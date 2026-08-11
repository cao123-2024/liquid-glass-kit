import "./demo.css";

import { DEFAULT_SETTINGS, PRESETS, SettingsStore } from "../src/core/settings";
import type { LiquidGlassSettings, SettingsPresetName } from "../src/core/types";
import { LiquidGlassGroup } from "../src/dom/liquid-glass-group";

const root = required<HTMLElement>("[data-liquid-root]");
const storage = new SettingsStore(globalThis.localStorage);
const group = new LiquidGlassGroup(root, { settings: storage.load(), quality: "high" });
const phaseOutput = required<HTMLElement>("[data-phase-output]");
const runtimeStatus = required<HTMLElement>("[data-runtime-status]");
const tracks = [
  ["Blue Hour Study", "Glasshouse No. 4", "North Campus Field Recordings"],
  ["Rain on Concrete", "Library After Dark", "East Wing Field Recordings"],
  ["First Bell", "Courtyard No. 2", "Morning Assembly Tapes"],
] as const;
let trackIndex = 0;

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

document.querySelectorAll<HTMLButtonElement>("[data-action='track']").forEach((button) => {
  button.addEventListener("click", () => {
    const direction = Number(button.dataset.direction) || 1;
    trackIndex = (trackIndex + direction + tracks.length) % tracks.length;
    const [eyebrow, title, source] = tracks[trackIndex]!;
    const copy = required<HTMLElement>(".track-copy");
    required<HTMLElement>("p", copy).textContent = eyebrow;
    required<HTMLElement>("h2", copy).textContent = title;
    required<HTMLElement>("span", copy).textContent = source;
    showToast(`正在播放 ${title}`);
  });
});

required<HTMLButtonElement>("[data-action='more']").addEventListener("click", () => {
  showToast("队列、设备与音频设置已就绪");
});

const brightness = required<HTMLInputElement>("[data-action='brightness']");
brightness.addEventListener("input", () => {
  required<HTMLOutputElement>("[data-brightness-output]").value = brightness.value;
  document.documentElement.style.setProperty(
    "--scene-brightness",
    (Number(brightness.value) / 100 * 0.78).toFixed(3),
  );
});

required<HTMLButtonElement>("[data-action='join']").addEventListener("click", (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const joined = button.dataset.joined !== "true";
  button.textContent = joined ? "Joined" : "Join room";
  button.dataset.joined = String(joined);
  showToast(joined ? "已加入 Design Systems Review" : "已退出会议室");
});

const componentSearch = required<HTMLInputElement>("[data-component-search]");
const catalogueItems = [...document.querySelectorAll<HTMLElement>("[data-search]")];
const catalogueCount = required<HTMLElement>("[data-catalogue-count]");
const catalogueEmpty = required<HTMLElement>("[data-catalogue-empty]");
let catalogueFilter = "all";

componentSearch.addEventListener("input", applyCatalogueFilter);

document.querySelectorAll<HTMLButtonElement>("[data-action='catalogue-tab']").forEach((button) => {
  button.addEventListener("click", () => {
    catalogueFilter = button.dataset.filter ?? "all";
    document.querySelectorAll<HTMLButtonElement>("[data-action='catalogue-tab']").forEach((tab) => {
      const selected = tab === button;
      tab.setAttribute("aria-selected", String(selected));
      tab.classList.toggle("is-selected", selected);
    });
    applyCatalogueFilter();
  });
});

document.querySelectorAll<HTMLButtonElement>("[data-action='catalogue-preview']").forEach((button) => {
  button.addEventListener("click", () => {
    showToast(`${required<HTMLElement>("b", button).textContent ?? "组件"} 已准备好复用`);
  });
});

document.querySelectorAll<HTMLButtonElement>("[data-action='task']").forEach((button) => {
  button.addEventListener("click", () => {
    const checked = button.getAttribute("aria-checked") !== "true";
    button.setAttribute("aria-checked", String(checked));
    button.classList.toggle("is-done", checked);
    showToast(checked ? "任务已完成" : "任务已恢复");
  });
});

const sessionProgress = required<HTMLInputElement>("[data-action='session-progress']");
const sessionOrbit = required<HTMLElement>("[data-session-orbit]");
const sessionOutput = required<HTMLElement>("[data-session-output]");
sessionProgress.addEventListener("input", () => {
  sessionOrbit.style.setProperty("--session-progress", sessionProgress.value);
  sessionOutput.textContent = `${sessionProgress.value}%`;
});

required<HTMLButtonElement>("[data-action='session-toggle']").addEventListener("click", (event) => {
  const button = event.currentTarget as HTMLButtonElement;
  const running = button.getAttribute("aria-pressed") !== "true";
  button.setAttribute("aria-pressed", String(running));
  button.textContent = running ? "暂停专注" : "开始专注";
  showToast(running ? "专注计时已开始" : "专注计时已暂停");
});

document.querySelectorAll<HTMLButtonElement>("[data-action='dock']").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll<HTMLButtonElement>("[data-action='dock']").forEach((item) => {
      if (item === button) item.setAttribute("aria-current", "page");
      else item.removeAttribute("aria-current");
    });
    showToast(`已切换到${button.dataset.view ?? "页面"}`);
  });
});

const focusComponentSearch = (): void => {
  componentSearch.scrollIntoView({ behavior: "smooth", block: "center" });
  componentSearch.focus({ preventScroll: true });
  showToast("输入名称即可筛选组件");
};

required<HTMLButtonElement>("[data-action='command']").addEventListener("click", focusComponentSearch);
globalThis.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    focusComponentSearch();
  }
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
  showToast("所有材质参数已恢复默认");
});

const statusObserver = new MutationObserver(updatePhase);
statusObserver.observe(root, { attributes: true, attributeFilter: ["data-liquid-glass-phase"] });
globalThis.addEventListener("pagehide", () => {
  statusObserver.disconnect();
  if (toastTimer !== undefined) globalThis.clearTimeout(toastTimer);
  group.destroy();
});

syncSettings(group.settings, detectPreset(group.settings));
updatePhase();

function applyCatalogueFilter(): void {
  const query = componentSearch.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const item of catalogueItems) {
    const matchesText = !query || (item.dataset.search ?? "").toLocaleLowerCase().includes(query);
    const matchesFilter = catalogueFilter === "all" || item.dataset.kind === catalogueFilter;
    item.hidden = !(matchesText && matchesFilter);
    if (!item.hidden) visible += 1;
  }
  catalogueCount.textContent = `${visible} item${visible === 1 ? "" : "s"}`;
  catalogueEmpty.hidden = visible !== 0;
}

let toastTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
function showToast(message: string): void {
  const region = required<HTMLElement>("[data-toast-region]");
  region.textContent = message;
  region.classList.add("is-visible");
  if (toastTimer !== undefined) globalThis.clearTimeout(toastTimer);
  toastTimer = globalThis.setTimeout(() => region.classList.remove("is-visible"), 2200);
}

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
