export function normalizeSessions(rows: any[]) {
  const m = new Map<string, any>();
  for (const s of rows) {
    if (!s.sessionId || !s.title || s.excludeFromSessionScheduler) continue;
    const id = s.sessionId;
    let item = m.get(id);
    if (!item) {
      item = {
        id,
        code: s.sessionCode || "",
        title: s.title,
        description: String(s.description || "").replace(/<[^>]*>/g, " "),
        speakers: s.speakerNames || "",
        type: s.sessionType?.displayValue || "Session",
        topics: (s.topic || []).map((t: any) => t.displayValue),
        level: (s.sessionLevel || [])
          .map((t: any) => t.displayValue)
          .join(", "),
        delivery: (s.deliveryTypes || []).map((t: any) => t.displayValue),
        instances: [],
        url: `https://ignite.microsoft.com/en-US/sessions/${s.sessionInstanceId || id}`,
      };
      m.set(id, item);
    }
    const room = s.location?.displayValue;
    const start = s.startDateTime;
    item.instances.push({
      id: s.sessionInstanceId,
      timeSlot:
        typeof s.TimeSlot === "string" &&
        /^\d{2}:\d{2}\s*[-–]\s*\d{2}:\d{2}$/.test(s.TimeSlot.trim())
          ? s.TimeSlot.trim()
          : null,
      room: room && !/test|tbd|to be/i.test(room) ? room : null,
      start:
        typeof start === "string" &&
        /T.*(Z|[+-]\d{2}:?\d{2})$/.test(start) &&
        !isNaN(Date.parse(start))
          ? start
          : null,
    });
  }
  return [...m.values()];
}
export function normalizeRates(d: any) {
  if (d.returnCode !== "SUC0000" || !Array.isArray(d.body))
    throw Error("汇率源格式变化");
  const rates: any = {};
  for (const code of ["USD", "EUR"]) {
    const r = d.body.find((x: any) => String(x.ccyNbrEng).endsWith(code));
    if (!r) throw Error("汇率缺失");
    const sell = Number(r.rthOfr) / 100,
      buy = Number(r.rthBid) / 100;
    if (
      !Number.isFinite(sell) ||
      !Number.isFinite(buy) ||
      sell <= 0 ||
      buy <= 0
    )
      throw Error("汇率无效");
    rates[code] = { sell, buy, time: `${r.ratDat} ${r.ratTim}（北京时间）` };
  }
  return {
    rates,
    retrievedAt: new Date().toISOString(),
    source: "https://fx.cmbchina.com/hq",
    stale: false,
  };
}
