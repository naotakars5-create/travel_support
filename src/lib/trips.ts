import AsyncStorage from "@react-native-async-storage/async-storage";
import { PackingItem, PlanEntry, ScheduleSlot } from "./types";
import { BaseMode } from "./transit";
import { idbAvailable, idbGet, idbSet } from "./idbKv";

const TRIPS_KEY = "tabinavi.trips.v1";

/** 保存された旅（後から呼び出せる旅程の履歴）。 */
export interface SavedTrip {
  id: string;
  /** 旅の名前（例: 大阪日帰り） */
  name: string;
  /** しおりの表紙写真（data URL・任意） */
  coverPhoto?: string;
  /** 旅の思い出写真（data URL・最大30枚） */
  photos?: string[];
  /** 保存日時（ISO8601） */
  savedAt: string;
  entries: PlanEntry[];
  slots: ScheduleSlot[];
  packing: PackingItem[];
  tripDate: string;
  tripDayCount: number;
  baseMode: BaseMode;
  /** AIへのお願い（自由文）。旅を読み込んだときに一緒に戻す */
  planRequest?: string;
  /** 地域から自動取得した表紙写真（手動設定の coverPhoto が無いときに使う） */
  autoCover?: { url: string; credit: string; creditUrl: string };
  /** 自動表紙を探した地域名（同じ地域を何度も問い合わせないための目印） */
  autoCoverRegion?: string;
}

/** 思い出写真の上限枚数。 */
export const MAX_TRIP_PHOTOS = 30;

async function loadFromAsyncStorage(): Promise<SavedTrip[]> {
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

export async function loadTrips(): Promise<SavedTrip[]> {
  // 写真は容量が大きいため、Web では IndexedDB を優先（localStorage の 5MB 制限を回避）。
  if (idbAvailable()) {
    const fromIdb = await idbGet<SavedTrip[]>(TRIPS_KEY);
    if (Array.isArray(fromIdb)) return fromIdb;
    // 旧 localStorage 保存分があれば IndexedDB へ移行する。
    const legacy = await loadFromAsyncStorage();
    if (legacy.length > 0) await idbSet(TRIPS_KEY, legacy);
    return legacy;
  }
  return loadFromAsyncStorage();
}

/** 保存の成否を返す（true=成功）。失敗時は呼び出し側でユーザーに通知する。 */
export async function saveTrips(trips: SavedTrip[]): Promise<boolean> {
  if (idbAvailable()) {
    const ok = await idbSet(TRIPS_KEY, trips);
    if (ok) {
      // 二重持ちを避け、旧 localStorage 分の容量を解放する。
      try {
        await AsyncStorage.removeItem(TRIPS_KEY);
      } catch {
        // 解放失敗は致命的でないため無視
      }
      return true;
    }
  }
  try {
    await AsyncStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    return true;
  } catch {
    return false;
  }
}
