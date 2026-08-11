export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export interface LiquidGlassSettings {
  fusionEnabled: boolean;
  prepareDistance: number;
  contactDistance: number;
  bridgeStrength: number;
  viscosity: number;
  snapStrength: number;
  rebound: number;
  impactResponse: number;
  dragResistance: number;
}

export interface GlassNode {
  id: string;
  rect: Rect;
  pull: Point;
  fusion: boolean;
}

export type SettingsPresetName = "soft" | "balanced" | "viscous";
