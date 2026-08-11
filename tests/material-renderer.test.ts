import { describe, expect, it } from "vitest";

import { scaleMaterialRect } from "../src/dom/material-renderer";
import { fragmentShaderSource } from "../src/dom/shaders";

describe("scaleMaterialRect", () => {
  it("converts CSS-pixel geometry to the WebGL drawing-buffer coordinate system", () => {
    expect(
      scaleMaterialRect(
        { x: 12, y: 20, width: 160, height: 96, radius: 28 },
        2,
      ),
    ).toEqual({
      x: 184,
      y: 136,
      halfWidth: 160,
      halfHeight: 96,
      radius: 56,
    });
  });
});

describe("material shader settings", () => {
  it("uses impact response in the optical ripple instead of leaving the setting inert", () => {
    expect(fragmentShaderSource).toMatch(/u_material\.w\s*\*/);
  });
});
