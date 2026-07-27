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
  onPickedMany,
  multiple = false,
  maxSize = 512,
  label = "写真を選ぶ",
}: {
  onPicked?: (dataUrl: string) => void;
  onPickedMany?: (dataUrls: string[]) => void;
  multiple?: boolean;
  maxSize?: number;
  label?: string;
}) {
  if (Platform.OS !== "web") {
    return <Text className="font-gothic-400 text-[11px] text-muted-light">写真の設定はブラウザ版でご利用ください</Text>;
  }

  const inputId = `tabinavi-photo-input-${pickerSeq++}`;
  const input = createElement("input", {
    type: "file",
    accept: "image/*",
    multiple,
    style: { display: "none" },
    id: inputId,
    onChange: async (e: { target: { files?: FileList | null; value: string } }) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      e.target.value = ""; // 同じ写真を選び直せるようにリセット
      if (files.length === 0) return;
      const readOne = (file: File): Promise<string | null> =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = async () => {
            if (typeof reader.result === "string") resolve(await downscaleImage(reader.result, maxSize, 0.8));
            else resolve(null);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
      const results = (await Promise.all(files.map(readOne))).filter((x): x is string => Boolean(x));
      if (results.length === 0) return;
      if (onPickedMany) onPickedMany(results);
      else if (onPicked) onPicked(results[0]);
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
        <Text className="font-gothic-500 text-[12px] text-ink">{label}</Text>
      </Pressable>
    </>
  );
}
