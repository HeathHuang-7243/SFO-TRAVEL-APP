import { Capacitor, registerPlugin } from "@capacitor/core";
import { App } from "@capacitor/app";

const ITERATIONS = 600000;
export const ACCESS_KEY = "sfo-access-lock:v1";
type RecordData = {
  schema: 1;
  salt: string;
  verifier: string;
  iterations: number;
  approvedVersion: string;
  failures: number;
  retryAt: number;
};
export type AccessState = "setup" | "locked" | "unlocked";
export class AccessError extends Error {
  constructor(
    public code:
      | "incorrect"
      | "rate"
      | "invalid"
      | "storage"
      | "exists"
      | "length",
  ) {
    super(code);
  }
}
export interface AccessStore {
  read(): Promise<string | null>;
  replace(expected: string | null, value: string): Promise<void>;
}
const native = registerPlugin<{
  read(): Promise<{ value: string | null }>;
  replace(options: { expected: string | null; value: string }): Promise<void>;
}>("AccessStore");
const store: AccessStore = {
  async read() {
    return Capacitor.isNativePlatform()
      ? (await native.read()).value
      : localStorage.getItem(ACCESS_KEY);
  },
  async replace(expected, value) {
    if (Capacitor.isNativePlatform()) await native.replace({ expected, value });
    else {
      if (localStorage.getItem(ACCESS_KEY) !== expected)
        throw new AccessError("storage");
      localStorage.setItem(ACCESS_KEY, value);
    }
  },
};
function encode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
function decode(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
async function derive(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: salt as BufferSource,
        iterations: ITERATIONS,
      },
      material,
      256,
    ),
  );
}
function parse(raw: string): RecordData {
  try {
    const record = JSON.parse(raw);
    if (
      record.schema !== 1 ||
      record.iterations !== ITERATIONS ||
      typeof record.approvedVersion !== "string" ||
      record.approvedVersion.length > 64 ||
      typeof record.salt !== "string" ||
      record.salt.length !== 24 ||
      decode(record.salt).length !== 16 ||
      typeof record.verifier !== "string" ||
      record.verifier.length !== 44 ||
      decode(record.verifier).length !== 32 ||
      !Number.isInteger(record.failures) ||
      record.failures < 0 ||
      record.failures > 99 ||
      !Number.isSafeInteger(record.retryAt) ||
      record.retryAt < 0
    )
      throw Error();
    return record;
  } catch {
    throw new AccessError("invalid");
  }
}
export class PasswordLock {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: AccessStore,
    private version: () => Promise<string>,
    private now = () => Date.now(),
  ) {}
  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }
  async state(): Promise<AccessState> {
    const raw = await this.storage.read();
    return raw === null
      ? "setup"
      : parse(raw).approvedVersion === (await this.version())
        ? "unlocked"
        : "locked";
  }
  private async record(password: string): Promise<RecordData> {
    if (password.length < 8 || password.length > 128)
      throw new AccessError("length");
    const salt = crypto.getRandomValues(new Uint8Array(16));
    return {
      schema: 1,
      salt: encode(salt),
      verifier: encode(await derive(password, salt)),
      iterations: ITERATIONS,
      approvedVersion: await this.version(),
      failures: 0,
      retryAt: 0,
    };
  }
  setup(password: string) {
    return this.exclusive(async () => {
      if ((await this.storage.read()) !== null) throw new AccessError("exists");
      await this.storage.replace(
        null,
        JSON.stringify(await this.record(password)),
      );
    });
  }
  private async verify(password: string) {
    const raw = await this.storage.read();
    if (raw === null) throw new AccessError("invalid");
    const record = parse(raw),
      remaining = record.retryAt - this.now();
    // A clock rollback must not leave the user indefinitely locked out.
    if (remaining > 0 && remaining <= 30000) throw new AccessError("rate");
    const expected = decode(record.verifier);
    const actual =
      password.length > 128
        ? new Uint8Array(32)
        : await derive(password, decode(record.salt));
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++)
      mismatch |= expected[i] ^ actual[i];
    if (mismatch !== 0) {
      const failures = Math.min(record.failures + 1, 99);
      await this.storage.replace(
        raw,
        JSON.stringify({
          ...record,
          failures,
          retryAt:
            this.now() +
            (failures < 5
              ? 0
              : Math.min(30000, 5000 * 2 ** Math.min(failures - 5, 3))),
        }),
      );
      throw new AccessError("incorrect");
    }
    return { raw, record };
  }
  unlock(password: string) {
    return this.exclusive(async () => {
      const { raw, record } = await this.verify(password);
      await this.storage.replace(
        raw,
        JSON.stringify({
          ...record,
          approvedVersion: await this.version(),
          failures: 0,
          retryAt: 0,
        }),
      );
    });
  }
  change(current: string, next: string) {
    return this.exclusive(async () => {
      if (next.length < 8 || next.length > 128) throw new AccessError("length");
      const { raw } = await this.verify(current);
      await this.storage.replace(raw, JSON.stringify(await this.record(next)));
    });
  }
}
export const accessLock = new PasswordLock(store, async () =>
  Capacitor.isNativePlatform() ? (await App.getInfo()).build : __APP_VERSION__,
);

export function accessMessage(error: unknown, en: boolean) {
  const code = error instanceof AccessError ? error.code : "storage";
  if (code === "incorrect")
    return en
      ? "Incorrect password. Your records have not been deleted."
      : "密码不正确，记录没有被删除。";
  if (code === "rate")
    return en
      ? "Too many attempts. Wait 30 seconds and retry. Your records are still here."
      : "尝试次数较多，请等待 30 秒后重试。记录仍保留在本机。";
  if (code === "length")
    return en ? "Use 8–128 characters." : "密码需要 8–128 个字符。";
  return en
    ? "Could not read or save the password settings. Retry without uninstalling or clearing app data; your records have not been reset."
    : "无法读取或保存密码设置，请重试。不要卸载或清除应用数据，已有记录未被重置。";
}
