# eIsland 26.7.2 接入

eIsland 使用 Electron、React 19、TypeScript 与 electron-vite。复制 `src/core`、`src/dom`、`src/react` 和 `src/styles/liquid-glass.css` 到 renderer 侧即可，不需要修改主进程、preload、IPC、Zustand store 或原有业务组件。

```tsx
<LiquidGlassGroup settings={{ fusionEnabled: false }}>
  <LiquidGlass as="button" glassId="play" type="button" onClick={togglePlayback}>
    Play
  </LiquidGlass>
</LiquidGlassGroup>
```

注意事项：

- `LiquidGlassGroup` 必须挂在 Electron renderer DOM 内，不能放到 main/preload。
- 默认 `fusionEnabled: false`，紧邻按钮不会自动融合。
- 内部滑杆等原生拖动控件加 `data-liquid-glass-static`，避免与固定锚点拉伸竞争。
- 组件卸载会释放 Pointer Events、ResizeObserver、动画帧和 WebGL 资源。
- 宿主只需把已有回调传给组件；不要把本包接入 IPC 或业务 store。
