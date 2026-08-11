import "./demo.css";

import { DEFAULT_SETTINGS, PRESETS, SettingsStore } from "../src/core/settings";
import type { LiquidGlassSettings, SettingsPresetName } from "../src/core/types";
import { LiquidGlassGroup } from "../src/dom/liquid-glass-group";

const root = required<HTMLElement>("[data-liquid-root]");
const storage = new SettingsStore(globalThis.localStorage);
const group = new LiquidGlassGroup(root, { settings: storage.load(), quality: "high" });
const phaseOutput = required<HTMLElement>("[data-phase-output]");
const runtimeStatus = required<HTMLElement>("[data-runtime-status]");

for (const element of document.querySelectorAll<HTMLElement>("[data-liquid-id]")) {
  group.register(element, {
    id: element.dataset.liquidId!,
    fusion: element.dataset.liquidFusion !== "false",
    radius: Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || undefined,
  });
}

document.querySelectorAll<HTMLButtonElement>("[data-action='toggle']").forEach((button) => {
  button.addEventListener("click", () => {
    const checked = button.getAttribute("aria-checked") !== "true";
    button.setAttribute("aria-checked", String(checked));
    button.classList.toggle("is-on", checked);
  });
});

const playButton = required<HTMLButtonElement>("[data-action='play']");
playButton.addEventListener("click", () => {
  const playing = playButton.dataset.playing !== "true";
  playButton.dataset.playing = String(playing);
  playButton.setAttribute("aria-label", playing ? "暂停" : "播放");
  const icon = required<SVGElement>("[data-play-icon]", playButton);
  icon.setAttribute("aria-label", playing ? "暂停图标" : "播放图标");
  required<SVGPathElement>("path", icon).setAttribute(
    "d",
    playing ? "M8.5 6.5v11M15.5 6.5v11" : "m9 6 9 6-9 6z",
  );
});

const volume = required<HTMLInputElement>("[data-action='volume']");
volume.addEventListener("input", () => {
  required<HTMLOutputElement>("[data-volume-output]").value = volume.value;
});

required<HTMLButtonElement>("[data-action='join']").addEventListener("click", (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  button.textContent = button.dataset.joined === "true" ? "Join room" : "Joined";
  button.dataset.joined = button.dataset.joined === "true" ? "false" : "true";
});

const fusionSwitch = required<HTMLButtonElement>("[data-setting='fusionEnabled']");
fusionSwitch.addEventListener("click", () => {
  const enabled = fusionSwitch.getAttribute("aria-checked") !== "true";
  const settings = persist(group.setSettings({ fusionEnabled: enabled }));
  syncSettings(settings, "custom");
});

document.querySelectorAll<HTMLInputElement>("input[data-setting]").forEach((input) => {
  input.addEventListener("input", () => {
    const key = input.dataset.setting as keyof LiquidGlassSettings;
    const settings = persist(group.setSettings({ [key]: Number(input.value) }));
    syncSettings(settings, "custom");
  });
});

document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => {
    const preset = button.dataset.preset as SettingsPresetName;
    const fusionEnabled = group.settings.fusionEnabled;
    const settings = persist(group.setSettings({ ...PRESETS[preset], fusionEnabled }));
    syncSettings(settings, preset);
  });
});

required<HTMLButtonElement>("[data-action='reset']").addEventListener("click", () => {
  storage.reset();
  group.resetSettings();
  syncSettings(DEFAULT_SETTINGS, "balanced");
});

const statusObserver = new MutationObserver(updatePhase);
statusObserver.observe(root, { attributes: true, attributeFilter: ["data-liquid-glass-phase"] });
globalThis.addEventListener("pagehide", () => {
  statusObserver.disconnect();
  group.destroy();
});

syncSettings(group.settings, detectPreset(group.settings));
updatePhase();

function persist(settings: LiquidGlassSettings): LiquidGlassSettings {
  storage.save(settings);
  return settings;
}

function syncSettings(settings: Readonly<LiquidGlassSettings>, preset: SettingsPresetName | "custom"): void {
  fusionSwitch.setAttribute("aria-checked", String(settings.fusionEnabled));
  root.dataset.liquidGlassFusionEnabled = String(settings.fusionEnabled);
  for (const input of document.querySelectorAll<HTMLInputElement>("input[data-setting]")) {
    const key = input.dataset.setting as keyof LiquidGlassSettings;
    input.value = String(settings[key]);
    const output = document.querySelector<HTMLOutputElement>(`[data-output='${key}']`);
    if (output) output.value = `${settings[key]}${key.endsWith("Distance") ? " px" : ""}`;
  }
  document.querySelectorAll<HTMLButtonElement>("[data-preset]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.preset === preset);
  });
  updatePhase();
}

function updatePhase(): void {
  const phase = root.dataset.liquidGlassPhase ?? (group.settings.fusionEnabled ? "idle" : "disabled");
  phaseOutput.textContent = phase.toUpperCase();
  const copy: Record<string, string> = {
    disabled: "融合关闭 · 各组件保持独立",
    idle: "融合待命 · 需要主动拉动",
    pulling: "正在拉伸 · 尚未进入准备距离",
    preparing: "融合准备 · 接近目标边缘",
    fused: "临时融合 · 松手后立即解除",
    returning: "回弹中 · 正在返回固定锚点",
  };
  runtimeStatus.textContent = copy[phase] ?? "融合待命 · 需要主动拉动";
}

function detectPreset(settings: Readonly<LiquidGlassSettings>): SettingsPresetName | "custom" {
  for (const [name, preset] of Object.entries(PRESETS) as [SettingsPresetName, Readonly<LiquidGlassSettings>][]) {
    const matches = (Object.keys(DEFAULT_SETTINGS) as (keyof LiquidGlassSettings)[])
      .filter((key) => key !== "fusionEnabled")
      .every((key) => settings[key] === preset[key]);
    if (matches) return name;
  }
  return "custom";
}

function required<T extends Element>(selector: string, rootElement: ParentNode = document): T {
  const element = rootElement.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required demo element: ${selector}`);
  return element;
}
