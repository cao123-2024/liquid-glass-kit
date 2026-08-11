import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(import.meta.dirname, "../demo/demo.ts"), "utf8");

describe("demo interaction wiring", () => {
  it("wires every catalogue control to real behavior", () => {
    expect(source).toContain("[data-component-search]");
    expect(source).toContain("[data-action='catalogue-tab']");
    expect(source).toContain("[data-action='task']");
    expect(source).toContain("[data-action='session-progress']");
    expect(source).toContain("[data-action='dock']");
    expect(source).toContain("[data-action='track']");
    expect(source).toContain("[data-action='brightness']");
    expect(source).toContain("[data-action='more']");
    expect(source).toContain("showToast");
  });

  it("supports the command shortcut without a fake dialog", () => {
    expect(source).toContain("event.key.toLowerCase() === \"k\"");
    expect(source).toContain("componentSearch.focus({ preventScroll: true })");
  });

  it("cleans up transient timers when the page is released", () => {
    expect(source).toContain("globalThis.clearTimeout(toastTimer)");
  });
});
