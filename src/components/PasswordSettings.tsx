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
          ? "Required after app updates. Incorrect passwords keep the app locked and never delete your records."
          : "应用更新后需要输入密码。输错密码只会保持锁定，不会删除记录。"}
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
            ? "Password changed. Use the new password after future updates."
            : "密码已修改，下次更新后请使用新密码。"}
        </p>
      )}
    </section>
  );
}
