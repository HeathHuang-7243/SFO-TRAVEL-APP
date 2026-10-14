import { describe, expect, it } from "vitest";
import { parseUpdate, versionCode } from "../src/services/updates";
const release = () => ({
  tag_name: "v1.2.0",
  body: "New release",
  assets: [
    {
      name: "SFOBusinessTravel-v1.2.0.apk",
      browser_download_url:
        "https://github.com/HeathHuang-7243/SFO-TRAVEL-APP/releases/download/v1.2.0/SFOBusinessTravel-v1.2.0.apk",
      digest: "sha256:" + "a".repeat(64),
      size: 30000000,
    },
  ],
});
describe("stable updates", () => {
  it("orders numeric versions and skips current, older and preview releases", () => {
    expect(versionCode("1.10.0")).toBeGreaterThan(versionCode("1.9.9"));
    expect(parseUpdate(release(), "1.1.3")?.version).toBe("1.2.0");
    expect(parseUpdate(release(), "1.2.0")).toBeNull();
    expect(parseUpdate(release(), "2.0.0")).toBeNull();
    expect(parseUpdate({ ...release(), prerelease: true }, "1.1.3")).toBeNull();
  });
  it("rejects foreign downloads, missing checksums and oversized files", () => {
    for (const patch of [
      { browser_download_url: "https://example.com/app.apk" },
      { digest: "" },
      { size: 200000000 },
    ]) {
      const data = release();
      Object.assign(data.assets[0], patch);
      expect(() => parseUpdate(data, "1.1.3")).toThrow();
    }
    expect(() => versionCode("1.1000.0")).toThrow();
    expect(() => versionCode("1.2.0-beta")).toThrow();
  });
});
