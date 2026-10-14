import { subscribeToSystemTheme, syncSystemTheme } from "./native-device";
export type Theme = "light" | "dark";
export type ThemePreference = Theme | "auto";
const key = "bay-theme";
let nativeDark: boolean | null = null;

export function getThemePreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(key);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "auto";
}

function apply(preference: ThemePreference) {
  const systemDark =
    nativeDark ?? window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme =
    preference === "auto" ? (systemDark ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  window.dispatchEvent(new Event("sfo-theme"));
  void syncSystemTheme(theme === "dark", preference).catch((error) =>
    console.error("System bar theme could not be updated", error),
  );
}
export function changeTheme(theme: ThemePreference) {
  localStorage.setItem(key, theme);
  apply(theme);
}
export function startThemeSync() {
  nativeDark = null;
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => apply(getThemePreference());
  const storage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) sync();
  };
  sync();
  media.addEventListener("change", sync);
  window.addEventListener("storage", storage);
  const stopNative = subscribeToSystemTheme((dark) => {
    nativeDark = dark;
    sync();
  });
  return () => {
    stopNative();
    media.removeEventListener("change", sync);
    window.removeEventListener("storage", storage);
  };
}
