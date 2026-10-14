import { useEffect, useState } from "react";
import type { Language } from "../lib/i18n";
import {
  changeTheme,
  getThemePreference,
  type ThemePreference,
} from "../services/theme";
const modes = ["light", "dark", "auto"] as const;

export default function ThemeToggle({ lang }: { lang: Language }) {
  const [theme, setTheme] = useState<ThemePreference>(getThemePreference);
  const [error, setError] = useState(false);
  const en = lang === "en";
  const choose = (mode: ThemePreference) => {
    try {
      changeTheme(mode);
      setError(false);
    } catch {
      setError(true);
    }
  };
  useEffect(() => {
    const sync = () => setTheme(getThemePreference());
    window.addEventListener("sfo-theme", sync);
    return () => window.removeEventListener("sfo-theme", sync);
  }, []);
  return (
    <div>
      <div
        className="theme-options"
        role="radiogroup"
        aria-label={en ? "Display mode" : "显示模式"}
      >
        {modes.map((mode, index) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={theme === mode}
            tabIndex={theme === mode ? 0 : -1}
            data-theme-mode={mode}
            onClick={() => choose(mode)}
            onKeyDown={(event) => {
              const step = ["ArrowRight", "ArrowDown"].includes(event.key)
                ? 1
                : ["ArrowLeft", "ArrowUp"].includes(event.key)
                  ? -1
                  : 0;
              if (!step) return;
              event.preventDefault();
              const next = modes[(index + step + modes.length) % modes.length];
              choose(next);
              event.currentTarget.parentElement
                ?.querySelector<HTMLButtonElement>(
                  `[data-theme-mode="${next}"]`,
                )
                ?.focus();
            }}
          >
            {mode === "light"
              ? en
                ? "Light"
                : "浅色"
              : mode === "dark"
                ? en
                  ? "Dark"
                  : "深色"
                : en
                  ? "Auto"
                  : "自动"}
          </button>
        ))}
      </div>
      <p className="fineprint theme-help">
        {en
          ? "Auto follows your phone’s display mode, including its scheduled dark mode."
          : "自动模式跟随手机系统的深浅色设置，包括系统设定的定时切换。"}
      </p>
      {error && (
        <p role="alert">
          {en
            ? "Could not save display mode. Please try again."
            : "显示模式未能保存，请重试。"}
        </p>
      )}
    </div>
  );
}
