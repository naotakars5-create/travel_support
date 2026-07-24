import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Priority, TransportMode } from "@/lib/types";
import { PlanEntryInput } from "@/lib/plan";
import { DateField } from "./DateField";

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

/** 行き先（行き先名・住所・重要度・滞在時間・目安到着時刻・費用）を入力して1件追加するフォーム。 */
export function PlanEntryForm({ onSubmit }: { onSubmit: (input: PlanEntryInput) => void }) {
  const [title, setTitle] = useState("");
  const [place, setPlace] = useState("");
  const [mode, setMode] = useState<TransportMode>("activity");
  const [priority, setPriority] = useState<Priority>("want");
  const [stayMin, setStayMin] = useState<number | null>(60);
  const [arriveAt, setArriveAt] = useState<Date | null>(null);
  const [fixedTime, setFixedTime] = useState(false);
  const [cost, setCost] = useState("");
  const [detail, setDetail] = useState("");

  const canSubmit = title.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit({
      title,
      place: place || undefined,
      mode,
      priority,
      stayMin: stayMin ?? undefined,
      arriveBy: arriveAt ? arriveAt.toISOString() : undefined,
      fixedTime: arriveAt ? fixedTime : false,
      cost: cost ? Number(cost.replace(/[^0-9]/g, "")) || undefined : undefined,
      detail: detail || undefined,
    });
    // 連続追加しやすいようリセット
    setTitle("");
    setPlace("");
    setPriority("want");
    setStayMin(60);
    setArriveAt(null);
    setFixedTime(false);
    setCost("");
    setDetail("");
  };

  return (
    <View className="gap-3">
      <View className="gap-1">
        <Text className="font-gothic-400 text-[10px] text-muted">行き先 *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="例: 中之島美術館"
          placeholderTextColor={MUTED}
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
        />
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
        <DateField label="目安到着時刻（任意）" value={arriveAt} onChange={setArriveAt} />
        <View className="flex-1 gap-1">
          <Text className="font-gothic-400 text-[10px] text-muted">費用（円・任意）</Text>
          <TextInput
            value={cost}
            onChangeText={setCost}
            keyboardType="number-pad"
            placeholder="例: 1200"
            placeholderTextColor={MUTED}
            className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
            style={{ fontVariant: ["tabular-nums"] }}
          />
        </View>
      </View>

      {arriveAt && (
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
        <Text className="text-center font-gothic-500 text-[12px] text-kinari">行き先を追加</Text>
      </Pressable>
    </View>
  );
}
