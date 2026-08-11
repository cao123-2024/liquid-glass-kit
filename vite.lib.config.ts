import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/index.ts"),
      name: "LiquidGlassKit",
      cssFileName: "liquid-glass-kit",
      fileName: (format) =>
        format === "es" ? "liquid-glass-kit.js" : "liquid-glass-kit.umd.cjs",
      formats: ["es", "umd"],
    },
  },
});
