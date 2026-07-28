import { createElement, useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { COLORS } from "@/lib/palette";

/**
 * 時刻だけ／日付だけを入力するフィールド。
 * - Web: ブラウザ標準の <input type="time"|"date">（タップ選択も手入力も可）。
 *   NativeWind の JSX 変換が生の DOM 要素を握り潰すため createElement で生成する。
 * - iOS/Android: DateTimePicker（mode="time"|"date"）。
 */

// 他の TextInput（px-3 py-2.5 text-[14px]）と箱の高さ・余白を揃える。
const WEB_INPUT_STYLE = {
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.1)",
  background: "rgba(255,255,255,0.6)",
  padding: "0 12px",
  height: 42,
  fontSize: 14,
  color: COLORS.ink,
  fontFamily: "ZenOldMincho_400Regular, serif",
  width: "100%",
  boxSizing: "border-box" as const,
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function Label({ label, required }: { label: string; required?: boolean }) {
  return (
    <Text className="font-gothic-400 text-[11px] text-muted">
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

/**
 * 選択肢から1つ選ぶ。
 * 選択肢が多いと横並びのチップは読みづらいので、ここはプルダウンにする。
 * - Web: ブラウザ標準の <select>
 * - iOS/Android: 押すと下から選択肢が出る
 */
export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  widthAuto,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  /** 中身に合わせた幅にする（横並びで使うとき） */
  widthAuto?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  if (Platform.OS === "web") {
    const select = createElement(
      "select",
      {
        value: String(value),
        onChange: (e: { target: { value: string } }) => {
          const picked = options.find((o) => String(o.value) === e.target.value);
          if (picked) onChange(picked.value);
        },
        style: {
          ...WEB_INPUT_STYLE,
          width: widthAuto ? "auto" : "100%",
          fontFamily: "NotoSansJP_400Regular, sans-serif",
          appearance: "auto" as const,
        },
      },
      options.map((o) => createElement("option", { key: String(o.value), value: String(o.value) }, o.label))
    );
    return (
      <View className={`gap-1 ${widthAuto ? "" : "flex-1"}`}>
        <Label label={label} />
        {select}
      </View>
    );
  }

  return (
    <View className={`gap-1 ${widthAuto ? "" : "flex-1"}`}>
      <Label label={label} />
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? ""}。押すと選べます`}
        className="flex-row items-center justify-between gap-2 rounded-[10px] border border-black/[.1] bg-white/60 px-3"
        style={{ height: 42 }}
      >
        <Text className="font-mincho-400 text-[14px] text-ink">{current?.label ?? "選択"}</Text>
        <Text className="font-gothic-400 text-[11px] text-muted">▾</Text>
      </Pressable>
      {open && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
          <Pressable className="flex-1 justify-center bg-[rgba(28,25,21,.28)] px-10" onPress={() => setOpen(false)}>
            <View className="overflow-hidden rounded-[14px] bg-sheet">
              <Text className="px-4 pb-2 pt-3 font-gothic-500 text-[12px] text-muted">{label}</Text>
              {options.map((o, i) => (
                <Pressable
                  key={String(o.value)}
                  onPress={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  accessibilityRole="button"
                  className={`px-4 py-3 ${i > 0 ? "border-t border-black/[.06]" : ""} ${o.value === value ? "bg-ink/[.06]" : ""}`}
                >
                  <Text className={`font-mincho-400 text-[15px] ${o.value === value ? "text-ink" : "text-muted"}`}>
                    {o.label}
                    {o.value === value ? "  ✓" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
