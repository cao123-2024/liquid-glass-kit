import { FusionController, type FusionSnapshot } from "../core/fusion-controller";
import { calculateSnapOffset, directionBetween, presentedRect } from "../core/geometry";
import { InteractionEngine } from "../core/interaction-engine";
import { calculateImpactImpulse, Spring2D } from "../core/physics";
import { DEFAULT_SETTINGS, PRESETS, normalizeSettings } from "../core/settings";
import type { GlassNode, LiquidGlassSettings, Point, SettingsPresetName } from "../core/types";
import { MaterialRenderer, type MaterialNodeFrame, type MaterialRendererLike } from "./material-renderer";

export interface RegisterOptions {
  id: string;
  fusion?: boolean;
  interactive?: boolean;
  radius?: number;
}

export interface LiquidGlassGroupOptions {
  settings?: Partial<LiquidGlassSettings>;
  renderer?: MaterialRendererLike;
  quality?: "low" | "medium" | "high";
}

interface NodeRecord {
  id: string;
  element: HTMLElement;
  engine: InteractionEngine;
  fusion: boolean;
  interactive: boolean;
  radius: number;
  pointerId: number | null;
  suppressClick: boolean;
  shiftX: number;
  shiftY: number;
  snap: Point;
  snapTarget: Point;
  impact: Point;
  impactSpring: Spring2D;
}

const requestFrame = (callback: FrameRequestCallback): number => {
  if (typeof globalThis.requestAnimationFrame === "function") {
    return globalThis.requestAnimationFrame(callback);
  }
  return globalThis.setTimeout(() => callback(performance.now()), 16) as unknown as number;
};

const cancelFrame = (handle: number): void => {
  if (typeof globalThis.cancelAnimationFrame === "function") {
    globalThis.cancelAnimationFrame(handle);
  } else {
    globalThis.clearTimeout(handle);
  }
};

export class LiquidGlassGroup {
  private readonly records = new Map<string, NodeRecord>();
  private readonly canvas: HTMLCanvasElement;
  private readonly bridge: HTMLDivElement;
  private readonly renderer: MaterialRendererLike;
  private readonly fusion = new FusionController();
  private readonly events = new AbortController();
  private readonly resizeObserver: ResizeObserver | null;
  private currentSettings: LiquidGlassSettings;
  private activeId: string | null = null;
  private frameHandle: number | null = null;
  private lastFrameTime = performance.now();
  private destroyed = false;

  constructor(
    private readonly root: HTMLElement,
    options: LiquidGlassGroupOptions = {},
  ) {
    this.currentSettings = normalizeSettings({ ...DEFAULT_SETTINGS, ...options.settings });
    this.root.classList.add("liquid-glass-group");
    this.canvas = document.createElement("canvas");
    this.canvas.className = "liquid-glass-canvas";
    this.canvas.setAttribute("aria-hidden", "true");
    this.bridge = document.createElement("div");
    this.bridge.className = "liquid-glass-fusion-bridge";
    this.bridge.setAttribute("aria-hidden", "true");
    this.root.prepend(this.bridge);
    this.root.prepend(this.canvas);
    this.renderer = options.renderer ?? new MaterialRenderer(this.canvas, options.quality);

    this.resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            this.queueFrame();
          })
        : null;
    this.resizeObserver?.observe(this.root);
    this.queueFrame();
  }

  get size(): number {
    return this.records.size;
  }

  get settings(): Readonly<LiquidGlassSettings> {
    return this.currentSettings;
  }

  get fusionSnapshot(): FusionSnapshot {
    return this.fusion.snapshot;
  }

  register(element: HTMLElement, options: RegisterOptions): () => void {
    if (this.destroyed) throw new Error("Cannot register a node on a destroyed LiquidGlassGroup");
    if (this.records.has(options.id)) throw new Error(`Liquid glass node id already registered: ${options.id}`);

    const record: NodeRecord = {
      id: options.id,
      element,
      engine: new InteractionEngine({
        dragResistance: this.currentSettings.dragResistance,
        rebound: this.currentSettings.rebound,
      }),
      fusion: options.fusion ?? true,
      interactive: options.interactive ?? true,
      radius: options.radius ?? readRadius(element),
      pointerId: null,
      suppressClick: false,
      shiftX: 0,
      shiftY: 0,
      snap: { x: 0, y: 0 },
      snapTarget: { x: 0, y: 0 },
      impact: { x: 0, y: 0 },
      impactSpring: new Spring2D(0.28, 0.7),
    };
    this.records.set(record.id, record);
    element.classList.add("liquid-glass-node");
    element.classList.toggle("is-liquid-interactive", record.interactive);
    element.dataset.liquidGlassId = record.id;
    element.dataset.liquidGlassFusion = String(record.fusion);
    if (record.interactive) this.installPointerInput(record);
    this.queueFrame();

    let registered = true;
    return () => {
      if (!registered) return;
      registered = false;
      this.records.delete(record.id);
      this.resetElement(record.element);
      if (this.activeId === record.id) this.activeId = null;
      this.queueFrame();
    };
  }

  setSettings(settings: Partial<LiquidGlassSettings>): LiquidGlassSettings {
    this.currentSettings = normalizeSettings({ ...this.currentSettings, ...settings });
    this.configureInteractionSettings();
    this.root.dataset.liquidGlassFusionEnabled = String(this.currentSettings.fusionEnabled);
    this.queueFrame();
    return { ...this.currentSettings };
  }

  applyPreset(name: SettingsPresetName): LiquidGlassSettings {
    this.currentSettings = {
      ...PRESETS[name],
      fusionEnabled: this.currentSettings.fusionEnabled,
    };
    this.configureInteractionSettings();
    this.root.dataset.liquidGlassPreset = name;
    this.root.dataset.liquidGlassFusionEnabled = String(this.currentSettings.fusionEnabled);
    this.queueFrame();
    return { ...this.currentSettings };
  }

  resetSettings(): LiquidGlassSettings {
    this.currentSettings = { ...DEFAULT_SETTINGS };
    this.configureInteractionSettings();
    delete this.root.dataset.liquidGlassPreset;
    this.root.dataset.liquidGlassFusionEnabled = "false";
    this.queueFrame();
    return { ...this.currentSettings };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.events.abort();
    this.resizeObserver?.disconnect();
    if (this.frameHandle !== null) cancelFrame(this.frameHandle);
    this.frameHandle = null;
    for (const record of this.records.values()) this.resetElement(record.element);
    this.records.clear();
    this.renderer.destroy();
    this.canvas.remove();
    this.bridge.remove();
    this.root.classList.remove("liquid-glass-group");
    delete this.root.dataset.liquidGlassPhase;
    delete this.root.dataset.liquidGlassFusionEnabled;
  }

  private installPointerInput(record: NodeRecord): void {
    const { element } = record;
    const signal = this.events.signal;

    element.addEventListener(
      "pointerdown",
      (event) => {
        if (event.button !== 0 || record.pointerId !== null) return;
        if ((event.target as Element).closest("[data-liquid-glass-static]")) return;
        event.stopPropagation();
        record.pointerId = event.pointerId;
        this.activeId = record.id;
        record.suppressClick = false;
        record.engine.begin({ x: event.clientX, y: event.clientY, time: event.timeStamp });
        element.classList.add("is-liquid-pressed");
        element.style.setProperty("--lg-origin-x", `${event.offsetX}px`);
        element.style.setProperty("--lg-origin-y", `${event.offsetY}px`);
        element.setPointerCapture?.(event.pointerId);
        this.queueFrame();
      },
      { signal },
    );

    element.addEventListener(
      "pointermove",
      (event) => {
        if (record.pointerId !== event.pointerId) return;
        const snapshot = record.engine.move({ x: event.clientX, y: event.clientY, time: event.timeStamp });
        if (snapshot.gesture === "pull") {
          record.suppressClick = true;
          event.preventDefault();
          element.classList.add("is-liquid-pulling");
        }
        this.applyPresentation(record);
        this.queueFrame();
      },
      { signal },
    );

    const finish = (event: PointerEvent, cancelled: boolean): void => {
      if (record.pointerId !== event.pointerId) return;
      const snapshot = cancelled ? record.engine.cancel() : record.engine.release();
      record.suppressClick = record.suppressClick || !snapshot.shouldClick;
      record.pointerId = null;
      if (this.activeId === record.id) this.activeId = null;
      element.releasePointerCapture?.(event.pointerId);
      element.classList.remove("is-liquid-pressed", "is-liquid-pulling");
      this.queueFrame();
    };

    element.addEventListener("pointerup", (event) => finish(event, false), { signal });
    element.addEventListener("pointercancel", (event) => finish(event, true), { signal });
    element.addEventListener(
      "click",
      (event) => {
        if (!record.suppressClick) return;
        record.suppressClick = false;
        event.preventDefault();
        event.stopImmediatePropagation();
      },
      { capture: true, signal },
    );
  }

  private configureInteractionSettings(): void {
    for (const record of this.records.values()) {
      record.engine.configure({
        dragResistance: this.currentSettings.dragResistance,
        rebound: this.currentSettings.rebound,
      });
    }
  }

  private queueFrame(): void {
    if (this.destroyed || this.frameHandle !== null) return;
    this.frameHandle = requestFrame((time) => this.renderFrame(time));
  }

  private renderFrame(time: number): void {
    this.frameHandle = null;
    if (this.destroyed) return;
    const delta = Math.min(1 / 20, Math.max(0, (time - this.lastFrameTime) / 1000));
    this.lastFrameTime = time;
    let returning = false;
    let materialMotion = false;
    for (const record of this.records.values()) {
      if (record.engine.snapshot.gesture === "returning") {
        record.engine.step(delta);
      }
      if (!record.impactSpring.settled) record.impact = record.impactSpring.step(delta);
      const snapProgress = 1 - Math.exp(-delta * 24);
      record.snap.x += (record.snapTarget.x - record.snap.x) * snapProgress;
      record.snap.y += (record.snapTarget.y - record.snap.y) * snapProgress;
      if (Math.abs(record.snapTarget.x - record.snap.x) < 0.01) record.snap.x = record.snapTarget.x;
      if (Math.abs(record.snapTarget.y - record.snap.y) < 0.01) record.snap.y = record.snapTarget.y;
      this.applyPresentation(record);
      returning ||= record.engine.snapshot.gesture === "returning";
      materialMotion ||= !record.impactSpring.settled
        || Math.abs(record.snapTarget.x - record.snap.x) >= 0.01
        || Math.abs(record.snapTarget.y - record.snap.y) >= 0.01;
    }

    let nodes = this.collectNodes();
    const previousFusion = this.fusion.snapshot;
    const fusion = this.fusion.update({
      activeId: this.activeId,
      returning,
      nodes,
      settings: this.currentSettings,
    });
    this.updateFusionPhysics(previousFusion, fusion, nodes);
    nodes = this.collectNodes();
    this.root.dataset.liquidGlassPhase = fusion.phase;
    this.updateFusionClasses(fusion);
    this.updateBridge(fusion, nodes);

    const bounds = this.root.getBoundingClientRect();
    const materialNodes: MaterialNodeFrame[] = nodes.map((node) => ({
      id: node.id,
      rect: presentedRect(node),
      pull: node.pull,
    }));
    this.renderer.render({
      nodes: materialNodes,
      fusion,
      settings: this.currentSettings,
      width: Math.max(1, bounds.width || this.root.clientWidth || 1),
      height: Math.max(1, bounds.height || this.root.clientHeight || 1),
      time,
    });

    if (returning || materialMotion || this.activeId !== null) this.queueFrame();
  }

  private collectNodes(): GlassNode[] {
    const rootBounds = this.root.getBoundingClientRect();
    return [...this.records.values()]
      .filter((record) => record.element.isConnected && record.element.closest("[hidden]") === null)
      .map((record) => {
        const bounds = record.element.getBoundingClientRect();
        const width = bounds.width || record.element.offsetWidth || 1;
        const height = bounds.height || record.element.offsetHeight || 1;
        return {
          id: record.id,
          fusion: record.fusion,
          rect: {
            x: bounds.left - rootBounds.left - record.shiftX - record.snap.x - record.impact.x,
            y: bounds.top - rootBounds.top - record.shiftY - record.snap.y - record.impact.y,
            width,
            height,
            radius: Math.min(record.radius, width / 2, height / 2),
          },
          pull: {
            x: record.shiftX + record.snap.x + record.impact.x,
            y: record.shiftY + record.snap.y + record.impact.y,
          },
        };
      });
  }

  private applyPresentation(record: NodeRecord): void {
    const snapshot = record.engine.snapshot;
    record.shiftX = snapshot.pull.x * 0.74;
    record.shiftY = snapshot.pull.y * 0.74;
    const bounds = record.element.getBoundingClientRect();
    const width = Math.max(80, bounds.width || record.element.offsetWidth || 80);
    const height = Math.max(48, bounds.height || record.element.offsetHeight || 48);
    const stretchX = 1 + Math.min(0.18, Math.abs(snapshot.pull.x) / width * 0.16);
    const stretchY = 1 + Math.min(0.18, Math.abs(snapshot.pull.y) / height * 0.16);
    const squeezeX = 1 - Math.min(0.055, Math.abs(snapshot.pull.y) / height * 0.035);
    const squeezeY = 1 - Math.min(0.055, Math.abs(snapshot.pull.x) / width * 0.035);
    record.element.style.setProperty("--lg-pull-x", `${record.shiftX.toFixed(3)}px`);
    record.element.style.setProperty("--lg-pull-y", `${record.shiftY.toFixed(3)}px`);
    record.element.style.setProperty("--lg-snap-x", `${record.snap.x.toFixed(3)}px`);
    record.element.style.setProperty("--lg-snap-y", `${record.snap.y.toFixed(3)}px`);
    record.element.style.setProperty("--lg-impact-x", `${record.impact.x.toFixed(3)}px`);
    record.element.style.setProperty("--lg-impact-y", `${record.impact.y.toFixed(3)}px`);
    record.element.classList.toggle("is-liquid-impacting", !record.impactSpring.settled);
    record.element.style.setProperty("--lg-scale-x", (stretchX * squeezeX).toFixed(4));
    record.element.style.setProperty("--lg-scale-y", (stretchY * squeezeY).toFixed(4));
    record.element.style.setProperty(
      "--lg-rotate",
      `${Math.max(-1.8, Math.min(1.8, snapshot.pull.x * snapshot.pull.y * 0.00012)).toFixed(3)}deg`,
    );
    record.element.dataset.liquidGlassGesture = snapshot.gesture;
  }

  private updateFusionClasses(snapshot: FusionSnapshot): void {
    const pair = snapshot.pair ? new Set(snapshot.pair) : null;
    for (const record of this.records.values()) {
      const paired = pair?.has(record.id) ?? false;
      record.element.classList.toggle("is-liquid-fusion-pair", paired);
      record.element.style.setProperty("--lg-fusion-readiness", String(paired ? snapshot.readiness : 0));
    }
  }

  private updateFusionPhysics(
    previous: FusionSnapshot,
    current: FusionSnapshot,
    nodes: readonly GlassNode[],
  ): void {
    for (const record of this.records.values()) record.snapTarget = { x: 0, y: 0 };
    if (!current.pair) return;

    const activeNode = nodes.find((node) => node.id === current.pair![0]);
    const targetNode = nodes.find((node) => node.id === current.pair![1]);
    const activeRecord = this.records.get(current.pair[0]);
    const targetRecord = this.records.get(current.pair[1]);
    if (!activeNode || !targetNode || !activeRecord || !targetRecord) return;

    if (activeRecord.interactive) {
      activeRecord.snapTarget = calculateSnapOffset(
        activeNode,
        targetNode,
        current.readiness,
        this.currentSettings.snapStrength,
      );
    }

    const samePair = previous.pair?.[0] === current.pair[0] && previous.pair?.[1] === current.pair[1];
    if (current.phase !== "fused" || (previous.phase === "fused" && samePair)) return;

    const direction = directionBetween(activeNode, targetNode);
    const targetArea = targetNode.rect.width * targetNode.rect.height;
    const impulse = calculateImpactImpulse(
      activeRecord.engine.snapshot.velocity,
      targetArea,
      this.currentSettings.impactResponse,
    );
    if (impulse <= 0) return;

    if (targetRecord.interactive) {
      targetRecord.impactSpring.set(targetRecord.impact, {
        x: direction.x * impulse,
        y: direction.y * impulse,
      });
    }
    if (activeRecord.interactive) {
      activeRecord.impactSpring.set(activeRecord.impact, {
        x: -direction.x * impulse * 0.36,
        y: -direction.y * impulse * 0.36,
      });
    }
  }

  private updateBridge(snapshot: FusionSnapshot, nodes: readonly GlassNode[]): void {
    if (!snapshot.pair || snapshot.readiness <= 0) {
      this.bridge.classList.remove("is-visible");
      return;
    }
    const first = nodes.find((node) => node.id === snapshot.pair![0]);
    const second = nodes.find((node) => node.id === snapshot.pair![1]);
    if (!first || !second) return;
    const a = presentedRect(first);
    const b = presentedRect(second);
    const ax = a.x + a.width / 2;
    const ay = a.y + a.height / 2;
    const bx = b.x + b.width / 2;
    const by = b.y + b.height / 2;
    const distance = Math.hypot(bx - ax, by - ay);
    const angle = Math.atan2(by - ay, bx - ax) * (180 / Math.PI);
    const thickness = Math.max(14, Math.min(a.height, b.height) * (0.18 + snapshot.readiness * 0.46));
    this.bridge.style.setProperty("--lg-bridge-x", `${ax}px`);
    this.bridge.style.setProperty("--lg-bridge-y", `${ay}px`);
    this.bridge.style.setProperty("--lg-bridge-width", `${distance}px`);
    this.bridge.style.setProperty("--lg-bridge-height", `${thickness}px`);
    this.bridge.style.setProperty("--lg-bridge-angle", `${angle}deg`);
    this.bridge.style.setProperty("--lg-bridge-opacity", String(snapshot.readiness));
    this.bridge.classList.add("is-visible");
  }

  private resetElement(element: HTMLElement): void {
    element.classList.remove(
      "liquid-glass-node",
      "is-liquid-interactive",
      "is-liquid-pressed",
      "is-liquid-pulling",
      "is-liquid-fusion-pair",
      "is-liquid-impacting",
    );
    delete element.dataset.liquidGlassId;
    delete element.dataset.liquidGlassFusion;
    delete element.dataset.liquidGlassGesture;
    for (const property of [
      "--lg-origin-x",
      "--lg-origin-y",
      "--lg-pull-x",
      "--lg-pull-y",
      "--lg-snap-x",
      "--lg-snap-y",
      "--lg-impact-x",
      "--lg-impact-y",
      "--lg-scale-x",
      "--lg-scale-y",
      "--lg-rotate",
      "--lg-fusion-readiness",
    ]) {
      element.style.removeProperty(property);
    }
  }
}

function readRadius(element: HTMLElement): number {
  const radius = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
  return Number.isFinite(radius) ? radius : 24;
}
