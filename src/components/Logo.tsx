import { useState } from "react";
import { Image, ImageStyle, Platform, StyleProp, Text, View } from "react-native";

/**
 * つばめみち のロゴ。
 *
 * 燕（つばめ）を家紋のように整理し、その下に一本の道を引いた形。
 * 尾の V 字は「経路の分岐」、下の線は「一本につながった道」を指す。
 * 素材は scripts/generate_logo.py で生成し、public/illustrations/ に置いている。
 */

/** マーク単体（正方形）と、マーク＋名前を積んだ組み（縦長）の縦横比。 */
const MARK_RATIO = 1;
const WORDMARK_RATIO = 1400 / 1133;

function assetUri(name: string): string {
  const path = `/illustrations/${name}.png`;
  if (Platform.OS === "web" && typeof window !== "undefined") return `${window.location.origin}${path}`;
  return path;
}

/**
 * 画像が読めない環境（素材未配置など）でも名前だけは必ず出す。
 * ブランドが黙って消えるより、文字で残る方がよい。
 */
function Fallback({ width }: { width: number }) {
  return (
    <View style={{ width, alignItems: "center" }}>
      <Text className="font-mincho-700 text-ink" style={{ fontSize: Math.max(14, width * 0.16) }}>
        つばめみち
      </Text>
    </View>
  );
}

export function LogoMark({ size = 64, style }: { size?: number; style?: StyleProp<ImageStyle> }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <View style={{ width: size, height: size }} />;
  return (
    <Image
      source={{ uri: assetUri("logo-mark") }}
      onError={() => setFailed(true)}
      accessibilityLabel="つばめみち"
      resizeMode="contain"
      style={[{ width: size, height: size / MARK_RATIO }, style]}
    />
  );
}

export function LogoWordmark({ width = 200, style }: { width?: number; style?: StyleProp<ImageStyle> }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Fallback width={width} />;
  return (
    <Image
      source={{ uri: assetUri("logo-wordmark") }}
      onError={() => setFailed(true)}
      accessibilityLabel="つばめみち"
      resizeMode="contain"
      style={[{ width, height: width / WORDMARK_RATIO }, style]}
    />
  );
}
