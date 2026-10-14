import { useEffect, useRef, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import type { Language } from "../lib/i18n";
import { saveWelcomeChoice, shouldShowWelcome } from "../services/welcome";

export default function WelcomePanel({
  lang,
  onClose,
}: {
  lang: Language;
  onClose: () => void;
}) {
  const en = lang === "en";
  const panel = useRef<HTMLElement>(null);
  const [skip, setSkip] = useState(() => !shouldShowWelcome());
  const [error, setError] = useState(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  const start = () => {
    try {
      saveWelcomeChoice(skip);
      onClose();
    } catch {
      setError(true);
    }
  };
  return (
    <div className="overlay" onClick={onClose}>
      <section
        ref={panel}
        className="modal settings-panel welcome-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const fields = Array.from(
            panel.current!.querySelectorAll<HTMLElement>(
              "button:not(:disabled), input:not(:disabled), a[href]",
            ),
          );
          const first = fields[0],
            last = fields.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <div className="settings-content welcome-content">
          <div className="row between">
            <h2 id="welcome-title">
              {en ? "Welcome to Bay Companion" : "欢迎使用「湾区随行」"}
            </h2>
            <button
              className="iconbutton"
              onClick={onClose}
              aria-label={en ? "Close introduction" : "关闭应用说明"}
            >
              <X size={20} />
            </button>
          </div>
          <p>
            {en
              ? "A free, open-source travel companion for expenses and receipts, currency conversion and tips, San Francisco weather, places and conference information."
              : "这是一款免费开源的差旅助手，帮助你记录支出和凭证、换算汇率与小费、查看旧金山天气、景点和会议资讯。"}
          </p>
          <h3>
            {en ? "Your data stays on your phone" : "数据保存在你的手机上"}
          </h3>
          <p>
            {en
              ? "Expenses, favorites and receipts are stored in the app’s private storage by default, without being uploaded to GitHub or our servers. If you enable gallery saving, photos are also copied to your system gallery and may be synced by your gallery’s cloud settings."
              : "账目、收藏和凭证默认保存在应用的私有存储空间，不上传到 GitHub 或我们的服务器。开启“保存到相册”后，照片会额外存入系统相册，可能受相册云同步设置影响。"}
          </p>
          <p>
            {en
              ? "Weather, exchange rates and conference information use public online sources. Uninstalling the app or clearing its data deletes local records. Please export encrypted backups regularly."
              : "天气、汇率和会议资讯会联网获取公开数据。卸载或清除应用数据会删除本地记录，请定期导出加密备份。"}
          </p>
          <h3>{en ? "Free & open source" : "免费与开源"}</h3>
          <p>
            {en
              ? "App code is licensed under MIT. Third-party images, content and dependencies retain their original rights."
              : "应用代码采用 MIT 许可证；第三方图片、资料和依赖保留原有权利。"}
          </p>
          <a
            className="welcome-repository"
            href="https://github.com/HeathHuang-7243/SFO-TRAVEL-APP"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>
              {en ? "Repository" : "仓库"} <ExternalLink size={14} />
            </span>
            github.com/HeathHuang-7243/SFO-TRAVEL-APP
          </a>
          {error && (
            <p role="alert">
              {en
                ? "Could not save your choice. Please retry, or close this introduction for now."
                : "未能保存你的选择，请重试，或先关闭这份说明。"}
            </p>
          )}
        </div>
        <footer className="settings-footer welcome-footer">
          <label className="welcome-choice">
            <input
              type="checkbox"
              checked={skip}
              onChange={(event) => setSkip(event.target.checked)}
            />
            {en ? "Don’t show again" : "不再显示"}
          </label>
          <button
            className="primary welcome-start"
            type="button"
            onClick={start}
          >
            {en ? "Start using the app" : "开始使用"}
          </button>
        </footer>
      </section>
    </div>
  );
}
