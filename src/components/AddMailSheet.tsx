import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ManualEntryForm } from "./ManualEntryForm";
import { ManualEventInput } from "@/lib/manualEntry";
import { SlideUp } from "./animations";

type Mode = "paste" | "manual";
const MUTED = "#8a8378";

export function AddMailSheet({
  onClose,
  onAdd,
  onAddManual,
}: {
  onClose: () => void;
  onAdd: (body: string, source: string) => void;
  onAddManual: (input: ManualEventInput) => void;
}) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("paste");
  const [source, setSource] = useState("");
  const [body, setBody] = useState("");

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1">
        <Pressable className="flex-1 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger="add-mail">
          <View className="max-h-[86%] rounded-t-sheet bg-sheet px-6 pt-3" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-4 h-1 w-9 rounded-full bg-black/[.14]" />

            <View className="mb-5 flex-row gap-2">
              <Pressable onPress={() => setMode("paste")} className={`flex-1 rounded-[10px] py-2 ${mode === "paste" ? "bg-ink" : "border border-black/[.1]"}`}>
                <Text className={`text-center font-gothic-500 text-[11px] ${mode === "paste" ? "text-kinari" : "text-muted"}`}>メールを貼り付け</Text>
              </Pressable>
              <Pressable onPress={() => setMode("manual")} className={`flex-1 rounded-[10px] py-2 ${mode === "manual" ? "bg-ink" : "border border-black/[.1]"}`}>
                <Text className={`text-center font-gothic-500 text-[11px] ${mode === "manual" ? "text-kinari" : "text-muted"}`}>手入力で追加</Text>
              </Pressable>
            </View>

            <ScrollView>
              {mode === "paste" ? (
                <View className="gap-3">
                  <Text className="-mt-2 font-gothic-400 text-[11px] text-muted">予約確認メールの本文をそのまま貼り付けてください。</Text>
                  <View className="gap-1">
                    <Text className="font-gothic-400 text-[10px] text-muted">送信元（任意）</Text>
                    <TextInput
                      value={source}
                      onChangeText={setSource}
                      placeholder="例: じゃらんnet"
                      placeholderTextColor={MUTED}
                      className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
                    />
                  </View>
                  <View className="gap-1">
                    <Text className="font-gothic-400 text-[10px] text-muted">メール本文 *</Text>
                    <TextInput
                      value={body}
                      onChangeText={setBody}
                      multiline
                      numberOfLines={10}
                      textAlignVertical="top"
                      placeholder="メール本文をここに貼り付け"
                      placeholderTextColor={MUTED}
                      className="min-h-[180px] rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-gothic-400 text-[12px] leading-[18px] text-ink"
                    />
                  </View>
                  <Pressable
                    disabled={!body.trim()}
                    onPress={() => onAdd(body, source)}
                    className={`mt-1 rounded-[12px] px-4 py-3 ${body.trim() ? "bg-ink" : "bg-ink/30"}`}
                  >
                    <Text className="text-center font-gothic-500 text-[12px] text-kinari">受信箱に追加</Text>
                  </Pressable>
                </View>
              ) : (
                <ManualEntryForm
                  intro="場所（住所推奨）と時刻を入力して旅程に追加します。住所を入れると移動時間や周辺スポットの提案も自動計算されます。"
                  onSubmit={onAddManual}
                />
              )}
            </ScrollView>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
