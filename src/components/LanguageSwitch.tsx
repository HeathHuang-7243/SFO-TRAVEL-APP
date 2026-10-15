import { useLanguage } from "./LanguageProvider";

export default function LanguageSwitch() {
  const { lang, setLang } = useLanguage();
  return (
    <div className="language-switch" role="group" aria-label="语言 / Language">
      <button
        type="button"
        lang="zh-CN"
        aria-pressed={lang === "zh"}
        onClick={() => setLang("zh")}
      >
        中文
      </button>
      <button
        type="button"
        lang="en"
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
      >
        English
      </button>
    </div>
  );
}
