import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const bundle = JSON.parse(process.env.SFO_SIGNING_BUNDLE || "null");
if (
  !bundle ||
  ["keystore", "storePassword", "keyAlias", "keyPassword"].some(
    (key) => typeof bundle[key] !== "string" || !bundle[key],
  )
) {
  throw Error(
    "Configure the SFO_SIGNING_BUNDLE repository secret. See docs/RELEASING.md.",
  );
}
const directory = mkdtempSync(
  join(process.env.RUNNER_TEMP || tmpdir(), "sfo-signing-"),
);
try {
  const path = join(directory, "release.jks");
  writeFileSync(path, Buffer.from(bundle.keystore, "base64"), { mode: 0o600 });
  const result = spawnSync(
    "./gradlew",
    ["assembleRelease", "lintRelease", "--no-daemon"],
    {
      cwd: new URL("../android", import.meta.url),
      stdio: "inherit",
      env: {
        ...process.env,
        SFO_KEYSTORE_PATH: path,
        SFO_STORE_PASSWORD: bundle.storePassword,
        SFO_KEY_ALIAS: bundle.keyAlias,
        SFO_KEY_PASSWORD: bundle.keyPassword,
      },
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status || 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
