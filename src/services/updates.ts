import { Capacitor, CapacitorHttp, registerPlugin } from "@capacitor/core";
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
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error("Invalid version");
  const [major, minor, patch] = version.split(".").map(Number);
  if (major > 2000 || minor > 999 || patch > 999)
    throw Error("Invalid version");
  return major * 1000000 + minor * 1000 + patch;
}
export function parseUpdate(data: any, current: string): AppUpdate | null {
  if (data.draft || data.prerelease) return null;
  const version = String(data.tag_name ?? "").replace(/^v/, "");
  if (versionCode(version) <= versionCode(current)) return null;
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
  downloadUpdate(options: { url: string; sha256: string }): Promise<void>;
  installUpdate(): Promise<{ permissionRequired: boolean }>;
}>("AppUpdater");
