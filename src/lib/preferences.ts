import { Store } from "@tauri-apps/plugin-store";

export type CreatureSize = "small" | "medium" | "large";
export type Corner = "tl" | "tr" | "bl" | "br";

export interface SleepSchedule {
  enabled: boolean;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
}

export interface Preferences {
  creature_size: CreatureSize;
  default_corner: Corner;
  idle_opacity: number;
  insight_cap_per_day: number;
  bubble_sound_enabled: boolean;
  privacy_hotkey: string | null;
}

export const PREF_DEFAULTS: Preferences = {
  creature_size: "medium",
  default_corner: "br",
  idle_opacity: 0.35,
  insight_cap_per_day: 3,
  bubble_sound_enabled: false,
  privacy_hotkey: null,
};

export const SIZE_MULTIPLIERS: Record<CreatureSize, number> = {
  small: 0.75,
  medium: 1.0,
  large: 1.4,
};

const STORE_FILE = "wisp-settings.json";
let _store: Store | null = null;

async function store(): Promise<Store> {
  if (!_store) _store = await Store.load(STORE_FILE);
  return _store;
}

export async function loadPreferences(): Promise<Preferences> {
  const s = await store();
  const out = { ...PREF_DEFAULTS };
  for (const key of Object.keys(PREF_DEFAULTS) as (keyof Preferences)[]) {
    const val = await s.get(key);
    if (val !== null && val !== undefined) {
      (out as Record<string, unknown>)[key] = val;
    }
  }
  return out;
}

export async function savePref<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): Promise<void> {
  const s = await store();
  await s.set(key, value);
  await s.save();
}

export async function loadSleepSchedule(): Promise<SleepSchedule> {
  const s = await store();
  const val = await s.get<SleepSchedule>("sleep_schedule");
  return val ?? { enabled: false, start_hour: 22, start_minute: 0, end_hour: 7, end_minute: 0 };
}
