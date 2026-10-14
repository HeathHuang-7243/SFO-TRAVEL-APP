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
export const availableCities = [
  ...clockCities,
  {
    zone: "America/Los_Angeles",
    zh: "旧金山",
    en: "San Francisco",
    latitude: 37.7749,
    longitude: -122.4194,
  },
  {
    zone: "Asia/Shanghai",
    zh: "北京",
    en: "Beijing",
    latitude: 39.9042,
    longitude: 116.4074,
  },
  {
    zone: "Asia/Shanghai",
    zh: "广州",
    en: "Guangzhou",
    latitude: 23.1291,
    longitude: 113.2644,
  },
  {
    zone: "Asia/Shanghai",
    zh: "深圳",
    en: "Shenzhen",
    latitude: 22.5431,
    longitude: 114.0579,
  },
  {
    zone: "Asia/Hong_Kong",
    zh: "香港",
    en: "Hong Kong",
    latitude: 22.3193,
    longitude: 114.1694,
  },
  {
    zone: "Asia/Tokyo",
    zh: "东京",
    en: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  {
    zone: "Asia/Seoul",
    zh: "首尔",
    en: "Seoul",
    latitude: 37.5665,
    longitude: 126.978,
  },
  {
    zone: "Asia/Singapore",
    zh: "新加坡",
    en: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
  },
  {
    zone: "Asia/Dubai",
    zh: "迪拜",
    en: "Dubai",
    latitude: 25.2048,
    longitude: 55.2708,
  },
  {
    zone: "Asia/Kolkata",
    zh: "孟买",
    en: "Mumbai",
    latitude: 19.076,
    longitude: 72.8777,
  },
  {
    zone: "Europe/London",
    zh: "伦敦",
    en: "London",
    latitude: 51.5074,
    longitude: -0.1278,
  },
  {
    zone: "Europe/Paris",
    zh: "巴黎",
    en: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    zone: "America/New_York",
    zh: "纽约",
    en: "New York",
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    zone: "America/Toronto",
    zh: "多伦多",
    en: "Toronto",
    latitude: 43.6532,
    longitude: -79.3832,
  },
  {
    zone: "Australia/Sydney",
    zh: "悉尼",
    en: "Sydney",
    latitude: -33.8688,
    longitude: 151.2093,
  },
  {
    zone: "Pacific/Auckland",
    zh: "奥克兰",
    en: "Auckland",
    latitude: -36.8509,
    longitude: 174.7645,
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
export function dateDifference(
  now: Date,
  zone: string,
  referenceZone = "Europe/Berlin",
) {
  return Math.round(
    (calendarDay(now, zone) - calendarDay(now, referenceZone)) / DAY,
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
export function cityClock(
  now: Date,
  city: (typeof clockCities)[number],
  referenceZone = "Europe/Berlin",
) {
  const { sunrise, sunset } = sunTimes(now, city);
  return {
    sunrise,
    sunset,
    daytime: now >= sunrise && now < sunset,
    difference: dateDifference(now, city.zone, referenceZone),
  };
}
