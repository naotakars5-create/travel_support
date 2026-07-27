import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlanEntryForm } from "./PlanEntryForm";
import { PlanEntryInput } from "@/lib/plan";
import { TransportMode } from "@/lib/types";
import { SlideUp } from "./animations";

type Mode = "manual" | "bulk" | "mail";
const PLACEHOLDER = "rgba(110,103,92,0.5)"; // muted の薄い版（入力済みと見間違えない濃さ）

export function AddEntrySheet({
  onClose,
  onAdd,
  onBulkAdd,
  onImportMail,
  tripDate,
  tripDayCount,
  fixedMode,
  initialDay,
  title = "行き先を追加",
}: {
  onClose: () => void;
  onAdd: (input: PlanEntryInput) => void;
  /** 自由文からの一括追加（未指定ならタブを出さない） */
  onBulkAdd?: (text: string) => Promise<{ ok: boolean; count?: number; message?: string }>;
  onImportMail: (body: string, source: string) => Promise<{ ok: boolean; message?: string }>;
  tripDate: string;
  tripDayCount: number;
  /** 種別を固定する（宿泊先の専用入力など）。指定時はメール取込を隠す。 */
  fixedMode?: TransportMode;
  /** 何日目を初期選択にするか（旅程の空き時間から開いた場合） */
  initialDay?: number;
  title?: string;
}) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<Mode>("manual");
  const [source, setSource] = useState("");
  const [body, setBody] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBulk = async () => {
    if (!onBulkAdd || !bulkText.trim() || importing) return;
    setImporting(true);
    setError(null);
    const res = await onBulkAdd(bulkText.trim());
    setImporting(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.message ?? "読み取りに失敗しました");
    }
  };

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
      {/* 背景は絶対配置にして、シート側だけが高さを持つようにする
          （シートの maxHeight が画面高に対して効き、ScrollView が正しく縮む） */}
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger="add-entry" style={{ maxHeight: "88%" }}>
          <View className="rounded-t-sheet bg-sheet px-6 pt-3" style={{ maxHeight: "100%", paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/[.14]" />

            <View className="mb-3 flex-row items-center justify-between">
              <Pressable onPress={onClose} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[12px] text-muted">‹ 戻る</Text>
              </Pressable>
              <Text className="font-mincho-600 text-[16px] text-ink">{title}</Text>
              <View className="w-[52px]" />
            </View>

            {!fixedMode && (
              <View className="mb-5 flex-row gap-2">
                <Pressable onPress={() => setMode("manual")} className={`flex-1 rounded-[10px] py-2 ${mode === "manual" ? "bg-ink" : "border border-black/[.1]"}`}>
                  <Text className={`text-center font-gothic-500 text-[11px] ${mode === "manual" ? "text-kinari" : "text-muted"}`}>1件ずつ</Text>
                </Pressable>
                {onBulkAdd && (
                  <Pressable onPress={() => setMode("bulk")} className={`flex-1 rounded-[10px] py-2 ${mode === "bulk" ? "bg-ink" : "border border-black/[.1]"}`}>
                    <Text className={`text-center font-gothic-500 text-[11px] ${mode === "bulk" ? "text-kinari" : "text-muted"}`}>まとめて</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setMode("mail")} className={`flex-1 rounded-[10px] py-2 ${mode === "mail" ? "bg-ink" : "border border-black/[.1]"}`}>
                  <Text className={`text-center font-gothic-500 text-[11px] ${mode === "mail" ? "text-kinari" : "text-muted"}`}>メールから</Text>
                </Pressable>
              </View>
            )}

            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
              {mode === "manual" || fixedMode ? (
                <PlanEntryForm
                  onSubmit={onAdd}
                  tripDate={tripDate}
                  tripDayCount={tripDayCount}
                  initial={
                    fixedMode
                      ? { title: "", mode: fixedMode, priority: "must", day: initialDay }
                      : initialDay
                        ? { title: "", mode: "activity", priority: "want", stayMin: 60, day: initialDay }
                        : undefined
                  }
                  lockMode={Boolean(fixedMode)}
                  submitLabel={
                    fixedMode === "stay" ? "宿泊先を追加" : fixedMode === "rental" ? "レンタカーを登録" : "行き先を追加"
                  }
                />
              ) : mode === "bulk" ? (
                <View className="gap-3">
                  <Text className="-mt-2 font-gothic-400 text-[11px] leading-[18px] text-muted">
                    行きたい場所を思いつくまま書くだけでOK。AIが読み取って一括で登録します。{"\n"}住所・営業時間・定休日は自動で補完されます。
                  </Text>
                  <View className="gap-1">
                    <TextInput
                      value={bulkText}
                      onChangeText={setBulkText}
                      multiline
                      numberOfLines={6}
                      textAlignVertical="top"
                      placeholder={"例: 大阪城、海遊館、道頓堀で夕食。\n2日目はUSJに1日いる"}
                      placeholderTextColor={PLACEHOLDER}
                      className="min-h-[120px] rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-gothic-400 text-[13px] leading-[20px] text-ink"
                    />
                  </View>
                  {error && <Text className="font-gothic-400 text-[11px] text-ink">{error}</Text>}
                  <Pressable
                    disabled={!bulkText.trim() || importing}
                    onPress={runBulk}
                    className={`mt-1 flex-row items-center justify-center gap-2 rounded-[12px] px-4 py-3 ${bulkText.trim() && !importing ? "bg-ink" : "bg-ink/30"}`}
                  >
                    {importing && <ActivityIndicator size="small" color="#F4EFE5" />}
                    <Text className="text-center font-gothic-500 text-[12px] text-kinari">
                      {importing ? "読み取り中…" : "AIで読み取って追加"}
                    </Text>
                  </Pressable>
                </View>
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
                      placeholderTextColor={PLACEHOLDER}
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
                      placeholderTextColor={PLACEHOLDER}
                      className="min-h-[160px] rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-gothic-400 text-[12px] leading-[18px] text-ink"
                    />
                  </View>
                  {error && <Text className="font-gothic-400 text-[11px] text-ink">{error}</Text>}
                  <Pressable
                    disabled={!body.trim() || importing}
                    onPress={runImport}
                    className={`mt-1 flex-row items-center justify-center gap-2 rounded-[12px] px-4 py-3 ${body.trim() && !importing ? "bg-ink" : "bg-ink/30"}`}
                  >
                    {importing && <ActivityIndicator size="small" color="#F4EFE5" />}
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
