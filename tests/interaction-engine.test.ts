import { describe, expect, it } from "vitest";

import { InteractionEngine } from "../src/core/interaction-engine";
import { estimateVelocity, rubberBand } from "../src/core/physics";

describe("pull physics", () => {
  it("progressively resists distant pulls", () => {
    expect(rubberBand(200, 300, 0.55)).toBeLessThan(200);
    expect(rubberBand(-200, 300, 0.55)).toBeGreaterThan(-200);
  });

  it("estimates release velocity from recent timestamped samples", () => {
    expect(
      estimateVelocity([
        { x: 0, y: 0, time: 0 },
        { x: 10, y: 0, time: 10 },
        { x: 30, y: 10, time: 20 },
      ]),
    ).toEqual({ x: 1500, y: 500 });
  });
});

describe("InteractionEngine", () => {
  it("preserves clicks below 8px and enters pull at the threshold", () => {
    const engine = new InteractionEngine();
    engine.begin({ x: 100, y: 100, time: 0 });

    expect(engine.move({ x: 104, y: 103, time: 16 }).gesture).toBe("press");
    expect(engine.release().shouldClick).toBe(true);

    engine.begin({ x: 100, y: 100, time: 32 });
    expect(engine.move({ x: 108, y: 100, time: 48 }).gesture).toBe("pull");
    expect(engine.release().shouldClick).toBe(false);
  });

  it("keeps its anchor immutable and springs the visual pull home", () => {
    const engine = new InteractionEngine({ anchor: { x: 24, y: 40 }, rebound: 0.22 });
    engine.begin({ x: 0, y: 0, time: 0 });
    engine.move({ x: 100, y: 30, time: 100 });
    const released = engine.release();

    expect(released.anchor).toEqual({ x: 24, y: 40 });
    expect(released.pull.x).toBeGreaterThan(0);

    for (let index = 0; index < 180; index += 1) engine.step(1 / 60);
    expect(engine.snapshot.anchor).toEqual({ x: 24, y: 40 });
    expect(Math.abs(engine.snapshot.pull.x)).toBeLessThan(0.05);
    expect(Math.abs(engine.snapshot.pull.y)).toBeLessThan(0.05);
    expect(engine.snapshot.gesture).toBe("idle");
  });

  it("can interrupt a return spring from the current presentation pull", () => {
    const engine = new InteractionEngine();
    engine.begin({ x: 0, y: 0, time: 0 });
    engine.move({ x: 90, y: 0, time: 60 });
    engine.release();
    engine.step(1 / 60);
    const beforeInterrupt = engine.snapshot.pull.x;

    const interrupted = engine.begin({ x: 50, y: 50, time: 80 });
    expect(interrupted.pull.x).toBeCloseTo(beforeInterrupt, 5);
    expect(interrupted.gesture).toBe("press");
  });
});
