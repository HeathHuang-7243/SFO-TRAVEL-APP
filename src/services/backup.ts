import { validateBackup, type Backup } from "../storage/repository";
const MAX_BYTES = 100 * 1024 * 1024;
const ITERATIONS = 210000;
function base64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 8192)
    s += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(s);
}
function bytes(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
async function key(password: string, salt: Uint8Array, usage: KeyUsage[]) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usage,
  );
}
export async function encryptBackup(backup: Backup, password: string) {
  if (password.length < 4 || password.length > 128)
    throw Error("密码需要 4–128 个字符 / Use 4–128 characters");
  const plain = new TextEncoder().encode(
    JSON.stringify(validateBackup(backup)),
  );
  if (plain.length > 70 * 1024 * 1024)
    throw Error("备份超过 70 MB，请先减少凭证照片 / Backup exceeds 70 MB");
  const salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(password, salt, ["encrypt"]),
    plain,
  );
  return JSON.stringify({
    format: "sfo-travel-encrypted",
    version: 1,
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    salt: base64(salt),
    iv: base64(iv),
    data: base64(new Uint8Array(ciphertext)),
  });
}
export async function decryptBackup(
  text: string,
  password: string,
): Promise<Backup> {
  if (text.length > MAX_BYTES) throw Error("备份文件过大 / Backup too large");
  let b: any;
  try {
    b = JSON.parse(text);
  } catch {
    throw Error("备份文件损坏 / Invalid backup file");
  }
  if (
    b?.format !== "sfo-travel-encrypted" ||
    b.version !== 1 ||
    b.kdf !== "PBKDF2-SHA256" ||
    b.iterations !== ITERATIONS ||
    typeof b.salt !== "string" ||
    typeof b.iv !== "string" ||
    typeof b.data !== "string"
  )
    throw Error("备份版本不支持 / Unsupported backup version");
  let plain: ArrayBuffer;
  try {
    const salt = bytes(b.salt),
      iv = bytes(b.iv);
    if (salt.length !== 16 || iv.length !== 12) throw Error("Invalid metadata");
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      await key(password, salt, ["decrypt"]),
      bytes(b.data),
    );
  } catch {
    throw Error(
      "密码不正确或备份已损坏 / Incorrect password or damaged backup",
    );
  }
  return validateBackup(JSON.parse(new TextDecoder().decode(plain)));
}
