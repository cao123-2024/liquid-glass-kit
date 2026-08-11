import { useCallback, useState } from "react";

import { DEFAULT_SETTINGS, PRESETS, normalizeSettings } from "../core/settings";
import type { LiquidGlassSettings, SettingsPresetName } from "../core/types";

export function useLiquidGlassSettings(initial?: Partial<LiquidGlassSettings>) {
  const [settings, setSettingsState] = useState<LiquidGlassSettings>(() =>
    normalizeSettings({ ...DEFAULT_SETTINGS, ...initial }),
  );

  const setSettings = useCallback((next: Partial<LiquidGlassSettings>) => {
    setSettingsState((current) => normalizeSettings({ ...current, ...next }));
  }, []);

  const applyPreset = useCallback((preset: SettingsPresetName) => {
    setSettingsState((current) => ({ ...PRESETS[preset], fusionEnabled: current.fusionEnabled }));
  }, []);

  const reset = useCallback(() => setSettingsState({ ...DEFAULT_SETTINGS }), []);

  return { settings, setSettings, applyPreset, reset } as const;
}
