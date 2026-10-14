import { useEffect, useState, type ReactNode } from "react";
import { LockKeyhole } from "lucide-react";
import {
  accessLock,
  accessMessage,
  type AccessState,
} from "../services/access-lock";
import PasswordForm from "./PasswordForm";

export default function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AccessState | "loading" | "error">(
    "loading",
  );
  const [error, setError] = useState("");
  const [en] = useState(() => {
    try {
      const saved = localStorage.getItem("bay-language");
      if (saved) return saved === "en";
    } catch {}
    return !navigator.language.startsWith("zh");
  });
  async function load() {
    setState("loading");
    try {
      setState(await accessLock.state());
    } catch (failure) {
      setError(accessMessage(failure, en));
      setState("error");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  if (state === "unlocked") return children;
  return (
    <div className="access-screen">
      <main className="access-card">
        <LockKeyhole className="access-icon" size={28} aria-hidden="true" />
        <span className="eyebrow">
          {en ? "BAY COMPANION · ON YOUR DEVICE" : "湾区随行 · 本机保护"}
        </span>
        <h1>
          {state === "setup"
            ? en
              ? "Set an unlock password"
              : "设置解锁密码"
            : state === "locked"
              ? en
                ? "Enter your password to continue"
                : "输入密码继续使用"
              : en
                ? "Opening local app"
                : "正在打开本机应用"}
        </h1>
        {(state === "setup" || state === "locked") && (
          <>
            <p>
              {state === "setup"
                ? en
                  ? "Set this once, then enter it after an app update. Your existing records stay on this device; no re-import is needed."
                  : "首次设置一次，应用更新后输入此密码即可继续使用。已有记录会保留在本机，无需重新导入。"
                : en
                  ? "The app has been updated. Unlock to continue; your records are still on this device."
                  : "应用已更新，请解锁后继续使用。你的记录仍保存在本机。"}
            </p>
            <PasswordForm
              mode={state === "setup" ? "setup" : "unlock"}
              en={en}
              onSuccess={() => void load()}
            />
            <p className="fineprint">
              {en
                ? "Incorrect or unanswered passwords never delete your records. Uninstalling or clearing app data can delete them; keep a separate backup."
                : "输错或暂不输入密码不会删除记录。卸载或清除应用数据会丢失本地记录，请另行保留备份。"}
            </p>
            {state === "locked" && (
              <details className="access-help">
                <summary>{en ? "Forgot your password?" : "忘记密码？"}</summary>
                <p>
                  {en
                    ? "There is no online password recovery. Keep the app and its data while trying to recall it. If you have an encrypted backup, you can restore it on another device using that backup’s password."
                    : "无法在线找回密码。请保留应用和数据，不要卸载或清除数据。如果已有加密备份，可在其他设备使用备份密码恢复。"}
                </p>
              </details>
            )}
          </>
        )}
        {state === "loading" && (
          <p role="status">
            {en ? "Checking local password settings…" : "正在读取本机密码设置…"}
          </p>
        )}
        {state === "error" && (
          <>
            <p role="alert">{error}</p>
            <button className="primary" onClick={() => void load()}>
              {en ? "Retry" : "重试"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
