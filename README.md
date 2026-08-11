# Liquid Glass Kit

A reusable seven-layer liquid-glass material for ordinary DOM, React 19, and Electron renderers. It combines a transparent CSS surface with a WebGL 2 optical rim, fixed-anchor pull physics, velocity-aware spring return, and opt-in smooth-union fusion.

The default is safe for real interfaces: fusion is off, nearby controls stay separate, and every registered control keeps its normal click handler.

## What is included

- Seven explicit material layers: environment, shape, tint, refraction, highlight, dispersion, and contact shadow.
- Fixed-anchor pull instead of free-position dragging.
- Speed-aware deformation and spring return.
- Fusion only while a user actively pulls one eligible node toward one nearest eligible target.
- Configurable prepare distance, contact distance, bridge strength, viscosity, snap, rebound, impact, and drag resistance.
- One-call presets and reset-to-default settings.
- High-DPI WebGL coordinate correction.
- Static material mode for host applications that already own `transform`, such as eIsland.
- DOM API, React 19 adapter, TypeScript declarations, production builds, and an offline demo.
- A complete responsive control-surface demo with media controls, switches, search and tabs, tasks,
  progress, notifications, navigation, live material tuning, presets, and one-click reset.

## Run the demo

```powershell
npm install
npm run dev
```

For the built offline demo, serve `dist/demo` with any static server. Opening the source `demo/index.html` directly is not supported because it imports TypeScript modules.

## React

```tsx
import { LiquidGlass, LiquidGlassGroup } from "liquid-glass-kit/react";
import "liquid-glass-kit/styles.css";

export function PlayerControls() {
  return (
    <LiquidGlassGroup settings={{ fusionEnabled: false }}>
      <LiquidGlass as="button" glassId="play" type="button" onClick={() => undefined}>
        Play
      </LiquidGlass>
    </LiquidGlassGroup>
  );
}
```

If the host already animates `transform`, use `interactive={false}`. The seven-layer material remains active without intercepting pointer gestures or overriding the host transform.

```tsx
<LiquidGlass as="div" glassId="host-shell" fusion={false} interactive={false}>
  Existing application content
</LiquidGlass>
```

## DOM

```ts
import { LiquidGlassGroup } from "liquid-glass-kit";
import "liquid-glass-kit/styles.css";

const root = document.querySelector<HTMLElement>("#controls");
const button = document.querySelector<HTMLElement>("#play");

if (root && button) {
  const glass = new LiquidGlassGroup(root, {
    settings: { fusionEnabled: false },
  });
  glass.register(button, { id: "play", fusion: false });
}
```

## Settings

| Setting | Default | Purpose |
|---|---:|---|
| `fusionEnabled` | `false` | Globally enables active-pull fusion. |
| `prepareDistance` | `28` | Edge gap in pixels where preparation begins. |
| `contactDistance` | `2` | Edge gap for the fused phase. |
| `bridgeStrength` | `0.56` | Smooth-union and bridge intensity. |
| `viscosity` | `0.64` | How broad and viscous the connection feels. |
| `snapStrength` | `0.18` | Pull assistance toward the target. |
| `rebound` | `0.22` | Spring character after release. |
| `impactResponse` | `0.16` | Collision response amount. |
| `dragResistance` | `0.55` | Resistance during fixed-anchor pull. |

Use `applyPreset("soft" | "balanced" | "viscous")`, `setSettings(...)`, or `resetSettings()` on the DOM runtime. The React adapter also provides `useLiquidGlassSettings()`.

Presets change the material character without changing the current fusion on/off choice. Values are normalized at runtime, including keeping `contactDistance` within `prepareDistance`; hidden catalogue items are removed from material rendering and fusion targeting.

## eIsland 26.7.2

See [examples/eisland/integration.md](examples/eisland/integration.md) and [docs/EISLAND_COMPATIBILITY.md](docs/EISLAND_COMPATIBILITY.md). The recommended integration keeps fusion disabled and uses static material mode so eIsland retains ownership of its existing shell morph animations, IPC, stores, and business logic.

## Browser support and limits

- WebGL 2 is used for the optical edge pass; unsupported devices fall back to the CSS material.
- `backdrop-filter` only refracts content available to the browser compositor. A transparent Electron window cannot reliably sample the Windows desktop behind it. True desktop refraction requires a desktop-capture texture supplied by the host application.
- `prefers-reduced-motion`, `prefers-reduced-transparency`, and increased-contrast modes have explicit fallbacks.

## License

MIT. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for upstream technique attribution. When this MIT package is incorporated into the GPL-3.0 eIsland application, the combined eIsland distribution remains subject to eIsland's GPL-3.0 terms.
