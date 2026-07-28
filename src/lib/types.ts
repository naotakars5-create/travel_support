export type TransportMode =
  | "air"
  | "rail"
  | "bus"
  | "walk"
  | "car"
  | "stay"
  | "dining"
  | "activity"
  | "rental";

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
  /** 定休日（0=日 … 6=土）。旅程で「定休日と重なっている」警告に使う */
  closedDays?: number[];
  /** スポット写真の参照ID（Places Photo） */
  photoRef?: string;
  /** 写真の提供元表示（Googleの規約で表示が必須） */
  photoAttribution?: string;
}

/** 行き先の重要度（時間が足りない時にAIが取捨選択する優先度）。 */
export type Priority = "must" | "want" | "optional";

/**
 * 「いつ行きたいか」の希望。上ほどゆるく、下ほど強い。
 *
 * 行き先リストは「行きたい所をどんどん足していく場所」なので、
 * ここで時刻まで決めきる必要はない。決まっている分だけ伝えれば、
 * 残りはAIが埋める、という段階を持たせるための型。
 *
 * - any    … こだわらない（日も時間もAIに任せる）
 * - day    … その日ならいつでも（何日目だけ指定）
 * - period … 午前・午後・夕方・夜のどれか
 * - window … 時間の範囲（10:00〜12:00 など）
 * - fixed  … 時刻が決まっている（予約など。絶対に動かさない）
 */
export type TimeWishKind = "any" | "day" | "period" | "window" | "fixed";

/** 1日の時間帯。 */
export type DayPeriod = "morning" | "afternoon" | "evening" | "night";

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

  /**
   * いつ行きたいかの希望。未指定の古いデータは fixedTime / day から推測する
   * （`timeWishOf()` を通して読むこと）。
   */
  wish?: TimeWishKind;
  /** wish="period" のときの時間帯 */
  period?: DayPeriod;
  /** wish="window" のときの範囲（"HH:MM"） */
  windowFrom?: string;
  windowTo?: string;

  /** 営業・開館時間（開始, "HH:MM"）。AIや自動配置がこの時刻より前に置かないようにする。 */
  openFrom?: string;
  /** 営業・開館時間（終了, "HH:MM"）。閉店までに滞在が収まるように配置する。 */
  openTo?: string;
  /** 定休日（0=日 … 6=土）。この曜日には配置しない・警告を出す。不明なら undefined */
  closedDays?: number[];
  /** スポット写真の参照ID（Places Photo）。旅程やしおりの表紙に使う */
  photoRef?: string;
  /** 写真の提供元表示（Googleの規約で表示が必須） */
  photoAttribution?: string;

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
