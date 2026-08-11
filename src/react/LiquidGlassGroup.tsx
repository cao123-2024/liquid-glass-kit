import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import type { LiquidGlassSettings } from "../core/types";
import {
  LiquidGlassGroup as LiquidGlassRuntime,
  type LiquidGlassGroupOptions,
} from "../dom/liquid-glass-group";

interface RuntimeContextValue {
  runtime: LiquidGlassRuntime | null;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export interface LiquidGlassGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "children"> {
  children: ReactNode;
  settings?: Partial<LiquidGlassSettings>;
  quality?: LiquidGlassGroupOptions["quality"];
  onRuntimeReady?: (runtime: LiquidGlassRuntime) => void;
}

export function LiquidGlassGroup({
  children,
  settings,
  quality = "high",
  onRuntimeReady,
  className,
  ...elementProps
}: LiquidGlassGroupProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [runtime, setRuntime] = useState<LiquidGlassRuntime | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const runtime = new LiquidGlassRuntime(root, { settings, quality });
    setRuntime(runtime);
    onRuntimeReady?.(runtime);
    return () => {
      setRuntime(null);
      runtime.destroy();
    };
  }, [quality, onRuntimeReady]);

  useLayoutEffect(() => {
    if (runtime && settings) runtime.setSettings(settings);
  }, [runtime, settings]);

  const context = useMemo<RuntimeContextValue>(() => ({ runtime }), [runtime]);

  return (
    <RuntimeContext.Provider value={context}>
      <div
        ref={rootRef}
        className={["liquid-glass-react-root", className].filter(Boolean).join(" ")}
        {...elementProps}
      >
        {children}
      </div>
    </RuntimeContext.Provider>
  );
}

export function useLiquidGlassRuntime(): LiquidGlassRuntime | null {
  const context = useContext(RuntimeContext);
  if (!context) throw new Error("LiquidGlass must be rendered inside LiquidGlassGroup");
  return context.runtime;
}
