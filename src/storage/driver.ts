import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";

export interface KeyValue {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
let driver: Promise<KeyValue> | undefined;
export function getDriver(): Promise<KeyValue> {
  return (driver ??= openDriver());
}
async function openDriver(): Promise<KeyValue> {
  if (Capacitor.isNativePlatform()) {
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const db = await sqlite.createConnection(
      "sfo_travel",
      false,
      "no-encryption",
      1,
      false,
    );
    await db.open();
    await db.execute(
      "CREATE TABLE IF NOT EXISTS local_data (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);",
    );
    return {
      async get(key) {
        const r = await db.query("SELECT value FROM local_data WHERE key=?", [
          key,
        ]);
        return r.values?.[0]?.value ?? null;
      },
      async set(key, value) {
        await db.run(
          "INSERT INTO local_data(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
          [key, value],
        );
      },
      async remove(key) {
        await db.run("DELETE FROM local_data WHERE key=?", [key]);
      },
    };
  }
  // Browser preview only; Android always uses SQLite and never silently falls back.
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("sfo-travel-preview", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("data");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  function transaction<T>(
    mode: IDBTransactionMode,
    run: (s: IDBObjectStore) => IDBRequest<T>,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction("data", mode);
      const request = run(tx.objectStore("data"));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? Error("Storage aborted"));
    });
  }
  return {
    async get(key) {
      return (await transaction("readonly", (s) => s.get(key))) ?? null;
    },
    async set(key, value) {
      await transaction("readwrite", (s) => s.put(value, key));
    },
    async remove(key) {
      await transaction("readwrite", (s) => s.delete(key));
    },
  };
}
