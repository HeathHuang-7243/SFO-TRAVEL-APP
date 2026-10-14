export const clockCities = [
  {
    zone: "America/Los_Angeles",
    zh: "洛杉矶",
    en: "Los Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
  },
  {
    zone: "Europe/Berlin",
    zh: "柏林",
    en: "Berlin",
    latitude: 52.52,
    longitude: 13.405,
  },
  {
    zone: "Asia/Shanghai",
    zh: "上海",
    en: "Shanghai",
    latitude: 31.2304,
    longitude: 121.4737,
  },
];
const DAY = 86400000;
export function calendarDay(now: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (name: string) =>
    Number(parts.find((p) => p.type === name)!.value);
  return Date.UTC(value("year"), value("month") - 1, value("day"));
}
export function dateDifference(now: Date, zone: string) {
  return Math.round(
    (calendarDay(now, zone) - calendarDay(now, "Europe/Berlin")) / DAY,
  );
}
// NOAA sunrise/sunset approximation, including refraction (90.833° zenith).
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
// Calculated locally: clocks remain available when weather requests fail.
export function sunTimes(now: Date, city: (typeof clockCities)[number]) {
  const midnight = calendarDay(now, city.zone),
    year = new Date(midnight).getUTCFullYear();
  const days = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY;
  const day = (midnight - Date.UTC(year, 0, 1)) / DAY + 1;
  const gamma = ((2 * Math.PI) / days) * (day - 1);
  const eq =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const decl =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  const rad = Math.PI / 180,
    lat = city.latitude * rad;
  const ha =
    Math.acos(
      Math.cos(90.833 * rad) / (Math.cos(lat) * Math.cos(decl)) -
        Math.tan(lat) * Math.tan(decl),
    ) / rad;
  return {
    sunrise: new Date(
      midnight + (720 - 4 * (city.longitude + ha) - eq) * 60000,
    ),
    sunset: new Date(midnight + (720 - 4 * (city.longitude - ha) - eq) * 60000),
  };
}
export function cityClock(now: Date, city: (typeof clockCities)[number]) {
  const { sunrise, sunset } = sunTimes(now, city);
  return {
    sunrise,
    sunset,
    daytime: now >= sunrise && now < sunset,
    difference: dateDifference(now, city.zone),
  };
}
