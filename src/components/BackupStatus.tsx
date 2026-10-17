import { useEffect, useState } from "react";
import {
  readBackupStatus,
  updateBackupStatus,
  backupDue,
  type BackupStatusData,
} from "../services/backup-status";

export default function BackupStatus({
  en,
  reminder = false,
  onBackup,
}: {
  en: boolean;
  reminder?: boolean;
  onBackup?: () => void;
}) {
  const [value, setValue] = useState<BackupStatusData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const read = () => {
      void readBackupStatus()
        .then((v) => {
          if (active) setValue(v);
        })
        .catch(() => {
          if (active)
            setError(en ? "Could not read backup status" : "无法读取备份状态");
        });
    };
    read();
    window.addEventListener("sfo-backup-status", read);
    return () => {
      active = false;
      window.removeEventListener("sfo-backup-status", read);
    };
  }, [en]);
  async function change(patch: Partial<BackupStatusData>) {
    try {
      setValue(await updateBackupStatus(patch));
      setError("");
    } catch {
      setError(en ? "Could not save the reminder setting" : "提醒设置未能保存");
    }
  }
  const time = (date?: string) =>
    date && Number.isFinite(Date.parse(date))
      ? new Date(date).toLocaleString(en ? "en-GB" : "zh-CN")
      : en
        ? "None yet"
        : "暂无";
  if (reminder)
    return value && backupDue(value) ? (
      <aside className="backup-reminder">
        <div>
          <strong>
            {en ? "Keep a separate backup" : "为这段旅程留一份备份"}
          </strong>
          <p>
            {value.savedAt
              ? (en ? "Last saved: " : "最近保存：") + time(value.savedAt)
              : en
                ? "No backup has been confirmed outside the app yet."
                : "还没有确认保存到应用之外的备份。"}
          </p>
        </div>
        <button className="secondary" onClick={onBackup}>
          {en ? "Back up" : "去备份"}
        </button>
        <button
          className="text-link"
          onClick={() => void change({ dismissedAt: new Date().toISOString() })}
        >
          {en ? "Remind me in 7 days" : "7 天后提醒"}
        </button>
        {error && <p role="alert">{error}</p>}
      </aside>
    ) : null;
  return (
    <div className="backup-status">
      <p>
        {en ? "Last generated: " : "最近生成："}
        {time(value?.generatedAt)}
      </p>
      <p>
        {en ? "Last saved outside the app: " : "最近确认保存到应用外："}
        {time(value?.savedAt)}
      </p>
      <label className="access-show">
        <input
          type="checkbox"
          checked={value?.reminders ?? true}
          disabled={!value}
          onChange={(e) => void change({ reminders: e.target.checked })}
        />
        {en ? "Remind me to back up every 7 days" : "每 7 天提醒备份"}
      </label>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
