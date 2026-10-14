import type { SQLiteConnection } from "@capacitor-community/sqlite";
import { SQLITE_SCHEMA, sqliteKeyValue } from "./sqlite-kv";
import type { KeyValue } from "./driver";

const DATABASE = "sfo_travel";

export async function openNativeDriver(
  sqlite: SQLiteConnection,
): Promise<KeyValue> {
  // A WebView reload discards the JS connection map, but not native handles.
  // The plugin closes orphaned handles here; it never deletes database files.
  await sqlite.checkConnectionsConsistency();
  const db = (await sqlite.isConnection(DATABASE, false)).result
    ? await sqlite.retrieveConnection(DATABASE, false)
    : await sqlite.createConnection(DATABASE, false, "no-encryption", 1, false);
  try {
    if (!(await db.isDBOpen()).result) await db.open();
    // Idempotent repair also covers installations where only local_data exists.
    for (const statement of SQLITE_SCHEMA) await db.execute(statement);
    // Fail during initialization if the expected schema is not usable.
    await db.query("SELECT key,value FROM local_data LIMIT 0");
    await db.query("SELECT key,part,value FROM local_chunks LIMIT 0");
    return sqliteKeyValue(db);
  } catch (error) {
    // Release the handle, not the stored data. Keep the original error visible.
    await sqlite.closeConnection(DATABASE, false).catch(() => {});
    throw error;
  }
}
