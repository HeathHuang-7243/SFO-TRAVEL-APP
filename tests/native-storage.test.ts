import { DatabaseSync } from "node:sqlite";
import { SQLiteConnection } from "@capacitor-community/sqlite";
import { afterEach, expect, it, vi } from "vitest";
import { openNativeDriver } from "../src/storage/native";

const databases: DatabaseSync[] = [];
afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});

function nativePlugin() {
  const sql = new DatabaseSync(":memory:");
  databases.push(sql);
  let connected = false,
    opened = false;
  const plugin = {
    async checkConnectionsConsistency({ dbNames }: { dbNames: string[] }) {
      if (!dbNames.length) {
        connected = false;
        opened = false;
        return { result: false };
      }
      return { result: connected };
    },
    createConnection: vi.fn(async () => {
      if (connected) throw Error("Connection sfo_travel already exists");
      connected = true;
    }),
    closeConnection: vi.fn(async () => {
      connected = false;
      opened = false;
    }),
    async isDBOpen() {
      return { result: opened };
    },
    async open() {
      opened = true;
    },
    execute: vi.fn(async ({ statements }: { statements: string }) => {
      // Match Android's ;\n splitting and single-statement native execSQL.
      // Node sql.exec() accepts same-line batches and masked the original bug.
      for (const statement of statements.split(";\n").filter((s) => s.trim())) {
        sql.prepare(statement).run();
      }
      return { changes: { changes: 0 } };
    }),
    async query({ statement, values }: { statement: string; values: any[] }) {
      if (!connected || !opened) throw Error("Database not opened");
      return { values: sql.prepare(statement).all(...values) };
    },
  };
  return { sql, plugin, connection: () => new SQLiteConnection(plugin) };
}

it("creates both tables on Android's single-statement execution path", async () => {
  const { sql, connection } = nativePlugin();
  const store = await openNativeDriver(connection());
  expect(await store.get("personal:v1")).toBeNull();
  expect(
    sql
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all(),
  ).toEqual([{ name: "local_chunks" }, { name: "local_data" }]);
});

it("repairs a partial schema and preserves legacy and chunked data across WebView reloads", async () => {
  const { sql, connection } = nativePlugin();
  sql.exec(
    "CREATE TABLE local_data (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  );
  sql.prepare("INSERT INTO local_data VALUES (?,?)").run("legacy", "旧账目🌉");
  const store = await openNativeDriver(connection());
  expect(await store.get("legacy")).toBe("旧账目🌉");
  sql
    .prepare("INSERT INTO local_chunks VALUES (?,?,?)")
    .run("chunked", 0, "凭证记录");
  // A fresh JS connection map with the same surviving native plugin handle.
  for (let i = 0; i < 3; i++) {
    const restarted = await openNativeDriver(connection());
    expect(await restarted.get("legacy")).toBe("旧账目🌉");
    expect(await restarted.get("chunked")).toBe("凭证记录");
  }
});

it("reuses an existing JS connection without opening a duplicate", async () => {
  const { connection, plugin } = nativePlugin();
  const sqlite = connection();
  await openNativeDriver(sqlite);
  await openNativeDriver(sqlite);
  expect(plugin.createConnection).toHaveBeenCalledTimes(1);
});

it("releases failed initialization and allows retry without deleting existing data", async () => {
  const { connection, plugin, sql } = nativePlugin();
  const sqlite = connection();
  sql.exec(
    "CREATE TABLE local_data (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
  );
  sql.prepare("INSERT INTO local_data VALUES (?,?)").run("legacy", "保留");
  plugin.execute.mockRejectedValueOnce(Error("Disk busy"));
  await expect(openNativeDriver(sqlite)).rejects.toThrow("Disk busy");
  expect(plugin.closeConnection).toHaveBeenCalledTimes(1);
  expect(await (await openNativeDriver(sqlite)).get("legacy")).toBe("保留");
});

it("rejects an unusable existing schema without dropping or resetting it", async () => {
  const { connection, sql } = nativePlugin();
  sql.exec("CREATE TABLE local_chunks (unexpected TEXT)");
  sql.prepare("INSERT INTO local_chunks VALUES (?)").run("keep me");
  await expect(openNativeDriver(connection())).rejects.toThrow();
  expect(sql.prepare("SELECT * FROM local_chunks").all()).toEqual([
    { unexpected: "keep me" },
  ]);
});
