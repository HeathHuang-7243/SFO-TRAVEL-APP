import type { KeyValue } from "./driver";
import { getDriver } from "./driver";
import { photos, type PhotoStore, validatePhoto } from "./photos";
import {
  createExpense,
  emptyPersonal,
  mergePersonal,
  safeId,
  validatePersonal,
  type PersonalData,
} from "./model";

export type Backup = {
  format: "sfo-travel";
  version: 1;
  exportedAt: string;
  personal: PersonalData;
  photos: Record<string, string>;
};
export class Repository {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private db: KeyValue,
    private files: PhotoStore,
  ) {}
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const job = this.queue.then(fn);
    this.queue = job.catch(() => {});
    return job;
  }
  async read() {
    const raw = await this.db.get("personal:v1");
    return raw ? validatePersonal(JSON.parse(raw)) : emptyPersonal();
  }
  private async write(p: PersonalData) {
    await this.db.set("personal:v1", JSON.stringify(validatePersonal(p)));
  }
  add(input: Record<string, unknown>, photo?: string) {
    return this.exclusive(async () => {
      const p = await this.read();
      const e = createExpense(input, crypto.randomUUID());
      if (photo) {
        validatePhoto(photo);
        e.photo_key = `receipts/${e.id}.jpg`;
        await this.files.write(e.photo_key, photo);
      }
      try {
        await this.write({ ...p, expenses: [e, ...p.expenses] });
      } catch (error) {
        if (e.photo_key) await this.files.remove(e.photo_key).catch(() => {});
        throw error;
      }
      return e;
    });
  }
  remove(id: string) {
    return this.exclusive(async () => {
      const p = await this.read();
      const item = p.expenses.find((e) => e.id === id);
      if (!item) throw Error("未找到记录 / Record not found");
      await this.write({
        ...p,
        expenses: p.expenses.filter((e) => e.id !== id),
      });
      // A failed file cleanup never makes a successfully deleted expense reappear.
      if (item.photo_key)
        await this.files.remove(item.photo_key).catch(() => {});
    });
  }
  favorite(id: string, selected: boolean) {
    return this.exclusive(async () => {
      if (!safeId(id)) throw Error("Invalid session ID");
      const p = await this.read();
      await this.write({
        ...p,
        favorites: selected
          ? [...new Set([...p.favorites, id])]
          : p.favorites.filter((x) => x !== id),
      });
    });
  }
  backup() {
    return this.exclusive(async () => {
      const personal = await this.read();
      const receipts: Record<string, string> = {};
      for (const e of personal.expenses)
        if (e.photo_key)
          receipts[e.photo_key] = await this.files.read(e.photo_key);
      return {
        format: "sfo-travel",
        version: 1,
        exportedAt: new Date().toISOString(),
        personal,
        photos: receipts,
      } as Backup;
    });
  }
  restore(input: unknown) {
    return this.exclusive(async () => {
      const backup = validateBackup(input);
      const current = await this.read();
      const existing = new Set(current.expenses.map((e) => e.id));
      const incoming = backup.personal.expenses
        .filter((e) => !existing.has(e.id))
        .map((e) => ({ ...e }));
      const written: string[] = [];
      try {
        // New file names ensure a failed restore cannot overwrite an existing receipt.
        for (const e of incoming)
          if (e.photo_key) {
            const data = backup.photos[e.photo_key];
            e.photo_key = `receipts/${crypto.randomUUID()}.jpg`;
            await this.files.write(e.photo_key, data);
            written.push(e.photo_key);
          }
        await this.write(
          mergePersonal(current, { ...backup.personal, expenses: incoming }),
        );
      } catch (error) {
        for (const key of written) await this.files.remove(key).catch(() => {});
        throw error;
      }
      return {
        added: incoming.length,
        skipped: backup.personal.expenses.length - incoming.length,
      };
    });
  }
}
export function validateBackup(input: unknown): Backup {
  const b = input as Backup;
  if (
    !b ||
    b.format !== "sfo-travel" ||
    b.version !== 1 ||
    !b.photos ||
    typeof b.photos !== "object" ||
    Array.isArray(b.photos)
  )
    throw Error("不是本应用的备份 / Not an SFO Travel backup");
  const personal = validatePersonal(b.personal);
  const expected = new Set(
    personal.expenses.flatMap((e) => (e.photo_key ? [e.photo_key] : [])),
  );
  if (Object.keys(b.photos).some((k) => !expected.has(k)))
    throw Error("备份含未知文件 / Unknown backup files");
  for (const key of expected) validatePhoto(b.photos[key]);
  return { ...b, personal };
}
let repository: Promise<Repository> | undefined;
export function getRepository() {
  return (repository ??= getDriver().then((db) => new Repository(db, photos)));
}
