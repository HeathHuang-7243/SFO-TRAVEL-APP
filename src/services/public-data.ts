import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { getDriver } from "../storage/driver";
import { normalizeRates, normalizeSessions } from "../lib/data";
import {
  parseEcb,
  historyWindow,
  ECB_SOURCE,
  ECB_XML,
} from "../lib/fx-history";
import rateSnapshot from "../lib/rates-snapshot.json";
import sessionSnapshot from "../lib/sessions-snapshot.json";
import historySnapshot from "../lib/fx-history-snapshot.json";

const allowedHosts = new Set([
  "api.open-meteo.com",
  "fx.cmbchina.com",
  "www.ecb.europa.eu",
  "ignite.microsoft.com",
]);
export async function publicGet(url: string, text = false): Promise<any> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname))
    throw Error("Unsupported public data source");
  if (Capacitor.isNativePlatform()) {
    const r = await CapacitorHttp.get({
      url,
      connectTimeout: 15000,
      readTimeout: 20000,
      responseType: text ? "text" : "json",
      disableRedirects: true,
    });
    if (r.status < 200 || r.status >= 300) throw Error(`HTTP ${r.status}`);
    return text
      ? String(r.data)
      : typeof r.data === "string"
        ? JSON.parse(r.data)
        : r.data;
  }
  const r = await fetch(url, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw Error(`HTTP ${r.status}`);
  return text ? r.text() : r.json();
}
const pending = new Map<string, Promise<any>>();
async function cached(
  key: string,
  ttl: number,
  fallback: any,
  fetcher: () => Promise<any>,
  force = false,
) {
  if (pending.has(key)) return pending.get(key);
  const job = (async () => {
    const db = await getDriver();
    let saved = fallback;
    const raw = await db.get("cache:" + key);
    if (raw) {
      try {
        const data = JSON.parse(raw);
        if (Number.isFinite(Date.parse(data.retrievedAt))) saved = data;
      } catch {
        /* use bundled fallback */
      }
    }
    if (
      !force &&
      saved &&
      Date.now() - Date.parse(saved.retrievedAt) >= 0 &&
      Date.now() - Date.parse(saved.retrievedAt) < ttl
    )
      return { ...saved, stale: false };
    try {
      const data = {
        ...(await fetcher()),
        retrievedAt: new Date().toISOString(),
        stale: false,
      };
      await db.set("cache:" + key, JSON.stringify(data));
      return data;
    } catch {
      if (saved)
        return {
          ...saved,
          stale: true,
          warning: "更新失败，显示已保存的数据；请留意更新时间。",
        };
      throw Error(
        "无法连接数据源，且本机尚无缓存 / Offline, no saved data yet",
      );
    }
  })();
  pending.set(key, job);
  try {
    return await job;
  } finally {
    pending.delete(key);
  }
}
export function loadRates(force = false) {
  return cached(
    "rates",
    5 * 60000,
    rateSnapshot,
    async () =>
      normalizeRates(await publicGet("https://fx.cmbchina.com/api/v1/fx/rate")),
    force,
  );
}
export function loadSessions(force = false) {
  return cached(
    "sessions",
    30 * 60000,
    sessionSnapshot,
    async () => {
      const raw = await publicGet(
        "https://ignite.microsoft.com/api/session/all/en-US",
      );
      if (!Array.isArray(raw) || !raw.length) throw Error("Invalid catalogue");
      const sessions = normalizeSessions(raw);
      if (!sessions.length) throw Error("Empty catalogue");
      return { schemaVersion: 2, sessions, rawCount: raw.length };
    },
    force,
  );
}
export async function loadHistory(force = false) {
  const data = await cached(
    "history",
    3600000,
    historySnapshot,
    async () => ({ rows: parseEcb(await publicGet(ECB_XML, true)) }),
    force,
  );
  return {
    ...historyWindow(data.rows),
    retrievedAt: data.retrievedAt,
    stale: data.stale,
    source: ECB_SOURCE,
  };
}
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast?latitude=37.7749&longitude=-122.4194&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,weather_code&timezone=America%2FLos_Angeles&forecast_days=15";
export async function loadWeather(force = false) {
  const data = await cached(
    "weather",
    15 * 60000,
    null,
    async () => {
      const d = await publicGet(WEATHER_URL);
      if (
        d.timezone !== "America/Los_Angeles" ||
        !Array.isArray(d.daily?.time) ||
        d.daily.time.length < 3 ||
        ![
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_probability_max",
          "wind_speed_10m_max",
          "weather_code",
        ].every(
          (k) =>
            Array.isArray(d.daily[k]) &&
            d.daily[k].length === d.daily.time.length &&
            d.daily[k].every(
              (n: unknown) => typeof n === "number" && Number.isFinite(n),
            ),
        ) ||
        !Number.isFinite(d.current?.temperature_2m)
      )
        throw Error("Invalid weather");
      return d;
    },
    force,
  );
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const stale = data.stale || data.daily.time[0] !== today;
  return {
    ...data,
    stale,
    warning: stale ? "更新失败，显示已保存的数据；请留意更新时间。" : undefined,
  };
}
