# eIsland 26.7.2 接入

eIsland 使用 Electron 35、React 19、TypeScript 5.8 与 Vite 6。把本包安装到 renderer 侧即可，不需要修改主进程、preload、IPC、Zustand store 或现有业务回调。

```tsx
<LiquidGlassGroup settings={{ fusionEnabled: false }}>
  <LiquidGlass as="button" glassId="play" type="button" onClick={togglePlayback}>
    Play
  </LiquidGlass>
</LiquidGlassGroup>
```

顶层 `.island-shell` 已经有自己的 morph `transform` 动画，必须使用静态材质模式：

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
  {/* 原有内容保持不变 */}
</LiquidGlass>
```

注意事项：

- `LiquidGlassGroup` 必须挂在 Electron renderer DOM 内，不能放到 main/preload。
- 默认 `fusionEnabled: false`，紧邻按钮不会自动融合。
- `interactive={false}` 保留完整材质，但不捕获指针、不覆盖 eIsland 自己的 `transform`。
- 内部滑杆等原生拖动控件加 `data-liquid-glass-static`，避免与固定锚点拉伸竞争。
- 组件卸载会释放 Pointer Events、ResizeObserver、动画帧和 WebGL 资源。
- 宿主只需把已有回调传给组件；不要把本包接入 IPC 或业务 store。
- 详细审查与验证清单见 `docs/EISLAND_COMPATIBILITY.md`。
