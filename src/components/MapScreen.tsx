import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GeoPoint } from "@/lib/types";
import { createSpotProvider, Spot } from "@/lib/spots";
import { haversineMeters } from "@/lib/geo";
import { clampZoom, viewRadiusMeters } from "@/lib/mercator";
import { MapMarker, PannableMap } from "./PannableMap";
import { COLORS } from "@/lib/palette";

const TNUM: TextStyle = { fontVariant: ["tabular-nums"] };

/** 最初に開いた時のズーム（街の広がりがひと目で分かるくらい）。 */
const INITIAL_ZOOM = 13;
/** 地図に打てるピンの数（Static Maps のURL長に収まる範囲）。 */
const MAX_PINS = 12;

/** 距離（メートル）の表示。 */
function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
}

/**
 * 地図タブ。画面いっぱいの地図を指で動かし、見えている範囲からスポットを探して計画へ足す。
 * 基点は「登録した行き先の中心」→無ければ現在地。
 */
export function MapScreen({
  center,
  liveLocation,
  existingTitles,
  readOnly,
  onAddSpot,
  onNavigatePlan,
}: {
  /** 登録済みの行き先の重心（無ければ null） */
  center: GeoPoint | null;
  liveLocation: GeoPoint | null;
  /** すでに計画にある行き先の名前（重複追加を防ぐ） */
  existingTitles: Set<string>;
  /** 共有された旅程を見ているだけの状態（押しても保存されない操作は出さない） */
  readOnly: boolean;
  onAddSpot: (spot: Spot) => void;
  onNavigatePlan: () => void;
}) {
  const insets = useSafeAreaInsets();
  const origin = center ?? liveLocation;

  const [mapCenter, setMapCenter] = useState<GeoPoint | null>(origin);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  // 探した時の中心。ここから離れたら「この範囲で探す」を出す
  const [searchedAt, setSearchedAt] = useState<GeoPoint | null>(null);
  const [viewSize, setViewSize] = useState({ width: 320, height: 420 });

  // 行き先が後から登録された場合に、まだ動かしていなければ基点へ寄せる
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !origin) return;
    started.current = true;
    setMapCenter(origin);
  }, [origin]);

  const search = useCallback(
    (at: GeoPoint, z: number) => {
      const radius = Math.max(500, Math.min(20000, viewRadiusMeters(at, z, viewSize.width, viewSize.height)));
      setLoading(true);
      setSearchedAt(at);
      createSpotProvider(true)
        .nearby(at.lat, at.lng, 120, false, radius)
        .then((res) => setSpots(res))
        .catch(() => setSpots([]))
        .finally(() => setLoading(false));
    },
    [viewSize.width, viewSize.height]
  );

  // 最初の1回だけ自動で探す（あとは指で動かして「この範囲で探す」）
  const autoSearched = useRef(false);
  useEffect(() => {
    if (autoSearched.current || !mapCenter) return;
    autoSearched.current = true;
    search(mapCenter, zoom);
  }, [mapCenter, zoom, search]);

  const fresh = useMemo(() => spots.filter((s) => !existingTitles.has(s.name)), [spots, existingTitles]);
  const pins: MapMarker[] = useMemo(
    () =>
      fresh
        .filter((s) => s.lat != null && s.lng != null)
        .slice(0, MAX_PINS)
        .map((s, i) => ({ p: { lat: s.lat!, lng: s.lng! }, label: String(i + 1) })),
    [fresh]
  );

  // 中心が表示の1/4以上動いたら、探し直しを促す
  const moved = useMemo(() => {
    if (!mapCenter || !searchedAt) return false;
    const shownRadius = viewRadiusMeters(mapCenter, zoom, viewSize.width, viewSize.height);
    return haversineMeters(mapCenter, searchedAt) > shownRadius * 0.5;
  }, [mapCenter, searchedAt, zoom, viewSize.width, viewSize.height]);

  if (!origin || !mapCenter) {
    return (
      <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
        <View className="px-[26px] pb-2 pt-3">
          <Text className="font-mincho-600 text-[26px] text-ink">地図で探す</Text>
        </View>
        <View className="h-px w-full bg-highlight/60" />
        <Pressable onPress={onNavigatePlan} className="mt-10 self-center rounded-[12px] border border-ink/25 px-5 py-3">
          <Text className="text-center font-gothic-400 text-[12px] leading-[21px] text-muted">
            まだ基点がありません。{"\n"}「旅」で行き先をひとつ追加してください。
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      {/* 見出しは1行だけ。地図に高さを譲る */}
      <View className="flex-row items-baseline justify-between px-[26px] pb-2 pt-2">
        <Text className="font-mincho-600 text-[20px] text-ink">地図で探す</Text>
        <Text className="font-gothic-400 text-[12px] text-muted">指で動かして探せます</Text>
      </View>

      <View
        className="flex-1"
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setViewSize((prev) =>
            Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1 ? prev : { width, height }
          );
        }}
      >
        <PannableMap
          center={mapCenter}
          zoom={zoom}
          markers={pins}
          me={liveLocation}
          onCenterChange={setMapCenter}
          onZoomChange={(z) => setZoom(clampZoom(z))}
        >
          {/* 現在地へ戻る */}
          {liveLocation && (
            <Pressable
              onPress={() => setMapCenter(liveLocation)}
              accessibilityRole="button"
              accessibilityLabel="現在地へ移動"
              className="absolute right-3 top-[104px] h-9 w-9 items-center justify-center rounded-[12px] border border-ink/15 bg-kinari/95"
            >
              <Text className="font-gothic-500 text-[13px] text-accent">◎</Text>
            </Pressable>
          )}

          {/* この範囲で探す（動かした時だけ出す） */}
          {(moved || loading) && (
            <View className="absolute left-0 right-0 top-3 items-center">
              <Pressable
                disabled={loading}
                onPress={() => search(mapCenter, zoom)}
                accessibilityRole="button"
                accessibilityLabel="この範囲でスポットを探す"
                className={`flex-row items-center gap-2 rounded-full px-4 py-2 ${loading ? "bg-ink/70" : "bg-accent"}`}
              >
                {loading && <ActivityIndicator size="small" color={COLORS.base} />}
                <Text className="font-gothic-500 text-[12px] text-kinari">
                  {loading ? "探しています…" : "この範囲で探す"}
                </Text>
              </Pressable>
            </View>
          )}

          {/* 候補カード（横に流す）。地図の上に重ねて、地図を隠しすぎないようにする */}
          <View className="absolute bottom-0 left-0 right-0 pb-2">
            {!loading && fresh.length === 0 ? (
              <View className="mx-4 rounded-[14px] border border-ink/12 bg-kinari/95 px-4 py-3">
                <Text className="text-center font-gothic-400 text-[12px] leading-[19px] text-muted">
                  この範囲では候補が見つかりませんでした。{"\n"}地図を動かすか「−」で広げて探してみてください。
                </Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 14, gap: 10 }}
              >
                {fresh.slice(0, MAX_PINS).map((s, i) => {
                  const isAdded = added.has(s.name);
                  const distance =
                    s.lat != null && s.lng != null ? haversineMeters(mapCenter, { lat: s.lat, lng: s.lng }) : null;
                  const isSelected = selected === s.name;
                  return (
                    <Pressable
                      key={s.name}
                      onPress={() => {
                        setSelected(s.name);
                        if (s.lat != null && s.lng != null) setMapCenter({ lat: s.lat, lng: s.lng });
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.name}を地図の中心にする`}
                      className={`w-[228px] rounded-[14px] border bg-kinari/97 px-3.5 py-2.5 ${
                        isSelected ? "border-accent" : "border-ink/12"
                      }`}
                    >
                      <View className="flex-row items-center gap-2">
                        <View className="h-[18px] w-[18px] items-center justify-center rounded-full bg-ink">
                          <Text className="font-gothic-500 text-[11px] text-kinari" style={TNUM}>
                            {i + 1}
                          </Text>
                        </View>
                        <Text numberOfLines={1} className="flex-1 font-mincho-600 text-[14px] text-ink">
                          {s.name}
                        </Text>
                      </View>
                      <Text numberOfLines={1} className="mt-1 font-gothic-400 text-[11px] text-muted" style={TNUM}>
                        {[s.category, distance != null ? formatDistance(distance) : null, s.note]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                      <View className="mt-2 flex-row items-center gap-2">
                        {!readOnly && (
                          <Pressable
                            disabled={isAdded}
                            onPress={() => {
                              onAddSpot(s);
                              setAdded((prev) => new Set(prev).add(s.name));
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`${s.name}を行き先に追加`}
                            className={`flex-1 items-center rounded-full py-2 ${isAdded ? "border border-ink/20" : "bg-accent"}`}
                          >
                            <Text className={`font-gothic-700 text-[12px] ${isAdded ? "text-muted-light" : "text-kinari"}`}>
                              {isAdded ? "✓ 追加済み" : "＋ 旅に追加"}
                            </Text>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => {
                            const q = s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : s.name;
                            void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`);
                          }}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={`${s.name}をGoogleマップで見る`}
                          className="rounded-full border border-ink/20 px-2.5 py-1.5"
                        >
                          <Text className="font-gothic-400 text-[11px] text-muted">詳しく</Text>
                        </Pressable>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </PannableMap>
      </View>
    </View>
  );
}
