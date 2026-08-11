import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  PRESETS,
  SettingsStore,
  normalizeSettings,
} from "../src/core/settings";

describe("normalizeSettings", () => {
  it("keeps explicit booleans and clamps numeric ranges", () => {
    const result = normalizeSettings({
      fusionEnabled: true,
      prepareDistance: 999,
      contactDistance: -5,
      bridgeStrength: 4,
    });

    expect(result.fusionEnabled).toBe(true);
    expect(result.prepareDistance).toBe(160);
    expect(result.contactDistance).toBe(0);
    expect(result.bridgeStrength).toBe(1);
  });

  it("replaces non-finite and mistyped values with defaults", () => {
    const result = normalizeSettings({
      prepareDistance: Number.NaN,
      rebound: "high",
      fusionEnabled: "yes",
    } as unknown as Record<string, unknown>);

    expect(result).toEqual(DEFAULT_SETTINGS);
  });

  it("provides complete immutable presets", () => {
    expect(PRESETS.balanced).toEqual(DEFAULT_SETTINGS);
    expect(PRESETS.soft.fusionEnabled).toBe(false);
    expect(PRESETS.viscous.viscosity).toBeGreaterThan(PRESETS.soft.viscosity);
  });
});

describe("SettingsStore", () => {
  it("round-trips versioned settings and resets every field", () => {
    const storage = new MemoryStorage();
    const store = new SettingsStore(storage);

    store.save({ ...DEFAULT_SETTINGS, fusionEnabled: true, prepareDistance: 44 });
    expect(store.load().fusionEnabled).toBe(true);
    expect(store.load().prepareDistance).toBe(44);
    expect(store.reset()).toEqual(DEFAULT_SETTINGS);
    expect(store.load()).toEqual(DEFAULT_SETTINGS);
  });

  it("falls back when persisted data is corrupt or from another version", () => {
    const storage = new MemoryStorage();
    const store = new SettingsStore(storage);

    storage.setItem(SettingsStore.key, "not-json");
    expect(store.load()).toEqual(DEFAULT_SETTINGS);

    storage.setItem(SettingsStore.key, JSON.stringify({ version: 99, settings: { fusionEnabled: true } }));
    expect(store.load()).toEqual(DEFAULT_SETTINGS);
  });
});

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
