import { View } from "react-native";
import { PulseRing, Spinner } from "./animations";

/** 幾何形のみで構成するアイコン群（円・正方形・線・リング）。アイコンライブラリは使わない。 */

export function MailStatusDot({ status, color }: { status: "done" | "parsing" | "new" | "skip" | "error"; color?: string }) {
  if (status === "done") {
    return <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color ?? "#4f7a5b" }} />;
  }
  if (status === "parsing") {
    return <Spinner size={9} color="#a8804a" />;
  }
  if (status === "skip") {
    return <View style={{ width: 8, height: 8, borderRadius: 2, borderWidth: 1, borderColor: "#b7b0a3" }} />;
  }
  // new / error
  return <View style={{ width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: "#a8804a" }} />;
}

export function RailNodeDot({ current, dark }: { current: boolean; dark?: boolean }) {
  if (current) {
    return (
      <View style={{ width: 13, height: 13, alignItems: "center", justifyContent: "center" }}>
        <PulseRing size={13} color="rgba(42,38,34,.5)" />
        <View
          style={{
            width: 13,
            height: 13,
            borderRadius: 7,
            backgroundColor: dark ? "#ece5d7" : "#2a2622",
          }}
        />
      </View>
    );
  }
  return (
    <View
      style={{
        width: 13,
        height: 13,
        borderRadius: 7,
        borderWidth: 2.5,
        backgroundColor: dark ? "#24201b" : "#f3efe6",
        borderColor: dark ? "#8f8674" : "#2a2622",
      }}
    />
  );
}

export function SignalDots({ dark }: { dark?: boolean }) {
  const color = dark ? "#ece5d7" : "#2a2622";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}
