import { readFileSync } from "node:fs";
const { version } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
if (
  !/^\d+\.\d+\.\d+$/.test(version) ||
  process.env.RELEASE_TAG !== `v${version}`
) {
  throw Error(
    "Tag must exactly match package.json, for example v1.0.0. Update version before tagging.",
  );
}
const [major, minor, patch] = version.split(".").map(Number);
if (major > 2000 || minor > 999 || patch > 999)
  throw Error("Version exceeds Android versionCode range");
console.log(
  `Release ${version}, Android versionCode ${major * 1000000 + minor * 1000 + patch}`,
);
