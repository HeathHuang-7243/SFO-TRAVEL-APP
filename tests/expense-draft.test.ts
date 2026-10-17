import { expect, it } from "vitest";
import {
  ExpenseDraftStore,
  type ExpenseDraft,
} from "../src/services/expense-draft";
import { backupDue } from "../src/services/backup-status";

const value: ExpenseDraft = {
  clientId: "draft-1",
  amount: "12.34",
  currency: "CNY",
  tip: "0",
  date: "2026-10-17",
  description: "Unfinished",
  category: "餐饮",
  usdCny: "7.2",
  usdEur: "0.9",
  rateInfo: "Manual",
  photoData: "/9j/AA==",
  photoKey: null,
  removePhoto: false,
};
it("persists text and receipt across instances and orders a clear after pending writes", async () => {
  const values = new Map<string, string>();
  const db = {
    async get(k: string) {
      return values.get(k) ?? null;
    },
    async set(k: string, v: string) {
      await new Promise((r) => setTimeout(r, 5));
      values.set(k, v);
    },
    async remove(k: string) {
      values.delete(k);
    },
  };
  const store = new ExpenseDraftStore(async () => db);
  await store.write(value);
  expect(await new ExpenseDraftStore(async () => db).read()).toEqual(value);
  await Promise.all([
    store.write({ ...value, description: "Latest" }),
    store.clear(),
  ]);
  expect(await store.read()).toBeNull();
});
it("does not erase a draft when reading or writing fails", async () => {
  let raw = JSON.stringify(value);
  const store = new ExpenseDraftStore(async () => ({
    async get() {
      return raw;
    },
    async set() {
      throw Error("Disk full");
    },
    async remove() {
      raw = "";
    },
  }));
  await expect(
    store.write({ ...value, description: "Changed" }),
  ).rejects.toThrow("Disk full");
  expect(await store.read()).toEqual(value);
});
it("treats only confirmed saves or snoozes as satisfying a backup reminder", () => {
  const now = Date.parse("2026-10-17T12:00:00Z");
  expect(
    backupDue(
      { reminders: true, generatedAt: new Date(now).toISOString() },
      now,
    ),
  ).toBe(true);
  expect(
    backupDue({ reminders: true, savedAt: new Date(now).toISOString() }, now),
  ).toBe(false);
  expect(
    backupDue(
      { reminders: true, dismissedAt: new Date(now - 86400000).toISOString() },
      now,
    ),
  ).toBe(false);
  expect(backupDue({ reminders: false }, now)).toBe(false);
});
