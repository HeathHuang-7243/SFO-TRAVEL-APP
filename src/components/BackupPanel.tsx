import { useEffect, useState } from "react";
import { getRepository } from "../storage/repository";
import { encryptBackup, decryptBackup } from "../services/backup";
import {
  accessLock,
  accessMessage,
  AccessError,
} from "../services/access-lock";
import { exportFile } from "../services/device";
import type { Language } from "../lib/i18n";
import PasswordKeyboardChoice from "./PasswordKeyboardChoice";
import BackupStatus from "./BackupStatus";
import { updateBackupStatus } from "../services/backup-status";
import { Capacitor } from "@capacitor/core";
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
  const [textKeyboard, setTextKeyboard] = useState(false);
  const [password, setPassword] = useState(""),
    [needsPassword, setNeedsPassword] = useState(
      () => !accessLock.hasSessionPassword(),
    ),
    [useHistorical, setUseHistorical] = useState(false),
    [historicalPassword, setHistoricalPassword] = useState(""),
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
  async function currentPassword() {
    const value = await accessLock.backupPassword(
      needsPassword ? password : undefined,
    );
    setNeedsPassword(false);
    setPassword("");
    return value;
  }
  const canVerify =
    !needsPassword || (password.length >= 4 && password.length <= 128);
  async function run(job: () => Promise<string>) {
    setBusy(true);
    setMessage("");
    try {
      setMessage(await job());
    } catch (e) {
      setMessage(
        e instanceof AccessError
          ? accessMessage(e, lang === "en")
          : e instanceof Error
            ? e.message
            : String(e),
      );
    } finally {
      setNeedsPassword(!accessLock.hasSessionPassword());
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
        <p>
          {say(
            "备份自动使用你的应用解锁密码，无需另外设置。",
            "Backups use your app unlock password. No separate password is needed.",
          )}
        </p>
        <BackupStatus en={lang === "en"} />
        {(needsPassword || useHistorical) && (
          <PasswordKeyboardChoice
            en={lang === "en"}
            textKeyboard={textKeyboard}
            onChange={setTextKeyboard}
            disabled={busy}
          />
        )}
        {needsPassword && (
          <label className="label">
            {say("验证应用密码", "Verify app password")}
            <input
              type="password"
              inputMode={textKeyboard ? "text" : "numeric"}
              autoComplete="current-password"
              minLength={4}
              maxLength={128}
              value={password}
              disabled={busy}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="fineprint">
              {say(
                "本次打开尚未输入密码，备份前验证一次即可。",
                "Confirm your existing password once for backups in this session.",
              )}
            </span>
          </label>
        )}
        <button
          className="primary full"
          disabled={busy || !canVerify}
          onClick={() =>
            run(async () => {
              const verifiedPassword = await currentPassword();
              const text = await encryptBackup(
                await (await getRepository()).backup(),
                verifiedPassword,
              );
              await updateBackupStatus({
                generatedAt: new Date().toISOString(),
              });
              const result = await exportFile(
                "sfo-travel-" +
                  new Date().toISOString().slice(0, 10) +
                  ".sfo-backup.json",
                text,
                "application/json",
                true,
              );
              if (result.saved) {
                await updateBackupStatus({ savedAt: new Date().toISOString() });
                return say(
                  "加密备份已保存到你选择的位置。",
                  "Encrypted backup saved to your chosen location.",
                );
              }
              return Capacitor.getPlatform() === "android"
                ? say(
                    "已取消保存；备份已生成，但尚未确认保存到应用外。",
                    "Saving cancelled. A backup was generated but was not saved outside the app.",
                  )
                : say(
                    "已请求浏览器下载，请确认文件已保存；这不代表已确认保存到应用外。",
                    "Browser download requested. Check that the file was saved; this does not confirm an external backup.",
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
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setHistoricalPassword("");
              setMessage("");
            }}
          />
        </label>
        <label className="access-show">
          <input
            type="checkbox"
            checked={useHistorical}
            disabled={busy}
            onChange={(e) => {
              setUseHistorical(e.target.checked);
              setHistoricalPassword("");
              setMessage("");
            }}
          />
          {say("使用旧备份的密码", "Use the password of an older backup")}
        </label>
        {useHistorical && (
          <label className="label">
            {say("旧备份密码", "Older backup password")}
            <input
              type="password"
              inputMode={textKeyboard ? "text" : "numeric"}
              autoComplete="off"
              value={historicalPassword}
              disabled={busy}
              onChange={(e) => setHistoricalPassword(e.target.value)}
            />
          </label>
        )}
        <p className="fineprint">
          {say(
            "默认使用当前应用密码恢复。修改密码之前或旧版本导出的备份，需要使用创建时的密码；此选项不会修改应用密码。",
            "Restore with your current app password by default. Backups made before a password change or in older versions need their original password; this option does not change your app password.",
          )}
        </p>
        <button
          className="secondary full"
          disabled={
            busy || !file || (useHistorical ? !historicalPassword : !canVerify)
          }
          onClick={() =>
            run(async () => {
              if (!file || file.size > 100 * 1024 * 1024)
                throw Error(say("文件超过 100 MB", "File exceeds 100 MB"));
              const restorePassword = useHistorical
                ? historicalPassword
                : await currentPassword();
              const backup = await decryptBackup(
                await file.text(),
                restorePassword,
              ).catch((error: Error) => {
                if (useHistorical) throw error;
                throw Error(
                  say(
                    "当前应用密码无法打开此备份，或文件已损坏。如果是旧备份，请选择“使用旧备份的密码”。",
                    "The current app password could not open this backup, or the file is damaged. For an older backup, choose its original password below.",
                  ),
                );
              });
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
