import AsyncStorage from "@react-native-async-storage/async-storage";
import { PackingItem, PlanEntry, ScheduleSlot } from "./types";
import { BaseMode } from "./transit";

const STORAGE_KEY = "tabinavi.state.v2";

export interface PersistedState {
  version: 2;
  /** ユーザーが追加した行き先リスト（主入力） */
  entries: PlanEntry[];
  /** 直近に組み上げた時刻割り当て（旅程イベントは entries+slots から都度導出する） */
  slots: ScheduleSlot[];
  /** 当日画面の到着記録済みノードキー */
  currentNodeKey: string | null;
  /** 持ち物チェックリスト */
  packing: PackingItem[];
  /** 旅行日（YYYY-MM-DD） */
  tripDate?: string;
  /** 基本の移動手段 */
  baseMode?: BaseMode;
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

export async function saveState(state: PersistedState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ストレージ書き込み失敗は無視
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // 無視
  }
}
