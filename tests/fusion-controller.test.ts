import { describe, expect, it } from "vitest";

import { FusionController } from "../src/core/fusion-controller";
import { signedRectGap } from "../src/core/geometry";
import { DEFAULT_SETTINGS } from "../src/core/settings";
import type { GlassNode } from "../src/core/types";

describe("signedRectGap", () => {
  it("measures separated and overlapping edges rather than centers", () => {
    expect(signedRectGap(node("a", 0), node("b", 120))).toBe(20);
    expect(signedRectGap(node("a", 0), node("b", 80))).toBe(-20);
  });

  it("includes the active presentation pull", () => {
    const moving = node("a", 0);
    moving.pull.x = 16;
    expect(signedRectGap(moving, node("b", 120))).toBe(4);
  });
});

describe("FusionController", () => {
  it("never prepares or fuses when the group setting is disabled", () => {
    const controller = new FusionController();
    const snapshot = controller.update({
      activeId: "a",
      returning: false,
      nodes: [node("a", 0), node("b", 80)],
      settings: DEFAULT_SETTINGS,
    });

    expect(snapshot.phase).toBe("disabled");
    expect(snapshot.pair).toBeNull();
  });

  it("keeps overlapping idle components isolated when fusion is enabled", () => {
    const controller = new FusionController();
    const snapshot = controller.update({
      activeId: null,
      returning: false,
      nodes: [node("a", 0), node("b", 80)],
      settings: { ...DEFAULT_SETTINGS, fusionEnabled: true },
    });

    expect(snapshot.phase).toBe("idle");
    expect(snapshot.pair).toBeNull();
  });

  it("prepares by configurable edge distance and fuses only at contact", () => {
    const controller = new FusionController();
    const settings = { ...DEFAULT_SETTINGS, fusionEnabled: true, prepareDistance: 28, contactDistance: 2 };
    const a = node("a", 0);
    const b = node("b", 120);

    expect(controller.update({ activeId: "a", returning: false, nodes: [a, b], settings }).phase).toBe(
      "preparing",
    );
    a.pull.x = 19;
    const fused = controller.update({ activeId: "a", returning: false, nodes: [a, b], settings });
    expect(fused.phase).toBe("fused");
    expect(fused.pair).toEqual(["a", "b"]);
  });

  it("chooses one nearest eligible target and clears it on release", () => {
    const controller = new FusionController();
    const settings = { ...DEFAULT_SETTINGS, fusionEnabled: true, prepareDistance: 50 };
    const nodes = [node("source", 0), node("far", 145), node("nearest", 126), node("disabled", 110, false)];

    const active = controller.update({ activeId: "source", returning: false, nodes, settings });
    expect(active.pair).toEqual(["source", "nearest"]);

    const released = controller.update({ activeId: null, returning: true, nodes, settings });
    expect(released.phase).toBe("returning");
    expect(released.pair).toBeNull();
  });
});

function node(id: string, x: number, fusion = true): GlassNode {
  return {
    id,
    fusion,
    rect: { x, y: 0, width: 100, height: 80, radius: 24 },
    pull: { x: 0, y: 0 },
  };
}
