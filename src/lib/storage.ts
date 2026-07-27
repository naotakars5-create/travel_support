import AsyncStorage from "@react-native-async-storage/async-storage";
import { PackingItem, PlanEntry, ScheduleSlot } from "./types";
import { BaseMode, EdgeTravel } from "./transit";

const STORAGE_KEY = "tabinavi.state.v2";

export interface PersistedState {
  /** 2 = 旅の名前を持たない旧形式。3 で旅の名前・行き先・しおりとの紐付けを追加。 */
  version: 2 | 3;
  /** 旅の名前（例: 香川ふたり旅）。空なら日付から自動で付ける */
  tripName?: string;
  /** 行き先（例: 香川県 高松・小豆島）。ヒーローとしおりの表紙に使う */
  tripDestination?: string;
  /** しおり一覧の中で、この旅がどれかを指すID */
  activeTripId?: string | null;
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
  /** AIへのお願い（自由文）。旅程を組むときの希望として毎回渡す */
  planRequest?: string;
  savedAt: string;
}

export async function loadState(): Promise<PersistedState | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // v2（旅の名前を持たない形式）もそのまま読める。足りない項目は後から埋まる。
    if (parsed?.version !== 2 && parsed?.version !== 3) return null;
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
