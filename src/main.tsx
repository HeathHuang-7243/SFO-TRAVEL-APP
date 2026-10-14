import { Component, type ReactNode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { getRepository } from "./storage/repository";
import { openExternal } from "./services/device";
import TravelApp from "./components/TravelApp";
import { startThemeSync } from "./services/theme";
import "./globals.css";
import "./themes.css";
import "./mobile.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }
  render() {
    return this.state.error ? (
      <div className="startup">
        <h1>应用遇到问题 / App error</h1>
        <p>{this.state.error}</p>
        <button onClick={() => location.reload()}>重试 / Retry</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
function Boot() {
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    getRepository()
      .then((repo) => repo.read())
      .then(() => setReady(true))
      .catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (a?.href.startsWith("https:") && a.origin !== location.origin) {
        e.preventDefault();
        void openExternal(a.href).catch(() =>
          window.alert("无法打开链接 / Cannot open link"),
        );
      }
    };
    document.addEventListener("click", listener);
    return () => document.removeEventListener("click", listener);
  }, []);
  if (error)
    return (
      <div className="startup">
        <h1>无法读取本地数据 / Storage unavailable</h1>
        <p>
          已有数据未被重置，请重启应用重试。 / Existing data has not been reset.
        </p>
        <p>{error}</p>
        <button onClick={() => location.reload()}>重试 / Retry</button>
      </div>
    );
  return ready ? (
    <TravelApp />
  ) : (
    <div className="startup">正在打开本地账本… / Opening local data…</div>
  );
}
startThemeSync();
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <Boot />
  </ErrorBoundary>,
);
