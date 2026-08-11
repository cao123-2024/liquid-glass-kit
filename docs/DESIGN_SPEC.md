# Seven-layer material specification

The material is implemented as one DOM surface plus one WebGL 2 optical pass. The center stays clear; visual energy is concentrated at the boundary and increases only during an active pull or fusion.

1. Environment: live page content remains visible through a low-alpha surface and `backdrop-filter`.
2. Shape: a rounded signed-distance field defines the optical boundary and its thickness.
3. Tint: a restrained neutral cyan-white fill gives the material a physical base without turning it into acrylic.
4. Refraction: low-amplitude internal caustics and stronger normal-derived edge distortion avoid a perfectly flat center.
5. Highlight: a fixed environmental light direction creates a stable rim; the highlight never follows the mouse cursor.
6. Dispersion: small RGB-separated edge energy appears only around high-curvature parts of the boundary.
7. Shadow: soft contact shadow outside the field separates the glass from the environment without a dark hard outline.

## Interaction invariants

- Nodes are anchored. Pulling deforms and displaces their presentation temporarily; it does not permanently reposition layout.
- A click remains a click until movement crosses the pull threshold.
- Spring return is interruptible by the next pointer-down.
- Idle proximity never fuses nodes.
- Fusion requires global opt-in, per-node eligibility, an active pull, and a nearest target inside the configured edge-gap threshold.
- One node can participate in at most one fused pair per frame.
- Static material mode never installs pull listeners and never owns `transform`.

## Performance

- All glass nodes inside one group share one WebGL canvas and one animation loop.
- The loop sleeps while the group is idle.
- Device pixel ratio is capped by quality level and geometry is converted to drawing-buffer coordinates.
- `ResizeObserver`, pointer listeners, animation frames, and WebGL resources are released by `destroy()`.
