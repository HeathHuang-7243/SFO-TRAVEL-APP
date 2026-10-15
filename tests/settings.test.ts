import { afterEach, expect, it, vi } from "vitest";
import {
  readPreferences,
  writePreferences,
  defaultPreferences,
} from "../src/services/preferences";
import {
  availableCities,
  cityClock,
  dateDifference,
} from "../src/lib/city-clocks";

afterEach(() => vi.unstubAllGlobals());
it("defaults to gallery copies and recovers invalid clock preferences", () => {
  vi.stubGlobal("localStorage", {
    getItem: () =>
      '{"saveToGallery":"true","cities":["London","invalid","Tokyo"]}',
  });
  expect(readPreferences()).toEqual({
    saveToGallery: true,
    cities: ["London", "Berlin", "Tokyo"],
  });
  vi.stubGlobal("localStorage", { getItem: () => null });
  expect(readPreferences()).toEqual(defaultPreferences);
  vi.stubGlobal("localStorage", { getItem: () => '{"cities":["London"]}' });
  expect(readPreferences().saveToGallery).toBe(true);
  vi.stubGlobal("localStorage", { getItem: () => "broken" });
  expect(readPreferences()).toEqual(defaultPreferences);
});
it("persists opt-out and city changes and reports a failed settings write", () => {
  let value = "";
  vi.stubGlobal("localStorage", {
    getItem: () => value,
    setItem: (_key: string, next: string) => {
      value = next;
    },
  });
  const p = {
    saveToGallery: false,
    cities: ["San Francisco", "Paris", "Beijing"],
  };
  writePreferences(p);
  expect(readPreferences()).toEqual(p);
  vi.stubGlobal("localStorage", {
    setItem: () => {
      throw Error("Storage full");
    },
  });
  expect(() => writePreferences(p)).toThrow("Storage full");
});
it("computes date offsets relative to the selected city, including daylight saving", () => {
  const now = new Date("2026-03-29T23:30:00Z");
  expect(dateDifference(now, "Asia/Tokyo", "Europe/Berlin")).toBe(0);
  expect(dateDifference(now, "Asia/Tokyo", "America/Los_Angeles")).toBe(1);
  const tokyo = availableCities.find((city) => city.en === "Tokyo")!;
  expect(cityClock(now, tokyo, "Asia/Tokyo").difference).toBe(0);
  for (const city of availableCities) {
    const state = cityClock(now, city);
    expect(Number.isFinite(state.sunrise.getTime())).toBe(true);
    expect(Number.isFinite(state.sunset.getTime())).toBe(true);
  }
});
