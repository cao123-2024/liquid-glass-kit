import { describe, expect, it } from "vitest";

import { scaleMaterialRect } from "../src/dom/material-renderer";

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
