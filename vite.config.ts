import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: "demo",
  publicDir: false,
  build: {
    outDir: "../dist/demo",
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, "demo/index.html"),
    },
  },
  test: {
    environment: "jsdom",
    include: ["../tests/**/*.test.ts"],
  },
});
