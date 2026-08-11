import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const provider = read("../src/react/LiquidGlassGroup.tsx");
const component = read("../src/react/LiquidGlass.tsx");
const example = read("../examples/eisland/EIslandMediaCard.tsx");

describe("React adapter source contract", () => {
  it("creates and destroys one runtime in a layout effect", () => {
    expect(provider).toContain("useLayoutEffect");
    expect(provider).toContain("runtime.destroy()");
    expect(provider).toContain("new LiquidGlassRuntime");
    expect(provider).toContain("onRuntimeReadyRef");
  });

  it("registers rendered DOM while forwarding children, events, and refs", () => {
    expect(component).toContain("runtime.register");
    expect(component).toContain("children");
    expect(component).toContain("forwardRef");
    expect(component).toContain("...elementProps");
  });

  it("keeps the eIsland example independent from IPC and application stores", () => {
    expect(example).toContain("onTogglePlayback");
    expect(example).toContain("onVolumeChange");
    expect(example).not.toContain("ipcRenderer");
    expect(example).not.toContain("zustand");
  });
});

function read(path: string): string {
  return readFileSync(resolve(import.meta.dirname, path), "utf8");
}
