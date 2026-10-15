import { availableCities, clockCities } from "../lib/city-clocks";

export type Preferences = { saveToGallery: boolean; cities: string[] };
export const defaultPreferences: Preferences = {
  saveToGallery: true,
  cities: clockCities.map((city) => city.en),
};
const key = "sfo-preferences:v1";
export function readPreferences(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(key) || "null");
    return {
      saveToGallery:
        typeof p?.saveToGallery === "boolean"
          ? p.saveToGallery
          : defaultPreferences.saveToGallery,
      cities: defaultPreferences.cities.map((fallback, index) =>
        availableCities.some((city) => city.en === p?.cities?.[index])
          ? p.cities[index]
          : fallback,
      ),
    };
  } catch {
    return { ...defaultPreferences, cities: [...defaultPreferences.cities] };
  }
}
export function writePreferences(value: Preferences) {
  // Do not claim a setting is saved if local storage is unavailable.
  localStorage.setItem(key, JSON.stringify(value));
}
