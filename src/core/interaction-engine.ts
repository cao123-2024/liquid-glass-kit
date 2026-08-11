import { Spring2D, estimateVelocity, rubberBand, type PointerSample } from "./physics";
import type { Point } from "./types";

export type GestureState = "idle" | "press" | "pull" | "returning";

export interface InteractionSnapshot {
  anchor: Readonly<Point>;
  pull: Readonly<Point>;
  velocity: Readonly<Point>;
  gesture: GestureState;
  shouldClick: boolean;
}

export interface InteractionOptions {
  anchor?: Point;
  dragResistance?: number;
  rebound?: number;
  threshold?: number;
  pullDimension?: number;
}

export class InteractionEngine {
  readonly anchor: Readonly<Point>;

  private resistance: number;
  private rebound: number;
  private readonly threshold: number;
  private readonly dimension: number;
  private spring: Spring2D;
  private startPointer: PointerSample | null = null;
  private startPull: Point = { x: 0, y: 0 };
  private pull: Point = { x: 0, y: 0 };
  private samples: PointerSample[] = [];
  private gesture: GestureState = "idle";

  constructor(options: InteractionOptions = {}) {
    this.anchor = Object.freeze({ ...(options.anchor ?? { x: 0, y: 0 }) });
    this.resistance = options.dragResistance ?? 0.55;
    this.rebound = options.rebound ?? 0.22;
    this.threshold = options.threshold ?? 8;
    this.dimension = options.pullDimension ?? 340;
    const dampingRatio = Math.max(0.72, 1 - this.rebound * 0.82);
    this.spring = new Spring2D(0.34, dampingRatio);
  }

  get snapshot(): InteractionSnapshot {
    return this.makeSnapshot(false);
  }

  configure(options: Pick<InteractionOptions, "dragResistance" | "rebound">): InteractionSnapshot {
    const velocity = { x: this.spring.x.velocity, y: this.spring.y.velocity };
    if (options.dragResistance !== undefined) {
      this.resistance = Math.min(1, Math.max(0, options.dragResistance));
    }
    if (options.rebound !== undefined) {
      this.rebound = Math.min(1, Math.max(0, options.rebound));
      const dampingRatio = Math.max(0.72, 1 - this.rebound * 0.82);
      this.spring = new Spring2D(0.34, dampingRatio);
      this.spring.set(this.pull, velocity);
    }
    return this.makeSnapshot(false);
  }

  begin(sample: PointerSample): InteractionSnapshot {
    this.startPointer = sample;
    this.startPull = { ...this.pull };
    this.samples = [sample];
    this.gesture = "press";
    this.spring.set(this.pull, { x: 0, y: 0 });
    return this.makeSnapshot(false);
  }

  move(sample: PointerSample): InteractionSnapshot {
    if (!this.startPointer) return this.makeSnapshot(false);
    this.samples.push(sample);
    if (this.samples.length > 5) this.samples.shift();

    const delta = {
      x: sample.x - this.startPointer.x,
      y: sample.y - this.startPointer.y,
    };
    if (this.gesture === "press" && Math.hypot(delta.x, delta.y) >= this.threshold) {
      this.gesture = "pull";
    }

    if (this.gesture === "pull") {
      this.pull = {
        x: this.startPull.x + rubberBand(delta.x, this.dimension, this.resistance),
        y: this.startPull.y + rubberBand(delta.y, this.dimension, this.resistance),
      };
      this.spring.set(this.pull, { x: 0, y: 0 });
    }
    return this.makeSnapshot(false);
  }

  release(): InteractionSnapshot {
    const shouldClick = this.gesture === "press";
    if (this.gesture === "pull") {
      const rawVelocity = estimateVelocity(this.samples);
      const velocityScale = 0.12 + this.rebound * 0.4;
      const velocity = {
        x: Math.max(-1800, Math.min(1800, rawVelocity.x * velocityScale)),
        y: Math.max(-1800, Math.min(1800, rawVelocity.y * velocityScale)),
      };
      this.spring.set(this.pull, velocity);
      this.gesture = "returning";
    } else {
      this.gesture = "idle";
      this.pull = { x: 0, y: 0 };
      this.spring.set(this.pull, { x: 0, y: 0 });
    }
    this.startPointer = null;
    this.samples = [];
    return this.makeSnapshot(shouldClick);
  }

  cancel(): InteractionSnapshot {
    if (this.gesture === "pull" || this.gesture === "press") {
      this.spring.set(this.pull, { x: 0, y: 0 });
      this.gesture = "returning";
    }
    this.startPointer = null;
    this.samples = [];
    return this.makeSnapshot(false);
  }

  step(deltaSeconds: number): InteractionSnapshot {
    if (this.gesture !== "returning") return this.makeSnapshot(false);
    this.pull = this.spring.step(deltaSeconds);
    if (this.spring.settled) {
      this.pull = { x: 0, y: 0 };
      this.spring.set(this.pull, { x: 0, y: 0 });
      this.gesture = "idle";
    }
    return this.makeSnapshot(false);
  }

  private makeSnapshot(shouldClick: boolean): InteractionSnapshot {
    const velocity = this.gesture === "pull"
      ? estimateVelocity(this.samples)
      : { x: this.spring.x.velocity, y: this.spring.y.velocity };
    return {
      anchor: this.anchor,
      pull: { ...this.pull },
      velocity,
      gesture: this.gesture,
      shouldClick,
    };
  }
}
