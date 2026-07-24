import { createElement, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

export interface DateFieldProps {
  label: string;
  value: Date | null;
  onChange: (d: Date) => void;
  required?: boolean;
}

function formatDateTime(d: Date | null): string {
  if (!d) return "日時を選択";
  return d.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** datetime-local の入力値（ローカルタイム, YYYY-MM-DDTHH:mm）を Date に変換する。 */
function parseLocalInput(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date を datetime-local の入力値へ整形する（ローカルタイム）。 */
function toLocalInputValue(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Label({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text className="font-gothic-400 text-[10px] text-muted">
      {label}
      {required ? " *" : ""}
    </Text>
  );
}

/**
 * 日時フィールド。
 * - Web: @react-native-community/datetimepicker は描画されないため、ブラウザ標準の
 *   <input type="datetime-local"> を使う。NativeWind の JSX 変換が生の DOM 要素を
 *   握り潰すため、JSX ではなく createElement で input を生成する。
 * - iOS/Android: DateTimePicker を使う。
 */
export function DateField({ label, value, onChange, required }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  if (Platform.OS === "web") {
    const input = createElement("input", {
      type: "datetime-local",
      value: toLocalInputValue(value),
      onChange: (e: { target: { value: string } }) => {
        const d = parseLocalInput(e.target.value);
        if (d) onChange(d);
      },
      style: {
        borderRadius: 10,
        border: "1px solid rgba(0,0,0,0.1)",
        background: "rgba(255,255,255,0.6)",
        padding: "10px 12px",
        fontSize: 13,
        color: "#2a2622",
        fontFamily: "ZenOldMincho_400Regular, serif",
        width: "100%",
        boxSizing: "border-box",
      },
    });
    return (
      <View className="flex-1 gap-1">
        <Label label={label} required={required} />
        {input}
      </View>
    );
  }

  return (
    <View className="flex-1 gap-1">
      <Label label={label} required={required} />
      <Pressable onPress={() => setOpen(true)} className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5">
        <Text className={`font-mincho-400 text-[13px] ${value ? "text-ink" : "text-muted-light"}`} style={{ fontVariant: ["tabular-nums"] }}>
          {formatDateTime(value)}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="datetime"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_, d) => {
            setOpen(Platform.OS === "ios");
            if (d) onChange(d);
          }}
        />
      )}
    </View>
  );
}
