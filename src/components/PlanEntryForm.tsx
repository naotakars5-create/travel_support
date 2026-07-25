import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Priority, TransportMode } from "@/lib/types";
import { PlanEntryInput } from "@/lib/plan";
import { combineDateAndTime, timeStrFromIso } from "@/lib/date";
import { fetchPlacePredictions, PlacePrediction } from "@/lib/places";
import { TimeField } from "./PlainFields";

const MODE_OPTIONS: { value: TransportMode; label: string }[] = [
  { value: "activity", label: "観光" },
  { value: "dining", label: "食事" },
  { value: "stay", label: "宿泊" },
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

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-1.5 ${active ? "border-ink bg-ink" : "border-black/[.12] bg-white/50"}`}
    >
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
}

/** 行き先を入力するフォーム。initial を渡すと「編集」モードになる（既存値を初期表示）。 */
export function PlanEntryForm({
  onSubmit,
  initial,
  tripDate,
  submitLabel = "行き先を追加",
  resetAfterSubmit = true,
}: {
  onSubmit: (input: PlanEntryInput) => void;
  initial?: PlanEntryFormInitial;
  /** 旅行日（YYYY-MM-DD）。到着時刻はこの日付と結合する。 */
  tripDate: string;
  submitLabel?: string;
  resetAfterSubmit?: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [place, setPlace] = useState(initial?.place ?? "");
  const [mode, setMode] = useState<TransportMode>(initial?.mode ?? "activity");
  const [priority, setPriority] = useState<Priority>(initial?.priority ?? "want");
  const [stayMin, setStayMin] = useState<number | null>(initial ? initial.stayMin ?? null : 60);
  const [arriveTime, setArriveTime] = useState<string>(timeStrFromIso(initial?.arriveBy));
  const [fixedTime, setFixedTime] = useState(initial?.fixedTime ?? false);
  const [cost, setCost] = useState(typeof initial?.cost === "number" ? String(initial.cost) : "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSubmit = title.trim().length > 0;

  // 行き先名の入力に合わせて住所つき候補を出す（オートコンプリート）
  const onTitleChange = (v: string) => {
    setTitle(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (v.trim().length < 2) {
      setPredictions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      const preds = await fetchPlacePredictions(v.trim());
      setPredictions(preds);
    }, 350);
  };

  const selectPrediction = (p: PlacePrediction) => {
    setTitle(p.mainText);
    setPlace(p.secondaryText || p.description);
    setPredictions([]);
  };

  const submit = () => {
    if (!canSubmit) return;
    const arriveDate = arriveTime ? combineDateAndTime(tripDate, arriveTime) : null;
    onSubmit({
      title,
      place: place || undefined,
      mode,
      priority,
      stayMin: stayMin ?? undefined,
      arriveBy: arriveDate ? arriveDate.toISOString() : undefined,
      fixedTime: arriveDate ? fixedTime : false,
      cost: cost ? Number(cost.replace(/[^0-9]/g, "")) || undefined : undefined,
      detail: detail || undefined,
    });
    if (!resetAfterSubmit) return;
    // 連続追加しやすいようリセット
    setTitle("");
    setPlace("");
    setPriority("want");
    setStayMin(60);
    setArriveTime("");
    setFixedTime(false);
    setCost("");
    setDetail("");
    setPredictions([]);
  };

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="font-gothic-400 text-[10px] text-muted">行き先 *（名前を入れると住所候補が出ます）</Text>
        <TextInput
          value={title}
          onChangeText={onTitleChange}
          placeholder="例: 中之島美術館"
          placeholderTextColor={MUTED}
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
        />
        {predictions.length > 0 && (
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
        <Text className="font-gothic-400 text-[10px] text-muted">種別</Text>
        <View className="flex-row flex-wrap gap-2">
          {MODE_OPTIONS.map((o) => (
            <Chip key={o.value} active={o.value === mode} label={o.label} onPress={() => setMode(o.value)} />
          ))}
        </View>
      </View>

      <View className="gap-1.5">
        <Text className="font-gothic-400 text-[10px] text-muted">重要度</Text>
        <View className="flex-row gap-2">
          {PRIORITY_OPTIONS.map((o) => (
            <Chip key={o.value} active={o.value === priority} label={o.label} onPress={() => setPriority(o.value)} />
          ))}
        </View>
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

      <View className="gap-1">
        <Text className="font-gothic-400 text-[10px] text-muted">メモ（任意）</Text>
        <TextInput
          value={detail}
          onChangeText={setDetail}
          placeholder="例: 企画展を鑑賞 / 予約番号 など"
          placeholderTextColor={MUTED}
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-gothic-400 text-[12px] text-ink"
        />
      </View>

      <Pressable
        disabled={!canSubmit}
        onPress={submit}
        className={`mt-1 rounded-[12px] px-4 py-3 ${canSubmit ? "bg-ink" : "bg-ink/30"}`}
      >
        <Text className="text-center font-gothic-500 text-[12px] text-kinari">{submitLabel}</Text>
      </Pressable>
    </View>
  );
}
