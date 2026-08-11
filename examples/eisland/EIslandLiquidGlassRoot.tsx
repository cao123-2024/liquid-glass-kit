import type { ReactNode } from "react";

import { LiquidGlassGroup } from "../../src/react";
import "../../src/styles/liquid-glass.css";

const EISLAND_MATERIAL_SETTINGS = Object.freeze({
  fusionEnabled: false,
  bridgeStrength: 0.42,
  viscosity: 0.5,
  rebound: 0.18,
});

export interface EIslandLiquidGlassRootProps {
  children: ReactNode;
}

export function EIslandLiquidGlassRoot({ children }: EIslandLiquidGlassRootProps) {
  return (
    <LiquidGlassGroup
      className="eisland-liquid-root"
      quality="medium"
      settings={EISLAND_MATERIAL_SETTINGS}
    >
      {children}
    </LiquidGlassGroup>
  );
}
