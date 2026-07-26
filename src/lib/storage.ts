import AsyncStorage from "@react-native-async-storage/async-storage";
import { PackingItem, PlanEntry, ScheduleSlot } from "./types";
import { BaseMode, EdgeTravel } from "./transit";

const STORAGE_KEY = "tabinavi.state.v2";

export interface PersistedState {
  version: 2;
  /** ユーザーが追加した行き先リスト（主入力） */
  entries: PlanEntry[];
  /** 直近に組み上げた時刻割り当て（旅程イベントは entries+slots から都度導出する） */
  slots: ScheduleSlot[];
  /** 当日画面の到着記録済みノードキー */
  currentNodeKey: string | null;
  /** 到着記録を行った時刻（ISO）。遅れの自己申告を時刻ベースの自動進行より優先するために使う */
  currentNodeSetAt?: string | null;
  /** 持ち物チェックリスト */
  packing: PackingItem[];
  /** 旅行の開始日（YYYY-MM-DD） */
  tripDate?: string;
  /** 旅行の日数 */
  tripDayCount?: number;
  /** 基本の移動手段 */
  baseMode?: BaseMode;
  /** 実測の移動時間キャッシュ（edgeKey → 分）。リロード時のDirections API再取得を減らす */
  transitCache?: Record<string, EdgeTravel>;
  savedAt: string;
}

export async function loadState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== 2) return null;
    return parsed as PersistedState;
  } catch {
    return null;
  }
}

/** 保存の成否を返す（true=成功）。容量不足等の失敗は呼び出し側でユーザーに知らせる。 */
export async function saveState(state: PersistedState): Promise<boolean> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無視
  }
}
