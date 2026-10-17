import { describe, it, expect } from "vitest";
import { Repository, validateBackup } from "../src/storage/repository";
import {
  createExpense,
  emptyPersonal,
  validatePersonal,
} from "../src/storage/model";
import { encryptBackup, decryptBackup } from "../src/services/backup";
import type { KeyValue } from "../src/storage/driver";
import type { PhotoStore } from "../src/storage/photos";

const input = {
  date: "2026-10-14",
  description: "午餐",
  category: "餐饮",
  currency: "USD",
  amount: 100,
  tip: 18,
  usdCny: 7.2,
  usdEur: 0.9,
  rateInfo: "Manual",
};
const jpeg = "/9j/AA==";
function setup() {
  const values = new Map<string, string>(),
    files = new Map<string, string>();
  let fail = false;
  const db: KeyValue = {
    async get(k) {
      return values.get(k) ?? null;
    },
    async set(k, v) {
      if (fail) throw Error("Disk full");
      values.set(k, v);
    },
    async remove(k) {
      values.delete(k);
    },
  };
  const photos: PhotoStore = {
    async read(k) {
      if (!files.has(k)) throw Error("Missing");
      return files.get(k)!;
    },
    async write(k, v) {
      files.set(k, v);
    },
    async remove(k) {
      files.delete(k);
    },
  };
  return {
    repo: new Repository(db, photos),
    db,
    photos,
    files,
    values,
    setFailure: (value: boolean) => {
      fail = value;
    },
  };
}
describe("local personal records", () => {
  it("edits without changing identity, historical rates, receipt or creation time", async () => {
    const s = setup();
    const original = await s.repo.add(input, jpeg);
    const edited = await s.repo.update(original.id, {
      ...input,
      amount: 50,
      tip: 0,
      currency: "EUR",
      usdCny: 99,
      usdEur: 99,
      description: "Edited",
    });
    expect(edited).toMatchObject({
      id: original.id,
      amount: 50,
      total: 50,
      cny: 400,
      eur: 50,
      usd_cny: 7.2,
      usd_eur: 0.9,
      created_at: original.created_at,
      rate_snapshot_at: original.rate_snapshot_at,
      photo_key: original.photo_key,
    });
    expect((await s.repo.read()).expenses).toHaveLength(1);
    expect(s.files.size).toBe(1);
  });
  it("rolls back failed receipt replacements and removes the old file only after commit", async () => {
    const s = setup();
    const original = await s.repo.add(input, jpeg);
    s.setFailure(true);
    await expect(
      s.repo.update(original.id, { ...input, amount: 42 }, jpeg),
    ).rejects.toThrow("Disk full");
    expect((await s.repo.read()).expenses).toEqual([original]);
    expect([...s.files.keys()]).toEqual([original.photo_key]);
    s.setFailure(false);
    const next = await s.repo.update(
      original.id,
      { ...input, amount: 42 },
      jpeg,
    );
    expect(next.photo_key).not.toBe(original.photo_key);
    expect(s.files.has(original.photo_key!)).toBe(false);
    await s.repo.update(next.id, input, null);
    expect(s.files.size).toBe(0);
    expect((await s.repo.read()).expenses[0].photo_key).toBeNull();
  });
  it("retries a submitted draft without creating duplicate expenses", async () => {
    const s = setup();
    const value = { ...input, clientId: "same-draft" };
    const [a, b] = await Promise.all([
      s.repo.add(value, jpeg),
      s.repo.add(value, jpeg),
    ]);
    expect(a).toEqual(b);
    expect((await s.repo.read()).expenses).toHaveLength(1);
    expect(s.files.size).toBe(1);
  });
  it("captures immutable FX values and persists across repository restarts", async () => {
    const s = setup();
    const expense = await s.repo.add(input, jpeg);
    expect(expense).toMatchObject({
      total: 118,
      cny: 849.6,
      eur: 106.2,
      usd_cny: 7.2,
    });
    const restarted = new Repository(s.db, s.photos);
    expect((await restarted.read()).expenses).toEqual([expense]);
  });
  it("does not lose concurrent expenses and favorites", async () => {
    const s = setup();
    await Promise.all([
      s.repo.add(input),
      s.repo.favorite("session-1", true),
      s.repo.add({ ...input, amount: 42 }),
    ]);
    const p = await s.repo.read();
    expect(p.expenses).toHaveLength(2);
    expect(p.favorites).toEqual(["session-1"]);
  });
  it("rejects invalid dates and non-finite values before storing", async () => {
    for (const change of [
      { date: "2026-02-30" },
      { amount: NaN },
      { amount: -1 },
      { usdCny: 0 },
      { category: "unknown" },
      { tip: 101 },
    ]) {
      await expect(setup().repo.add({ ...input, ...change })).rejects.toThrow();
    }
  });
  it("removes an uncommitted receipt if the database write fails", async () => {
    const s = setup();
    s.setFailure(true);
    await expect(s.repo.add(input, jpeg)).rejects.toThrow("Disk full");
    expect(s.files.size).toBe(0);
  });
  it("deletes both the record and its private receipt", async () => {
    const s = setup();
    const e = await s.repo.add(input, jpeg);
    await s.repo.remove(e.id);
    expect((await s.repo.read()).expenses).toHaveLength(0);
    expect(s.files.size).toBe(0);
  });
  it("fails closed on invalid existing data without resetting it", async () => {
    const s = setup();
    s.values.set("personal:v1", '{"version":99}');
    await expect(s.repo.read()).rejects.toThrow();
    expect(s.values.get("personal:v1")).toBe('{"version":99}');
  });
});
describe("portable encrypted backup", () => {
  it("round-trips 4 and 128 character passwords and rejects invalid new backup lengths", async () => {
    const data = await setup().repo.backup();
    for (const password of ["2468", "x".repeat(128)]) {
      expect(
        await decryptBackup(await encryptBackup(data, password), password),
      ).toEqual(data);
    }
    for (const password of ["123", "x".repeat(129)])
      await expect(encryptBackup(data, password)).rejects.toThrow("4–128");
  });
  it("round-trips receipts and favorites and merges idempotently", async () => {
    const a = setup(),
      b = setup();
    await a.repo.add(input, jpeg);
    await a.repo.favorite("session-1", true);
    await b.repo.add({ ...input, description: "existing" });
    const encrypted = await encryptBackup(
      await a.repo.backup(),
      "test-password",
    );
    expect(encrypted).not.toContain("午餐");
    const backup = await decryptBackup(encrypted, "test-password");
    expect(await b.repo.restore(backup)).toEqual({ added: 1, skipped: 0 });
    expect(await b.repo.restore(backup)).toEqual({ added: 0, skipped: 1 });
    expect((await b.repo.read()).expenses).toHaveLength(2);
    expect(b.files.size).toBe(1);
    expect((await b.repo.backup()).photos).toEqual(
      expect.objectContaining(Object.fromEntries(b.files)),
    );
  });
  it("rejects incorrect passwords and tampered ciphertext", async () => {
    const encrypted = await encryptBackup(
      await setup().repo.backup(),
      "test-password",
    );
    await expect(decryptBackup(encrypted, "wrong-password")).rejects.toThrow();
    const envelope = JSON.parse(encrypted);
    envelope.data = "AAAA" + envelope.data.slice(4);
    await expect(
      decryptBackup(JSON.stringify(envelope), "test-password"),
    ).rejects.toThrow();
  });
  it("rejects a missing receipt without mutating current data", async () => {
    const a = setup(),
      b = setup();
    await a.repo.add(input, jpeg);
    const backup = await a.repo.backup();
    backup.photos = {};
    await expect(b.repo.restore(backup)).rejects.toThrow();
    expect(await b.repo.read()).toEqual(emptyPersonal());
  });
  it("rolls back new files on restore failure without overwriting existing receipts", async () => {
    const a = setup(),
      b = setup();
    await a.repo.add(input, jpeg);
    await b.repo.add({ ...input, description: "Keep" }, jpeg);
    const before = await b.repo.backup();
    b.setFailure(true);
    await expect(b.repo.restore(await a.repo.backup())).rejects.toThrow(
      "Disk full",
    );
    expect(await b.repo.backup()).toMatchObject({
      personal: before.personal,
      photos: before.photos,
    });
  });
  it("rejects traversal paths, future formats and modified saved totals", async () => {
    const a = setup();
    await a.repo.add(input, jpeg);
    const backup = await a.repo.backup();
    expect(() => validateBackup({ ...backup, version: 2 })).toThrow();
    backup.personal.expenses[0].photo_key = "../private";
    expect(() => validateBackup(backup)).toThrow();
    const e = createExpense(input, "expense-1");
    expect(() =>
      validatePersonal({
        version: 1,
        expenses: [{ ...e, total: 1 }],
        favorites: [],
      }),
    ).toThrow();
  });
});
