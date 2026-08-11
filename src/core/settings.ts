import type { LiquidGlassSettings, SettingsPresetName } from "./types";

const STORAGE_VERSION = 1;

export const DEFAULT_SETTINGS: Readonly<LiquidGlassSettings> = Object.freeze({
  fusionEnabled: false,
  prepareDistance: 28,
  contactDistance: 2,
  bridgeStrength: 0.56,
  viscosity: 0.64,
  snapStrength: 0.18,
  rebound: 0.22,
  impactResponse: 0.16,
  dragResistance: 0.55,
});

export const PRESETS: Readonly<Record<SettingsPresetName, Readonly<LiquidGlassSettings>>> = Object.freeze({
  soft: Object.freeze({
    ...DEFAULT_SETTINGS,
    bridgeStrength: 0.42,
    viscosity: 0.46,
    snapStrength: 0.1,
    rebound: 0.16,
    impactResponse: 0.1,
  }),
  balanced: DEFAULT_SETTINGS,
  viscous: Object.freeze({
    ...DEFAULT_SETTINGS,
    prepareDistance: 36,
    bridgeStrength: 0.74,
    viscosity: 0.84,
    snapStrength: 0.26,
    rebound: 0.18,
    impactResponse: 0.2,
  }),
});

type UnknownSettings = Partial<Record<keyof LiquidGlassSettings, unknown>>;

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

function finiteOrDefault(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, minimum, maximum)
    : fallback;
}

export function normalizeSettings(input: UnknownSettings | null | undefined): LiquidGlassSettings {
  const value = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const prepareDistance = finiteOrDefault(
    value.prepareDistance,
    DEFAULT_SETTINGS.prepareDistance,
    0,
    160,
  );

  return {
    fusionEnabled:
      typeof value.fusionEnabled === "boolean" ? value.fusionEnabled : DEFAULT_SETTINGS.fusionEnabled,
    prepareDistance,
    contactDistance: finiteOrDefault(
      value.contactDistance,
      Math.min(DEFAULT_SETTINGS.contactDistance, prepareDistance),
      0,
      prepareDistance,
    ),
    bridgeStrength: finiteOrDefault(value.bridgeStrength, DEFAULT_SETTINGS.bridgeStrength, 0, 1),
    viscosity: finiteOrDefault(value.viscosity, DEFAULT_SETTINGS.viscosity, 0, 1),
    snapStrength: finiteOrDefault(value.snapStrength, DEFAULT_SETTINGS.snapStrength, 0, 1),
    rebound: finiteOrDefault(value.rebound, DEFAULT_SETTINGS.rebound, 0, 1),
    impactResponse: finiteOrDefault(value.impactResponse, DEFAULT_SETTINGS.impactResponse, 0, 1),
    dragResistance: finiteOrDefault(value.dragResistance, DEFAULT_SETTINGS.dragResistance, 0, 1),
  };
}

interface PersistedSettings {
  version: number;
  settings: UnknownSettings;
}

export class SettingsStore {
  static readonly key = "liquid-glass-kit:v1";

  constructor(private readonly storage?: Storage | null) {}

  load(): LiquidGlassSettings {
    if (!this.storage) return { ...DEFAULT_SETTINGS };

    try {
      const raw = this.storage.getItem(SettingsStore.key);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(raw) as Partial<PersistedSettings> | null;
      if (!parsed || parsed.version !== STORAGE_VERSION || !parsed.settings) {
        return { ...DEFAULT_SETTINGS };
      }
      return normalizeSettings(parsed.settings);
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  save(settings: UnknownSettings): LiquidGlassSettings {
    const normalized = normalizeSettings(settings);
    this.storage?.setItem(
      SettingsStore.key,
      JSON.stringify({ version: STORAGE_VERSION, settings: normalized } satisfies PersistedSettings),
    );
    return normalized;
  }

  reset(): LiquidGlassSettings {
    this.storage?.removeItem(SettingsStore.key);
    return { ...DEFAULT_SETTINGS };
  }
}

export type { LiquidGlassSettings, SettingsPresetName } from "./types";
