import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementType,
  type ForwardedRef,
  type HTMLAttributes,
  type ReactElement,
  type Ref,
} from "react";

import { useLiquidGlassRuntime } from "./LiquidGlassGroup";

type LiquidGlassOwnProps<T extends ElementType> = {
  as?: T;
  glassId: string;
  fusion?: boolean;
  interactive?: boolean;
  radius?: number;
};

export type LiquidGlassProps<T extends ElementType = "div"> = LiquidGlassOwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof LiquidGlassOwnProps<T>>;

type LiquidGlassComponent = <T extends ElementType = "div">(
  props: LiquidGlassProps<T> & { ref?: Ref<HTMLElement> },
) => ReactElement | null;

interface LiquidGlassImplementationProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  glassId: string;
  fusion?: boolean;
  interactive?: boolean;
  radius?: number;
  type?: string;
}

function LiquidGlassInner(
  { as, glassId, fusion = true, interactive = true, radius, children, ...elementProps }: LiquidGlassImplementationProps,
  forwardedRef: ForwardedRef<HTMLElement>,
) {
  const runtime = useLiquidGlassRuntime();
  const localRef = useRef<HTMLElement | null>(null);
  const Component = (as ?? "div") as ElementType;

  useLayoutEffect(() => {
    if (!runtime || !(localRef.current instanceof HTMLElement)) return;
    return runtime.register(localRef.current, { id: glassId, fusion, interactive, radius });
  }, [runtime, glassId, fusion, interactive, radius]);

  const attachRef = (node: HTMLElement | null): void => {
    localRef.current = node;
    assignRef(forwardedRef, node);
  };

  return (
    <Component ref={attachRef} {...elementProps}>
      {children}
    </Component>
  );
}

export const LiquidGlass = forwardRef<HTMLElement, LiquidGlassImplementationProps>(
  LiquidGlassInner,
) as unknown as LiquidGlassComponent;

function assignRef(ref: ForwardedRef<HTMLElement>, value: HTMLElement | null): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}
