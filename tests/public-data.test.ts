import { it, expect } from "vitest";
import { parseEcb, historyWindow } from "../src/lib/fx-history";
import { normalizeSessions, normalizeRates } from "../src/lib/data";
import { savedExpenseValue } from "../src/lib/expense-rates";
it("does not manufacture rates on weekends or unpublished days", () => {
  const rows = parseEcb(
    `<Cube time='2026-10-09'><Cube currency='USD' rate='1.1'/><Cube currency='CNY' rate='7.7'/></Cube>`,
  );
  const history = historyWindow(rows, new Date("2026-10-11T12:00:00Z"));
  expect(history.points).toHaveLength(20);
  expect(history.observations).toBe(1);
  expect(history.points.at(-1)?.usdCny).toBeNull();
  expect(history.points.find((p) => p.date === "2026-10-09")?.usdCny).toBe(7);
});
it("preserves original currency amounts without a conversion", () => {
  expect(
    savedExpenseValue({ currency: "CNY", total: 15, cny: null }, "CNY"),
  ).toBe(15);
  expect(
    savedExpenseValue({ currency: "USD", total: 15, eur: null }, "EUR"),
  ).toBeNull();
});
it("keeps unknown session timezones pending and removes test rooms", () => {
  const rows = normalizeSessions([
    {
      sessionId: "s1",
      title: "Session",
      sessionInstanceId: "i1",
      startDateTime: "2026-10-14T10:00",
      location: { displayValue: "Test room" },
    },
    {
      sessionId: "s1",
      title: "Session",
      sessionInstanceId: "i2",
      startDateTime: "2026-10-14T10:00:00Z",
    },
  ]);
  expect(rows).toHaveLength(1);
  expect(rows[0].instances).toHaveLength(2);
  expect(rows[0].instances[0]).toMatchObject({ start: null, room: null });
  expect(rows[0].instances[1].start).toBe("2026-10-14T10:00:00Z");
});
it("rejects malformed bank quotes rather than caching zero rates", () => {
  expect(() => normalizeRates({ returnCode: "SUC0000", body: [] })).toThrow();
});
