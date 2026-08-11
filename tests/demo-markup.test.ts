import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const html = readFileSync(resolve(import.meta.dirname, "../demo/index.html"), "utf8");

describe("component demo", () => {
  it("contains practical controls and the complete settings surface", () => {
    expect(html).toContain('data-action="reset"');
    expect(html).toContain('data-setting="fusionEnabled"');
    expect(html).toContain('data-setting="prepareDistance"');
    expect(html).toContain('data-setting="bridgeStrength"');
    expect(html).toContain('data-setting="viscosity"');
    expect(html).toContain('data-setting="snapStrength"');
    expect(html).toContain('data-setting="impactResponse"');
    expect(html).toContain('data-setting="dragResistance"');
    expect(html).not.toContain("Move the glass");
  });

  it("uses accessible inline SVG instead of emoji or icon packages", () => {
    expect(html.match(/<svg/g)?.length).toBeGreaterThanOrEqual(10);
    expect(html).not.toMatch(/[😀-🙏🌀-🫿]/u);
    expect(html).not.toContain("font-awesome");
    expect(html).not.toContain("material-icons");
  });

  it("exposes real buttons, switches, sliders, and a status region", () => {
    expect(html).toContain('type="button"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('type="range"');
    expect(html).toContain('role="status"');
  });

  it("includes a complete interactive component catalogue", () => {
    expect(html).toContain('data-component-search');
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('data-action="task"');
    expect(html).toContain('data-action="session-progress"');
    expect(html).toContain('class="glass-dock"');
    expect(html).toContain('data-toast-region');
    expect(html).toContain('data-brightness-output');
  });
});
