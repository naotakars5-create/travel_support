import { createElement } from "react";
import { Platform, Pressable, Text } from "react-native";
import { downscaleImage } from "@/lib/image";

let pickerSeq = 0;

/**
 * Web: 画像ファイルを選び、指定の最大辺まで縮小した data URL を返すボタン。
 * ネイティブでは非対応の案内を出す（デプロイ先＝ブラウザ版での利用を想定）。
 */
export function PhotoPicker({
  onPicked,
  maxSize = 512,
  label = "写真を選ぶ",
}: {
  onPicked: (dataUrl: string) => void;
  maxSize?: number;
  label?: string;
}) {
  if (Platform.OS !== "web") {
    return <Text className="font-gothic-400 text-[10px] text-muted-light">写真の設定はブラウザ版でご利用ください</Text>;
  }

  const inputId = `tabinavi-photo-input-${pickerSeq++}`;
  const input = createElement("input", {
    type: "file",
    accept: "image/*",
    style: { display: "none" },
    id: inputId,
    onChange: (e: { target: { files?: FileList | null; value: string } }) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === "string") {
          const out = await downscaleImage(reader.result, maxSize, 0.8);
          onPicked(out);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = ""; // 同じ写真を選び直せるようにリセット
    },
  });
  const openPicker = () => {
    if (typeof document !== "undefined") {
      const el = document.getElementById(inputId) as HTMLInputElement | null;
      el?.click();
    }
  };
  return (
    <>
      {input}
      <Pressable onPress={openPicker} className="rounded-full border border-ink/25 px-4 py-1.5">
        <Text className="font-gothic-500 text-[11px] text-ink">{label}</Text>
      </Pressable>
    </>
  );
}
