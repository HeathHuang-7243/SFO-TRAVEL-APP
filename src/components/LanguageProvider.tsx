import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Language } from "../lib/i18n";

const LanguageContext = createContext<{
  lang: Language;
  setLang: (lang: Language) => void;
} | null>(null);
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, updateLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("bay-language");
      if (saved === "zh" || saved === "en") return saved;
    } catch {}
    return navigator.language.startsWith("zh") ? "zh" : "en";
  });
  const setLang = useCallback((next: Language) => {
    // Persist at selection time, before the next startup screen can mount.
    try {
      localStorage.setItem("bay-language", next);
    } catch {}
    updateLanguage(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
  }, [lang]);
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw Error("LanguageProvider is required");
  return context;
}
