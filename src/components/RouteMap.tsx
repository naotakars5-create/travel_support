import { useState } from "react";
import { Image, Linking, Pressable, Text, View } from "react-native";
import { GeoPoint } from "@/lib/types";
import { routeMapImageUrl } from "@/lib/routeMap";

/** 全地点を通る Google マップ（ディレクション）を開くURL。タップで拡大・移動できる。 */
function googleMapsRouteUrl(points: GeoPoint[], me?: GeoPoint | null): string {
  const all = me ? [me, ...points] : points;
  const path = all.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("/");
  return `https://www.google.com/maps/dir/${path}`;
}

/**
 * 旅程の全地点を結ぶ経路地図（/api/staticmap のプロキシ画像）。
 * タップすると Google マップが開き、ピンチ/ズーム・移動できる。
 * 座標がまだ無い / APIキー未設定 / 読み込み失敗時は、そっと非表示にする（フォールバック）。
 */
export function RouteMap({ points, me, labels }: { points: GeoPoint[]; me?: GeoPoint | null; labels?: (string | undefined)[] }) {
  // 失敗はURL単位で記録する（地点が変わって別URLになったら自動でリトライされる）
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = routeMapImageUrl(points, me, labels);
  const failed = uri !== null && failedUri === uri;

  const openInteractive = () => {
    if (points.length === 0 && !me) return;
    void Linking.openURL(googleMapsRouteUrl(points, me));
  };

  // 座標が1点も無ければ出しようがない（ジオコーディング完了までの短い間だけ）
  if (!uri && !(points.length > 0)) return null;

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
