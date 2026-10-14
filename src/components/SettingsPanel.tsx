import { useEffect, useRef, useState } from "react";
import { X, ImagePlus, MapPin, Palette, ShieldCheck } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import type { Language } from "../lib/i18n";
import { availableCities } from "../lib/city-clocks";
import type { Preferences } from "../services/preferences";
import ThemeToggle from "./ThemeToggle";

export default function SettingsPanel({
  lang,
  preferences,
  onChange,
  onLanguage,
  onBackup,
  onClose,
}: {
  lang: Language;
  preferences: Preferences;
  onChange: (p: Preferences) => void;
  onLanguage: (lang: Language) => void;
  onBackup: () => void;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const [error, setError] = useState("");
  const en = lang === "en";
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.body.style.overflow = scroll;
      previous?.focus();
    };
  }, []);
  const change = (next: Preferences) => {
    try {
      onChange(next);
      setError("");
    } catch {
      setError(
        en
          ? "Could not save settings. Please try again."
          : "设置未能保存，请重试。",
      );
    }
  };
  return (
    <div className="overlay" onClick={onClose}>
      <section
        ref={panel}
        className="modal settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          const fields = Array.from(
            panel.current!.querySelectorAll<HTMLElement>(
              "button, select, input:not(:disabled), a[href]",
            ),
          );
          const first = fields[0],
            last = fields.at(-1);
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="row between">
          <div>
            <span className="eyebrow">ON YOUR DEVICE</span>
            <h2 id="settings-title">{en ? "Settings" : "设置中心"}</h2>
          </div>
          <button
            className="iconbutton"
            onClick={onClose}
            aria-label={en ? "Close settings" : "关闭设置"}
          >
            <X />
          </button>
        </div>
        <section className="settings-section">
          <h3>
            <ImagePlus size={18} />
            {en ? "Receipt photos" : "凭证照片"}
          </h3>
          <label className="settings-switch">
            <span>
              {en
                ? "Also save receipt photos to gallery"
                : "记录支出时同时保存到相册"}
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={preferences.saveToGallery}
              onChange={(e) =>
                change({ ...preferences, saveToGallery: e.target.checked })
              }
            />
          </label>
          <p className="fineprint">
            {en
              ? "After an expense is saved, copy its photo to Pictures / SFO Travel. Your private receipt stays in the app. Deleting an expense does not delete its gallery copy."
              : "账目保存成功后，将凭证另存到相册的 SFO Travel 文件夹。应用内仍保留凭证；删除账目不会删除相册中的副本。"}
          </p>
          <p className="fineprint">
            {en
              ? "Android 10+ does not require access to your photo library to add a photo. Older Android versions ask for storage permission when saving. Declining keeps your expense and private receipt safe."
              : "Android 10 及以上无需读取相册权限即可添加照片；旧版安卓会在保存时请求存储权限。拒绝授权不影响账目和应用内凭证。"}
          </p>
          {Capacitor.getPlatform() !== "android" && (
            <p className="notice">
              {en
                ? "Gallery copying is available in the Android app. This preview only saves your preference."
                : "相册保存仅在安卓应用中生效，当前预览只保存设置。"}
            </p>
          )}
        </section>
        <section className="settings-section">
          <h3>
            <MapPin size={18} />
            {en ? "World clocks" : "时钟城市"}
          </h3>
          <p className="fineprint">
            {en
              ? "Choose the three cities shown at the top. Date offsets are relative to the second city."
              : "选择顶部显示的三个城市，日期差以第二个城市为基准。"}
          </p>
          {preferences.cities.map((city, index) => (
            <label className="label" key={index}>
              {en ? `Clock city ${index + 1}` : `时钟城市 ${index + 1}`}
              <select
                value={city}
                onChange={(e) =>
                  change({
                    ...preferences,
                    cities: preferences.cities.map((value, i) =>
                      i === index ? e.target.value : value,
                    ),
                  })
                }
              >
                {availableCities.map((c) => (
                  <option key={c.en} value={c.en}>
                    {c[lang]}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </section>
        <section className="settings-section">
          <h3>
            <Palette size={18} />
            {en ? "Appearance & language" : "外观与语言"}
          </h3>
          <div className="row between">
            <span>{en ? "Light / dark mode" : "浅色 / 深色模式"}</span>
            <ThemeToggle lang={lang} />
          </div>
          <label className="label">
            {en ? "Language" : "语言"}
            <select
              value={lang}
              onChange={(e) => onLanguage(e.target.value as Language)}
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </label>
        </section>
        <section className="settings-section">
          <h3>
            <ShieldCheck size={18} />
            {en ? "Local data" : "本地数据"}
          </h3>
          <button className="secondary" onClick={onBackup}>
            {en ? "Backup & restore" : "本地备份"}
          </button>
          <p className="fineprint">
            {en
              ? "Settings stay on this device. Encrypted backups contain your expenses, private receipt photos and favorites."
              : "设置保存在本机。加密备份包含账目、应用内凭证和收藏。"}
          </p>
        </section>
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        <p className="fineprint">
          {en ? "Version" : "版本"} {__APP_VERSION__}
        </p>
      </section>
    </div>
  );
}
