import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { TransportMode } from "@/lib/types";
import { ManualEventInput } from "@/lib/manualEntry";
import { DateField } from "./DateField";

const MODE_OPTIONS: { value: TransportMode; label: string }[] = [
  { value: "air", label: "飛行機" },
  { value: "rail", label: "鉄道" },
  { value: "bus", label: "バス" },
  { value: "car", label: "車" },
  { value: "walk", label: "徒歩" },
  { value: "stay", label: "宿泊" },
  { value: "dining", label: "食事" },
  { value: "activity", label: "観光" },
];

const MUTED = "#8a8378";

export function ManualEntryForm({
  onSubmit,
  intro = "自動解析できなかったため、内容を手入力してください。",
}: {
  onSubmit: (input: ManualEventInput) => void;
  intro?: string;
}) {
  const [mode, setMode] = useState<TransportMode>("stay");
  const [title, setTitle] = useState("");
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [placeFrom, setPlaceFrom] = useState("");
  const [placeTo, setPlaceTo] = useState("");
  const [detail, setDetail] = useState("");

  const isTransit = mode === "air" || mode === "rail" || mode === "bus" || mode === "car";
  const canSubmit = title.trim().length > 0 && startAt !== null;

  return (
    <View className="gap-3">
      <Text className="font-gothic-400 text-[11px] leading-[18px] text-muted">{intro}</Text>

      <View className="gap-1.5">
        <Text className="font-gothic-400 text-[10px] text-muted">種別</Text>
        <View className="flex-row flex-wrap gap-2">
          {MODE_OPTIONS.map((o) => {
            const active = o.value === mode;
            return (
              <Pressable
                key={o.value}
                onPress={() => setMode(o.value)}
                className={`rounded-full border px-3 py-1.5 ${active ? "border-ink bg-ink" : "border-black/[.12] bg-white/50"}`}
              >
                <Text className={`font-gothic-400 text-[11px] ${active ? "text-kinari" : "text-ink"}`}>{o.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-1">
        <Text className="font-gothic-400 text-[10px] text-muted">タイトル *</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="例: ホテル日航大阪"
          placeholderTextColor={MUTED}
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
        />
      </View>

      <View className="flex-row gap-3">
        <DateField label="開始日時" value={startAt} onChange={setStartAt} required />
        <DateField label="終了日時" value={endAt} onChange={setEndAt} />
      </View>

      {isTransit ? (
        <View className="flex-row gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-gothic-400 text-[10px] text-muted">出発地（住所推奨）</Text>
            <TextInput
              value={placeFrom}
              onChangeText={setPlaceFrom}
              placeholder="例: 東京都大田区羽田空港2-6-5"
              placeholderTextColor={MUTED}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
            />
          </View>
          <View className="flex-1 gap-1">
            <Text className="font-gothic-400 text-[10px] text-muted">到着地（住所推奨）</Text>
            <TextInput
              value={placeTo}
              onChangeText={setPlaceTo}
              placeholder="例: 大阪府池田市空港2-1"
              placeholderTextColor={MUTED}
              className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
            />
          </View>
        </View>
      ) : (
        <View className="gap-1">
          <Text className="font-gothic-400 text-[10px] text-muted">場所・住所</Text>
          <TextInput
            value={placeTo}
            onChangeText={setPlaceTo}
            placeholder="例: 大阪府大阪市北区堂島浜1-3-1"
            placeholderTextColor={MUTED}
            className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[13px] text-ink"
          />
        </View>
      )}
      <Text className="-mt-1 font-gothic-400 text-[10px] text-muted-light">
        住所を入力すると、地図情報をもとに移動時間や周辺スポットの提案精度が上がります（未入力でも登録できます）。
      </Text>

      <View className="gap-1">
        <Text className="font-gothic-400 text-[10px] text-muted">詳細</Text>
        <TextInput
          value={detail}
          onChangeText={setDetail}
          placeholder="例: 予約番号 / 座席 など"
          placeholderTextColor={MUTED}
          className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-gothic-400 text-[12px] text-ink"
        />
      </View>

      <Pressable
        disabled={!canSubmit}
        onPress={() =>
          onSubmit({
            mode,
            title,
            startAt: (startAt as Date).toISOString(),
            endAt: endAt ? endAt.toISOString() : undefined,
            placeFrom: placeFrom || undefined,
            placeTo: placeTo || undefined,
            detail: detail || undefined,
          })
        }
        className={`mt-1 rounded-[12px] px-4 py-3 ${canSubmit ? "bg-ink" : "bg-ink/30"}`}
      >
        <Text className="text-center font-gothic-500 text-[12px] text-kinari">旅程に追加</Text>
      </Pressable>
    </View>
  );
}
