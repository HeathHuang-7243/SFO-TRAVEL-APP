export type FxObservation = { date: string; eurUsd: number; eurCny: number };
export const ECB_SOURCE =
  "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html";
export const ECB_XML =
  "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml";
export function parseEcb(xml: string): FxObservation[] {
  const rows: FxObservation[] = [];
  for (const block of xml.matchAll(
    /<Cube\b[^>]*time=['"](\d{4}-\d{2}-\d{2})['"][^>]*>([\s\S]*?)<\/Cube>/g,
  )) {
    const values: Record<string, number> = {};
    for (const rate of block[2].matchAll(
      /<Cube\b[^>]*currency=['"]([A-Z]{3})['"][^>]*rate=['"]([\d.]+)['"]/g,
    ))
      values[rate[1]] = Number(rate[2]);
    if (
      Number.isFinite(values.USD) &&
      values.USD > 0 &&
      Number.isFinite(values.CNY) &&
      values.CNY > 0
    )
      rows.push({ date: block[1], eurUsd: values.USD, eurCny: values.CNY });
  }
  if (!rows.length) throw Error("Invalid ECB response");
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}
export function historyWindow(rows: FxObservation[], now = new Date()) {
  // The publication date follows Frankfurt / Berlin, including daylight saving time.
  const end = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const endMs = Date.parse(end + "T00:00:00Z");
  const from = new Date(endMs - 19 * 86400000).toISOString().slice(0, 10);
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const points = Array.from({ length: 20 }, (_, i) => {
    const date = new Date(endMs - (19 - i) * 86400000)
        .toISOString()
        .slice(0, 10),
      row = byDate.get(date);
    return {
      date,
      usdCny: row ? row.eurCny / row.eurUsd : null,
      eurCny: row?.eurCny ?? null,
      usdEur: row ? 1 / row.eurUsd : null,
      eurUsd: row?.eurUsd ?? null,
    };
  });
  return {
    from,
    to: end,
    points,
    observations: points.filter((p) => p.eurUsd !== null).length,
  };
}
