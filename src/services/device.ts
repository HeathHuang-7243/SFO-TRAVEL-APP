import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import { Browser } from "@capacitor/browser";
import { TravelDevice } from "./native-device";

export async function exportFile(
  name: string,
  content: string,
  type = "application/json",
  confirmSave = false,
) {
  if (Capacitor.isNativePlatform()) {
    await Filesystem.mkdir({
      path: "exports",
      directory: Directory.Cache,
      recursive: true,
    }).catch(() => {});
    // A receiving app may open the content URI after the chooser returns.
    // Keep exports for 24 hours rather than deleting a file still being read.
    const old = await Filesystem.readdir({
      path: "exports",
      directory: Directory.Cache,
    });
    for (const file of old.files) {
      if (file.mtime && Date.now() - file.mtime > 86400000) {
        await Filesystem.deleteFile({
          path: "exports/" + file.name,
          directory: Directory.Cache,
        }).catch(() => {});
      }
    }
    const path = "exports/" + crypto.randomUUID() + "-" + name;
    await Filesystem.writeFile({
      path,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({
      path,
      directory: Directory.Cache,
    });
    if (confirmSave && Capacitor.getPlatform() === "android") {
      return TravelDevice.saveDocument({ path, name, type });
    }
    await Share.share({
      title: name,
      url: uri,
      dialogTitle: "保存或分享 / Save or share",
    });
    return { saved: false };
  } else {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return { saved: false };
  }
}
export async function captureReceipt(): Promise<File | null> {
  try {
    const p = await Camera.getPhoto({
      quality: 85,
      width: 1800,
      height: 1800,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      saveToGallery: false,
      correctOrientation: true,
    });
    if (!p.base64String) return null;
    // Base64 result also makes the native plugin clean up its temporary camera file.
    const data = Uint8Array.from(atob(p.base64String), (character) =>
      character.charCodeAt(0),
    );
    return new File([data], "receipt.jpg", { type: "image/jpeg" });
  } catch (error) {
    if (/cancel/i.test(String(error))) return null;
    throw error;
  }
}
export async function prepareReceipt(file: File): Promise<string> {
  if (!file.type.startsWith("image/"))
    throw Error("请选择照片 / Please choose a photo");
  if (file.size > 25 * 1024 * 1024)
    throw Error("原始照片请小于 25 MB / Choose a photo smaller than 25 MB");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(
          Error(
            "无法读取照片，请选择 JPG 或 PNG / Choose a readable JPG or PNG",
          ),
        );
      img.src = url;
    });
    const ratio = Math.min(1, 1800 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export async function openExternal(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:")
    throw Error("Only HTTPS links are supported");
  if (Capacitor.isNativePlatform()) await Browser.open({ url });
  else window.open(url, "_blank", "noopener,noreferrer");
}
