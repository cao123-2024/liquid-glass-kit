# eIsland 26.7.2 compatibility review

Reviewed against the official `JNTMTMTM/eIsland` `v26.7.2` source release.

## Verdict

The package is compatible with eIsland's renderer stack: React 19.1, TypeScript 5.8, Vite 6, and Electron 35. It belongs entirely in the renderer. No main-process, preload, IPC, Zustand store, media control, or window-management changes are required.

Use static material mode for the top-level island shell:

```tsx
<LiquidGlass
  as="div"
  glassId="island-shell"
  fusion={false}
  interactive={false}
  className={shellClassName}
  onClick={handleIslandClick}
  style={shellStyle}
>
  {/* existing background and state content */}
</LiquidGlass>
```

Wrap the renderer once:

```tsx
<LiquidGlassGroup
  className="eisland-liquid-root"
  quality="medium"
  settings={{ fusionEnabled: false }}
>
  <DynamicIsland />
</LiquidGlassGroup>
```

Add this host layout rule:

```css
.eisland-liquid-root {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
}
```

## Confirmed integration points

- Renderer entry: `src/renderer/DynamicIslandMain.tsx`.
- Shell component: `src/renderer/components/DynamicIsland.tsx`.
- Existing shell class calculation: `src/renderer/components/hooks/useIslandShellPresentation.ts`.
- Existing shell styles and morph keyframes: `src/renderer/styles/shell/shell.css`.
- Electron main window is already frameless, transparent, and uses `#00000000`.

## Conflicts avoided by this package

1. Transform ownership: eIsland morph keyframes use `transform`. `interactive={false}` keeps the material while preventing the kit from writing its pull transform.
2. Accidental fusion: eIsland's compact controls sit close together. Global fusion is off by default and the shell explicitly opts out.
3. Pointer ownership: static mode does not capture pointers, so eIsland retains clicks, pill dragging, hover transitions, sliders, and all existing handlers.
4. Business coupling: the adapter accepts normal React callbacks and does not import `window.api`, IPC, or application stores.
5. StrictMode cleanup: runtime teardown releases observers, listeners, animation frames, and WebGL objects before React remounts it.

## Host limitations

- The eIsland renderer window is transparent, but Chromium cannot reliably refract the external Windows desktop with CSS alone. The kit can refract DOM/background media rendered inside the window. True Windows-desktop refraction needs a captured desktop texture and carries privacy/performance implications.
- eIsland's current `.island-shell` has `overflow: hidden`; this is useful for internal optics, but outer contact shadows beyond the shell bounds may be clipped. Keep the WebGL canvas on the group wrapper rather than inside the shell.
- eIsland is GPL-3.0. This kit is MIT; once included in the eIsland distribution, the combined application remains GPL-3.0.

## Recommended first merge

Start with the top-level shell only, fusion disabled, `quality="medium"`, and the existing state content untouched. Validate idle, hover, notification, expanded, maxExpand, pill drag, light theme, opacity control, background image/video, and window resize before converting nested controls.
