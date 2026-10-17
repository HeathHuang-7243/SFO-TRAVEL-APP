import { describe, expect, it } from "vitest";
import {
  PasswordLock,
  nativeAccessVersion,
  type AccessStore,
} from "../src/services/access-lock";

function fixture() {
  let value: string | null = null;
  const store: AccessStore = {
    async read() {
      return value;
    },
    async replace(expected, next) {
      if (value !== expected) throw Error("conflict");
      value = next;
    },
  };
  return {
    store,
    raw: () => value,
    corrupt: (raw: string) => {
      value = raw;
    },
  };
}
describe("update password gate", () => {
  it("unlocks a same-code beta with the original password and keeps future stable compatibility", async () => {
    const f = fixture();
    const stable = new PasswordLock(f.store, async () =>
      nativeAccessVersion("1003004", "1.3.4"),
    );
    await stable.setup("0073");
    const before = JSON.parse(f.raw()!);
    const beta = new PasswordLock(f.store, async () =>
      nativeAccessVersion("1003004", "1.3.4b"),
    );
    expect(await beta.state()).toBe("locked");
    await expect(beta.unlock("0000")).rejects.toMatchObject({
      code: "incorrect",
    });
    expect(JSON.parse(f.raw()!)).toMatchObject({
      salt: before.salt,
      verifier: before.verifier,
      approvedVersion: before.approvedVersion,
    });
    await beta.unlock("0073");
    expect(
      await new PasswordLock(f.store, async () =>
        nativeAccessVersion("1003004", "1.3.4b"),
      ).state(),
    ).toBe("unlocked");
    const next = new PasswordLock(f.store, async () =>
      nativeAccessVersion("1003005", "1.3.5"),
    );
    expect(await next.state()).toBe("locked");
    await next.unlock("0073");
    expect(await next.backupPassword()).toBe("0073");
    expect(JSON.parse(f.raw()!)).toMatchObject({
      salt: before.salt,
      verifier: before.verifier,
      approvedVersion: "1003005",
    });
  });
  it("remembers setup within a version, requires the same password after updates, and never stores plaintext", async () => {
    const f = fixture(),
      old = new PasswordLock(f.store, async () => "1002001");
    expect(await old.state()).toBe("setup");
    await old.setup("correct-password");
    expect(f.raw()).not.toContain("correct-password");
    expect(await new PasswordLock(f.store, async () => "1002001").state()).toBe(
      "unlocked",
    );
    const next = new PasswordLock(f.store, async () => "1003000");
    expect(await next.state()).toBe("locked");
    const before = JSON.parse(f.raw()!);
    await expect(next.unlock("wrong-password")).rejects.toMatchObject({
      code: "incorrect",
    });
    expect(await next.state()).toBe("locked");
    expect(JSON.parse(f.raw()!)).toMatchObject({
      salt: before.salt,
      verifier: before.verifier,
      approvedVersion: before.approvedVersion,
    });
    await next.unlock("correct-password");
    expect(await next.state()).toBe("unlocked");
    await expect(next.setup("replacement-password")).rejects.toMatchObject({
      code: "exists",
    });
  });
  it("changes passwords only after verifying the old password", async () => {
    const f = fixture(),
      lock = new PasswordLock(f.store, async () => "1");
    await lock.setup("original-password");
    await expect(
      lock.change("wrong-password", "new-password"),
    ).rejects.toMatchObject({ code: "incorrect" });
    await lock.change("original-password", "new-password");
    const updated = new PasswordLock(f.store, async () => "2");
    await expect(updated.unlock("original-password")).rejects.toMatchObject({
      code: "incorrect",
    });
    await updated.unlock("new-password");
    expect(await updated.state()).toBe("unlocked");
  });
  it("fails closed on corrupt settings or failed writes and never resets them", async () => {
    const f = fixture(),
      lock = new PasswordLock(f.store, async () => "1");
    f.corrupt("broken settings");
    await expect(lock.state()).rejects.toMatchObject({ code: "invalid" });
    await expect(lock.setup("replacement-password")).rejects.toMatchObject({
      code: "exists",
    });
    expect(f.raw()).toBe("broken settings");
    const unavailable = new PasswordLock(
      {
        async read() {
          return null;
        },
        async replace() {
          throw Error("disk full");
        },
      },
      async () => "1",
    );
    await expect(unavailable.setup("valid-password")).rejects.toThrow(
      "disk full",
    );
  });
  it("throttles repeated failures temporarily without destroying the verifier", async () => {
    const f = fixture();
    let now = 100000;
    const lock = new PasswordLock(
      f.store,
      async () => "1",
      () => now,
    );
    await lock.setup("correct-password");
    const verifier = JSON.parse(f.raw()!).verifier;
    for (let i = 0; i < 5; i++)
      await expect(lock.unlock("wrong-password")).rejects.toMatchObject({
        code: "incorrect",
      });
    await expect(lock.unlock("correct-password")).rejects.toMatchObject({
      code: "rate",
    });
    now += 30001;
    await lock.unlock("correct-password");
    expect(JSON.parse(f.raw()!).verifier).toBe(verifier);
    expect(JSON.parse(f.raw()!).failures).toBe(0);
  });
});

describe("shared unlock and backup password", () => {
  it("accepts 4 and 128 characters, rejects 3 and 129 without changing metadata", async () => {
    const f = fixture(),
      lock = new PasswordLock(f.store, async () => "1");
    for (const password of ["123", "x".repeat(129)]) {
      await expect(lock.setup(password)).rejects.toMatchObject({
        code: "length",
      });
      expect(f.raw()).toBeNull();
    }
    await lock.setup("2468");
    expect(await lock.backupPassword()).toBe("2468");
    const before = f.raw();
    await expect(lock.change("2468", "123")).rejects.toMatchObject({
      code: "length",
    });
    expect(f.raw()).toBe(before);
    await lock.change("2468", "x".repeat(128));
    expect(await lock.backupPassword()).toBe("x".repeat(128));
    expect(f.raw()).not.toContain("x".repeat(128));
  });
  it("requires the existing password after restart, updates the session on change, and rejects stale sessions", async () => {
    const f = fixture(),
      original = new PasswordLock(f.store, async () => "1");
    await original.setup("2468");
    const restarted = new PasswordLock(f.store, async () => "1");
    expect(await restarted.state()).toBe("unlocked");
    expect(restarted.hasSessionPassword()).toBe(false);
    await expect(restarted.backupPassword("0000")).rejects.toMatchObject({
      code: "incorrect",
    });
    expect(await restarted.backupPassword("2468")).toBe("2468");
    await restarted.change("2468", "9753");
    expect(await restarted.backupPassword()).toBe("9753");
    await expect(original.backupPassword()).rejects.toMatchObject({
      code: "incorrect",
    });
    expect(original.hasSessionPassword()).toBe(false);
    const upgraded = new PasswordLock(f.store, async () => "2");
    await expect(upgraded.backupPassword("9753")).rejects.toMatchObject({
      code: "invalid",
    });
    expect(await upgraded.state()).toBe("locked");
    await upgraded.unlock("9753");
    expect(await upgraded.backupPassword()).toBe("9753");
  });
});
