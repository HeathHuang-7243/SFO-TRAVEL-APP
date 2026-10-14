import { syncSystemTheme } from "./native-device";
export type Theme = "light" | "dark";
const key = "bay-theme";

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.dispatchEvent(new Event("sfo-theme"));
  void syncSystemTheme(theme === "dark").catch((error) =>
    console.error("System bar theme could not be updated", error),
  );
}
export function changeTheme(theme: Theme) {
  localStorage.setItem(key, theme);
  apply(theme);
}
export function startThemeSync() {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const sync = () => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(key);
    } catch {}
    apply(
      saved === "light" || saved === "dark"
        ? saved
        : media.matches
          ? "dark"
          : "light",
    );
  };
  const storage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) sync();
  };
  sync();
  media.addEventListener("change", sync);
  window.addEventListener("storage", storage);
  return () => {
    media.removeEventListener("change", sync);
    window.removeEventListener("storage", storage);
  };
}
