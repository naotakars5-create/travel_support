export type TransportMode =
  | "air"
  | "rail"
  | "bus"
  | "walk"
  | "car"
  | "stay"
  | "dining"
  | "activity"
  | "home";

export interface ParsedField {
  key: string;
  value: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface ParsedEvent {
  id: string;
  mode: TransportMode;
  title: string;
  /** ISO8601 */
  startAt: string;
  /** ISO8601 */
  endAt?: string;
  placeFrom?: string;
  placeTo?: string;
  detail?: string;
  reservationNo?: string;
  price?: number;
  source: string;
  fields: ParsedField[];
  /** 0-1 */
  confidence: number;
  /** placeFrom の座標（ジオコーディング済みの場合） */
  placeFromGeo?: GeoPoint;
  /** placeTo の座標（ジオコーディング済みの場合） */
  placeToGeo?: GeoPoint;
  /** この地点からの（またはこの地点への）移動手段の指定。出発地で使う */
  travelMode?: "car" | "walk" | "rail";
}

/** 行き先の重要度（時間が足りない時にAIが取捨選択する優先度）。 */
export type Priority = "must" | "want" | "optional";

/**
 * ユーザーが自分で追加する「行きたい場所／予定」1件。
 * これを溜めていくと、AI（またはローカル・ヒューリスティック）が到着時刻順に
 * 旅程へ組み上げる。予約メールから取り込んだ確定予定は fixedTime=true の anchor になる。
 */
export interface PlanEntry {
  id: string;
  /** 行き先名（例: 中之島美術館） */
  title: string;
  /** 住所（ジオコーディング用。未指定なら title を使う） */
  place?: string;
  /** ジオコーディング済み座標（地図・移動時間・周辺提案に使う） */
  placeGeo?: GeoPoint;
  mode: TransportMode;
  /** 重要度。時間が足りない時にAIが optional から外す判断に使う */
  priority: Priority;
  /** 滞在時間の目安（分） */
  stayMin?: number;
  /** 目安到着時間（ISO8601）。未指定なら前後関係から自動で割り当てる */
  arriveBy?: string;
  /** 予約など時刻が確定していて動かせない場合 true */
  fixedTime?: boolean;
  /** 費用（円）。予算メモ用 */
  cost?: number;
  detail?: string;
  /** 由来。"手入力" | "メール" | 事業者名 など */
  source: string;
  /** 何日目か（1始まり）。複数日程で使う。未指定は1日目扱い。 */
  day?: number;

  /** 営業・開館時間（開始, "HH:MM"）。AIや自動配置がこの時刻より前に置かないようにする。 */
  openFrom?: string;
  /** 営業・開館時間（終了, "HH:MM"）。閉店までに滞在が収まるように配置する。 */
  openTo?: string;

  // --- 移動系（鉄道・バス・飛行機・車）専用 ---
  /** 出発地 */
  placeFrom?: string;
  placeFromGeo?: GeoPoint;
  /** 到着地 */
  placeTo?: string;
  placeToGeo?: GeoPoint;
  /** 出発時刻（ISO8601）。移動系で使う（arriveBy は到着時刻になる） */
  departAt?: string;

  // --- 宿泊専用 ---
  /** チェックアウト時刻（ISO8601）。宿泊で使う（arriveBy はチェックイン） */
  checkOut?: string;

  // --- 出発地専用 ---
  /** 出発地→最初のスポット／最後のスポット→帰着 の移動手段（車・電車バス・徒歩） */
  travelMode?: "car" | "walk" | "rail";
}

/** AIが返す1件の時刻割り当て（どの行き先に、何時に着いて、何分居るか）。 */
export interface ScheduleSlot {
  entryId: string;
  /** ISO8601 */
  arriveAt: string;
  stayMin: number;
}

/** AIが計画中に提案する立ち寄りスポット候補。 */
export interface SpotSuggestion {
  title: string;
  area?: string;
  note?: string;
  mode?: TransportMode;
  stayMin?: number;
}

export type PlanApiResponse =
  | { kind: "plan"; schedule: ScheduleSlot[]; suggestions: SpotSuggestion[]; notes?: string }
  | { kind: "error"; message: string };

/** 持ち物チェックリストの1項目。 */
export interface PackingItem {
  id: string;
  label: string;
  checked: boolean;
}

/** 予約メール解析（補助機能・/api/parse）のレスポンス。 */
export type ParseApiResponse =
  | { kind: "events"; events: ParsedEvent[] }
  | { kind: "skip" }
  | { kind: "error"; message: string };

/** 移動手段カテゴリ（路線図の色分け用） */
export const TRANSIT_MODES: TransportMode[] = ["air", "rail", "bus", "walk", "car"];

export function isTransitMode(mode: TransportMode): boolean {
  return (TRANSIT_MODES as string[]).includes(mode);
}
