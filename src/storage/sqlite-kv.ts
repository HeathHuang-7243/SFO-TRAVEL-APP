import type { SQLiteDBConnection } from "@capacitor-community/sqlite";
import type { KeyValue } from "./driver";

// Execute each statement separately: Android's plugin splits batches on ;\n,
// and native execSQL silently ignores a second statement on the same line.
export const SQLITE_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS local_data (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL);",
  "CREATE TABLE IF NOT EXISTS local_chunks (key TEXT NOT NULL, part INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY(key,part));",
];

// Keep individual SQLite rows well below Android's CursorWindow limit.
// Do not split UTF-16 surrogate pairs across rows (for example emoji in notes).
export function chunkText(value: string): string[] {
  const chunks: string[] = [];
  for (let start = 0; start < value.length; ) {
    let end = Math.min(start + 65536, value.length);
    const code = value.charCodeAt(end - 1);
    if (end < value.length && code >= 0xd800 && code <= 0xdbff) end--;
    chunks.push(value.slice(start, end));
    start = end;
  }
  return chunks.length ? chunks : [""];
}
export function sqliteKeyValue(
  db: Pick<SQLiteDBConnection, "query" | "executeSet" | "run">,
): KeyValue {
  return {
    async get(key) {
      const result = await db.query(
        "SELECT part,value FROM local_chunks WHERE key=? ORDER BY part",
        [key],
      );
      if (result.values?.length) {
        if (
          result.values.some(
            (r, i) => r.part !== i || typeof r.value !== "string",
          )
        )
          throw Error("Local storage is incomplete");
        return result.values.map((r) => r.value).join("");
      }
      // Read first-build records without destructive migration. Next write upgrades them.
      const legacy = await db.query(
        "SELECT value FROM local_data WHERE key=?",
        [key],
      );
      return legacy.values?.[0]?.value ?? null;
    },
    async set(key, value) {
      await db.executeSet(
        [
          { statement: "DELETE FROM local_chunks WHERE key=?", values: [key] },
          { statement: "DELETE FROM local_data WHERE key=?", values: [key] },
          ...chunkText(value).map((chunk, part) => ({
            statement: "INSERT INTO local_chunks(key,part,value) VALUES(?,?,?)",
            values: [key, part, chunk],
          })),
        ],
        true,
      );
    },
    async remove(key) {
      await db.executeSet(
        [
          { statement: "DELETE FROM local_chunks WHERE key=?", values: [key] },
          { statement: "DELETE FROM local_data WHERE key=?", values: [key] },
        ],
        true,
      );
    },
  };
}
