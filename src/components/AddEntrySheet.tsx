import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlanEntryForm } from "./PlanEntryForm";
import { PlanEntryInput } from "@/lib/plan";
import { SlideUp } from "./animations";

type Mode = "manual" | "mail";
const MUTED = "#8a8378";

export function AddEntrySheet({
  onClose,
  onAdd,
  onImportMail,
}: {
  onClose: () => void;
  onAdd: (input: PlanEntryInput) => void;
  onImportMail: (body: string, source: string) => Promise<{ ok: boolean; message?: string }>;
}) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("manual");
  const [source, setSource] = useState("");
  const [body, setBody] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runImport = async () => {
    if (!body.trim() || importing) return;
    setImporting(true);
    setError(null);
    const res = await onImportMail(body.trim(), source.trim() || "貼り付けメール");
    setImporting(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.message ?? "取り込みに失敗しました");
    }
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1">
        <Pressable className="flex-1 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger="add-entry">
          <View className="max-h-[88%] rounded-t-sheet bg-sheet px-6 pt-3" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-4 h-1 w-9 rounded-full bg-black/[.14]" />

            <View className="mb-5 flex-row gap-2">
              <Pressable onPress={() => setMode("manual")} className={`flex-1 rounded-[10px] py-2 ${mode === "manual" ? "bg-ink" : "border border-black/[.1]"}`}>
                <Text className={`text-center font-gothic-500 text-[11px] ${mode === "manual" ? "text-kinari" : "text-muted"}`}>行き先を入力</Text>
              </Pressable>
              <Pressable onPress={() => setMode("mail")} className={`flex-1 rounded-[10px] py-2 ${mode === "mail" ? "bg-ink" : "border border-black/[.1]"}`}>
                <Text className={`text-center font-gothic-500 text-[11px] ${mode === "mail" ? "text-kinari" : "text-muted"}`}>メールから追加</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {mode === "manual" ? (
                <PlanEntryForm onSubmit={onAdd} />
              ) : (
                <View className="gap-3">
                  <Text className="-mt-2 font-gothic-400 text-[11px] leading-[18px] text-muted">
                    航空券・ホテル等の予約確認メールを貼り付けると、AIが読み取って確定予定（固定時刻）として取り込みます。
                  </Text>
                  <View className="gap-1">
                    <Text className="font-gothic-400 text-[10px] text-muted">送信元（任意）</Text>
                    <TextInput
                      value={source}
                      onChangeText={setSource}
                      placeholder="例: JAL / 一休.com"
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
                      className="min-h-[160px] rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-gothic-400 text-[12px] leading-[18px] text-ink"
                    />
                  </View>
                  {error && <Text className="font-gothic-400 text-[11px] text-accent">{error}</Text>}
                  <Pressable
                    disabled={!body.trim() || importing}
                    onPress={runImport}
                    className={`mt-1 flex-row items-center justify-center gap-2 rounded-[12px] px-4 py-3 ${body.trim() && !importing ? "bg-ink" : "bg-ink/30"}`}
                  >
                    {importing && <ActivityIndicator size="small" color="#f3efe6" />}
                    <Text className="text-center font-gothic-500 text-[12px] text-kinari">{importing ? "解析中…" : "メールを解析して追加"}</Text>
                  </Pressable>
                </View>
              )}
            </ScrollView>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
