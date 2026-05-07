import { Store } from "@tauri-apps/plugin-store";

export type Corner = "tl" | "tr" | "bl" | "br";

export interface SleepSchedule {
  enabled: boolean;
  start_hour: number;
  start_minute: number;
  end_hour: number;
  end_minute: number;
}

export interface Preferences {
  creature_scale: number;
  default_corner: Corner;
  idle_opacity: number;
  bubble_sound_enabled: boolean;
  privacy_hotkey: string | null;
}

export const PREF_DEFAULTS: Preferences = {
  creature_scale: 1.0,
  default_corner: "br",
  idle_opacity: 0.35,
  bubble_sound_enabled: false,
  privacy_hotkey: null,
};

const STORE_FILE = "polter-settings.json";
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
