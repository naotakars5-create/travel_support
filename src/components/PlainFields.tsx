import { createElement, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

/**
 * 時刻だけ／日付だけを入力するフィールド。
 * - Web: ブラウザ標準の <input type="time"|"date">（タップ選択も手入力も可）。
 *   NativeWind の JSX 変換が生の DOM 要素を握り潰すため createElement で生成する。
 * - iOS/Android: DateTimePicker（mode="time"|"date"）。
 */

const WEB_INPUT_STYLE = {
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.1)",
  background: "rgba(255,255,255,0.6)",
  padding: "10px 12px",
  fontSize: 14,
  color: "#2a2622",
  fontFamily: "ZenOldMincho_400Regular, serif",
  width: "100%",
  boxSizing: "border-box" as const,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function Label({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text className="font-gothic-400 text-[10px] text-muted">
      {label}
      {required ? " *" : ""}
    </Text>
  );
}

/** 時刻（HH:mm）だけを入力する。 */
export function TimeField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === "web") {
    const input = createElement("input", {
      type: "time",
      value,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      style: WEB_INPUT_STYLE,
    });
    return (
      <View className="flex-1 gap-1">
        <Label label={label} required={required} />
        {input}
      </View>
    );
  }

  const base = new Date();
  if (value) {
    const [h, m] = value.split(":").map(Number);
    if (Number.isFinite(h) && Number.isFinite(m)) base.setHours(h, m, 0, 0);
  }

  return (
    <View className="flex-1 gap-1">
      <Label label={label} required={required} />
      <Pressable onPress={() => setOpen(true)} className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5">
        <Text className={`font-mincho-400 text-[14px] ${value ? "text-ink" : "text-muted-light"}`} style={{ fontVariant: ["tabular-nums"] }}>
          {value || "時刻を選択"}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={base}
          mode="time"
          is24Hour
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, d) => {
            setOpen(Platform.OS === "ios");
            if (d) onChange(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
          }}
        />
      )}
    </View>
  );
}

/** 日付（YYYY-MM-DD）だけを入力する。 */
export function DateOnlyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === "web") {
    const input = createElement("input", {
      type: "date",
      value,
      onChange: (e: { target: { value: string } }) => onChange(e.target.value),
      style: { ...WEB_INPUT_STYLE, width: "auto" },
    });
    return (
      <View className="gap-1">
        <Label label={label} />
        {input}
      </View>
    );
  }

  const base = value ? new Date(`${value}T00:00`) : new Date();

  return (
    <View className="gap-1">
      <Label label={label} />
      <Pressable onPress={() => setOpen(true)} className="self-start rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5">
        <Text className="font-mincho-400 text-[14px] text-ink" style={{ fontVariant: ["tabular-nums"] }}>
          {value || "日付を選択"}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={Number.isNaN(base.getTime()) ? new Date() : base}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_, d) => {
            setOpen(Platform.OS === "ios");
            if (d) onChange(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`);
          }}
        />
      )}
    </View>
  );
}
