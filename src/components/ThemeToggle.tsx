"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import type { Language } from "../lib/i18n";

type Theme = "light" | "dark";
const key = "bay-theme";
export default function ThemeToggle({ lang }: { lang: Language }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(key);
      } catch {}
      const next: Theme =
        saved === "light" || saved === "dark"
          ? saved
          : media.matches
            ? "dark"
            : "light";
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    const storage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) sync();
    };
    sync();
    media.addEventListener("change", sync);
    window.addEventListener("storage", storage);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", storage);
    };
  }, []);
  function toggle() {
    const next: Theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(key, next);
    } catch {}
  }
  const label =
    theme === "dark"
      ? lang === "en"
        ? "Switch to light mode"
        : "切换到浅色模式"
      : lang === "en"
        ? "Switch to dark mode"
        : "切换到深色模式";
  return (
    <button
      type="button"
      className="theme-switch"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={theme === "dark"}
    >
      <Moon className="theme-moon" size={16} />
      <Sun className="theme-sun" size={16} />
    </button>
  );
}
