import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DayOfState, computeCountdown } from "@/lib/dayof";
import { formatDurationMin } from "@/lib/itinerary";
import { formatJstTime, formatJstMonthDayJa } from "@/lib/date";
import { MODE_COLOR, MODE_LABEL } from "@/lib/modeMeta";
import { createSpotProvider, Spot } from "@/lib/spots";
import { GeoPoint } from "@/lib/types";
import { LocationPermissionState } from "@/hooks/useLiveLocation";
import { Blinker } from "./animations";

const TNUM: TextStyle = { fontVariant: ["tabular-nums"] };

export function DayOfScreen({
  state,
  now,
  liveLocation,
  locationPermission,
  onNavigateInbox,
  onRecordArrival,
}: {
  state: DayOfState;
  now: Date;
  liveLocation: GeoPoint | null;
  locationPermission: LocationPermissionState;
  onNavigateInbox: () => void;
  onRecordArrival: (nodeKey: string, place: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const gpsActive = locationPermission === "granted" && Boolean(liveLocation);
  return (
    <View className="flex-1 bg-day-bg" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-baseline justify-between px-[26px] pb-4 pt-4">
        <Text className="font-gothic-400 text-[11px] text-day-text2">{formatJstMonthDayJa(now)} · 大阪</Text>
        <Text className="font-gothic-400 text-[11px] text-day-text2" style={TNUM}>
          現在 {formatJstTime(now)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 26, paddingBottom: insets.bottom + 24 }}>
        {state.mode === "locked" && <LockedHero onNavigateInbox={onNavigateInbox} />}
        {state.mode === "move" && <MoveHero state={state} now={now} gpsActive={gpsActive} onRecordArrival={onRecordArrival} />}
        {state.mode === "free" && (
          <FreeHero state={state} liveLocation={liveLocation} gpsActive={gpsActive} onRecordArrival={onRecordArrival} />
        )}
        {state.mode === "done" && <DoneHero totalReservations={state.totalReservations} />}
      </ScrollView>
    </View>
  );
}

function GpsHint({ active }: { active: boolean }) {
  if (!active) return null;
  return <Text className="mt-3 font-gothic-400 text-[10px] text-day-text3">GPSでこの場所に近づくと自動で到着を記録します</Text>;
}

function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mt-6 rounded-[12px] border border-day-text/40 py-3">
      <Text className="text-center font-gothic-400 text-[12px] text-day-text">{label}</Text>
    </Pressable>
  );
}

function LockedHero({ onNavigateInbox }: { onNavigateInbox: () => void }) {
  return (
    <View className="items-center">
      <Text className="font-gothic-400 text-[11px] tracking-[.08em] text-day-text2">未確定の予約があります</Text>
      <Text className="mt-4 text-center font-mincho-700 text-[30px] leading-[36px] text-day-text">
        次の行き先が{"\n"}まだ決まっていません
      </Text>
      <Text className="mt-4 text-center font-gothic-400 text-[12px] leading-[19px] text-day-text2">
        受信箱の未解析メールを解析すると、{"\n"}旅程がつながり出発時刻を計算します。
      </Text>
      <OutlineButton label="受信箱で解析する" onPress={onNavigateInbox} />
    </View>
  );
}

function MoveHero({
  state,
  now,
  gpsActive,
  onRecordArrival,
}: {
  state: Extract<DayOfState, { mode: "move" }>;
  now: Date;
  gpsActive: boolean;
  onRecordArrival: (nodeKey: string, place: string) => void;
}) {
  const { mm, ss } = computeCountdown(state.targetDepartAt, now);
  const modeColor = MODE_COLOR[state.transitMode];
  return (
    <View className="items-center">
      <Text className="font-gothic-400 text-[11px] tracking-[.08em] text-day-text2">次の移動まで</Text>
      <View className="mt-3 flex-row">
        <Text className="font-mincho-900 text-[90px] leading-[81px] text-accent" style={TNUM}>
          {mm}
        </Text>
        <Blinker>
          <Text className="font-mincho-900 text-[90px] leading-[81px] text-accent">:</Text>
        </Blinker>
        <Text className="font-mincho-900 text-[90px] leading-[81px] text-accent" style={TNUM}>
          {ss}
        </Text>
      </View>
      <Text className="mt-2 font-gothic-400 text-[10px] tracking-[.15em] text-day-text3">分 秒</Text>

      <View className="mt-8 w-full rounded-[16px] border border-day-text/10 bg-day-text/[.04] p-4">
        <Text className="font-mincho-600 text-[23px] text-day-text">{state.nextNode.place}</Text>
        <View className="mt-2 flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: modeColor }} />
          <Text className="font-gothic-400 text-[11px] text-day-text2" style={TNUM}>
            {state.currentNode?.place ?? "現在地"} → {state.nextNode.place} · {MODE_LABEL[state.transitMode]}
            {state.transitMin > 0 ? formatDurationMin(state.transitMin) : ""}
          </Text>
        </View>
      </View>

      <Pressable onPress={() => onRecordArrival(state.nextNode.key, state.nextNode.place)} className="mt-6 w-full rounded-[12px] border border-day-text/40 py-3">
        <Text className="text-center font-gothic-400 text-[12px] text-day-text">{state.nextNode.place} に到着を記録</Text>
      </Pressable>
      <GpsHint active={gpsActive && Boolean(state.nextNode.geo)} />
    </View>
  );
}

function FreeHero({
  state,
  liveLocation,
  gpsActive,
  onRecordArrival,
}: {
  state: Extract<DayOfState, { mode: "free" }>;
  liveLocation: GeoPoint | null;
  gpsActive: boolean;
  onRecordArrival: (nodeKey: string, place: string) => void;
}) {
  const [spots, setSpots] = useState<Spot[]>([]);
  // 実際の現在地（GPS）があればそちらを優先し、無ければ到着記録した地点の座標を使う。
  const geo = liveLocation ?? state.currentNode.geo;

  useEffect(() => {
    let cancelled = false;
    const provider = createSpotProvider(Boolean(geo));
    provider.nearby(geo?.lat ?? 0, geo?.lng ?? 0, state.freeMin).then((res) => {
      if (!cancelled) setSpots(res);
    });
    return () => {
      cancelled = true;
    };
  }, [state.freeMin, geo]);

  return (
    <View className="items-center">
      <Text className="font-gothic-400 text-[11px] tracking-[.08em] text-day-text2">空き時間</Text>
      <Text className="mt-3 font-mincho-900 text-[62px] leading-[56px] text-day-text" style={TNUM}>
        {formatDurationMin(state.freeMin)}
      </Text>
      <Text className="mt-2 font-gothic-400 text-[11px] text-day-text2" style={TNUM}>
        次の予約 {formatJstTime(new Date(state.nextNode.time))} {state.nextNode.place} まで
      </Text>

      {spots.length > 0 && (
        <View className="mt-7 w-full">
          <Text className="mb-2 font-gothic-400 text-[10px] tracking-[.15em] text-day-text3">
            近くに寄れる場所{liveLocation ? "（現在地から）" : ""}
          </Text>
          <View className="rounded-[16px] border border-day-text/10">
            {spots.map((s, i) => (
              <View key={s.name} className={`flex-row items-center justify-between px-4 py-3 ${i > 0 ? "border-t border-day-text/10" : ""}`}>
                <View className="flex-1 pr-2">
                  <Text className="font-mincho-400 text-[14px] text-day-text">{s.name}</Text>
                  <Text className="mt-0.5 font-gothic-400 text-[10px] text-day-text2">{s.note}</Text>
                </View>
                <Text className="font-gothic-400 text-[11px] text-day-text2" style={TNUM}>
                  徒歩 {s.walkMin}分
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Pressable onPress={() => onRecordArrival(state.nextNode.key, state.nextNode.place)} className="mt-6 w-full rounded-[12px] border border-day-text/40 py-3">
        <Text className="text-center font-gothic-400 text-[12px] text-day-text">{state.nextNode.place} に到着を記録</Text>
      </Pressable>
      <GpsHint active={gpsActive && Boolean(state.nextNode.geo)} />
    </View>
  );
}

function DoneHero({ totalReservations }: { totalReservations: number }) {
  if (totalReservations === 0) {
    return (
      <View className="items-center">
        <Text className="font-gothic-400 text-[11px] tracking-[.08em] text-day-text2">本日の予定</Text>
        <Text className="mt-4 text-center font-mincho-700 text-[26px] text-day-text">まだ予定がありません</Text>
        <Text className="mt-4 text-center font-gothic-400 text-[12px] leading-[19px] text-day-text2">
          受信箱でメールを解析すると、{"\n"}ここに旅程が表示されます。
        </Text>
      </View>
    );
  }
  return (
    <View className="items-center">
      <Text className="font-gothic-400 text-[11px] tracking-[.08em] text-day-text2">本日の予定</Text>
      <Text className="mt-4 font-mincho-700 text-[30px] text-day-text">すべて完了</Text>
      <Text className="mt-4 text-center font-gothic-400 text-[12px] leading-[19px] text-day-text2">
        {totalReservations}件の予約を、途切れなく巡りました。{"\n"}お疲れさまでした。
      </Text>
    </View>
  );
}
