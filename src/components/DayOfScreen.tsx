import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, TextStyle, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DayOfState, computeCountdown } from "@/lib/dayof";
import { formatDurationMin, RailNode } from "@/lib/itinerary";
import { formatJstTime, formatJstMonthDayJa } from "@/lib/date";
import { MODE_COLOR, MODE_LABEL } from "@/lib/modeMeta";
import { createSpotProvider, Spot } from "@/lib/spots";
import { GeoPoint, PlanEntry } from "@/lib/types";
import { WeatherInfo } from "@/lib/weather";
import { fetchWeather } from "@/lib/weatherClient";
import { haversineMeters } from "@/lib/geo";
import { furusatoAd, isLastTripDay } from "@/lib/furusatoAd";
import { lodgingPrefecture } from "@/lib/lodgingAd";
import { useAdFree } from "@/hooks/useAdFree";
import { AdCard } from "./AdSlot";
import { LocationPermissionState } from "@/hooks/useLiveLocation";
import { Blinker } from "./animations";

const TNUM: TextStyle = { fontVariant: ["tabular-nums"] };

/** 距離（メートル）を「◯.◯km」「◯m」表記に。 */
function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
}

/** 現在地周辺の観光スポット一覧（当日画面・ダークテーマ）。移動中・空き時間どちらでも使う。 */
function NearbySpots({
  geo,
  freeMinutes,
  preferIndoor,
  live,
}: {
  geo: GeoPoint | null;
  freeMinutes: number;
  preferIndoor: boolean;
  live: boolean;
}) {
  const [spots, setSpots] = useState<Spot[]>([]);
  const lat = geo?.lat;
  const lng = geo?.lng;
  useEffect(() => {
    let cancelled = false;
    const provider = createSpotProvider(lat != null && lng != null);
    provider.nearby(lat ?? 0, lng ?? 0, freeMinutes, preferIndoor).then((res) => {
      if (!cancelled) setSpots(res);
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, freeMinutes, preferIndoor]);

  if (spots.length === 0) return null;
  const openSpot = (s: Spot) => {
    const query = s.lat != null && s.lng != null ? `${s.lat},${s.lng}` : encodeURIComponent(s.name);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };
  return (
    <View className="mt-4 w-full">
      <Text className="mb-1.5 font-gothic-400 text-[11px] tracking-[.15em] text-day-text3">
        {preferIndoor ? "近くの屋内スポット（雨のため）" : "近くの観光スポット"}
        {live ? "（現在地から）" : ""} · タップで地図
      </Text>
      <View className="rounded-[16px] border border-day-text/10">
        {spots.map((s, i) => (
          <Pressable
            key={s.name}
            onPress={() => openSpot(s)}
            className={`flex-row items-start justify-between px-4 py-2 ${i > 0 ? "border-t border-day-text/10" : ""}`}
          >
            <View className="flex-1 pr-2">
              <Text className="font-mincho-400 text-[14px] text-day-text">{s.name}</Text>
              <Text className="mt-0.5 font-gothic-400 text-[11px] text-day-text2">{[s.category, s.note].filter(Boolean).join(" · ")}</Text>
              {s.address && <Text className="mt-0.5 font-gothic-400 text-[11px] text-day-text3">{s.address}</Text>}
            </View>
            <Text className="mt-0.5 font-gothic-400 text-[12px] text-day-text2" style={TNUM}>
              徒歩 {s.walkMin}分 ›
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** 地点の「名前」（行き先名）。イベントの title を使う。 */
function nodeName(node: RailNode): string {
  return node.event.title || node.place;
}

/** 地点の「住所」。名前と異なる場合のみ返す（同じなら住所表示は省く）。 */
function nodeAddress(node: RailNode): string | null {
  return node.place && node.place !== node.event.title ? node.place : null;
}

/** state から天気取得の基点になる座標を選ぶ（GPS優先、無ければ次/現在ノード）。 */
function weatherGeoFor(state: DayOfState, liveLocation: GeoPoint | null): GeoPoint | null {
  if (liveLocation) return liveLocation;
  if (state.mode === "move" || state.mode === "free") return state.nextNode.geo ?? state.currentNode?.geo ?? null;
  return state.currentNode?.geo ?? null;
}

/**
 * 「現在地を直す」：旅程の地点一覧から今いる場所を選び直せる。
 * 到着ボタンの押し忘れ・順番変更・スキップで状態がずれた時の復帰手段。
 */
function CurrentNodePicker({
  nodes,
  now,
  currentNodeKey,
  onRecordArrival,
}: {
  nodes: RailNode[];
  now: Date;
  currentNodeKey: string | null;
  onRecordArrival: (nodeKey: string, place: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (nodes.length === 0) return null;
  // 今日の地点を優先表示（無ければ全地点）
  const todayKey = now.toDateString();
  const todays = nodes.filter((n) => new Date(n.time).toDateString() === todayKey);
  const list = todays.length > 0 ? todays : nodes;
  return (
    <View className="mt-6 w-full">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel="現在地を選び直す"
        className="self-center rounded-full border border-day-text/25 px-4 py-1.5"
      >
        <Text className="font-gothic-400 text-[12px] text-day-text2">{open ? "閉じる" : "いまいる場所を選び直す"}</Text>
      </Pressable>
      {open && (
        <View className="mt-2 rounded-[16px] border border-day-text/10">
          {list.map((n, i) => {
            const active = n.key === currentNodeKey;
            return (
              <Pressable
                key={n.key}
                onPress={() => {
                  onRecordArrival(n.key, nodeName(n));
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${nodeName(n)}にいる`}
                className={`flex-row items-center gap-3 px-4 py-2 ${i > 0 ? "border-t border-day-text/10" : ""}`}
              >
                <Text className="w-11 font-gothic-400 text-[12px] text-day-text3" style={TNUM}>
                  {formatJstTime(new Date(n.time))}
                </Text>
                <Text className={`flex-1 font-mincho-400 text-[13px] ${active ? "text-day-text" : "text-day-text2"}`}>
                  {nodeName(n)}
                </Text>
                {active && (
                  <View className="rounded-full bg-highlight/25 px-2 py-[2px]">
                    <Text className="font-gothic-700 text-[11px] text-highlight">✓ いまここ</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export function DayOfScreen({
  state,
  now,
  nodes,
  currentNodeKey,
  liveLocation,
  locationPermission,
  onNavigatePlan,
  onRecordArrival,
  entries = [],
  destination = "",
  tripDate,
  tripDayCount = 1,
}: {
  state: DayOfState;
  now: Date;
  /** 旅程の全地点（現在地の選び直しに使う） */
  nodes: RailNode[];
  currentNodeKey: string | null;
  /** 行き先リスト。旅先の都道府県を割り出すのに使う */
  entries?: PlanEntry[];
  /** 旅の行き先（例: 金沢） */
  destination?: string;
  /** 旅の開始日（YYYY-MM-DD） */
  tripDate?: string;
  /** 旅の日数 */
  tripDayCount?: number;
  liveLocation: GeoPoint | null;
  locationPermission: LocationPermissionState;
  onNavigatePlan: () => void;
  onRecordArrival: (nodeKey: string, place: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const adFree = useAdFree();

  // 旅の締めくくり（最終日 × その日の予定を消化しきった状態）にだけ出す。
  // done は「次にやること」が存在しない状態なので、当日画面の核
  // （次に何をするかだけを示す）を傷つけない。move / free では絶対に出さない。
  const lastDay = tripDate ? isLastTripDay(tripDate, tripDayCount, now) : false;
  const furusato =
    adFree || !lastDay
      ? null
      : furusatoAd({
          prefecture: lodgingPrefecture(entries, destination),
          now,
          onTripLastDay: true,
        });
  const gpsActive = locationPermission === "granted" && Boolean(liveLocation);

  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const weatherGeo = weatherGeoFor(state, liveLocation);
  const weatherKey = weatherGeo ? `${weatherGeo.lat.toFixed(2)},${weatherGeo.lng.toFixed(2)}` : null;
  useEffect(() => {
    if (!weatherGeo) return;
    let cancelled = false;
    fetchWeather(weatherGeo).then((w) => {
      if (!cancelled) setWeather(w);
    });
    return () => {
      cancelled = true;
    };
    // 座標が概ね変わった時だけ再取得（weatherKey で丸め）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherKey]);

  return (
    <View className="flex-1 bg-day-bg" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-baseline justify-between px-[26px] pb-4 pt-4">
        <Text className="font-gothic-400 text-[12px] text-day-text2">
          {formatJstMonthDayJa(now)}
          {weather ? ` · ${weather.summary}${weather.temperature !== null ? ` ${Math.round(weather.temperature)}℃` : ""}` : ""}
        </Text>
        <Text className="font-gothic-400 text-[12px] text-day-text2" style={TNUM}>
          現在 {formatJstTime(now)}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 26, paddingBottom: insets.bottom + 24 }}>
        {state.mode === "locked" && <LockedHero onNavigatePlan={onNavigatePlan} />}
        {state.mode === "move" && (
          <MoveHero state={state} now={now} gpsActive={gpsActive} liveLocation={liveLocation} weather={weather} onRecordArrival={onRecordArrival} />
        )}
        {state.mode === "free" && (
          <FreeHero state={state} liveLocation={liveLocation} gpsActive={gpsActive} weather={weather} onRecordArrival={onRecordArrival} />
        )}
        {state.mode === "done" && <DoneHero totalReservations={state.totalReservations} />}
        {/* 旅の締めくくりに1枚だけ。done 以外では出さない（上のコメント参照） */}
        {state.mode === "done" && furusato && (
          <View className="mt-3">
            <AdCard title={furusato.headline} sub={furusato.sub} actionLabel={furusato.actionLabel} url={furusato.url} />
          </View>
        )}
        <CurrentNodePicker nodes={nodes} now={now} currentNodeKey={currentNodeKey} onRecordArrival={onRecordArrival} />
      </ScrollView>
    </View>
  );
}

function GpsHint({ active }: { active: boolean }) {
  if (!active) return null;
  return <Text className="mt-3 font-gothic-400 text-[11px] text-day-text3">GPSでこの場所に近づくと自動で到着を記録します</Text>;
}

function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} className="mt-6 rounded-[12px] border border-day-text/40 py-3">
      <Text className="text-center font-gothic-400 text-[12px] text-day-text">{label}</Text>
    </Pressable>
  );
}

function LockedHero({ onNavigatePlan }: { onNavigatePlan: () => void }) {
  return (
    <View className="items-center">
      <Text className="font-gothic-400 text-[12px] tracking-[.08em] text-day-text2">まだ旅程がありません</Text>
      <Text className="mt-4 text-center font-mincho-700 text-[30px] leading-[36px] text-day-text">
        次の行き先が{"\n"}まだ決まっていません
      </Text>
      <Text className="mt-4 text-center font-gothic-400 text-[12px] leading-[21px] text-day-text2">
        「旅」で行き先を追加すると、{"\n"}旅程がつながり出発時刻を計算します。
      </Text>
      <OutlineButton label="行き先を追加する" onPress={onNavigatePlan} />
    </View>
  );
}

function MoveHero({
  state,
  now,
  gpsActive,
  liveLocation,
  weather,
  onRecordArrival,
}: {
  state: Extract<DayOfState, { mode: "move" }>;
  now: Date;
  gpsActive: boolean;
  liveLocation: GeoPoint | null;
  weather: WeatherInfo | null;
  onRecordArrival: (nodeKey: string, place: string) => void;
}) {
  const countdown = computeCountdown(state.targetDepartAt, now);
  const modeColor = MODE_COLOR[state.transitMode];
  // 予定より遅れ（出発時刻を過ぎた分）。3分以上でお知らせ。
  const lateMin = Math.round((now.getTime() - new Date(state.targetDepartAt).getTime()) / 60000);
  // GPSで目的地までの残り距離
  const remainingMeters = liveLocation && state.nextNode.geo ? haversineMeters(liveLocation, state.nextNode.geo) : null;
  const geoForSpots = liveLocation ?? state.currentNode?.geo ?? state.nextNode.geo ?? null;
  return (
    <View className="items-center">
      <Text className="font-gothic-400 text-[12px] tracking-[.08em] text-day-text2">
        {countdown.scale === "soon" ? "次の移動まで" : "出発まで"}
      </Text>
      {countdown.scale === "soon" ? (
        <>
          {/* 1時間を切ったら分:秒の大時計。急ぐ感覚が要る場面 */}
          <View className="mt-3 flex-row">
            <Text className="font-mincho-900 text-[90px] leading-[81px] text-accent" style={TNUM}>
              {countdown.mm}
            </Text>
            <Blinker>
              <Text className="font-mincho-900 text-[90px] leading-[81px] text-accent">:</Text>
            </Blinker>
            <Text className="font-mincho-900 text-[90px] leading-[81px] text-accent" style={TNUM}>
              {countdown.ss}
            </Text>
          </View>
          <Text className="mt-2 font-gothic-400 text-[12px] tracking-[.15em] text-day-text3">分 秒</Text>
        </>
      ) : (
        // まだ先なら「◯日◯時間」。秒まで出しても意味が無く、数字が桁あふれする
        <View className="mt-3 flex-row items-baseline">
          {countdown.scale === "days" ? (
            <>
              <Text className="font-mincho-900 text-[76px] leading-[76px] text-accent" style={TNUM}>
                {countdown.days}
              </Text>
              <Text className="ml-1 mr-3 font-gothic-500 text-[18px] text-day-text2">日</Text>
              <Text className="font-mincho-900 text-[46px] leading-[46px] text-accent" style={TNUM}>
                {countdown.hours}
              </Text>
              <Text className="ml-1 font-gothic-500 text-[15px] text-day-text2">時間</Text>
            </>
          ) : (
            <>
              <Text className="font-mincho-900 text-[76px] leading-[76px] text-accent" style={TNUM}>
                {countdown.hours}
              </Text>
              <Text className="ml-1 mr-3 font-gothic-500 text-[18px] text-day-text2">時間</Text>
              <Text className="font-mincho-900 text-[46px] leading-[46px] text-accent" style={TNUM}>
                {countdown.minutes}
              </Text>
              <Text className="ml-1 font-gothic-500 text-[15px] text-day-text2">分</Text>
            </>
          )}
        </View>
      )}

      {lateMin >= 3 && (
        <View className="mt-6 w-full rounded-[12px] border border-accent/50 bg-accent/[.08] px-4 py-3">
          <Text className="font-gothic-500 text-[12px] text-accent" style={TNUM}>
            予定より {formatDurationMin(lateMin)} 遅れています
          </Text>
          <Text className="mt-1 font-gothic-400 text-[12px] leading-[19px] text-day-text2">
            このままだと後の予定も同じくらい後ろへずれます。急ぐか、任意の予定を1つ省くと取り戻せます。
          </Text>
        </View>
      )}

      <View className="mt-8 w-full rounded-[16px] border border-day-text/10 bg-day-text/[.04] p-4">
        <Text className="font-mincho-600 text-[23px] text-day-text">{nodeName(state.nextNode)}</Text>
        {nodeAddress(state.nextNode) && (
          <Text className="mt-1 font-gothic-400 text-[12px] text-day-text3">{nodeAddress(state.nextNode)}</Text>
        )}
        <View className="mt-2 flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: modeColor }} />
          <Text className="font-gothic-400 text-[12px] text-day-text2" style={TNUM}>
            {state.currentNode ? nodeName(state.currentNode) : "現在地"} → {nodeName(state.nextNode)} · {MODE_LABEL[state.transitMode]}
            {state.transitMin > 0 ? formatDurationMin(state.transitMin) : ""}
          </Text>
        </View>
        {remainingMeters != null && (
          <Text className="mt-2 font-mincho-600 text-[13px] text-accent" style={TNUM}>
            目的地まで あと {formatDistance(remainingMeters)}
          </Text>
        )}
      </View>

      <Pressable onPress={() => onRecordArrival(state.nextNode.key, nodeName(state.nextNode))} className="mt-6 w-full rounded-[12px] border border-day-text/40 py-3">
        <Text className="text-center font-gothic-400 text-[12px] text-day-text">{nodeName(state.nextNode)} に到着を記録</Text>
      </Pressable>
      <GpsHint active={gpsActive && Boolean(state.nextNode.geo)} />
      <NearbySpots geo={geoForSpots} freeMinutes={30} preferIndoor={Boolean(weather?.rain)} live={Boolean(liveLocation)} />
    </View>
  );
}

function FreeHero({
  state,
  liveLocation,
  gpsActive,
  weather,
  onRecordArrival,
}: {
  state: Extract<DayOfState, { mode: "free" }>;
  liveLocation: GeoPoint | null;
  gpsActive: boolean;
  weather: WeatherInfo | null;
  onRecordArrival: (nodeKey: string, place: string) => void;
}) {
  // 実際の現在地（GPS）があればそちらを優先し、無ければ到着記録した地点の座標を使う。
  const geo = liveLocation ?? state.currentNode.geo ?? null;
  const preferIndoor = Boolean(weather?.rain);

  return (
    <View className="items-center">
      <Text className="font-gothic-400 text-[12px] tracking-[.08em] text-day-text2">空き時間 · 予定より早く回れています</Text>
      <Text className="mt-3 font-mincho-900 text-[62px] leading-[56px] text-highlight" style={TNUM}>
        {formatDurationMin(state.freeMin)}
      </Text>
      <Text className="mt-2 font-gothic-400 text-[12px] text-day-text2" style={TNUM}>
        次の予約 {formatJstTime(new Date(state.nextNode.time))} {nodeName(state.nextNode)} まで
      </Text>
      {state.freeMin >= 30 && (
        <Text className="mt-2 text-center font-gothic-400 text-[12px] leading-[19px] text-day-text3">
          この時間で近くのスポットへ寄り道できます。下のおすすめからどうぞ。
        </Text>
      )}

      <NearbySpots geo={geo} freeMinutes={state.freeMin} preferIndoor={preferIndoor} live={Boolean(liveLocation)} />

      <Pressable onPress={() => onRecordArrival(state.nextNode.key, nodeName(state.nextNode))} className="mt-6 w-full rounded-[12px] border border-day-text/40 py-3">
        <Text className="text-center font-gothic-400 text-[12px] text-day-text">{nodeName(state.nextNode)} に到着を記録</Text>
      </Pressable>
      <GpsHint active={gpsActive && Boolean(state.nextNode.geo)} />
    </View>
  );
}

function DoneHero({ totalReservations }: { totalReservations: number }) {
  if (totalReservations === 0) {
    return (
      <View className="items-center">
        <Text className="font-gothic-400 text-[12px] tracking-[.08em] text-day-text2">本日の予定</Text>
        <Text className="mt-4 text-center font-mincho-700 text-[26px] text-day-text">まだ予定がありません</Text>
        <Text className="mt-4 text-center font-gothic-400 text-[12px] leading-[21px] text-day-text2">
          「旅」で行き先を追加すると、{"\n"}ここに旅程が表示されます。
        </Text>
      </View>
    );
  }
  return (
    <View className="items-center">
      <Text className="font-gothic-400 text-[12px] tracking-[.08em] text-day-text2">本日の予定</Text>
      {/* 達成の瞬間。ここはマスタード（完了の色）をはっきり使う */}
      <View className="mt-4 h-[76px] w-[76px] items-center justify-center rounded-full bg-highlight/25">
        <Text className="font-mincho-700 text-[34px] text-highlight">✓</Text>
      </View>
      <Text className="mt-4 font-mincho-700 text-[30px] text-highlight">すべて完了</Text>
      <Text className="mt-4 text-center font-gothic-400 text-[13px] leading-[22px] text-day-text2">
        {totalReservations}件の予定を、途切れなく巡りました。{"\n"}お疲れさまでした。
      </Text>
    </View>
  );
}
