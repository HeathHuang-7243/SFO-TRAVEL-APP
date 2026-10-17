import {
  Capacitor,
  CapacitorHttp,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";
import { App } from "@capacitor/app";

export const releasePage =
  "https://github.com/HeathHuang-7243/SFO-TRAVEL-APP/releases/latest";
const api =
  "https://api.github.com/repos/HeathHuang-7243/SFO-TRAVEL-APP/releases/latest";
export type AppUpdate = {
  version: string;
  url: string;
  sha256: string;
  notes: string;
  size: number;
};
export function versionCode(version: string) {
  if (!/^\d+\.\d+\.\d+b?$/.test(version)) throw Error("Invalid version");
  const [major, minor, patch] = version
    .replace(/b$/, "")
    .split(".")
    .map(Number);
  if (major > 2000 || minor > 999 || patch > 999)
    throw Error("Invalid version");
  return major * 1000000 + minor * 1000 + patch;
}
export function parseUpdate(data: any, current: string): AppUpdate | null {
  if (data.draft || data.prerelease) return null;
  const version = String(data.tag_name ?? "").replace(/^v/, "");
  if (versionCode(version) <= versionCode(current)) return null;
  if (!/^\d+\.\d+\.\d+$/.test(version)) return null;
  const name = `SFOBusinessTravel-v${version}.apk`;
  const url = `https://github.com/HeathHuang-7243/SFO-TRAVEL-APP/releases/download/v${version}/${name}`;
  const asset = data.assets?.find((item: any) => item.name === name);
  if (
    !asset ||
    asset.browser_download_url !== url ||
    !/^sha256:[a-f0-9]{64}$/.test(asset.digest ?? "") ||
    !Number.isSafeInteger(asset.size) ||
    asset.size <= 0 ||
    asset.size > 150 * 1024 * 1024
  )
    throw Error(
      "发布包缺失或校验信息不完整 / Release package or verification information is missing",
    );
  return {
    version,
    url,
    sha256: asset.digest.slice(7),
    notes: String(data.body ?? "").slice(0, 8000),
    size: asset.size,
  };
}
export async function checkForUpdate() {
  let status: number, data: unknown;
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({
      url: api,
      headers: { Accept: "application/vnd.github+json" },
      connectTimeout: 15000,
      readTimeout: 15000,
    });
    status = response.status;
    data = response.data;
  } else {
    const response = await fetch(api, { signal: AbortSignal.timeout(15000) });
    status = response.status;
    if (status === 200) data = await response.json();
  }
  if (status === 404) return null;
  if (status !== 200)
    throw Error(
      "无法检查更新，请稍后重试 / Cannot check for updates; please retry later",
    );
  const current = Capacitor.isNativePlatform()
    ? (await App.getInfo()).version.replace(/-debug$/, "")
    : __APP_VERSION__;
  return parseUpdate(data, current);
}
export async function isDebugApp() {
  return (
    Capacitor.isNativePlatform() && (await App.getInfo()).id.endsWith(".debug")
  );
}
export const AppUpdater = registerPlugin<{
  downloadUpdate(options: {
    url: string;
    sha256: string;
    size?: number;
  }): Promise<void>;
  cancelDownload(): Promise<void>;
  getDownloadState(): Promise<DownloadState>;
  addListener(
    event: "downloadProgress",
    listener: (state: DownloadState) => void,
  ): Promise<PluginListenerHandle>;
  installUpdate(): Promise<{ permissionRequired: boolean }>;
}>("AppUpdater");
export type DownloadState = {
  phase:
    | "idle"
    | "connecting"
    | "downloading"
    | "verifying"
    | "ready"
    | "cancelled"
    | "error";
  downloadedBytes: number;
  totalBytes: number;
  url: string;
  sha256: string;
  errorCode?: string;
};
export function updateError(error: unknown, en: boolean) {
  const value = error as { code?: string; message?: string };
  const code = value?.code || "";
  const message = String(value?.message || error);
  if (code === "DOWNLOAD_CANCELLED")
    return en
      ? "Download cancelled. You can retry when ready."
      : "下载已取消，可随时重新下载。";
  if (code === "CHECKSUM_MISMATCH" || /checksum/i.test(message))
    return en
      ? "The download is incomplete or damaged. Download it again."
      : "下载文件不完整或已损坏，请重新下载。";
  if (code === "SIGNATURE_MISMATCH" || /signing certificate|签名/.test(message))
    return en
      ? "This package has a different signature. Keep your installed app and use the official releases."
      : "安装包签名与当前应用不一致，请保留已安装应用，核对正式版来源。";
  if (code === "STORAGE_ERROR")
    return en
      ? "Could not save the APK. Check free storage and retry."
      : "安装包未能保存，请检查手机剩余空间后重试。";
  if (code === "INVALID_PACKAGE")
    return en
      ? "The package does not match this app or is not a newer version. Check again."
      : "安装包与当前应用不匹配，或不是更新版本，请重新检查更新。";
  return en
    ? "Could not finish the update. Check your connection, retry, or open GitHub releases."
    : "更新未能完成，请检查网络后重试，或打开 GitHub 正式版页面。";
}
