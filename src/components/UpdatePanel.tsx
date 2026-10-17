import { useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Download } from "lucide-react";
import type { Language } from "../lib/i18n";
import {
  AppUpdater,
  checkForUpdate,
  isDebugApp,
  releasePage,
  type AppUpdate,
  type DownloadState,
  updateError,
} from "../services/updates";

export default function UpdatePanel({ lang }: { lang: Language }) {
  const en = lang === "en";
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [debug, setDebug] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState<DownloadState | null>(null);
  const progressRef = useRef<DownloadState | null>(null);
  const [cancelling, setCancelling] = useState(false);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    let remove: (() => void) | undefined;
    const receive = (state: DownloadState) => {
      if (!active) return;
      progressRef.current = state;
      setProgress(state);
      const downloading = ["connecting", "downloading", "verifying"].includes(
        state.phase,
      );
      setBusy(downloading);
      setDownloaded(state.phase === "ready");
      if (!downloading) setCancelling(false);
      const match = state.url.match(/\/v(\d+\.\d+\.\d+)\//);
      if (match && state.sha256)
        setUpdate({
          version: match[1],
          url: state.url,
          sha256: state.sha256,
          size: state.totalBytes,
          notes: "",
        });
      if (state.phase === "cancelled" || state.phase === "error")
        setMessage(updateError({ code: state.errorCode }, en));
      if (state.phase === "ready")
        setMessage(
          en
            ? "Download verified. Continue to Android installation."
            : "安装包已下载并校验，可继续安装。",
        );
    };
    void AppUpdater.addListener("downloadProgress", receive)
      .then((handle) => {
        if (!active) {
          void handle.remove();
          return;
        }
        remove = () => {
          void handle.remove();
        };
        return AppUpdater.getDownloadState().then(receive);
      })
      .catch(() => {});
    return () => {
      active = false;
      remove?.();
    };
  }, [en]);
  async function check() {
    setBusy(true);
    setMessage("");
    setUpdate(null);
    setDownloaded(false);
    try {
      const testing = await isDebugApp();
      setDebug(testing);
      if (testing) {
        setMessage(
          en
            ? "This is a test build. Export an encrypted backup, install the stable release alongside it, then restore your backup. Future stable releases update in place."
            : "当前为测试版。请导出加密备份，安装可并存的正式版后恢复。以后正式版可覆盖更新。",
        );
        return;
      }
      const next = await checkForUpdate();
      setUpdate(next);
      if (
        next &&
        progressRef.current?.phase === "ready" &&
        progressRef.current.url === next.url &&
        progressRef.current.sha256 === next.sha256
      )
        setDownloaded(true);
      if (!next)
        setMessage(
          en
            ? "No newer stable release is available."
            : "暂时没有更新的正式版本。",
        );
    } catch {
      setMessage(
        en
          ? "Could not check for updates. Check your connection and try again, or open GitHub releases below."
          : "检查更新失败，请检查网络后重试，或打开下方 GitHub 正式版页面。",
      );
    } finally {
      setBusy(false);
    }
  }
  async function install() {
    if (!update) return;
    setBusy(true);
    try {
      if (!downloaded) {
        setMessage(
          en
            ? "Downloading and verifying the APK… Keep the app open."
            : "正在下载并校验安装包…请保持应用打开。",
        );
        await AppUpdater.downloadUpdate({
          url: update.url,
          sha256: update.sha256,
          size: update.size,
        });
        setDownloaded(true);
      }
      const result = await AppUpdater.installUpdate();
      setMessage(
        result.permissionRequired
          ? en
            ? "Allow installation from this app in Android settings, return here, then tap Continue installation."
            : "请在系统设置中允许此应用安装未知应用，返回后点击“继续安装”。"
          : en
            ? "Confirm the update in Android. If you cancel, you can continue installation here."
            : "请在系统安装界面确认更新。取消后可在这里继续安装。",
      );
    } catch (error) {
      setMessage(updateError(error, en));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-section update-section">
      <h3>
        <Download size={19} />
        {en ? "App updates" : "应用更新"}
      </h3>
      <p className="muted">
        {en
          ? "Stable releases from GitHub. Android confirms installation; updates preserve your local records."
          : "从 GitHub 获取正式版本，由 Android 确认安装，覆盖更新保留本地记录。"}
      </p>
      <button
        className="secondary"
        onClick={() => void check()}
        disabled={busy}
      >
        {en ? "Check for updates" : "检查更新"}
      </button>
      {update && (
        <div>
          <p>
            {en ? "New version" : "发现新版本"} {update.version} ·{" "}
            {(update.size / 1024 / 1024).toFixed(1)} MB
          </p>
          {update.notes && <p className="update-notes">{update.notes}</p>}
          {Capacitor.isNativePlatform() && !debug ? (
            <button
              className="primary"
              disabled={busy}
              onClick={() => void install()}
            >
              {downloaded
                ? en
                  ? "Continue installation"
                  : "继续安装"
                : en
                  ? "Download and install"
                  : "下载并安装"}
            </button>
          ) : (
            <a href={update.url} target="_blank" rel="noopener noreferrer">
              {en ? "Download APK" : "下载 APK"}
            </a>
          )}
        </div>
      )}
      {progress &&
        ["connecting", "downloading", "verifying"].includes(progress.phase) && (
          <div aria-live="polite">
            <progress
              className="update-progress"
              max={progress.totalBytes || undefined}
              value={progress.totalBytes ? progress.downloadedBytes : undefined}
            />
            <p>
              {progress.phase === "connecting"
                ? en
                  ? "Connecting…"
                  : "正在连接…"
                : progress.phase === "verifying"
                  ? en
                    ? "Verifying package…"
                    : "正在校验安装包…"
                  : `${progress.totalBytes ? Math.min(100, Math.round((progress.downloadedBytes / progress.totalBytes) * 100)) + "% · " : ""}${(progress.downloadedBytes / 1024 / 1024).toFixed(1)} / ${(progress.totalBytes / 1024 / 1024).toFixed(1)} MB`}
            </p>
            <button
              className="secondary"
              disabled={cancelling}
              onClick={async () => {
                setCancelling(true);
                try {
                  await AppUpdater.cancelDownload();
                } catch (e) {
                  setCancelling(false);
                  setMessage(updateError(e, en));
                }
              }}
            >
              {cancelling
                ? en
                  ? "Cancelling…"
                  : "正在取消…"
                : en
                  ? "Cancel download"
                  : "取消下载"}
            </button>
          </div>
        )}
      {message && <p role="status">{message}</p>}
      <a href={releasePage} target="_blank" rel="noopener noreferrer">
        {en ? "GitHub releases" : "查看 GitHub 正式版"}
      </a>
    </section>
  );
}
