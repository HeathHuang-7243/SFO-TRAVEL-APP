import { useEffect, useState } from "react";
import { getRepository } from "../storage/repository";
import { encryptBackup, decryptBackup } from "../services/backup";
import { exportFile } from "../services/device";
import type { Language } from "../lib/i18n";
export default function BackupPanel({
  lang,
  onClose,
  onRestore,
}: {
  lang: Language;
  onClose: () => void;
  onRestore: () => void;
}) {
  const say = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [password, setPassword] = useState(""),
    [repeat, setRepeat] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [file, setFile] = useState<File | null>(null);
  useEffect(() => {
    const back = () => {
      if (!busy) onClose();
    };
    window.addEventListener("sfo-backup-back", back);
    return () => window.removeEventListener("sfo-backup-back", back);
  }, [busy, onClose]);
  async function run(job: () => Promise<string>) {
    setBusy(true);
    setMessage("");
    try {
      setMessage(await job());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="overlay" onClick={() => !busy && onClose()}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={say("本地数据与备份", "Local data & backup")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="section-head">
          <h2>{say("本地数据与备份", "Local data & backup")}</h2>
          <button className="secondary" disabled={busy} onClick={onClose}>
            {say("关闭", "Close")}
          </button>
        </div>
        <p>
          {say(
            "账目、收藏与凭证仅保存在本机，不上传到 GitHub 或原网站。卸载应用或清除数据会删除这些内容，请定期导出备份。",
            "Expenses, favorites and receipts stay on this device. Nothing is uploaded to GitHub or the original website. Uninstalling or clearing app data deletes these records. Export backups regularly.",
          )}
        </p>
        <label className="label">
          {say("备份密码（至少 8 位）", "Backup password (8+ characters)")}
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="label">
          {say("导出时再次输入密码", "Confirm password for export")}
          <input
            type="password"
            autoComplete="new-password"
            value={repeat}
            disabled={busy}
            onChange={(e) => setRepeat(e.target.value)}
          />
        </label>
        <button
          className="primary full"
          disabled={busy || password.length < 8 || password !== repeat}
          onClick={() =>
            run(async () => {
              const text = await encryptBackup(
                await (await getRepository()).backup(),
                password,
              );
              await exportFile(
                "sfo-travel-" +
                  new Date().toISOString().slice(0, 10) +
                  ".sfo-backup.json",
                text,
              );
              return say(
                "备份已交给保存/分享界面，请确认已保存到应用之外。",
                "Backup handed to the save/share dialog. Confirm it was saved outside the app.",
              );
            })
          }
        >
          {say("导出加密完整备份", "Export encrypted full backup")}
        </button>
        <p className="fineprint">
          {say(
            "密码无法找回。备份包含凭证照片，但不包含天气等可重新获取的公共缓存。单次备份上限为 70 MB。",
            "The password cannot be recovered. Receipts are included; replaceable public caches are not. Maximum backup payload: 70 MB.",
          )}
        </p>
        <label className="label">
          {say("选择本应用的备份文件", "Choose an app backup")}
          <input
            type="file"
            accept=".json,.sfo-backup,application/json,application/octet-stream"
            disabled={busy}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <button
          className="secondary full"
          disabled={busy || !file || password.length < 8}
          onClick={() =>
            run(async () => {
              if (!file || file.size > 100 * 1024 * 1024)
                throw Error(say("文件超过 100 MB", "File exceeds 100 MB"));
              const backup = await decryptBackup(await file.text(), password);
              const result = await (await getRepository()).restore(backup);
              onRestore();
              return say(
                `恢复完成：新增 ${result.added} 笔，跳过 ${result.skipped} 笔已有记录。`,
                `Restored ${result.added} expenses; skipped ${result.skipped} existing records.`,
              );
            })
          }
        >
          {say(
            "合并恢复，保留已有记录",
            "Merge restore, keep existing records",
          )}
        </button>
        <p className="fineprint">
          {say(
            "重复恢复不会复制已有账目。此格式用于安卓应用备份，尚不支持原网站账目导入。",
            "Repeated restores do not duplicate expenses. This format is for app backups; website record import is not supported yet.",
          )}
        </p>
        {(busy || message) && (
          <p role="status" className="notice">
            {busy
              ? say("正在处理，请保持应用打开…", "Working, keep the app open…")
              : message}
          </p>
        )}
        <p className="fineprint">
          SFO Travel v{__APP_VERSION__} ·{" "}
          <a
            href="https://github.com/HeathHuang-7243/SFO-TRAVEL-APP/releases"
            target="_blank"
            rel="noreferrer"
          >
            {say("版本与下载", "Releases & downloads")}
          </a>
        </p>
      </section>
    </div>
  );
}
