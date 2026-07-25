import { View } from "react-native";

/** 幾何形のみで構成するアイコン群（円・正方形・線・リング）。アイコンライブラリは使わない。 */

/** ミニマルなベル（お知らせ）アイコン。幾何形のみ・単色。 */
export function BellIcon({ color = "#23201D", size = 18 }: { color?: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* 本体（上が丸く下が開いた輪郭） */}
      <View
        style={{
          width: size * 0.62,
          height: size * 0.5,
          borderTopLeftRadius: size * 0.31,
          borderTopRightRadius: size * 0.31,
          borderWidth: 1.6,
          borderBottomWidth: 0,
          borderColor: color,
        }}
      />
      {/* 裾のライン */}
      <View style={{ width: size * 0.78, height: 1.6, borderRadius: 1, backgroundColor: color, marginTop: -0.8 }} />
      {/* 振り子 */}
      <View style={{ width: size * 0.16, height: size * 0.16, borderRadius: size * 0.08, backgroundColor: color, marginTop: size * 0.06 }} />
    </View>
  );
}

export function SignalDots({ dark }: { dark?: boolean }) {
  const color = dark ? "#F4EFE5" : "#23201D";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}
