import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.heathhuang.sfotravel",
  appName: "湾区随行",
  webDir: "dist",
  android: {
    allowMixedContent: false,
    minWebViewVersion: 109,
    adjustMarginsForEdgeToEdge: "auto",
  },
  plugins: { CapacitorSQLite: { androidIsEncryption: false } },
};
export default config;
