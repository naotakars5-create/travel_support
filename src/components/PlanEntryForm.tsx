import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { DayPeriod, GeoPoint, Priority, TimeWishKind, TransportMode } from "@/lib/types";
import { closedDaysLabel, PERIOD_META, PERIOD_ORDER, PlanEntryInput, timeWishOf } from "@/lib/plan";
import { combineDateAndTime, dateForDay, dayOfIso, timeStrFromIso } from "@/lib/date";
import { fetchPlacePredictions, fetchPlaceDetails, PlacePrediction } from "@/lib/places";
import { formatDurationMin } from "@/lib/itinerary";
import { TimeField } from "./PlainFields";

// 宿泊・レンタカーは計画画面の「固定枠」から専用入力するため、通常の追加からは除外。
const MODE_OPTIONS: { value: TransportMode; label: string }[] = [
  { value: "activity", label: "観光" },
  { value: "dining", label: "食事" },
  { value: "rail", label: "鉄道" },
  { value: "bus", label: "バス" },
  { value: "car", label: "車" },
  { value: "walk", label: "徒歩" },
  { value: "air", label: "飛行機" },
];

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: "must", label: "必ず行く" },
  { value: "want", label: "できれば" },
  { value: "optional", label: "余れば" },
];

/**
 * 滞在時間の選択肢（分）。
 *
 * 以前は 30/60/90/120 だけで、**2時間より長く滞在する行き先を登録できなかった**。
 * テーマパーク・水族館・登山・美術館のはしごなど、半日〜1日かける行き先は
 * 珍しくないので、8時間まで用意する。
 *
 * ラベルは `formatDurationMin` に任せて「4時間」と出す（「240分」では読めない）。
 * ここに無い値（45分・7時間など）は「その他」から分単位で入れられる。
 */
const STAY_OPTIONS = [30, 60, 90, 120, 180, 240, 300, 360, 480];

/** 滞在時間に入れられる上限（分）。24時間を超える滞在は宿泊として登録する。 */
const STAY_MAX_MIN = 24 * 60;
const PLACEHOLDER = "rgba(111, 98, 90, 0.5)"; // muted の薄い版（入力済みと見間違えない濃さ）

const TRANSIT_MODES: TransportMode[] = ["air", "rail", "bus", "car"];
const isTransit = (m: TransportMode) => TRANSIT_MODES.includes(m);

/** 自動取得した営業時間・定休日の表示（読み取り専用）。取得中は「取得中…」。 */
function OpenHoursNote({
  loading,
  openFrom,
  openTo,
  closedDays,
}: {
  loading: boolean;
  openFrom?: string;
  openTo?: string;
  closedDays?: number[];
}) {
  if (loading) {
    return <Text className="font-gothic-400 text-[11px] text-muted-light">営業時間を取得中…</Text>;
  }
  if (openFrom || openTo) {
    const closed = closedDaysLabel({ closedDays });
    return (
      <Text className="font-gothic-400 text-[11px] text-muted">
        営業時間 {openFrom ?? "?"}〜{openTo ?? "?"}
        {closed ? `・${closed}` : ""}（自動取得・AIがこの時間内に組みます）
      </Text>
    );
  }
  return null;
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`rounded-full border px-3 py-1.5 ${active ? "border-ink bg-ink" : "border-black/[.12] bg-white/50"}`}>
      <Text className={`font-gothic-400 text-[12px] ${active ? "text-kinari" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}

/** 「いつ行く？」の選択肢。左ほどゆるく、右ほど強い。 */
const WISH_OPTIONS: { value: TimeWishKind; label: string }[] = [
  { value: "any", label: "こだわらない" },
  { value: "day", label: "日を決める" },
  { value: "period", label: "時間帯" },
  { value: "window", label: "時間の範囲" },
  { value: "fixed", label: "時刻を決める" },
];

const WISH_HINT: Record<TimeWishKind, string> = {
  any: "日も時刻もAIにおまかせ。順路がいちばん良くなるように置かれます。",
  day: "その日の中でAIが時刻を決めます。",
  period: "その時間帯の中でAIが時刻を決めます（午前=9〜12時／午後=12〜17時／夕方=17〜20時／夜=19〜23時）。",
  window: "その範囲の中でAIが時刻を決めます。",
  fixed: "予約など、動かせない時刻。AIもこの時刻は変えません。",
};

export interface PlanEntryFormInitial {
  title: string;
  place?: string;
  placeGeo?: GeoPoint;
  mode: TransportMode;
  priority: Priority;
  stayMin?: number;
  arriveBy?: string;
  fixedTime?: boolean;
  cost?: number;
  detail?: string;
  day?: number;
  wish?: TimeWishKind;
  period?: DayPeriod;
  windowFrom?: string;
  windowTo?: string;
  placeFrom?: string;
  placeTo?: string;
  departAt?: string;
  checkOut?: string;
  openFrom?: string;
  openTo?: string;
  closedDays?: number[];
  photoRef?: string;
  photoAttribution?: string;
  allowDuringStay?: boolean;
}

/** 行き先を入力するフォーム。種別で入力欄が変わり、複数日程では「何日目」を選べる。 */
export function PlanEntryForm({
  onSubmit,
  initial,
  tripDate,
  tripDayCount,
  submitLabel = "行き先を追加",
  resetAfterSubmit = true,
  lockMode = false,
}: {
  onSubmit: (input: PlanEntryInput) => void;
  initial?: PlanEntryFormInitial;
  /** 旅行の開始日（YYYY-MM-DD） */
  tripDate: string;
  /** 旅行の日数 */
  tripDayCount: number;
  submitLabel?: string;
  resetAfterSubmit?: boolean;
  /** 種別の切替を隠して固定する（宿泊先の専用入力など） */
  lockMode?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [placeFrom, setPlaceFrom] = useState(initial?.placeFrom ?? "");
  const [placeTo, setPlaceTo] = useState(initial?.placeTo ?? "");
  const [mode, setMode] = useState<TransportMode>(initial?.mode ?? "activity");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "want");
  const [stayMin, setStayMin] = useState<number | null>(initial ? initial.stayMin ?? null : 60);
  // 選択肢に無い滞在時間（メール取り込みやAIが入れた45分など）も編集できるようにする。
  // 開いた時点で選択肢に無い値なら「その他」を開いた状態で見せる
  const [stayCustomOpen, setStayCustomOpen] = useState<boolean>(
    () => stayMin !== null && !STAY_OPTIONS.includes(stayMin)
  );
  const [day, setDay] = useState<number>(initial?.day ?? 1);
  const [arriveTime, setArriveTime] = useState<string>(timeStrFromIso(initial?.arriveBy));
  const [departTime, setDepartTime] = useState<string>(timeStrFromIso(initial?.departAt));
  const [checkOutTime, setCheckOutTime] = useState<string>(timeStrFromIso(initial?.checkOut));
  // 宿泊の泊数（同じ宿に連泊する場合に使う）
  const [nights, setNights] = useState<number>(() => {
    if (!initial?.arriveBy || !initial?.checkOut) return 1;
    const inMs = new Date(initial.arriveBy).getTime();
    const outMs = new Date(initial.checkOut).getTime();
    if (Number.isNaN(inMs) || Number.isNaN(outMs)) return 1;
    return Math.max(1, Math.round((outMs - inMs) / 86400000) || 1);
  });
  // いつ行きたいか（決まっている分だけ伝える。残りはAIが決める）
  const [wish, setWish] = useState<TimeWishKind>(() => (initial ? timeWishOf(initial) : "any"));
  const [period, setPeriod] = useState<DayPeriod>(initial?.period ?? "morning");
  const [windowFrom, setWindowFrom] = useState<string>(initial?.windowFrom ?? "");
  const [windowTo, setWindowTo] = useState<string>(initial?.windowTo ?? "");
  const [cost, setCost] = useState(typeof initial?.cost === "number" ? String(initial.cost) : "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  // 営業時間は Place Details から自動取得する（手入力欄は廃止）。
  const [openFrom, setOpenFrom] = useState<string | undefined>(initial?.openFrom);
  const [openTo, setOpenTo] = useState<string | undefined>(initial?.openTo);
  const [placeGeo, setPlaceGeo] = useState<GeoPoint | undefined>(initial?.placeGeo);
  const [closedDays, setClosedDays] = useState<number[] | undefined>(initial?.closedDays);
  // スポット写真（旅程カードのサムネイルに使う）
  const [photo, setPhoto] = useState<{ ref?: string; attribution?: string }>({
    ref: initial?.photoRef,
    attribution: initial?.photoAttribution,
  });
  // 宿にチェックインしたあとの時間帯にも入れてよいか（夜ご飯・夜景など）
  const [allowNight, setAllowNight] = useState(Boolean(initial?.allowDuringStay));
  // レンタカーを返す日（借りる日と別日になりうる）
  const [returnDay, setReturnDay] = useState<number>(() => {
    if (initial?.mode === "rental" && initial.arriveBy) {
      const d = dayOfIso(tripDate, initial.arriveBy);
      if (d > 0) return d;
    }
    return initial?.day ?? 1;
  });
  const [loadingDetails, setLoadingDetails] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transit = isTransit(mode);
  const stay = mode === "stay";
  const rental = mode === "rental";
  const canSubmit = rental ? true : title.trim().length > 0;

  const onTitleChange = (v: string) => {
    setTitle(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setPredictions(await fetchPlacePredictions(v.trim()));
    }, 350);
  };

  const selectPrediction = (p: PlacePrediction) => {
    setTitle(p.mainText);
    setPlace(p.secondaryText || p.description);
    setPredictions([]);
    // place_id から番地までの住所と営業時間を自動取得して補完する。
    setLoadingDetails(true);
    void (async () => {
      const details = await fetchPlaceDetails(p.placeId);
      if (details) {
        if (details.address) setPlace(details.address); // 番地まで含む完全な住所
        if (details.geo) setPlaceGeo(details.geo); // Places由来の正確な座標
        setOpenFrom(details.openFrom);
        setOpenTo(details.openTo);
        setClosedDays(details.closedDays);
        setPhoto({ ref: details.photoRef, attribution: details.photoAttribution });
      }
      setLoadingDetails(false);
    })();
  };

  const onPlaceChange = (v: string) => {
    setPlace(v);
    // 住所を手で変えたら、自動取得した座標・営業時間・定休日はいったんクリア（別の場所になり得るため）。
    setPlaceGeo(undefined);
    setClosedDays(undefined);
    setOpenFrom(undefined);
    setOpenTo(undefined);
    setPhoto({});
  };

  const iso = (d: number, t: string) => (t ? combineDateAndTime(dateForDay(tripDate, d), t)?.toISOString() : undefined);

  const submit = () => {
    if (!canSubmit) return;
    const input: PlanEntryInput = {
      title,
      mode,
      priority,
      day,
      cost: cost ? Number(cost.replace(/[^0-9]/g, "")) || undefined : undefined,
      detail: detail || undefined,
    };
    if (rental) {
      // レンタカーは「借りる〜返す」の期間。地点ではないので旅程には出さない。
      input.title = title.trim() || "レンタカー";
      input.place = place || undefined;
      input.priority = "must";
      input.day = day;
      input.departAt = iso(day, departTime); // 借りる
      input.arriveBy = iso(returnDay, arriveTime); // 返す
      input.fixedTime = true;
    } else if (transit) {
      input.placeFrom = placeFrom || undefined;
      input.placeTo = placeTo || undefined;
      input.departAt = iso(day, departTime);
      input.arriveBy = iso(day, arriveTime);
      input.fixedTime = true;
    } else if (stay) {
      input.place = place || undefined;
      input.placeGeo = placeGeo;
      input.arriveBy = iso(day, arriveTime); // チェックイン
      input.checkOut = iso(day + nights, checkOutTime); // 泊数ぶん後の日にチェックアウト
      input.fixedTime = true;
      input.openFrom = openFrom;
      input.openTo = openTo;
      input.closedDays = closedDays;
      input.photoRef = photo.ref;
      input.photoAttribution = photo.attribution;
    } else {
      input.allowDuringStay = allowNight || undefined;
      input.place = place || undefined;
      input.placeGeo = placeGeo;
      input.stayMin = stayMin ?? undefined;
      input.wish = wish;
      // 「いつでもいい」は日も自由にする（AIが順路の調整に使えるようにする）
      input.day = wish === "any" ? undefined : day;
      input.period = wish === "period" ? period : undefined;
      input.windowFrom = wish === "window" ? windowFrom || undefined : undefined;
      input.windowTo = wish === "window" ? windowTo || undefined : undefined;
      input.arriveBy = wish === "fixed" ? iso(day, arriveTime) : undefined;
      input.fixedTime = wish === "fixed" && Boolean(arriveTime);
      input.openFrom = openFrom;
      input.openTo = openTo;
      input.closedDays = closedDays;
      input.photoRef = photo.ref;
      input.photoAttribution = photo.attribution;
    }
    onSubmit(input);
    if (!resetAfterSubmit) return;
    setTitle("");
    setPlace("");
    setPlaceFrom("");
    setPlaceTo("");
    setPriority("want");
    setStayMin(60);
    setArriveTime("");
    setDepartTime("");
    setCheckOutTime("");
    setWish("any");
    setPeriod("morning");
    setWindowFrom("");
    setWindowTo("");
    setCost("");
    setDetail("");
    setPredictions([]);
    setOpenFrom(undefined);
    setOpenTo(undefined);
    setClosedDays(undefined);
    setPhoto({});
    setPlaceGeo(undefined);
  };

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="font-gothic-400 text-[11px] text-muted">
          {rental
            ? "レンタカー会社・営業所（任意）"
            : stay
              ? "宿の名前 *（名前を入れると住所候補が出ます）"
              : transit
                ? "名称 *（例: JL105便）"
                : "行き先 *（名前を入れると住所候補が出ます）"}
        </Text>
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder={
            rental
              ? "例: トヨタレンタカー 高松空港店"
              : stay
                ? "例: ホテルグランヴィア大阪"
                : transit
                  ? "例: のぞみ / JL105"
                  : "例: 大阪城天守閣"
          }
          placeholderTextColor={PLACEHOLDER}
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
        />
        {predictions.length > 0 && !transit && (
          <View className="mt-1 overflow-hidden rounded-[10px] border border-black/[.1] bg-white/90">
            {predictions.map((p, i) => (
              <Pressable key={p.placeId} onPress={() => selectPrediction(p)} className={`px-3 py-2 ${i > 0 ? "border-t border-black/[.06]" : ""}`}>
                <Text className="font-mincho-400 text-[13px] text-ink">{p.mainText}</Text>
                {p.secondaryText ? <Text className="mt-0.5 font-gothic-400 text-[11px] text-muted">{p.secondaryText}</Text> : null}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {!lockMode && (
        <View className="gap-1.5">
          <Text className="font-gothic-400 text-[11px] text-muted">種別</Text>
          <View className="flex-row flex-wrap gap-2">
            {MODE_OPTIONS.map((o) => (
              <Chip key={o.value} active={o.value === mode} label={o.label} onPress={() => setMode(o.value)} />
            ))}
          </View>
        </View>
      )}

      {tripDayCount > 1 && (transit || stay) && (
        <View className="gap-1.5">
          <Text className="font-gothic-400 text-[11px] text-muted">何日目</Text>
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: tripDayCount }, (_, i) => i + 1).map((d) => (
              <Chip key={d} active={day === d} label={`${d}日目`} onPress={() => setDay(d)} />
            ))}
          </View>
        </View>
      )}

      {/* 種別ごとの入力欄 */}
      {rental ? (
        <>
          <View className="gap-1">
            <Text className="font-gothic-400 text-[11px] text-muted">営業所・住所（任意）</Text>
            <TextInput
              value={place}
              onChangeText={onPlaceChange}
              placeholder="例: ○○駅前店"
              placeholderTextColor={PLACEHOLDER}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
            />
          </View>
          {tripDayCount > 1 && (
            <View className="gap-1.5">
              <Text className="font-gothic-400 text-[11px] text-muted">借りる日</Text>
              <View className="flex-row flex-wrap gap-2">
                {Array.from({ length: tripDayCount }, (_, i) => i + 1).map((d) => (
                  <Chip key={d} active={day === d} label={`${d}日目`} onPress={() => setDay(d)} />
                ))}
              </View>
            </View>
          )}
          {tripDayCount > 1 && (
            <View className="gap-1.5">
              <Text className="font-gothic-400 text-[11px] text-muted">返す日</Text>
              <View className="flex-row flex-wrap gap-2">
                {Array.from({ length: tripDayCount }, (_, i) => i + 1).map((d) => (
                  <Chip key={d} active={returnDay === d} label={`${d}日目`} onPress={() => setReturnDay(d)} />
                ))}
              </View>
            </View>
          )}
          <View className="flex-row gap-3">
            <TimeField label="借りる時刻" value={departTime} onChange={setDepartTime} />
            <TimeField label="返す時刻" value={arriveTime} onChange={setArriveTime} />
          </View>
          <Text className="font-gothic-400 text-[11px] leading-[17px] text-muted">
            この期間の移動は「車」で計算します。期間外は近ければ徒歩、離れていれば電車・バスとして計算します。
          </Text>
        </>
      ) : transit ? (
        <>
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <Text className="font-gothic-400 text-[11px] text-muted">出発地</Text>
              <TextInput
                value={placeFrom}
                onChangeText={setPlaceFrom}
                placeholder="例: 東京駅"
                placeholderTextColor={PLACEHOLDER}
                className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
              />
            </View>
            <View className="flex-1 gap-1">
              <Text className="font-gothic-400 text-[11px] text-muted">到着地</Text>
              <TextInput
                value={placeTo}
                onChangeText={setPlaceTo}
                placeholder="例: 新大阪駅"
                placeholderTextColor={PLACEHOLDER}
                className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
              />
            </View>
          </View>
          <View className="flex-row gap-3">
            <TimeField label="出発時刻" value={departTime} onChange={setDepartTime} />
            <TimeField label="到着時刻" value={arriveTime} onChange={setArriveTime} />
          </View>
        </>
      ) : stay ? (
        <>
          <View className="gap-1">
            <Text className="font-gothic-400 text-[11px] text-muted">住所（宿泊先候補から選ぶと番地まで自動入力）</Text>
            <TextInput
              value={place}
              onChangeText={onPlaceChange}
              placeholder="例: 大阪府大阪市北区梅田3-1-1"
              placeholderTextColor={PLACEHOLDER}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
            />
            <OpenHoursNote loading={loadingDetails} openFrom={openFrom} openTo={openTo} closedDays={closedDays} />
          </View>
          <View className="gap-1.5">
            <Text className="font-gothic-400 text-[11px] text-muted">泊数（同じ宿に連泊する場合）</Text>
            <View className="flex-row flex-wrap gap-2">
              {[1, 2, 3, 4].map((n) => (
                <Chip key={n} active={nights === n} label={`${n}泊`} onPress={() => setNights(n)} />
              ))}
            </View>
          </View>
          <View className="flex-row gap-3">
            <TimeField label={`チェックイン（${day}日目）`} value={arriveTime} onChange={setArriveTime} />
            <TimeField label={`チェックアウト（${day + nights}日目）`} value={checkOutTime} onChange={setCheckOutTime} />
          </View>
        </>
      ) : (
        <>
          <View className="gap-1">
            <Text className="font-gothic-400 text-[11px] text-muted">住所（候補から選ぶと番地まで自動入力）</Text>
            <TextInput
              value={place}
              onChangeText={onPlaceChange}
              placeholder="例: 大阪府大阪市中央区大阪城1-1"
              placeholderTextColor={PLACEHOLDER}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
            />
            <OpenHoursNote loading={loadingDetails} openFrom={openFrom} openTo={openTo} closedDays={closedDays} />
          </View>
          <View className="gap-1.5">
            <Text className="font-gothic-400 text-[11px] text-muted">滞在時間の目安</Text>
            <View className="flex-row flex-wrap gap-2">
              {STAY_OPTIONS.map((m) => (
                <Chip
                  key={m}
                  active={stayMin === m && !stayCustomOpen}
                  label={formatDurationMin(m)}
                  onPress={() => {
                    setStayMin(m);
                    setStayCustomOpen(false);
                  }}
                />
              ))}
              <Chip
                active={stayCustomOpen}
                label="その他"
                onPress={() => setStayCustomOpen((v) => !v)}
              />
              <Chip
                active={stayMin === null && !stayCustomOpen}
                label="指定なし"
                onPress={() => {
                  setStayMin(null);
                  setStayCustomOpen(false);
                }}
              />
            </View>
            {/* 45分・7時間など、選択肢に無い時間を分で入れる */}
            {stayCustomOpen && (
              <View className="mt-1 flex-row items-center gap-2">
                <TextInput
                  value={stayMin === null ? "" : String(stayMin)}
                  onChangeText={(t) => {
                    const n = Number(t.replace(/[^0-9]/g, ""));
                    setStayMin(t.trim() === "" || Number.isNaN(n) ? null : Math.min(n, STAY_MAX_MIN));
                  }}
                  keyboardType="number-pad"
                  placeholder="例: 300"
                  placeholderTextColor={PLACEHOLDER}
                  className="w-24 rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2 font-mincho-400 text-[13px] text-ink"
                />
                <Text className="font-gothic-400 text-[12px] text-muted">分</Text>
                {stayMin !== null && stayMin > 0 && (
                  <Text className="font-gothic-400 text-[11px] text-muted-light">＝ {formatDurationMin(stayMin)}</Text>
                )}
              </View>
            )}
          </View>
          {/* いつ行くか。行き先リストは「行きたい所を溜める場所」なので、
              決まっている分だけ伝えれば足りる。残りの時刻はAIが埋める。 */}
          <View className="gap-1.5">
            <Text className="font-gothic-400 text-[11px] text-muted">いつ行く？（決まっている分だけでOK）</Text>
            <View className="flex-row flex-wrap gap-2">
              {WISH_OPTIONS.map((o) => (
                <Chip key={o.value} active={wish === o.value} label={o.label} onPress={() => setWish(o.value)} />
              ))}
            </View>

            {wish !== "any" && tripDayCount > 1 && (
              <View className="mt-1.5 gap-1.5">
                <Text className="font-gothic-400 text-[11px] text-muted">何日目</Text>
                <View className="flex-row flex-wrap gap-2">
                  {Array.from({ length: tripDayCount }, (_, i) => i + 1).map((d) => (
                    <Chip key={d} active={day === d} label={`${d}日目`} onPress={() => setDay(d)} />
                  ))}
                </View>
              </View>
            )}

            {wish === "period" && (
              <View className="mt-1.5 flex-row flex-wrap gap-2">
                {PERIOD_ORDER.map((k) => (
                  <Chip key={k} active={period === k} label={PERIOD_META[k].label} onPress={() => setPeriod(k)} />
                ))}
              </View>
            )}

            {wish === "window" && (
              <View className="mt-1.5 flex-row items-end gap-3">
                <TimeField label="この時刻から" value={windowFrom} onChange={setWindowFrom} />
                <TimeField label="この時刻まで" value={windowTo} onChange={setWindowTo} />
              </View>
            )}

            {wish === "fixed" && (
              <View className="mt-1.5 flex-row">
                <TimeField label="到着時刻" value={arriveTime} onChange={setArriveTime} />
              </View>
            )}

            <Text className="mt-1 font-gothic-400 text-[11px] leading-[17px] text-muted-light">
              {WISH_HINT[wish]}
            </Text>
          </View>
          <View className="gap-1">
            <Text className="font-gothic-400 text-[11px] text-muted">費用（円・任意）</Text>
            <TextInput
              value={cost}
              onChangeText={setCost}
              keyboardType="number-pad"
              placeholder="例: 1200"
              placeholderTextColor={PLACEHOLDER}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 font-mincho-400 text-[14px] text-ink"
              style={{ height: 42, fontVariant: ["tabular-nums"] }}
            />
          </View>
        </>
      )}

      {/* 重要度は宿泊/移動/レンタカー以外で表示（これらは必ず組み込む・並べない想定） */}
      {!transit && !stay && !rental && (
        <View className="gap-1.5">
          <Text className="font-gothic-400 text-[11px] text-muted">重要度（時間が足りない時、AIが優先度の低い予定から外します）</Text>
          <View className="flex-row gap-2">
            {PRIORITY_OPTIONS.map((o) => (
              <Chip key={o.value} active={o.value === priority} label={o.label} onPress={() => setPriority(o.value)} />
            ))}
          </View>
        </View>
      )}

      {/* 宿の時間帯への配置許可。既定ではチェックイン〜チェックアウトの間に予定を入れない */}
      {!transit && !stay && !rental && (
        <Pressable
          onPress={() => setAllowNight((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: allowNight }}
          className="flex-row items-center gap-2.5"
        >
          <View
            className={`h-[20px] w-[20px] items-center justify-center rounded-[6px] border ${
              allowNight ? "border-accent bg-accent" : "border-black/[.25] bg-white/60"
            }`}
          >
            {allowNight && <Text className="font-gothic-700 text-[12px] text-kinari">✓</Text>}
          </View>
          <View className="flex-1">
            <Text className="font-gothic-400 text-[12px] text-ink">ホテルにチェックイン後でも行く（夜の予定）</Text>
            <Text className="mt-0.5 font-gothic-400 text-[10px] leading-[15px] text-muted-light">
              ふだんはチェックイン〜チェックアウトの間に予定を入れません。夜ご飯・夜景などはここをオンに。
            </Text>
          </View>
        </Pressable>
      )}

      {/* 費用（移動・宿泊・レンタカーはこちらに） */}
      {(transit || stay || rental) && (
        <View className="gap-1">
          <Text className="font-gothic-400 text-[11px] text-muted">
            費用（円・任意）{stay ? "／宿泊は1泊分" : rental ? "／レンタル料金の合計" : ""}
          </Text>
          <TextInput
            value={cost}
            onChangeText={setCost}
            keyboardType="number-pad"
            placeholder="例: 14000"
            placeholderTextColor={PLACEHOLDER}
            className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 font-mincho-400 text-[14px] text-ink"
            style={{ height: 42, fontVariant: ["tabular-nums"] }}
          />
        </View>
      )}

      <View className="gap-1">
        <Text className="font-gothic-400 text-[11px] text-muted">メモ（任意）</Text>
        <TextInput
          value={detail}
          onChangeText={setDetail}
          placeholder="例: 予約番号 / 座席 など"
          placeholderTextColor={PLACEHOLDER}
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-gothic-400 text-[12px] text-ink"
        />
      </View>

      <Pressable disabled={!canSubmit} onPress={submit} className={`mt-1 rounded-[12px] px-4 py-3 ${canSubmit ? "bg-ink" : "bg-ink/30"}`}>
        <Text className="text-center font-gothic-500 text-[12px] text-kinari">{submitLabel}</Text>
      </Pressable>
    </View>
  );
}
