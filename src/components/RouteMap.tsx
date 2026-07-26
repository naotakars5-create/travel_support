import { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { GeoPoint } from "@/lib/types";
import { routeMapImageUrl } from "@/lib/routeMap";

/**
 * 全地点を通る Google マップ（ディレクション）を開くURL。
 * 座標があれば座標を使い、無ければ地点名（住所・行き先名）で経路を引く。
 * ジオコーディングが未完了・APIキー未設定でも Google マップは開けるようにする。
 */
function googleMapsRouteUrl(points: GeoPoint[], places: string[], me?: GeoPoint | null): string {
  const coords = points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`);
  const stops = coords.length > 0 ? coords : places.map((p) => p.trim()).filter(Boolean);
  const all = me ? [`${me.lat.toFixed(5)},${me.lng.toFixed(5)}`, ...stops] : stops;
  return `https://www.google.com/maps/dir/${all.map(encodeURIComponent).join("/")}`;
}

/**
 * 旅程の全地点を結ぶ経路地図（/api/staticmap のプロキシ画像）。
 * タップすると Google マップが開き、ピンチ/ズーム・移動できる。
 *
 * 座標が無い（ジオコーディング未完了・APIキー未設定）場合や画像の取得に失敗した場合も、
 * 地点名で Google マップを開くボタンとして必ず残す（黙って消えない）。
 */
export function RouteMap({
  points,
  places = [],
  me,
  labels,
}: {
  points: GeoPoint[];
  /** 座標が無いときに経路を引くための地点名（住所または行き先名） */
  places?: string[];
  me?: GeoPoint | null;
  labels?: (string | undefined)[];
}) {
  // 失敗はURL単位で記録する（地点が変わって別URLになったら自動でリトライされる）
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = routeMapImageUrl(points, me, labels);
  const failed = uri !== null && failedUri === uri;

  const stopCount = points.length > 0 ? points.length : places.filter((p) => p.trim()).length;
  const openInteractive = () => {
    if (stopCount === 0 && !me) return;
    void Linking.openURL(googleMapsRouteUrl(points, places, me));
  };

  // 座標も地点名も無ければ出しようがない
  if (stopCount === 0 && !me) return null;

  // 画像が取得できない時も黙って消えない：Googleマップを開くボタンとして残す。
  // （以前は失敗時に非表示にしていたため「地図が消えた」ように見えていた）
  if (!uri || failed) {
    return (
      <Pressable
        onPress={openInteractive}
        accessibilityRole="button"
        accessibilityLabel="経路をGoogleマップで開く"
        className="mb-2 flex-row items-center justify-between rounded-[16px] border border-black/[.08] bg-black/[.03] px-4 py-3"
      >
        <Text className="font-gothic-500 text-[11px] text-ink">この日の経路をGoogleマップで見る</Text>
        <Text className="font-gothic-400 text-[13px] text-muted">›</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={openInteractive}
      accessibilityRole="button"
      accessibilityLabel="経路をGoogleマップで開く"
      className="mb-2 overflow-hidden rounded-[16px] border border-black/[.08] bg-black/[.03]">
      <Image
        source={{ uri }}
        onError={() => setFailedUri(uri)}
        resizeMode="cover"
        style={{ width: "100%", aspectRatio: 2 }}
      />
      <View className="absolute left-3 top-3 rounded-full bg-kinari/90 px-2.5 py-[3px]">
        <Text className="font-gothic-500 text-[9px] tracking-[.1em] text-ink">全行程マップ{me ? " · 青=現在地" : ""}</Text>
      </View>
      <View className="absolute bottom-3 right-3 rounded-full bg-ink/85 px-2.5 py-[3px]">
        <Text className="font-gothic-500 text-[9px] text-kinari">タップで拡大 · ズーム</Text>
      </View>
    </Pressable>
  );
}
