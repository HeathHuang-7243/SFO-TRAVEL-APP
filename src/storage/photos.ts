import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { getDriver } from "./driver";

export interface PhotoStore {
  read(key: string): Promise<string>;
  write(key: string, data: string): Promise<void>;
  remove(key: string): Promise<void>;
}
function checkKey(key: string) {
  if (!/^receipts\/[a-zA-Z0-9_-]+\.jpg$/.test(key))
    throw Error("Invalid receipt path");
}
export function validatePhoto(data: unknown): asserts data is string {
  if (
    typeof data !== "string" ||
    data.length > 14 * 1024 * 1024 ||
    !/^\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(data) ||
    data.length % 4 !== 0
  )
    throw Error("凭证照片无效 / Invalid JPEG receipt");
}
export const photos: PhotoStore = {
  async read(key) {
    checkKey(key);
    if (Capacitor.isNativePlatform()) {
      const r = await Filesystem.readFile({
        path: key,
        directory: Directory.Data,
      });
      if (typeof r.data !== "string") throw Error("Invalid photo");
      return r.data;
    }
    const data = await (await getDriver()).get("photo:" + key);
    if (!data) throw Error("凭证照片丢失 / Missing receipt");
    return data;
  },
  async write(key, data) {
    checkKey(key);
    validatePhoto(data);
    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({
        path: key,
        data,
        directory: Directory.Data,
        recursive: true,
      });
    } else await (await getDriver()).set("photo:" + key, data);
  },
  async remove(key) {
    checkKey(key);
    if (Capacitor.isNativePlatform())
      await Filesystem.deleteFile({ path: key, directory: Directory.Data });
    else await (await getDriver()).remove("photo:" + key);
  },
};
export async function photoUrl(key: string) {
  checkKey(key);
  if (Capacitor.isNativePlatform()) {
    const r = await Filesystem.getUri({ path: key, directory: Directory.Data });
    return Capacitor.convertFileSrc(r.uri);
  }
  return "data:image/jpeg;base64," + (await photos.read(key));
}
export async function fileBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
