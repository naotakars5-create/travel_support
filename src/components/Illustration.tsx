import { useState } from "react";
import { Image, ImageStyle, Platform, StyleProp, View } from "react-native";
import { IllustrationName } from "@/lib/illustrations";

/** サイズトークン（正方形前提）。 */
const SIZES = { sm: 48, md: 120, lg: 200 } as const;
export type IllustrationSize = keyof typeof SIZES;

/**
 * public/illustrations/ のイラストを表示する共通コンポーネント。
 * 読み込みに失敗した場合は「何も表示しない」フォールバックにする
 * （素材が無い環境やネイティブでレイアウトが崩れないように）。
 */
export function Illustration({
  name,
  size = "md",
  alt,
  style,
}: {
  name: IllustrationName;
  size?: IllustrationSize;
  /** スクリーンリーダー向けの説明。装飾目的なら空文字でよい */
  alt: string;
  style?: StyleProp<ImageStyle>;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  const px = SIZES[size];
  return (
    <Image
      source={{ uri: illustrationUri(name) }}
      accessibilityLabel={alt}
      accessible={alt.length > 0}
      onError={() => setFailed(true)}
      resizeMode="contain"
      style={[{ width: px, height: px }, style]}
    />
  );
}

/**
 * イラストを「コーラルピンクの面」に載せて出す台座。
 *
 * ブランドのイラストは、地がコーラルピンクで、その上をクリーム・ローズ・黒だけで
 * 描いてある。素材そのものは背景が透明なので、大きく見せる場所（空の画面・
 * 読み込み中・初回紹介）ではこの台座で地を作り、絵と同じ見え方に揃える。
 * 逆に小さく添えるだけの場所（空き時間チップなど）では台座を敷かない。
 */
export function IllustrationPlate({
  name,
  size = "lg",
  alt,
  round = false,
}: {
  name: IllustrationName;
  size?: IllustrationSize;
  alt: string;
  /** 丸く抜く（初回紹介のように1枚を主役にする場面） */
  round?: boolean;
}) {
  return (
    <View className={`items-center justify-center bg-highlight p-6 ${round ? "rounded-full" : "rounded-[22px]"}`}>
      <Illustration name={name} size={size} alt={alt} />
    </View>
  );
}

/**
 * イラストのURI。Web では相対パスを解決できないことがあるため origin を足す。
 * （routeMap と同じ方針）
 */
export function illustrationUri(name: IllustrationName): string {
  const path = `/illustrations/${name}.png`;
  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  return path;
}
