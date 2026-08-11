import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/react",
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, "src/react/index.ts"),
      fileName: () => "index.js",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["react", "react-dom"],
    },
  },
});
