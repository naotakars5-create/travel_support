import AsyncStorage from "@react-native-async-storage/async-storage";
import { PackingItem, PlanEntry, ScheduleSlot } from "./types";
import { BaseMode } from "./transit";

const TRIPS_KEY = "tabinavi.trips.v1";

/** 保存された旅（後から呼び出せる旅程の履歴）。 */
export interface SavedTrip {
  id: string;
  /** 旅の名前（例: 大阪日帰り） */
  name: string;
  /** しおりの表紙写真（data URL・任意） */
  coverPhoto?: string;
  /** 保存日時（ISO8601） */
  savedAt: string;
  entries: PlanEntry[];
  slots: ScheduleSlot[];
  packing: PackingItem[];
  tripDate: string;
  tripDayCount: number;
  baseMode: BaseMode;
}

export async function loadTrips(): Promise<SavedTrip[]> {
  try {
    const raw = await AsyncStorage.getItem(TRIPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedTrip[];
  } catch {
    return [];
  }
}

export async function saveTrips(trips: SavedTrip[]): Promise<void> {
  try {
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  } catch {
    // 書き込み失敗は無視
  }
}
