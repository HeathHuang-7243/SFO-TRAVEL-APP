import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import pkg from "./package.json";
export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version.replace(/-b$/, "b")) },
  test: { include: ["tests/**/*.test.ts"] },
  build: {
    target: "es2022",
    rollupOptions: { output: { manualChunks: { charts: ["recharts"] } } },
  },
});
