import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GeoPoint } from "@/lib/types";
import { createSpotProvider, Spot } from "@/lib/spots";
import { haversineMeters } from "@/lib/geo";
import { RouteMap } from "./RouteMap";

const TNUM: TextStyle = { fontVariant: ["tabular-nums"] };

/** 探すジャンル。Places の検索半径だけを変え、種別は「観光」で統一して結果のばらつきを抑える。 */
const RANGES: { label: string; meters: number }[] = [
  { label: "すぐ近く", meters: 1200 },
  { label: "この街", meters: 5000 },
  { label: "広めに", meters: 15000 },
];

/** 距離（メートル）の表示。 */
function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
}

/**
 * 地図タブ。旅の周辺スポットを探して、タップで計画へ足せる。
 * 基点は「登録した行き先の中心」→無ければ現在地。
 */
export function MapScreen({
  center,
  liveLocation,
  existingTitles,
  onAddSpot,
  onNavigatePlan,
}: {
  /** 登録済みの行き先の重心（無ければ null） */
  center: GeoPoint | null;
  liveLocation: GeoPoint | null;
  /** すでに計画にある行き先の名前（重複追加を防ぐ） */
  existingTitles: Set<string>;
  onAddSpot: (spot: Spot) => void;
  onNavigatePlan: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [rangeIndex, setRangeIndex] = useState(1);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());

  const origin = center ?? liveLocation;
  const radius = RANGES[rangeIndex].meters;
  const originKey = origin ? `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}|${radius}` : null;

  /* eslint-disable react-hooks/set-state-in-effect -- 外部API（周辺スポット）取得のため意図的 */
  useEffect(() => {
    if (!origin) {
      setSpots([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    createSpotProvider(true)
      .nearby(origin.lat, origin.lng, 120, false, radius)
      .then((res) => {
        if (!cancelled) setSpots(res);
      })
      .catch(() => {
        if (!cancelled) setSpots([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // 基点と範囲が変わった時だけ取り直す
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const fresh = spots.filter((s) => !existingTitles.has(s.name));
  const mapPoints = fresh.filter((s) => s.lat != null && s.lng != null).slice(0, 10).map((s) => ({ lat: s.lat!, lng: s.lng! }));

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <View className="px-[26px] pb-2 pt-3">
        <Text className="font-mincho-600 text-[26px] text-ink">地図で探す</Text>
        <Text className="mt-1 font-gothic-400 text-[11px] text-muted">
          {origin ? "タップすると計画の行き先リストに追加します" : "行き先を1つ登録すると、その周辺から探せます"}
        </Text>
      </View>
      <View className="h-px w-full bg-black/[.08]" />

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingTop: 10, paddingBottom: 90 }}>
        {!origin ? (
          <Pressable onPress={onNavigatePlan} className="mt-10 self-center rounded-[12px] border border-ink/25 px-5 py-3">
            <Text className="text-center font-gothic-400 text-[12px] text-muted">
              まだ基点がありません。{"\n"}「計画」で行き先をひとつ追加してください。
            </Text>
          </Pressable>
        ) : (
          <>
            {/* 探す範囲 */}
            <View className="mb-2.5 flex-row gap-2">
              {RANGES.map((r, i) => {
                const active = i === rangeIndex;
                return (
                  <Pressable
                    key={r.label}
                    onPress={() => setRangeIndex(i)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`rounded-full border px-3 py-1.5 ${active ? "border-ink bg-ink" : "border-black/[.12] bg-white/50"}`}
                  >
                    <Text className={`font-gothic-400 text-[11px] ${active ? "text-kinari" : "text-ink"}`}>{r.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 候補の位置関係が分かる地図 */}
            <RouteMap points={mapPoints} me={liveLocation} caption={`この辺の候補 · ${fresh.length}件`} />

            {loading && (
              <View className="flex-row items-center gap-2 py-3">
                <ActivityIndicator size="small" color="#6E675C" />
                <Text className="font-gothic-400 text-[11px] text-muted">近くのスポットを探しています…</Text>
              </View>
            )}

            {!loading && fresh.length === 0 && (
              <Text className="mt-6 text-center font-gothic-400 text-[12px] leading-[19px] text-muted">
                この範囲では新しい候補が見つかりませんでした。{"\n"}範囲を広げてみてください。
              </Text>
            )}

            <View className="overflow-hidden rounded-[14px] border border-ink/10">
              {fresh.map((s, i) => {
                const isAdded = added.has(s.name);
                const distance =
                  origin && s.lat != null && s.lng != null ? haversineMeters(origin, { lat: s.lat, lng: s.lng }) : null;
                return (
                  <View key={s.name} className={`flex-row items-center gap-2 px-4 py-2.5 ${i > 0 ? "border-t border-ink/10" : ""}`}>
                    <Pressable
                      onPress={() => {
                        if (s.lat != null && s.lng != null) {
                          void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}`);
                        }
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.name}を地図で見る`}
                      className="flex-1"
                    >
                      <Text className="font-mincho-600 text-[14px] text-ink">{s.name}</Text>
                      <Text className="mt-0.5 font-gothic-400 text-[10px] text-muted" style={TNUM}>
                        {[s.category, distance != null ? formatDistance(distance) : null, s.note].filter(Boolean).join(" · ")}
                      </Text>
                      {s.address && (
                        <Text numberOfLines={1} className="mt-0.5 font-gothic-400 text-[10px] text-muted-light">
                          {s.address}
                        </Text>
                      )}
                    </Pressable>
                    <Pressable
                      disabled={isAdded}
                      onPress={() => {
                        onAddSpot(s);
                        setAdded((prev) => new Set(prev).add(s.name));
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.name}を計画に追加`}
                      className={`rounded-full px-3 py-1.5 ${isAdded ? "border border-ink/20" : "bg-ink"}`}
                    >
                      <Text className={`font-gothic-500 text-[11px] ${isAdded ? "text-muted-light" : "text-kinari"}`}>
                        {isAdded ? "追加済み" : "＋ 計画へ"}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
