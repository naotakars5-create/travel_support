import { useState } from "react";
import { Image, Text, View } from "react-native";
import { placePhotoImageUrl } from "@/lib/placePhoto";

/**
 * スポットの写真（Places Photo）。取得できない時は静かに消える。
 * Googleの規約で提供元の表示が必要なため、あれば画像の下端に小さく重ねる。
 * 行き先リスト・タイムラインの行の横に添える共通部品。
 */
export function SpotThumb({
  photoRef,
  attribution,
  size = 44,
}: {
  photoRef?: string;
  attribution?: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const uri = placePhotoImageUrl(photoRef, Math.max(size, 160));
  if (!uri || failed) return null;
  return (
    <View className="overflow-hidden rounded-[8px] bg-black/[.05]" style={{ width: size, height: size }}>
      <Image source={{ uri }} onError={() => setFailed(true)} resizeMode="cover" style={{ width: size, height: size }} />
      {attribution ? (
        <View className="absolute bottom-0 left-0 right-0 bg-black/45">
          <Text numberOfLines={1} className="px-[2px] text-[5px] text-white">
            {attribution}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
