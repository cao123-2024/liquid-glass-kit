import type { Point } from "./types";

export interface PointerSample extends Point {
  time: number;
}

export function rubberBand(distance: number, dimension: number, constant = 0.55): number {
  if (distance === 0) return 0;
  return (distance * dimension * constant) / (dimension + constant * Math.abs(distance));
}

export function estimateVelocity(samples: readonly PointerSample[]): Point {
  if (samples.length < 2) return { x: 0, y: 0 };
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  const elapsedSeconds = Math.max(1, last.time - first.time) / 1000;
  return {
    x: (last.x - first.x) / elapsedSeconds,
    y: (last.y - first.y) / elapsedSeconds,
  };
}

export function calculateImpactImpulse(velocity: Point, area: number, response: number): number {
  if (response <= 0) return 0;
  const speed = Math.hypot(velocity.x, velocity.y);
  const sizeScale = Math.sqrt(12_000 / Math.max(1, area));
  return Math.min(680, speed * Math.min(1, response) * sizeScale * 0.18);
}

export class SpringAxis {
  value = 0;
  velocity = 0;

  constructor(
    private readonly response = 0.34,
    private readonly dampingRatio = 0.82,
  ) {}

  set(value: number, velocity = this.velocity): void {
    this.value = value;
    this.velocity = velocity;
  }

  step(deltaSeconds: number, target = 0): number {
    const delta = Math.min(1 / 30, Math.max(0, deltaSeconds));
    const omega = (Math.PI * 2) / this.response;
    const stiffness = omega * omega;
    const damping = 2 * this.dampingRatio * omega;
    const acceleration = stiffness * (target - this.value) - damping * this.velocity;
    this.velocity += acceleration * delta;
    this.value += this.velocity * delta;
    return this.value;
  }

  get settled(): boolean {
    return Math.abs(this.value) < 0.04 && Math.abs(this.velocity) < 2;
  }
}

export class Spring2D {
  readonly x: SpringAxis;
  readonly y: SpringAxis;

  constructor(response = 0.34, dampingRatio = 0.82) {
    this.x = new SpringAxis(response, dampingRatio);
    this.y = new SpringAxis(response, dampingRatio);
  }

  set(point: Point, velocity: Point = { x: this.x.velocity, y: this.y.velocity }): void {
    this.x.set(point.x, velocity.x);
    this.y.set(point.y, velocity.y);
  }

  step(deltaSeconds: number): Point {
    return { x: this.x.step(deltaSeconds), y: this.y.step(deltaSeconds) };
  }

  get settled(): boolean {
    return this.x.settled && this.y.settled;
  }
}
