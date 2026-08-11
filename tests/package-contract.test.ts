import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const packageJson = JSON.parse(readFileSync(resolve(projectRoot, "package.json"), "utf8")) as {
  exports: Record<string, unknown>;
  scripts: { build: string };
};

describe("package contract", () => {
  it("builds the framework-neutral, React, and demo targets", () => {
    expect(packageJson.scripts.build).toContain("vite.lib.config.ts");
    expect(packageJson.scripts.build).toContain("vite.react.config.ts");
    expect(packageJson.scripts.build).toContain("vite.config.ts");
    expect(packageJson.scripts.build.trim().endsWith("tsc -p tsconfig.build.json")).toBe(true);
  });

  it("publishes stable entry points for core, React, and CSS", () => {
    expect(packageJson.exports).toHaveProperty(".");
    expect(packageJson.exports).toHaveProperty("./react");
    expect(packageJson.exports).toHaveProperty("./styles.css");
  });
});
