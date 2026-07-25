import { useState } from "react";
import { Image, ImageStyle, Platform, StyleProp } from "react-native";
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
