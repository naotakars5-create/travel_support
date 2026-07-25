import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Priority, TransportMode } from "@/lib/types";
import { PlanEntryInput } from "@/lib/plan";
import { combineDateAndTime, dateForDay, timeStrFromIso } from "@/lib/date";
import { fetchPlacePredictions, PlacePrediction } from "@/lib/places";
import { TimeField } from "./PlainFields";

const MODE_OPTIONS: { value: TransportMode; label: string }[] = [
  { value: "activity", label: "観光" },
  { value: "dining", label: "食事" },
  { value: "stay", label: "宿泊" },
  { value: "home", label: "自宅" },
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

const STAY_OPTIONS = [30, 60, 90, 120];
const MUTED = "#8a8378";

const TRANSIT_MODES: TransportMode[] = ["air", "rail", "bus", "car"];
const isTransit = (m: TransportMode) => TRANSIT_MODES.includes(m);

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className={`rounded-full border px-3 py-1.5 ${active ? "border-ink bg-ink" : "border-black/[.12] bg-white/50"}`}>
      <Text className={`font-gothic-400 text-[11px] ${active ? "text-kinari" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}

export interface PlanEntryFormInitial {
  title: string;
  place?: string;
  mode: TransportMode;
  priority: Priority;
  stayMin?: number;
  arriveBy?: string;
  fixedTime?: boolean;
  cost?: number;
  detail?: string;
  day?: number;
  placeFrom?: string;
  placeTo?: string;
  departAt?: string;
  checkOut?: string;
  openFrom?: string;
  openTo?: string;
}

/** 行き先を入力するフォーム。種別で入力欄が変わり、複数日程では「何日目」を選べる。 */
export function PlanEntryForm({
  onSubmit,
  initial,
  tripDate,
  tripDayCount,
  submitLabel = "行き先を追加",
  resetAfterSubmit = true,
}: {
  onSubmit: (input: PlanEntryInput) => void;
  initial?: PlanEntryFormInitial;
  /** 旅行の開始日（YYYY-MM-DD） */
  tripDate: string;
  /** 旅行の日数 */
  tripDayCount: number;
  submitLabel?: string;
  resetAfterSubmit?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [placeFrom, setPlaceFrom] = useState(initial?.placeFrom ?? "");
  const [placeTo, setPlaceTo] = useState(initial?.placeTo ?? "");
  const [mode, setMode] = useState<TransportMode>(initial?.mode ?? "activity");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "want");
  const [stayMin, setStayMin] = useState<number | null>(initial ? initial.stayMin ?? null : 60);
  const [day, setDay] = useState<number>(initial?.day ?? 1);
  const [arriveTime, setArriveTime] = useState<string>(timeStrFromIso(initial?.arriveBy));
  const [departTime, setDepartTime] = useState<string>(timeStrFromIso(initial?.departAt));
  const [checkOutTime, setCheckOutTime] = useState<string>(timeStrFromIso(initial?.checkOut));
  const [openFrom, setOpenFrom] = useState<string>(initial?.openFrom ?? "");
  const [openTo, setOpenTo] = useState<string>(initial?.openTo ?? "");
  const [fixedTime, setFixedTime] = useState(initial?.fixedTime ?? false);
  const [cost, setCost] = useState(typeof initial?.cost === "number" ? String(initial.cost) : "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const transit = isTransit(mode);
  const stay = mode === "stay";
  const home = mode === "home";
  const canSubmit = home ? true : title.trim().length > 0;

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
  };

  const iso = (d: number, t: string) => (t ? combineDateAndTime(dateForDay(tripDate, d), t)?.toISOString() : undefined);

  const submit = () => {
    if (!canSubmit) return;
    const input: PlanEntryInput = {
      title: home ? title.trim() || "自宅" : title,
      mode,
      priority,
      day,
      cost: cost ? Number(cost.replace(/[^0-9]/g, "")) || undefined : undefined,
      detail: detail || undefined,
    };
    if (home) {
      input.place = place || undefined;
      input.priority = "must";
      input.day = 1;
      input.departAt = iso(1, departTime); // 初日に出発
      input.arriveBy = iso(tripDayCount, arriveTime); // 最終日に帰宅
      input.fixedTime = true;
    } else if (transit) {
      input.placeFrom = placeFrom || undefined;
      input.placeTo = placeTo || undefined;
      input.departAt = iso(day, departTime);
      input.arriveBy = iso(day, arriveTime);
      input.fixedTime = true;
    } else if (stay) {
      input.place = place || undefined;
      input.arriveBy = iso(day, arriveTime); // チェックイン
      input.checkOut = iso(day + 1, checkOutTime); // 翌日チェックアウト
      input.fixedTime = true;
    } else {
      input.place = place || undefined;
      input.stayMin = stayMin ?? undefined;
      input.arriveBy = iso(day, arriveTime);
      input.fixedTime = arriveTime ? fixedTime : false;
      input.openFrom = openFrom || undefined;
      input.openTo = openTo || undefined;
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
    setOpenFrom("");
    setOpenTo("");
    setFixedTime(false);
    setCost("");
    setDetail("");
    setPredictions([]);
  };

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="font-gothic-400 text-[10px] text-muted">
          {home ? "名称（任意・例: 自宅）" : transit ? "名称 *（例: JL105便）" : "行き先 *（名前を入れると住所候補が出ます）"}
        </Text>
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder={home ? "自宅" : transit ? "例: のぞみ / JL105" : "例: 中之島美術館"}
          placeholderTextColor={MUTED}
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
        />
        {predictions.length > 0 && !transit && !home && (
          <View className="mt-1 overflow-hidden rounded-[10px] border border-black/[.1] bg-white/90">
            {predictions.map((p, i) => (
              <Pressable key={p.placeId} onPress={() => selectPrediction(p)} className={`px-3 py-2 ${i > 0 ? "border-t border-black/[.06]" : ""}`}>
                <Text className="font-mincho-400 text-[13px] text-ink">{p.mainText}</Text>
                {p.secondaryText ? <Text className="mt-0.5 font-gothic-400 text-[10px] text-muted">{p.secondaryText}</Text> : null}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View className="gap-1.5">
        <Text className="font-gothic-400 text-[10px] text-muted">種別</Text>
        <View className="flex-row flex-wrap gap-2">
          {MODE_OPTIONS.map((o) => (
            <Chip key={o.value} active={o.value === mode} label={o.label} onPress={() => setMode(o.value)} />
          ))}
        </View>
      </View>

      {tripDayCount > 1 && !home && (
        <View className="gap-1.5">
          <Text className="font-gothic-400 text-[10px] text-muted">何日目</Text>
          <View className="flex-row flex-wrap gap-2">
            {Array.from({ length: tripDayCount }, (_, i) => i + 1).map((d) => (
              <Chip key={d} active={day === d} label={`${d}日目`} onPress={() => setDay(d)} />
            ))}
          </View>
        </View>
      )}

      {/* 種別ごとの入力欄 */}
      {home ? (
        <>
          <View className="gap-1">
            <Text className="font-gothic-400 text-[10px] text-muted">住所（任意・入れると地図/移動時間の精度UP）</Text>
            <TextInput
              value={place}
              onChangeText={setPlace}
              placeholder="例: 東京都新宿区…"
              placeholderTextColor={MUTED}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
            />
          </View>
          <View className="flex-row gap-3">
            <TimeField label="出発時刻（初日）" value={departTime} onChange={setDepartTime} />
            <TimeField label={tripDayCount > 1 ? `帰宅時刻（${tripDayCount}日目）` : "帰宅時刻"} value={arriveTime} onChange={setArriveTime} />
          </View>
          <Text className="font-gothic-400 text-[10px] text-muted">
            出発は初日、帰宅は最終日として旅程の起点・終点に置きます。
          </Text>
        </>
      ) : transit ? (
        <>
          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <Text className="font-gothic-400 text-[10px] text-muted">出発地</Text>
              <TextInput
                value={placeFrom}
                onChangeText={setPlaceFrom}
                placeholder="例: 東京駅"
                placeholderTextColor={MUTED}
                className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
              />
            </View>
            <View className="flex-1 gap-1">
              <Text className="font-gothic-400 text-[10px] text-muted">到着地</Text>
              <TextInput
                value={placeTo}
                onChangeText={setPlaceTo}
                placeholder="例: 新大阪駅"
                placeholderTextColor={MUTED}
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
            <Text className="font-gothic-400 text-[10px] text-muted">場所・住所（宿泊先）</Text>
            <TextInput
              value={place}
              onChangeText={setPlace}
              placeholder="例: ホテル日航大阪"
              placeholderTextColor={MUTED}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
            />
          </View>
          <View className="flex-row gap-3">
            <TimeField label="チェックイン" value={arriveTime} onChange={setArriveTime} />
            <TimeField label="チェックアウト（翌日）" value={checkOutTime} onChange={setCheckOutTime} />
          </View>
        </>
      ) : (
        <>
          <View className="gap-1">
            <Text className="font-gothic-400 text-[10px] text-muted">住所（任意・入れると地図/移動時間の精度UP）</Text>
            <TextInput
              value={place}
              onChangeText={setPlace}
              placeholder="例: 大阪府大阪市北区中之島4-3-1"
              placeholderTextColor={MUTED}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
            />
          </View>
          <View className="gap-1.5">
            <Text className="font-gothic-400 text-[10px] text-muted">滞在時間の目安</Text>
            <View className="flex-row flex-wrap gap-2">
              {STAY_OPTIONS.map((m) => (
                <Chip key={m} active={stayMin === m} label={`${m}分`} onPress={() => setStayMin(m)} />
              ))}
              <Chip active={stayMin === null} label="指定なし" onPress={() => setStayMin(null)} />
            </View>
          </View>
          <View className="gap-1">
            <Text className="font-gothic-400 text-[10px] text-muted">営業・開館時間（任意・AIがこの時間内に組みます）</Text>
            <View className="flex-row gap-3">
              <TimeField label="開店" value={openFrom} onChange={setOpenFrom} />
              <TimeField label="閉店" value={openTo} onChange={setOpenTo} />
            </View>
          </View>
          <View className="flex-row items-end gap-3">
            <TimeField label="到着時刻（任意）" value={arriveTime} onChange={setArriveTime} />
            <View className="flex-1 gap-1">
              <Text className="font-gothic-400 text-[10px] text-muted">費用（円・任意）</Text>
              <TextInput
                value={cost}
                onChangeText={setCost}
                keyboardType="number-pad"
                placeholder="例: 1200"
                placeholderTextColor={MUTED}
                className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 font-mincho-400 text-[14px] text-ink"
                style={{ height: 42, fontVariant: ["tabular-nums"] }}
              />
            </View>
          </View>
          {arriveTime !== "" && (
            <Pressable onPress={() => setFixedTime((v) => !v)} className="flex-row items-center gap-2">
              <View className={`h-[18px] w-[18px] items-center justify-center rounded-[5px] border ${fixedTime ? "border-ink bg-ink" : "border-black/[.25]"}`}>
                {fixedTime && <View className="h-[8px] w-[8px] rounded-[2px] bg-kinari" />}
              </View>
              <Text className="font-gothic-400 text-[11px] text-muted">この時刻は固定（予約など。AIが動かしません）</Text>
            </Pressable>
          )}
        </>
      )}

      {/* 重要度は宿泊/移動/自宅以外で表示（宿泊・移動・自宅は必ず組み込む想定） */}
      {!transit && !stay && !home && (
        <View className="gap-1.5">
          <Text className="font-gothic-400 text-[10px] text-muted">重要度</Text>
          <View className="flex-row gap-2">
            {PRIORITY_OPTIONS.map((o) => (
              <Chip key={o.value} active={o.value === priority} label={o.label} onPress={() => setPriority(o.value)} />
            ))}
          </View>
        </View>
      )}

      {/* 費用（移動・宿泊はこちらに） */}
      {(transit || stay) && (
        <View className="gap-1">
          <Text className="font-gothic-400 text-[10px] text-muted">費用（円・任意）{stay ? "／宿泊は1泊分" : ""}</Text>
          <TextInput
            value={cost}
            onChangeText={setCost}
            keyboardType="number-pad"
            placeholder="例: 14000"
            placeholderTextColor={MUTED}
            className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 font-mincho-400 text-[14px] text-ink"
            style={{ height: 42, fontVariant: ["tabular-nums"] }}
          />
        </View>
      )}

      <View className="gap-1">
        <Text className="font-gothic-400 text-[10px] text-muted">メモ（任意）</Text>
        <TextInput
          value={detail}
          onChangeText={setDetail}
          placeholder="例: 予約番号 / 座席 など"
          placeholderTextColor={MUTED}
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-gothic-400 text-[12px] text-ink"
        />
      </View>

      <Pressable disabled={!canSubmit} onPress={submit} className={`mt-1 rounded-[12px] px-4 py-3 ${canSubmit ? "bg-ink" : "bg-ink/30"}`}>
        <Text className="text-center font-gothic-500 text-[12px] text-kinari">{submitLabel}</Text>
      </Pressable>
    </View>
  );
}
