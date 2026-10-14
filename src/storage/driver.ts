import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { openNativeDriver } from "./native";

export interface KeyValue {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
let driver: Promise<KeyValue> | undefined;
const sqlite = new SQLiteConnection(CapacitorSQLite);
export function getDriver(): Promise<KeyValue> {
  return (driver ??= openDriver().catch((error) => {
    driver = undefined;
    throw error;
  }));
}
async function openDriver(): Promise<KeyValue> {
  if (Capacitor.isNativePlatform()) {
    return openNativeDriver(sqlite);
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
