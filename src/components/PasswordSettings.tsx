import { useState } from "react";
import { LockKeyhole } from "lucide-react";
import type { Language } from "../lib/i18n";
import PasswordForm from "./PasswordForm";

export default function PasswordSettings({ lang }: { lang: Language }) {
  const en = lang === "en";
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <section className="settings-section password-settings">
      <h3>
        <LockKeyhole size={18} />
        {en ? "Unlock password" : "解锁密码"}
      </h3>
      <p className="fineprint">
        {en
          ? "One password for unlocking and new backups, 4–128 characters. Changing it requires the old password. Existing backup files still need the password used when they were created."
          : "应用解锁与新备份使用同一个密码，支持 4–128 位。修改时需验证旧密码；已经导出的备份仍需使用创建时的密码。"}
      </p>
      {editing ? (
        <PasswordForm
          mode="change"
          en={en}
          onCancel={() => setEditing(false)}
          onSuccess={() => {
            setEditing(false);
            setSaved(true);
          }}
        />
      ) : (
        <button
          className="secondary"
          onClick={() => {
            setSaved(false);
            setEditing(true);
          }}
        >
          {en ? "Change password" : "修改密码"}
        </button>
      )}
      {saved && (
        <p role="status">
          {en
            ? "Password changed. Future unlocks and new backups use the new password. Existing backups are unchanged."
            : "密码已修改，后续解锁和新备份使用新密码。已经导出的备份不受影响。"}
        </p>
      )}
    </section>
  );
}
