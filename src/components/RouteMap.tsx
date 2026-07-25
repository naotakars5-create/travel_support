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
export function RouteMap({ points, me }: { points: GeoPoint[]; me?: GeoPoint | null }) {
  const [failed, setFailed] = useState(false);
  const uri = routeMapImageUrl(points, me);

  if (!uri || failed) return null;

  const openInteractive = () => {
    if (points.length === 0) return;
    void Linking.openURL(googleMapsRouteUrl(points, me));
  };

  return (
    <Pressable onPress={openInteractive} className="mb-4 overflow-hidden rounded-[16px] border border-black/[.08] bg-black/[.03]">
      <Image
        source={{ uri }}
        onError={() => setFailed(true)}
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
