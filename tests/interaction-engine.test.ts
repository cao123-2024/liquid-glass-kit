import { describe, expect, it } from "vitest";

import { InteractionEngine } from "../src/core/interaction-engine";
import { calculateImpactImpulse, estimateVelocity, rubberBand } from "../src/core/physics";

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

  it("scales impact by pointer speed, material response, and component area", () => {
    const fastSmall = calculateImpactImpulse({ x: 1400, y: 0 }, 12_000, 0.8);
    const slowSmall = calculateImpactImpulse({ x: 400, y: 0 }, 12_000, 0.8);
    const fastLarge = calculateImpactImpulse({ x: 1400, y: 0 }, 48_000, 0.8);

    expect(fastSmall).toBeGreaterThan(slowSmall);
    expect(fastSmall).toBeGreaterThan(fastLarge);
    expect(calculateImpactImpulse({ x: 1400, y: 0 }, 12_000, 0)).toBe(0);
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

  it("reports live pull velocity and accepts updated material settings", () => {
    const engine = new InteractionEngine({ dragResistance: 0.15, rebound: 0.1 });
    engine.configure({ dragResistance: 0.9, rebound: 0.42 });
    engine.begin({ x: 0, y: 0, time: 0 });
    engine.move({ x: 20, y: 0, time: 10 });
    const snapshot = engine.move({ x: 40, y: 0, time: 20 });

    expect(snapshot.velocity.x).toBeCloseTo(2000, 3);
    expect(snapshot.pull.x).toBeGreaterThan(rubberBand(40, 340, 0.15));
  });
});
