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

  it("applies updated drag resistance to nodes that were already registered", () => {
    const root = document.createElement("section");
    const button = document.createElement("button");
    root.append(button);
    document.body.append(root);
    const renderer: MaterialRendererLike = { render: vi.fn(), destroy: vi.fn() };
    const group = new LiquidGlassGroup(root, {
      renderer,
      settings: { dragResistance: 0.1 },
    });
    group.register(button, { id: "button" });
    group.setSettings({ dragResistance: 0.95 });

    button.dispatchEvent(pointerEvent("pointerdown", 0, 0, 0));
    button.dispatchEvent(pointerEvent("pointermove", 100, 0, 16));

    expect(Number.parseFloat(button.style.getPropertyValue("--lg-pull-x"))).toBeGreaterThan(45);
    group.destroy();
    root.remove();
  });

  it("uses snap strength and impact response when an active pull reaches another node", async () => {
    const root = document.createElement("section");
    const active = document.createElement("button");
    const target = document.createElement("button");
    root.append(active, target);
    document.body.append(root);
    setRect(root, 0, 0, 420, 180);
    setMovingRect(active, 0, 40, 100, 80);
    setMovingRect(target, 160, 40, 100, 80);
    const renderer: MaterialRendererLike = { render: vi.fn(), destroy: vi.fn() };
    const group = new LiquidGlassGroup(root, {
      renderer,
      settings: {
        fusionEnabled: true,
        prepareDistance: 70,
        contactDistance: 6,
        snapStrength: 1,
        impactResponse: 1,
        dragResistance: 0.95,
      },
    });
    group.register(active, { id: "active" });
    group.register(target, { id: "target" });

    active.dispatchEvent(pointerEvent("pointerdown", 0, 0, 0));
    active.dispatchEvent(pointerEvent("pointermove", 180, 0, 16));
    await waitForFrames(5);

    expect(group.fusionSnapshot.phase).toBe("fused");
    expect(Number.parseFloat(active.style.getPropertyValue("--lg-snap-x"))).toBeGreaterThan(0);
    expect(Math.abs(Number.parseFloat(target.style.getPropertyValue("--lg-impact-x")))).toBeGreaterThan(0);
    group.destroy();
    root.remove();
  });

  it("preserves fusion mode when applying a material preset", () => {
    const root = document.createElement("section");
    document.body.append(root);
    const renderer: MaterialRendererLike = { render: vi.fn(), destroy: vi.fn() };
    const group = new LiquidGlassGroup(root, { renderer, settings: { fusionEnabled: true } });

    group.applyPreset("viscous");

    expect(group.settings.fusionEnabled).toBe(true);
    expect(group.settings.viscosity).toBeGreaterThan(0.8);
    group.destroy();
    root.remove();
  });

  it("excludes hidden catalogue items from material rendering and fusion", async () => {
    const root = document.createElement("section");
    const visible = document.createElement("button");
    const hidden = document.createElement("button");
    hidden.hidden = true;
    root.append(visible, hidden);
    document.body.append(root);
    const render = vi.fn<MaterialRendererLike["render"]>();
    const renderer: MaterialRendererLike = { render, destroy: vi.fn() };
    const group = new LiquidGlassGroup(root, { renderer, settings: { fusionEnabled: true } });
    group.register(visible, { id: "visible" });
    group.register(hidden, { id: "hidden" });

    await waitForFrames(2);

    const lastFrame = render.mock.calls.at(-1)?.[0];
    expect(lastFrame?.nodes.map((node) => node.id)).toEqual(["visible"]);
    expect(group.fusionSnapshot.pair).toBeNull();
    group.destroy();
    root.remove();
  });
});

function pointerEvent(type: string, clientX: number, clientY: number, timeStamp?: number): PointerEvent {
  const event = new MouseEvent(type, { bubbles: true, button: 0, clientX, clientY }) as PointerEvent;
  Object.defineProperty(event, "pointerId", { value: 1 });
  if (timeStamp !== undefined) Object.defineProperty(event, "timeStamp", { value: timeStamp });
  return event;
}

function setRect(element: HTMLElement, x: number, y: number, width: number, height: number): void {
  element.getBoundingClientRect = () => rect(x, y, width, height);
}

function setMovingRect(element: HTMLElement, x: number, y: number, width: number, height: number): void {
  element.getBoundingClientRect = () => {
    const offsetX = ["--lg-pull-x", "--lg-snap-x", "--lg-impact-x"]
      .map((property) => Number.parseFloat(element.style.getPropertyValue(property)) || 0)
      .reduce((total, value) => total + value, 0);
    const offsetY = ["--lg-pull-y", "--lg-snap-y", "--lg-impact-y"]
      .map((property) => Number.parseFloat(element.style.getPropertyValue(property)) || 0)
      .reduce((total, value) => total + value, 0);
    return rect(x + offsetX, y + offsetY, width, height);
  };
}

function rect(x: number, y: number, width: number, height: number): DOMRect {
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({}),
  } as DOMRect;
}

async function waitForFrames(count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}
