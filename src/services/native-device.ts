import {
  Capacitor,
  registerPlugin,
  type PluginListenerHandle,
} from "@capacitor/core";

export const TravelDevice = registerPlugin<{
  setTheme(options: {
    mode: "light" | "dark" | "auto";
  }): Promise<void>;
  getSystemTheme(): Promise<{ dark: boolean }>;
  addListener(
    event: "systemThemeChanged",
    listener: (theme: { dark: boolean }) => void,
  ): Promise<PluginListenerHandle>;
  saveReceiptToGallery(options: { path: string }): Promise<{ uri: string }>;
}>("TravelDevice");

export async function syncSystemTheme(
  dark: boolean,
  mode: "light" | "dark" | "auto",
) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#152019" : "#fbfcf9");
  if (Capacitor.getPlatform() === "android")
    await TravelDevice.setTheme({ mode });
}

export function subscribeToSystemTheme(listener: (dark: boolean) => void) {
  if (Capacitor.getPlatform() !== "android") return () => {};
  let active = true;
  let handle: PluginListenerHandle | undefined;
  const emit = ({ dark }: { dark: boolean }) => {
    if (active) listener(dark);
  };
  const refresh = () => {
    if (!active || document.visibilityState === "hidden") return;
    void TravelDevice.getSystemTheme()
      .then(emit)
      .catch((error) => console.error("Could not read system theme", error));
  };
  void TravelDevice.addListener("systemThemeChanged", emit)
    .then((subscription) => {
      if (!active) {
        void subscription.remove();
        return;
      }
      handle = subscription;
      refresh();
    })
    .catch((error) => {
      console.error("Could not watch system theme", error);
      refresh();
    });
  document.addEventListener("visibilitychange", refresh);
  return () => {
    active = false;
    void handle?.remove();
    document.removeEventListener("visibilitychange", refresh);
  };
}

export async function saveReceiptToGallery(path: string) {
  if (Capacitor.getPlatform() !== "android")
    throw Error("相册保存仅在安卓应用中可用 / Gallery saving requires Android");
  await TravelDevice.saveReceiptToGallery({ path });
}
