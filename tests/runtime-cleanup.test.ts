import { describe, expect, it, vi } from "vitest";

import { LiquidGlassGroup } from "../src/dom/liquid-glass-group";
import type { MaterialRendererLike } from "../src/dom/material-renderer";

describe("LiquidGlassGroup", () => {
  it("registers fixed nodes and releases every owned resource", () => {
    const root = document.createElement("section");
    const button = document.createElement("button");
    root.append(button);
    document.body.append(root);
    const renderer: MaterialRendererLike = {
      render: vi.fn(),
      destroy: vi.fn(),
    };

    const group = new LiquidGlassGroup(root, { renderer });
    const unregister = group.register(button, { id: "play", fusion: true });

    expect(root.querySelector("canvas")).not.toBeNull();
    expect(button.classList.contains("liquid-glass-node")).toBe(true);
    expect(group.size).toBe(1);

    unregister();
    expect(group.size).toBe(0);
    expect(button.classList.contains("liquid-glass-node")).toBe(false);

    group.destroy();
    expect(renderer.destroy).toHaveBeenCalledOnce();
    expect(root.querySelector("canvas")).toBeNull();
    root.remove();
  });

  it("keeps fusion disabled after registering nearby nodes until settings change", () => {
    const root = document.createElement("section");
    const first = document.createElement("button");
    const second = document.createElement("button");
    root.append(first, second);
    document.body.append(root);
    const renderer: MaterialRendererLike = { render: vi.fn(), destroy: vi.fn() };
    const group = new LiquidGlassGroup(root, { renderer });

    group.register(first, { id: "first", fusion: true });
    group.register(second, { id: "second", fusion: true });

    expect(group.settings.fusionEnabled).toBe(false);
    expect(group.fusionSnapshot.phase).toBe("disabled");
    group.destroy();
    root.remove();
  });
});
