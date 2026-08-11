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

  it("lets a nested button own its pull without also pulling its parent card", () => {
    const root = document.createElement("section");
    const card = document.createElement("article");
    const button = document.createElement("button");
    card.append(button);
    root.append(card);
    document.body.append(root);
    const renderer: MaterialRendererLike = { render: vi.fn(), destroy: vi.fn() };
    const group = new LiquidGlassGroup(root, { renderer });
    group.register(card, { id: "card" });
    group.register(button, { id: "button" });

    button.dispatchEvent(pointerEvent("pointerdown", 0, 0));
    button.dispatchEvent(pointerEvent("pointermove", 20, 0));

    expect(button.dataset.liquidGlassGesture).toBe("pull");
    expect(card.dataset.liquidGlassGesture).not.toBe("pull");
    group.destroy();
    root.remove();
  });

  it("can render material without taking over the host transform or pointer gestures", () => {
    const root = document.createElement("section");
    const shell = document.createElement("div");
    root.append(shell);
    document.body.append(root);
    const renderer: MaterialRendererLike = { render: vi.fn(), destroy: vi.fn() };
    const group = new LiquidGlassGroup(root, { renderer });

    group.register(shell, { id: "eisland-shell", fusion: false, interactive: false });
    shell.dispatchEvent(pointerEvent("pointerdown", 0, 0));
    shell.dispatchEvent(pointerEvent("pointermove", 40, 0));

    expect(shell.classList.contains("liquid-glass-node")).toBe(true);
    expect(shell.classList.contains("is-liquid-interactive")).toBe(false);
    expect(shell.dataset.liquidGlassGesture).toBeUndefined();
    group.destroy();
    root.remove();
  });
});

function pointerEvent(type: string, clientX: number, clientY: number): PointerEvent {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY }) as PointerEvent;
  Object.defineProperty(event, "pointerId", { value: 1 });
  return event;
}
