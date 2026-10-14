"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import type { Language } from "../lib/i18n";

import { changeTheme, type Theme } from "../services/theme";
export default function ThemeToggle({ lang }: { lang: Language }) {
  const [theme, setTheme] = useState<Theme>("light");
  useEffect(() => {
    const sync = () =>
      setTheme(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      );
    sync();
    window.addEventListener("sfo-theme", sync);
    return () => window.removeEventListener("sfo-theme", sync);
  }, []);
  function toggle() {
    changeTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
    );
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
