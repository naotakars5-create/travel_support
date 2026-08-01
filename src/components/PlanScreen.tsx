import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlanEntry, Priority, SpotSuggestion } from "@/lib/types";
import {
  PlanTotals,
  PRIORITY_META,
  closedDaysLabel,
  effectiveStayMin,
  entryDurationMin,
  isClosedOn,
  timeWishOf,
  wishLabel,
  COST_CATEGORY_LABEL,
  COST_CATEGORY_ORDER,
} from "@/lib/plan";
import { BaseMode } from "@/lib/transit";
import { MODE_LABEL } from "@/lib/modeMeta";
import { formatDurationMin } from "@/lib/itinerary";
import { dateForDay, formatJstMonthDayJa, formatJstTime } from "@/lib/date";
import { formatYen } from "@/lib/format";
import { DateOnlyField, SelectField } from "./PlainFields";
import { Illustration, illustrationUri } from "./Illustration";
import { SpotThumb } from "./SpotThumb";
import { FlowSteps } from "./FlowSteps";
import { COLORS, dayColor, tint } from "@/lib/palette";
import { Floater } from "./animations";
import { Button, SectionHeading } from "./ui";
import { LodgingNight, lodgingNights, lodgingPrefecture, lodgingProgress } from "@/lib/lodgingAd";
import { rentalAd } from "@/lib/rentalAd";
import { useAdFree } from "@/hooks/useAdFree";
import { AdActionButton } from "./AdSlot";

const TNUM: TextStyle = { fontVariant: ["tabular-nums"] };
const PLACEHOLDER = "rgba(111, 98, 90, 0.5)"; // muted の薄い版（入力済みと見間違えない濃さ）

// 日ごとの淡い背景色（複数日程で日を見分けやすくする）。
// 色は palette.ts の「日ごとの色」を薄くしたもので、旅程・当日タブと同じ割り当て。
const dayTintStyle = (day: number) => ({ backgroundColor: tint(dayColor(day), 0.05) });

/** 旅行日数の選択肢（1〜7日）。 */
const DAY_COUNT_OPTIONS = Array.from({ length: 7 }, (_, i) => ({ value: i + 1, label: `${i + 1}日間` }));

const PRIORITY_STYLE: Record<Priority, { border: string; text: string }> = {
  must: { border: "border-ink", text: "text-ink" },
  want: { border: "border-ink/40", text: "text-ink" },
  optional: { border: "border-muted-light", text: "text-muted" },
};

/**
 * 「いつ行く？」の希望を1つのチップで示す。
 * 時刻が決まっているものだけ濃く、任せてあるものは薄く出して、
 * 「どこまで自分で決めて、どこからAIに任せているか」が一目で分かるようにする。
 */
function WishChip({ entry, disabled, onPress }: { entry: PlanEntry; disabled?: boolean; onPress: () => void }) {
  const kind = timeWishOf(entry);
  const strong = kind === "fixed";
  const loose = kind === "any";
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole={disabled ? undefined : "button"}
      accessibilityLabel={`いつ行くか: ${wishLabel(entry)}。押すと変えられます`}
      className={`rounded-full border px-2 py-[2px] ${
        strong ? "border-ink bg-ink" : loose ? "border-black/[.15]" : "border-accent/50 bg-accent/[.08]"
      }`}
    >
      <Text className={`font-gothic-500 text-[10px] ${strong ? "text-kinari" : loose ? "text-muted-light" : "text-accent"}`}>
        {strong ? "🕐 " : ""}
        {wishLabel(entry)}
      </Text>
    </Pressable>
  );
}

/** 登録済みの宿1件の行（宿泊先の枠と、日帰り時の固定枠で共用）。 */
function LodgingEntryRow({
  entry,
  tripDayCount,
  onEdit,
  onRemove,
}: {
  entry: PlanEntry;
  tripDayCount: number;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View className="flex-row items-center gap-3">
      {/* 宿の写真があれば写真、無ければベッドのアイコン */}
      {entry.photoRef ? (
        <SpotThumb photoRef={entry.photoRef} attribution={entry.photoAttribution} size={40} />
      ) : (
        <Image source={{ uri: illustrationUri("icon-bed") }} style={{ width: 32, height: 32 }} resizeMode="contain" />
      )}
      <Pressable onPress={() => onEdit(entry.id)} className="flex-1">
        <Text className="font-mincho-600 text-[13px] text-ink">{entry.title}</Text>
        <Text className="mt-0.5 font-gothic-400 text-[11px] text-muted" style={TNUM}>
          {tripDayCount > 1 ? `${entry.day ?? 1}日目 · ` : ""}
          {entry.arriveBy ? `IN ${formatJstTime(new Date(entry.arriveBy))}` : ""}
          {entry.checkOut ? ` → OUT ${formatJstTime(new Date(entry.checkOut))}` : ""}
        </Text>
        {entry.place && (
          <Text numberOfLines={1} className="font-gothic-400 text-[11px] text-muted-light">
            {entry.place}
          </Text>
        )}
      </Pressable>
      <Pressable onPress={() => onRemove(entry.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${entry.title || "この項目"}を削除`}>
        <Text className="font-gothic-400 text-[15px] text-muted-light">×</Text>
      </Pressable>
    </View>
  );
}

/**
 * 1泊ぶんの枠。埋まっていれば宿を、空いていれば探す導線を出す。
 *
 * 「宿を探す」と「自分で入力」を必ず並べる。外部サイトへの導線だけを置くと
 * ただの広告になるが、アプリ内で完結する手段と並ぶと
 * 「未確定の泊を埋める2つの手段」になる。
 */
function LodgingNightRow({
  night,
  areaLabel,
  onEdit,
  onRemove,
  onAdd,
  onToggleSkip,
}: {
  night: LodgingNight;
  /** 検索対象のエリア名（例: 香川県） */
  areaLabel?: string;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
  onToggleSkip: (nth: number) => void;
}) {
  const head = (
    <View className="flex-row items-center gap-2">
      <Text className="font-gothic-700 text-[11px] text-ink">{night.nth}泊目</Text>
      {night.tonight && (
        <View className="rounded-full bg-accent px-2 py-[1px]">
          <Text className="font-gothic-700 text-[9px] text-kinari">今夜</Text>
        </View>
      )}
      <Text className="flex-1 font-gothic-400 text-[10px] text-muted" style={TNUM}>
        {night.rangeLabel}
      </Text>
    </View>
  );

  // 宿を取らないと決めた泊。閉じてあるだけなので、押せば戻せる
  if (night.skipped) {
    return (
      <View className="rounded-[10px] border border-ink/[.08] px-3 py-2 opacity-60">
        {head}
        <Pressable onPress={() => onToggleSkip(night.nth)} hitSlop={6} className="mt-1 self-start">
          <Text className="font-gothic-400 text-[11px] text-muted-light">宿泊なし · 押すと戻せます</Text>
        </Pressable>
      </View>
    );
  }

  if (night.entry) {
    return (
      <View className="rounded-[10px] border border-ink/10 bg-white/50 px-3 py-2">
        {head}
        <View className="mt-1.5">
          <LodgingEntryRow entry={night.entry} tripDayCount={2} onEdit={onEdit} onRemove={onRemove} />
        </View>
      </View>
    );
  }

  return (
    <View className="rounded-[10px] border border-ink/10 px-3 py-2">
      {head}
      {night.searchUrl ? (
        <View className="mt-2">
          <AdActionButton
            label={areaLabel ? `${areaLabel}の宿を探す` : "宿を探す"}
            sub={`${night.rangeLabel} · 大人2名で検索`}
            url={night.searchUrl}
          />
          <View className="mt-1.5 flex-row items-center justify-between">
            <Pressable onPress={onAdd} hitSlop={6}>
              <Text className="font-gothic-400 text-[11px] text-muted underline">自分で入力</Text>
            </Pressable>
            <Pressable onPress={() => onToggleSkip(night.nth)} hitSlop={6}>
              <Text className="font-gothic-400 text-[11px] text-muted-light">この泊は宿を取らない</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        // 過ぎた泊・提携ID未設定・広告非表示プランでは、自分で入れる導線だけ残す
        <View className="mt-1.5 flex-row items-center justify-between">
          <Pressable onPress={onAdd} hitSlop={6}>
            <Text className="font-gothic-500 text-[11px] text-ink underline">＋ 宿を登録する</Text>
          </Pressable>
          {!night.past && (
            <Pressable onPress={() => onToggleSkip(night.nth)} hitSlop={6}>
              <Text className="font-gothic-400 text-[11px] text-muted-light">この泊は宿を取らない</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export function PlanScreen({
  entries,
  totals,
  scheduleByEntry,
  suggestions,
  areaSuggestions,
  areaSuggestionsLoading,
  hasGeoReference,
  composing,
  composeError,
  readOnly,
  tripEnded,
  tripDate,
  onSetTripDate,
  tripDayCount,
  onSetTripDayCount,
  baseMode,
  onSetBaseMode,
  onOpenAdd,
  onOpenAddLodging,
  onOpenAddRental,
  onGoShiori,
  onOpenGenerate,
  planRequest,
  onSetPlanRequest,
  onCompose,
  onRemoveEntry,
  onEditEntry,
  onSetEntryDay,
  onMoveEntry,
  onMoveEntryToEdge,
  onAddSuggestions,
  onShare,
  onImportShared,
  embedded = false,
  canUndoCompose,
  onUndoCompose,
  destination = "",
  now,
  lodgingSkipped = [],
  onToggleLodgingSkip,
}: {
  entries: PlanEntry[];
  totals: PlanTotals;
  scheduleByEntry: Map<string, string>;
  suggestions: SpotSuggestion[];
  areaSuggestions: SpotSuggestion[];
  areaSuggestionsLoading: boolean;
  hasGeoReference: boolean;
  composing: boolean;
  composeError: string | null;
  readOnly: boolean;
  /** 旅行日程が終了しているか（しおり保存の提案を出す） */
  tripEnded: boolean;
  tripDate: string;
  onSetTripDate: (v: string) => void;
  tripDayCount: number;
  onSetTripDayCount: (n: number) => void;
  baseMode: BaseMode;
  onSetBaseMode: (m: BaseMode) => void;
  onOpenAdd: () => void;
  onOpenAddLodging: () => void;
  onOpenAddRental: () => void;
  /** 旅行終了後の「しおりへ」導線 */
  onGoShiori: () => void;
  /** 条件を選んでAIに旅程をまるごと作ってもらう */
  onOpenGenerate: () => void;
  /** AIへのお願い（自由文）。旅程を組むときの希望として渡される */
  planRequest: string;
  onSetPlanRequest: (v: string) => void;
  onCompose: () => void;
  onRemoveEntry: (id: string) => void;
  onEditEntry: (id: string) => void;
  onSetEntryDay: (id: string, day: number) => void;
  onMoveEntry: (id: string, dir: -1 | 1) => void;
  onMoveEntryToEdge: (id: string, dir: -1 | 1) => void;
  onAddSuggestions: (list: SpotSuggestion[]) => void;
  onShare: () => void;
  onImportShared: () => void;
  /** 「旅」タブの中に埋め込まれているか（見出しは TripHero が持つので出さない） */
  embedded?: boolean;
  /** AIの組み直しを取り消せるか。取り消しは組み直した直後の画面に出す */
  canUndoCompose: boolean;
  onUndoCompose: () => void;
  /** 行き先（例: 香川県 高松・小豆島）。宿探しの検索キーワードに使う */
  destination?: string;
  /** 現在時刻。旅行前かどうかの判定に使う */
  now: Date;
  /** 「宿を取らない」と決めた泊（1始まり） */
  lodgingSkipped?: number[];
  onToggleLodgingSkip: (nth: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const adFree = useAdFree();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const togglePick = (title: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  // AIのおすすめと周辺スポットを1つの「この辺のおすすめ」に統合（タイトルで重複排除・登録済みは除外）
  const existingTitles = new Set(entries.map((e) => e.title));
  const combinedSuggestions: SpotSuggestion[] = [];
  for (const s of [...suggestions, ...areaSuggestions]) {
    if (existingTitles.has(s.title)) continue;
    if (combinedSuggestions.some((m) => m.title === s.title)) continue;
    combinedSuggestions.push(s);
  }
  const [selectedDay, setSelectedDay] = useState<number | "all">("all");
  // 表示時刻：固定予定は目安到着を厳守、それ以外は組み上げ結果（自動計算）の時刻を優先
  const timeOf = (e: PlanEntry): string | null =>
    (e.fixedTime && e.arriveBy ? e.arriveBy : scheduleByEntry.get(e.id) ?? e.arriveBy) ?? null;
  // 宿泊・レンタカーは「固定枠」として別枠。並び替えの対象外。
  const lodging = entries.filter((e) => e.mode === "stay");
  // 宿泊先は「泊ごとの枠」で見せる。3日間なら必ず2泊あるという日程の事実から
  // 枠を作り、埋まっている泊と空いている泊を並べる（lib/lodgingAd.ts）。
  // 有料プラン（広告非表示）では宿探しリンクだけ落ちて、枠と登録済みの宿は残る。
  const lodgingArea = lodgingPrefecture(entries, destination);
  const nights = lodgingNights({
    entries,
    destination,
    tripDate,
    tripDayCount,
    skipped: lodgingSkipped,
    now,
    affiliateId: adFree ? "" : undefined,
  });
  const nightsDone = lodgingProgress(nights).done;
  const rentals = entries.filter((e) => e.mode === "rental");
  // 徒歩・電車が基本の旅でレンタカーが未登録なら、探す導線を出す。
  // baseMode === "car" は「マイカー」なので勧めない（lib/rentalAd.ts）
  const rentalSuggest = rentalAd({
    entries,
    baseMode,
    tripDate,
    tripDayCount,
    now,
    prefecture: lodgingArea,
    affiliateId: adFree ? "" : undefined,
  });
  // 表示は「並び順（＝行程順）」: 日ごと → 行き先リスト内の順番（固定枠は除外）
  const indexOf = new Map(entries.map((e, i) => [e.id, i]));
  const ordered = entries
    .filter((e) => e.mode !== "stay" && e.mode !== "rental")
    .sort((a, b) => (a.day ?? 1) - (b.day ?? 1) || (indexOf.get(a.id) ?? 0) - (indexOf.get(b.id) ?? 0));
  // 日ごとの通し番号（1,2,3…）
  const numberOf = new Map<string, number>();
  const dayCounter = new Map<number, number>();
  for (const e of ordered) {
    const d = e.day ?? 1;
    const n = (dayCounter.get(d) ?? 0) + 1;
    dayCounter.set(d, n);
    numberOf.set(e.id, n);
  }
  // 日数が減った等で選択日が範囲外なら「全日」にフォールバック
  const activeDay: number | "all" =
    typeof selectedDay === "number" && selectedDay >= 1 && selectedDay <= tripDayCount ? selectedDay : "all";
  const visible = activeDay === "all" ? ordered : ordered.filter((e) => (e.day ?? 1) === activeDay);
  // 同じ日の中で最初/最後か（上下ボタンの無効化に使う）
  const isFirstInDay = (e: PlanEntry) => numberOf.get(e.id) === 1;
  const isLastInDay = (e: PlanEntry) => numberOf.get(e.id) === dayCounter.get(e.day ?? 1);
  // 時刻レンジ（開始〜終了）の表示
  const timeRange = (e: PlanEntry): string | null => {
    const startIso = timeOf(e);
    if (!startIso) return null;
    const start = new Date(startIso);
    const dur = entryDurationMin(e);
    const startStr = formatJstTime(start);
    if (dur <= 0) return `${startStr}〜`;
    return `${startStr}〜${formatJstTime(new Date(start.getTime() + dur * 60000))}`;
  };

  return (
    <View className="flex-1 bg-kinari" style={embedded ? undefined : { paddingTop: insets.top }}>
      {!embedded && (
        <View className="px-[26px] pb-2 pt-3">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="font-mincho-600 text-[26px] text-ink">{readOnly ? "共有された旅程" : "行き先リスト"}</Text>
            </View>
            {!readOnly && (
              <View className="mt-1 flex-row items-center gap-2">
                <Pressable onPress={onShare} accessibilityRole="button" className="h-8 items-center justify-center rounded-[8px] border border-ink/25 px-3">
                  <Text className="font-gothic-500 text-[12px] text-ink">共有</Text>
                </Pressable>
                <Pressable
                  onPress={onOpenAdd}
                  accessibilityRole="button"
                  accessibilityLabel="行き先を追加"
                  className="h-8 w-8 items-center justify-center rounded-[8px] border border-ink/25"
                >
                  <View className="relative h-[11px] w-[11px]">
                    <View className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 bg-ink" />
                    <View className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-ink" />
                  </View>
                </Pressable>
              </View>
            )}
          </View>
          <Text className="mt-1 font-gothic-400 text-[12px] text-muted" style={TNUM}>
            行き先 {totals.entryCount}件{totals.totalCost > 0 ? ` · 予算 ${formatYen(totals.totalCost)}` : ""}
          </Text>
        </View>
      )}
      {!embedded && <View className="h-px w-full bg-highlight/60" />}

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingTop: 8, paddingBottom: 90 }}>
        {/* 旅行が終わったら、しおりに残す導線を出す（作った思い出機能へ辿り着けるように） */}
        {tripEnded && (
          <View className="mb-3 flex-row items-center gap-3 rounded-[12px] border border-ink/[.15] bg-surface/60 px-4 py-2.5">
            <View className="flex-1">
              <Text className="font-gothic-500 text-[12px] text-ink">旅はいかがでしたか？</Text>
              <Text className="mt-0.5 font-gothic-400 text-[11px] leading-[17px] text-muted">
                この旅程をしおりに保存して、写真と一緒に残せます。
              </Text>
            </View>
            <Pressable
              onPress={onGoShiori}
              accessibilityRole="button"
              accessibilityLabel="しおりに保存する"
              className="rounded-full bg-ink px-3 py-1.5"
            >
              <Text className="font-gothic-500 text-[12px] text-kinari">しおりへ</Text>
            </Pressable>
          </View>
        )}
        {!readOnly && (
          // 開始日と日数は横並び。日数は 1〜7 を並べると読みづらいのでプルダウンにする
          <View className="mb-2 flex-row items-end gap-3 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-2">
            <DateOnlyField label="開始日" value={tripDate} onChange={onSetTripDate} />
            <SelectField
              label="日数"
              value={tripDayCount}
              options={DAY_COUNT_OPTIONS}
              onChange={onSetTripDayCount}
              widthAuto
            />
          </View>
        )}
        {/* ゼロから作り直す入口。日程を決める場所のすぐ下＝「はじめる」流れの頭に置き、
            テラコッタで他のカード（インクの線）とはっきり見分けが付くようにする。 */}
        {!readOnly && entries.length > 0 && (
          <Pressable
            onPress={onOpenGenerate}
            accessibilityRole="button"
            accessibilityLabel="条件を選んでAIにゼロから旅程を作ってもらう"
            className="mb-2 flex-row items-center gap-3 rounded-[14px] border border-accent/[.45] bg-accent/[.08] px-4 py-2.5"
          >
            <View className="h-9 w-9 items-center justify-center rounded-full bg-accent">
              <Text className="font-gothic-700 text-[12px] text-kinari">AI</Text>
            </View>
            <View className="flex-1">
              <Text className="font-gothic-700 text-[13px] text-accent">ゼロから旅程を作ってもらう</Text>
              <Text className="mt-0.5 font-gothic-400 text-[11px] leading-[17px] text-muted">
                行き先・日数・同伴者・目的を選ぶだけ。いまの行き先リストは置き換わります。
              </Text>
            </View>
            <Text className="font-gothic-500 text-[16px] text-accent">›</Text>
          </Pressable>
        )}
        {readOnly && (
          <View className="mb-4 rounded-[12px] border border-ink/[.15] bg-white/50 px-4 py-3">
            <Text className="font-gothic-500 text-[12px] text-ink">共有された旅程（閲覧のみ）</Text>
            <Text className="mt-1 font-gothic-400 text-[11px] leading-[18px] text-muted">
              旅程・当日ビュー（残り時間・近くのスポット）を見られます。取り込むと、
              まったく同じ内容が自分の旅になり、編集できます。
            </Text>
            <Pressable onPress={onImportShared} className="mt-2 self-start rounded-full bg-ink px-3 py-1.5">
              <Text className="font-gothic-500 text-[12px] text-kinari">自分の旅として取り込む</Text>
            </Pressable>
          </View>
        )}
        {/* 費用が1件も入っていないと予算ブロックは出ない。消えているのか未入力なのか分かるよう一言だけ添える */}
        {!readOnly && totals.totalCost === 0 && entries.length > 0 && (
          <Text className="mb-2 font-gothic-400 text-[11px] text-muted-light">
            予算のめやす：行き先に費用を入れると、ここに交通・宿泊・食事・観光の内訳が出ます。
          </Text>
        )}
        {totals.totalCost > 0 && (
          <View className="mb-2 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-2">
            <View className="flex-row items-baseline justify-between">
              <Text className="font-gothic-500 text-[11px] tracking-[.1em] text-muted">予算のめやす</Text>
              <Text className="font-mincho-600 text-[16px] text-ink" style={TNUM}>
                {formatYen(totals.totalCost)}
              </Text>
            </View>
            <View className="mt-2 gap-1">
              {COST_CATEGORY_ORDER.filter((c) => totals.byCategory[c] > 0).map((c) => {
                const amount = totals.byCategory[c];
                const pct = Math.round((amount / totals.totalCost) * 100);
                return (
                  <View key={c} className="flex-row items-center gap-2">
                    <Text className="w-8 font-gothic-400 text-[12px] text-muted">{COST_CATEGORY_LABEL[c]}</Text>
                    <View className="h-[6px] flex-1 overflow-hidden rounded-full bg-black/[.06]">
                      <View className="h-full rounded-full bg-ink/60" style={{ width: `${Math.max(4, pct)}%` }} />
                    </View>
                    <Text className="w-16 text-right font-gothic-400 text-[12px] text-muted" style={TNUM}>
                      {formatYen(amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
        {/* 宿泊先。泊ごとの枠にして「あと何泊が未定か」を一目で分かるようにする。
            宿を決めるのは旅の準備そのものなので、探す導線は条件を絞らず常に置く。
            埋まった泊・宿を取らないと決めた泊・過ぎた泊では自然に消える。 */}
        {!readOnly && nights.length > 0 && (
          <View className="mb-2 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-gothic-700 text-[12px] text-ink">宿泊先</Text>
              <Text className="font-gothic-400 text-[11px] text-muted" style={TNUM}>
                {nightsDone} / {nights.length} 泊 決定
              </Text>
            </View>
            {/* 進捗バーは持ち物リストと同じ形。「あと何個」の見せ方をアプリ内で揃える */}
            <View className="mt-1.5 h-[5px] w-full overflow-hidden rounded-full bg-surface">
              <View
                className={`h-full rounded-full ${nightsDone === nights.length ? "bg-highlight" : "bg-ink"}`}
                style={{ width: `${Math.round((nightsDone / nights.length) * 100)}%` }}
              />
            </View>

            <View className="mt-3 gap-2.5">
              {nights.map((n) => (
                <LodgingNightRow
                  key={n.nth}
                  night={n}
                  areaLabel={lodgingArea?.name}
                  onEdit={onEditEntry}
                  onRemove={onRemoveEntry}
                  onAdd={onOpenAddLodging}
                  onToggleSkip={onToggleLodgingSkip}
                />
              ))}
            </View>

            {/* 予約したあと手入力に戻らなくて済むことを一度だけ伝える */}
            {nights.some((n) => n.searchUrl) && (
              <Text className="mt-2.5 font-gothic-400 text-[10px] leading-[16px] text-muted-light">
                予約したら「＋」→「メールから追加」に予約確認メールを貼ると、チェックイン・チェックアウト時刻ごと旅程に入ります。
              </Text>
            )}
          </View>
        )}

        {/* 日帰りでも宿を1件登録できるようにしておく（前泊・後泊など） */}
        {!readOnly && nights.length === 0 && lodging.length > 0 && (
          <View className="mb-2 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-2">
            <Text className="font-gothic-500 text-[12px] text-ink">宿泊先（固定）</Text>
            <View className="mt-2 gap-2">
              {lodging.map((e) => (
                <LodgingEntryRow key={e.id} entry={e} tripDayCount={tripDayCount} onEdit={onEditEntry} onRemove={onRemoveEntry} />
              ))}
            </View>
          </View>
        )}

        {/* 車の移動（ずっと車 or レンタカーを借りている期間だけ車）。移動時間の見積もりに使う。 */}
        {!readOnly && (
          <View className="mb-2 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-2">
            <View className="flex-row items-center justify-between">
              <Text className="font-gothic-500 text-[12px] text-ink">車の移動</Text>
              {baseMode === "walk" && (
                <Pressable onPress={onOpenAddRental} className="rounded-full border border-ink/25 px-3 py-1">
                  <Text className="font-gothic-500 text-[11px] text-ink">＋ レンタカー</Text>
                </Pressable>
              )}
            </View>
            <View className="mt-1.5 flex-row gap-2">
              {(["walk", "car"] as BaseMode[]).map((m) => {
                const active = baseMode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => onSetBaseMode(m)}
                    className={`rounded-full border px-3 py-1.5 ${active ? "border-ink bg-ink" : "border-black/[.12] bg-white/50"}`}
                  >
                    <Text className={`font-gothic-400 text-[12px] ${active ? "text-kinari" : "text-ink"}`}>
                      {m === "car" ? "ずっと車（マイカー）" : "徒歩・電車が基本"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {baseMode === "car" ? (
              <Text className="mt-1.5 font-gothic-400 text-[11px] leading-[17px] text-muted-light">
                旅行中ずっと車で移動する前提で、区間の所要時間を計算します。
              </Text>
            ) : rentals.length === 0 ? (
              <>
                <Text className="mt-1.5 font-gothic-400 text-[11px] leading-[17px] text-muted-light">
                  近い区間は徒歩、離れた区間は電車・バスとして計算します。途中でレンタカーを借りるなら「＋レンタカー」で借りる〜返す時間を登録すると、その期間だけ車で計算します。
                </Text>
                {/* アプリ側から既にレンタカーを勧めている場所なので、
                    その隣に「探す」を並べる。宿泊先と同じ対の形にする */}
                {rentalSuggest && (
                  <View className="mt-2">
                    <AdActionButton
                      label={`${rentalSuggest.areaName}のレンタカーを探す`}
                      sub={`${rentalSuggest.rangeLabel} · 楽天トラベル`}
                      url={rentalSuggest.url}
                    />
                  </View>
                )}
              </>
            ) : (
              <View className="mt-2 gap-2">
                {rentals.map((e) => (
                  <View key={e.id} className="flex-row items-center gap-2">
                    <Pressable onPress={() => onEditEntry(e.id)} className="flex-1">
                      <Text className="font-mincho-600 text-[13px] text-ink">{e.title || "レンタカー"}</Text>
                      <Text className="mt-0.5 font-gothic-400 text-[11px] text-muted" style={TNUM}>
                        {e.departAt ? `借 ${formatJstMonthDayJa(new Date(e.departAt))} ${formatJstTime(new Date(e.departAt))}` : ""}
                        {e.arriveBy ? ` → 返 ${formatJstMonthDayJa(new Date(e.arriveBy))} ${formatJstTime(new Date(e.arriveBy))}` : ""}
                      </Text>
                      {e.place && (
                        <Text numberOfLines={1} className="font-gothic-400 text-[11px] text-muted-light">
                          {e.place}
                        </Text>
                      )}
                    </Pressable>
                    <Pressable onPress={() => onRemoveEntry(e.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${e.title || "この項目"}を削除`}>
                      <Text className="font-gothic-400 text-[15px] text-muted-light">×</Text>
                    </Pressable>
                  </View>
                ))}
                <Text className="font-gothic-400 text-[11px] leading-[17px] text-muted-light">
                  この期間の移動は車、期間外は徒歩・電車として計算します。
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Day タブ（複数日程のとき）。並び替えは各日の中で行う。 */}
        {tripDayCount > 1 && entries.length > 0 && (
          <View className="mb-2 flex-row flex-wrap gap-2">
            <Pressable
              onPress={() => setSelectedDay("all")}
              className={`rounded-[10px] border px-3 py-1.5 ${activeDay === "all" ? "border-ink bg-ink" : "border-black/[.15] bg-white/50"}`}
            >
              <Text className={`font-gothic-500 text-[12px] ${activeDay === "all" ? "text-kinari" : "text-ink"}`}>全日</Text>
            </Pressable>
            {Array.from({ length: tripDayCount }, (_, i) => i + 1).map((d) => {
              const active = activeDay === d;
              const dateStr = formatJstMonthDayJa(new Date(`${dateForDay(tripDate, d)}T00:00`));
              return (
                <Pressable
                  key={d}
                  onPress={() => setSelectedDay(d)}
                  className="rounded-[10px] border px-3 py-1.5"
                  style={
                    active
                      ? { backgroundColor: dayColor(d), borderColor: dayColor(d) }
                      : { backgroundColor: tint(dayColor(d), 0.08), borderColor: tint(dayColor(d), 0.35) }
                  }
                >
                  <Text className={`font-gothic-500 text-[12px] ${active ? "text-kinari" : "text-ink"}`}>Day{d}</Text>
                  <Text className={`font-gothic-400 text-[10px] ${active ? "text-kinari/80" : "text-muted"}`}>{dateStr}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {entries.length === 0 && !readOnly && (
          <View className="mt-4 items-center">
            {/* 行き先ゼロの時こそ、いちばん強い導線を置く。
                以前はデモの行き先が入っていたので、この画面は誰にも見えていなかった。 */}
            <Illustration name="loading-map" size="lg" alt="" />
            <Text className="mt-4 text-center font-mincho-700 text-[22px] leading-[32px] text-ink">
              どこへ行きましょうか
            </Text>
            <Text className="mt-2.5 text-center font-gothic-400 text-[13px] leading-[22px] text-muted">
              行き先だけ決まっていれば、{"\n"}あとはAIが旅程をまるごと組み立てます。
            </Text>
            {/* 使い方の流れを図で。文章より先に「順番」が目に入るように */}
            <View className="mt-5">
              <FlowSteps current={1} />
            </View>
            <View className="mt-6 w-full gap-2.5">
              <Button label="AIに旅程を作ってもらう" size="lg" accent onPress={onOpenGenerate} />
              <Button label="自分で行き先を追加する" tone="secondary" onPress={onOpenAdd} />
            </View>
            <Text className="mt-4 text-center font-gothic-400 text-[12px] leading-[19px] text-muted-light">
              日程・同伴者・目的を選ぶだけ。{"\n"}住所や営業時間はあとから自動で埋まります。
            </Text>
          </View>
        )}

        {visible.map((e) => {
          const ps = PRIORITY_STYLE[e.priority];
          const num = numberOf.get(e.id);
          const range = timeRange(e);
          const day = e.day ?? 1;
          const showHeader = activeDay === "all" && tripDayCount > 1 && num === 1;
          return (
            <View key={e.id}>
              {showHeader && (
                <View className="mb-1 mt-3 flex-row items-center gap-2">
                  {/* 日の印は「角ラベル」。スポットの丸番号と見分けが付くようにする */}
                  <View className="rounded-[4px] px-1.5 py-[2px]" style={{ backgroundColor: dayColor(day) }}>
                    <Text className="font-gothic-700 text-[10px] tracking-[.05em] text-kinari" style={TNUM}>DAY {day}</Text>
                  </View>
                  <Text className="font-gothic-500 text-[12px] text-ink">
                    {formatJstMonthDayJa(new Date(`${dateForDay(tripDate, day)}T00:00`))}
                  </Text>
                  <View className="h-px flex-1 bg-black/[.1]" />
                </View>
              )}
              <View className="border-b border-black/[.06] px-2 py-3.5" style={dayTintStyle(day)}>
              <View className="flex-row gap-2">
                {/* 番号 */}
                <View className="w-[22px] items-center pt-0.5">
                  <View className="h-[20px] w-[20px] items-center justify-center rounded-full" style={{ backgroundColor: dayColor(day) }}>
                    <Text className="font-gothic-500 text-[11px] text-kinari" style={TNUM}>{num}</Text>
                  </View>
                </View>
                {/* スポットの写真（photoRef が付いたら自動で出る） */}
                <View className="pt-0.5">
                  <SpotThumb photoRef={e.photoRef} attribution={e.photoAttribution} size={48} />
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-1.5">
                    <Pressable disabled={readOnly} onPress={() => onEditEntry(e.id)}>
                      {range ? (
                        <Text className="font-mincho-600 text-[13px] text-ink" style={TNUM}>{range}</Text>
                      ) : (
                        <Text className="font-gothic-400 text-[11px] text-muted-light">時刻未定</Text>
                      )}
                    </Pressable>
                    {/* いつ行きたいかの希望。ここが「AIに何を任せたか」の表示になる */}
                    <WishChip entry={e} disabled={readOnly} onPress={() => onEditEntry(e.id)} />
                  </View>
                  <Pressable disabled={readOnly} onPress={() => onEditEntry(e.id)}>
                    <View className="mt-0.5 flex-row items-center gap-1.5">
                      <Text className="font-mincho-600 text-[15px] text-ink">{e.title}</Text>
                      {!readOnly && <Text className="font-gothic-400 text-[11px] text-muted-light">編集 ›</Text>}
                    </View>
                    {e.place && (
                      <Text numberOfLines={1} className="mt-0.5 font-gothic-400 text-[11px] text-muted-light">
                        {e.place}
                      </Text>
                    )}
                    <View className="mt-1 flex-row flex-wrap items-center gap-1.5">
                      <View className={`rounded-full border px-2 py-[1px] ${ps.border}`}>
                        <Text className={`font-gothic-400 text-[10px] ${ps.text}`}>{PRIORITY_META[e.priority].label}</Text>
                      </View>
                      <Text className="font-gothic-400 text-[11px] text-muted">{MODE_LABEL[e.mode]}</Text>
                      <Text className="font-gothic-400 text-[11px] text-muted" style={TNUM}>
                        · 滞在{formatDurationMin(effectiveStayMin(e))}
                      </Text>
                      {typeof e.cost === "number" && e.cost > 0 && (
                        <Text className="font-gothic-400 text-[11px] text-muted" style={TNUM}>
                          · {formatYen(e.cost)}
                        </Text>
                      )}
                      {(e.openFrom || e.openTo) && (
                        <Text className="font-gothic-400 text-[11px] text-muted" style={TNUM}>
                          · 営業{e.openFrom ?? "?"}〜{e.openTo ?? "?"}
                        </Text>
                      )}
                      {isClosedOn(e, new Date(`${dateForDay(tripDate, day)}T00:00`)) && (
                        <View className="rounded-full border border-ink bg-surface px-1.5 py-[1px]">
                          <Text className="font-gothic-500 text-[10px] text-ink">{closedDaysLabel(e)}・この日は休み</Text>
                        </View>
                      )}
                    </View>
                  </Pressable>
                </View>
                {/* 並び替え（上下タップ／長押しで先頭・末尾へ）＋削除 */}
                {!readOnly && (
                  <View className="items-center justify-center gap-1.5">
                    <Pressable
                      disabled={isFirstInDay(e)}
                      onPress={() => onMoveEntry(e.id, -1)}
                      onLongPress={() => onMoveEntryToEdge(e.id, -1)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${e.title}を上へ移動（長押しで先頭へ）`}
                      className={`h-9 w-9 items-center justify-center rounded-[8px] border ${isFirstInDay(e) ? "border-black/[.08]" : "border-ink/30"}`}
                    >
                      <Text className={`text-[15px] ${isFirstInDay(e) ? "text-muted-light" : "text-ink"}`}>▲</Text>
                    </Pressable>
                    <Pressable
                      disabled={isLastInDay(e)}
                      onPress={() => onMoveEntry(e.id, 1)}
                      onLongPress={() => onMoveEntryToEdge(e.id, 1)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${e.title}を下へ移動（長押しで末尾へ）`}
                      className={`h-9 w-9 items-center justify-center rounded-[8px] border ${isLastInDay(e) ? "border-black/[.08]" : "border-ink/30"}`}
                    >
                      <Text className={`text-[15px] ${isLastInDay(e) ? "text-muted-light" : "text-ink"}`}>▼</Text>
                    </Pressable>
                  </View>
                )}
                {!readOnly && (
                  <Pressable
                    onPress={() => onRemoveEntry(e.id)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`${e.title}を削除`}
                    className="pt-0.5"
                  >
                    <Text className="font-gothic-400 text-[16px] text-muted-light">×</Text>
                  </Pressable>
                )}
              </View>
              {/* 複数日程では、行き先を何日目に置くか切り替えられる */}
              {!readOnly && tripDayCount > 1 && (
                <View className="mt-1.5 flex-row flex-wrap items-center gap-1.5 pl-[30px]">
                  <Text className="font-gothic-400 text-[10px] text-muted-light">日:</Text>
                  {Array.from({ length: tripDayCount }, (_, i) => i + 1).map((d) => {
                    const active = (e.day ?? 1) === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => onSetEntryDay(e.id, d)}
                        className="rounded-full border px-2.5 py-[3px]"
                        style={
                          active
                            ? { backgroundColor: dayColor(d), borderColor: dayColor(d) }
                            : { backgroundColor: "rgba(255,255,255,.5)", borderColor: tint(dayColor(d), 0.3) }
                        }
                      >
                        <Text className={`font-gothic-400 text-[11px] ${active ? "text-kinari" : "text-muted"}`}>{d}日目</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              </View>
            </View>
          );
        })}

        {!readOnly && ordered.length > 1 && (
          <Text className="mt-2 font-gothic-400 text-[11px] leading-[17px] text-muted-light">
            ここは行きたい場所を溜めていく場所です。時刻は「AIで予定を組む」で決まります。{"\n"}▲▼は手で順番を決めたい時に（長押しで先頭・末尾へ）。
          </Text>
        )}

        {!readOnly && entries.length > 0 && (
          <View className="mt-5">
            {/* AIへのお願い（自由文）。並び順や時間配分のニュアンスを言葉で伝える。 */}
            <View className="mb-2 gap-1">
              <Text className="font-gothic-400 text-[11px] text-muted">AIへのお願い（任意・入れたままにできます）</Text>
              <TextInput
                value={planRequest}
                onChangeText={onSetPlanRequest}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                placeholder={"例: 1日目はホテルに着いたら、そのあとは予定を入れない\n朝はゆっくりめ / 移動は少なめに"}
                placeholderTextColor={PLACEHOLDER}
                accessibilityLabel="AIへのお願い"
                className="min-h-[56px] rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2 font-gothic-400 text-[12px] leading-[20px] text-ink"
              />
            </View>
            <Button
              label={composing ? "AIが予定を組んでいます…" : "AIで予定を組む"}
              size="lg"
              loading={composing}
              onPress={onCompose}
            />
            {/* 組み直した直後に取り消したくなるので、取り消しはこの場に置く
                （以前はタイムライン側にしか無く、押した画面から見えなかった） */}
            {canUndoCompose && !composing && (
              <View className="mt-2">
                <Button label="組む前に戻す" tone="ghost" size="sm" onPress={onUndoCompose} />
              </View>
            )}
            <Text className="mt-2 text-center font-gothic-400 text-[12px] leading-[19px] text-muted-light">
              押すとAIが、それぞれの「いつ行く？」の希望・移動効率・営業時間・定休日を見て、順番と時刻を決めます。結果はタイムラインに出ます。
            </Text>
            {composeError && <Text className="mt-2 text-center font-gothic-400 text-[12px] text-ink">{composeError}</Text>}

          </View>
        )}

        {/* この辺のおすすめ（AIのおすすめ＋周辺スポットを統合・選んでまとめて追加） */}
        {!readOnly && entries.length > 0 && combinedSuggestions.length === 0 && (
          <View className="mt-6">
<SectionHeading label="この辺のおすすめ" className="mb-1.5" />
            {areaSuggestionsLoading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color={COLORS.muted} />
                <Text className="font-gothic-400 text-[12px] text-muted-light">周辺のおすすめを探しています…</Text>
              </View>
            ) : (
              <Text className="font-gothic-400 text-[12px] leading-[19px] text-muted-light">
                {hasGeoReference
                  ? "近くのおすすめが見つかりませんでした。"
                  : "行き先や宿泊先を住所候補から選ぶと、その周辺のおすすめが出ます。"}
              </Text>
            )}
          </View>
        )}

        {!readOnly && combinedSuggestions.length > 0 && (
          <View className="mt-7">
            <View className="mb-2 flex-row items-center justify-between">
<SectionHeading label="この辺のおすすめ" />
              <Pressable
                onPress={() =>
                  setPicked((prev) =>
                    prev.size === combinedSuggestions.length ? new Set() : new Set(combinedSuggestions.map((s) => s.title))
                  )
                }
                hitSlop={6}
                className="rounded-full border border-ink/25 px-2.5 py-1"
              >
                <Text className="font-gothic-400 text-[11px] text-ink">
                  {picked.size === combinedSuggestions.length ? "選択を解除" : "すべて選択"}
                </Text>
              </Pressable>
            </View>
            <View className="rounded-[16px] border border-ink/10">
              {combinedSuggestions.map((s, i) => {
                const on = picked.has(s.title);
                return (
                  <Pressable
                    key={s.title}
                    onPress={() => togglePick(s.title)}
                    className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-ink/10" : ""}`}
                  >
                    <View className={`h-[20px] w-[20px] items-center justify-center rounded-[6px] border ${on ? "border-ink bg-ink" : "border-black/[.25]"}`}>
                      {on && <View className="h-[8px] w-[8px] rounded-[2px] bg-kinari" />}
                    </View>
                    <View className="flex-1">
                      <Text className="font-mincho-400 text-[14px] text-ink">{s.title}</Text>
                      {(s.area || s.note) && (
                        <Text className="mt-0.5 font-gothic-400 text-[11px] text-muted">{[s.area, s.note].filter(Boolean).join(" · ")}</Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              disabled={picked.size === 0}
              onPress={() => {
                onAddSuggestions(combinedSuggestions.filter((s) => picked.has(s.title)));
                setPicked(new Set());
              }}
              className={`mt-2 rounded-[12px] py-3 ${picked.size > 0 ? "bg-ink" : "bg-ink/30"}`}
            >
              <Text className="text-center font-gothic-500 text-[12px] text-kinari">
                {picked.size > 0 ? `選択した${picked.size}件を追加` : "追加したいものを選択"}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* AIで旅程を組んでいる間のオーバーレイ（イラストは上下4pxのふわふわのみ） */}
      {composing && (
        <View className="absolute inset-0 items-center justify-center bg-base/90">
          <Floater>
            <Illustration name="loading-map" size="md" alt="" />
          </Floater>
          <Text className="mt-4 font-mincho-600 text-[15px] text-ink">旅程を組み立てています</Text>
          <Text className="mt-1.5 font-gothic-400 text-[12px] text-muted">少しお待ちください</Text>
        </View>
      )}
    </View>
  );
}
