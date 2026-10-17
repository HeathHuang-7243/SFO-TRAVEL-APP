import { getDriver } from "../storage/driver";

export type BackupStatusData = {
  generatedAt?: string;
  savedAt?: string;
  reminders: boolean;
  dismissedAt?: string;
};
const key = "backup-status:v1";
let queue: Promise<unknown> = Promise.resolve();
export async function readBackupStatus(): Promise<BackupStatusData> {
  const raw = await (await getDriver()).get(key);
  if (!raw) return { reminders: true };
  const value = JSON.parse(raw);
  return {
    generatedAt: value.generatedAt,
    savedAt: value.savedAt,
    reminders: value.reminders !== false,
    dismissedAt: value.dismissedAt,
  };
}
export function updateBackupStatus(patch: Partial<BackupStatusData>) {
  const job = queue.then(async () => {
    const value = { ...(await readBackupStatus()), ...patch };
    await (await getDriver()).set(key, JSON.stringify(value));
    window.dispatchEvent(new Event("sfo-backup-status"));
    return value;
  });
  queue = job.catch(() => {});
  return job;
}
export function backupDue(value: BackupStatusData, now = Date.now()) {
  const last = Math.max(
    Date.parse(value.savedAt || "") || 0,
    Date.parse(value.dismissedAt || "") || 0,
  );
  return value.reminders && now - last > 7 * 86400000;
}
