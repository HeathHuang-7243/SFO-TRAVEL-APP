import { Capacitor, registerPlugin } from "@capacitor/core";

export const TravelDevice = registerPlugin<{
  setTheme(options: { dark: boolean }): Promise<void>;
  saveReceiptToGallery(options: { path: string }): Promise<{ uri: string }>;
}>("TravelDevice");

export async function syncSystemTheme(dark: boolean) {
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? "#152019" : "#fbfcf9");
  if (Capacitor.getPlatform() === "android")
    await TravelDevice.setTheme({ dark });
}

export async function saveReceiptToGallery(path: string) {
  if (Capacitor.getPlatform() !== "android")
    throw Error("相册保存仅在安卓应用中可用 / Gallery saving requires Android");
  await TravelDevice.saveReceiptToGallery({ path });
}
