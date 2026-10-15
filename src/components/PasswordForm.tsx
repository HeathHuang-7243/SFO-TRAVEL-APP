import { useState, type FormEvent } from "react";
import { accessLock, accessMessage } from "../services/access-lock";

export default function PasswordForm({
  mode,
  en,
  onSuccess,
  onCancel,
}: {
  mode: "setup" | "unlock" | "change";
  en: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
}) {
  const [password, setPassword] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (mode !== "unlock" && next !== repeat) {
      setError(en ? "The passwords do not match." : "两次输入的密码不一致。");
      return;
    }
    setBusy(true);
    try {
      if (mode === "setup") await accessLock.setup(next);
      else if (mode === "unlock") await accessLock.unlock(password);
      else await accessLock.change(password, next);
      setPassword("");
      setNext("");
      setRepeat("");
      onSuccess();
    } catch (failure) {
      setError(accessMessage(failure, en));
      setPassword("");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="access-form"
      data-access-mode={mode}
      onSubmit={(event) => void submit(event)}
    >
      <fieldset disabled={busy}>
        {mode !== "setup" && (
          <label className="label">
            {mode === "change"
              ? en
                ? "Current password"
                : "当前密码"
              : en
                ? "Password"
                : "密码"}
            <input
              id="access-current-password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={128}
              required
            />
          </label>
        )}
        {mode !== "unlock" && (
          <>
            <label className="label">
              {mode === "setup"
                ? en
                  ? "Set password"
                  : "设置密码"
                : en
                  ? "New password"
                  : "新密码"}
              <input
                id="access-new-password"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                minLength={4}
                maxLength={128}
                required
              />
            </label>
            <label className="label">
              {mode === "setup"
                ? en
                  ? "Repeat password"
                  : "再次输入密码"
                : en
                  ? "Repeat new password"
                  : "再次输入新密码"}
              <input
                id="access-repeat-password"
                type={visible ? "text" : "password"}
                autoComplete="new-password"
                value={repeat}
                onChange={(e) => setRepeat(e.target.value)}
                minLength={4}
                maxLength={128}
                required
              />
            </label>
            <p className="fineprint">
              {en
                ? "Use 4–128 characters. This password also encrypts new backups. Keep it safe; it cannot be recovered online."
                : "请设置 4–128 个字符的密码，同时用于应用解锁和新备份加密。请妥善保管，无法在线找回。"}
            </p>
          </>
        )}
        <label className="access-show">
          <input
            type="checkbox"
            checked={visible}
            onChange={(e) => setVisible(e.target.checked)}
          />
          {en ? "Show password" : "显示密码"}
        </label>
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        <button className="primary" type="submit">
          {busy
            ? en
              ? "Verifying…"
              : "正在验证…"
            : mode === "setup"
              ? en
                ? "Set password and continue"
                : "设置密码并继续"
              : mode === "unlock"
                ? en
                  ? "Unlock and continue"
                  : "解锁并继续"
                : en
                  ? "Save new password"
                  : "保存新密码"}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            {en ? "Cancel" : "取消"}
          </button>
        )}
      </fieldset>
    </form>
  );
}
