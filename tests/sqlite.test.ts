import { DatabaseSync } from "node:sqlite";
import { it, expect } from "vitest";
import { SQLITE_SCHEMA, sqliteKeyValue } from "../src/storage/sqlite-kv";

function database() {
  const sql = new DatabaseSync(":memory:");
  for (const statement of SQLITE_SCHEMA) sql.exec(statement);
  let failure = false;
  const driver = {
    async query(statement: string, values: any[]) {
      return { values: sql.prepare(statement).all(...values) };
    },
    async executeSet(
      statements: { statement: string; values: any[] }[],
      transaction: boolean,
    ) {
      expect(transaction).toBe(true);
      sql.exec("BEGIN");
      try {
        for (const [index, s] of statements.entries()) {
          sql.prepare(s.statement).run(...s.values);
          if (failure && index === 2) throw Error("Simulated write failure");
        }
        sql.exec("COMMIT");
      } catch (e) {
        sql.exec("ROLLBACK");
        throw e;
      }
      return { changes: { changes: statements.length } };
    },
    async run() {
      throw Error("Not used");
    },
  };
  return {
    sql,
    store: sqliteKeyValue(driver),
    fail: () => {
      failure = true;
    },
  };
}
it("round-trips a multi-megabyte Unicode record with bounded SQLite rows", async () => {
  const { sql, store } = database();
  const large = "a".repeat(65535) + "🌉" + "出差🌉".repeat(500000);
  await store.set("personal", large);
  expect(await store.get("personal")).toBe(large);
  const rows = sql.prepare("SELECT value FROM local_chunks").all() as {
    value: string;
  }[];
  expect(rows.length).toBeGreaterThan(2);
  expect(rows.every((r) => Buffer.byteLength(r.value, "utf8") < 262144)).toBe(
    true,
  );
  expect(rows.map((r) => Buffer.from(r.value).toString("utf8")).join("")).toBe(
    large,
  );
  await store.set("personal", "small");
  expect(await store.get("personal")).toBe("small");
  await store.remove("personal");
  expect(await store.get("personal")).toBeNull();
  sql.close();
});
it("migrates legacy data only on successful writes and rolls back partial chunks", async () => {
  const { sql, store, fail } = database();
  sql
    .prepare("INSERT INTO local_data(key,value) VALUES(?,?)")
    .run("personal", "legacy");
  expect(await store.get("personal")).toBe("legacy");
  await store.set("personal", "upgraded");
  expect(await store.get("personal")).toBe("upgraded");
  expect(sql.prepare("SELECT * FROM local_data").all()).toHaveLength(0);
  fail();
  await expect(store.set("personal", "x".repeat(300000))).rejects.toThrow(
    "Simulated",
  );
  expect(await store.get("personal")).toBe("upgraded");
  sql.close();
});
