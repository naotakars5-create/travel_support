import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SavedTrip } from "@/lib/trips";
import { formatDateStrJa } from "@/lib/date";
import { SlideUp } from "./animations";

const MUTED = "#8a8378";

/** 旅の履歴（保存・呼び出し・削除）を管理する半モーダル。 */
export function TripsSheet({
  trips,
  canSave,
  onSave,
  onLoad,
  onDelete,
  onClose,
}: {
  trips: SavedTrip[];
  /** 現在の旅程が保存可能か（行き先が1件以上あるか） */
  canSave: boolean;
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const save = () => {
    onSave(name);
    setName("");
    onClose();
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1">
        <Pressable className="flex-1 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger="trips">
          <View className="max-h-[88%] rounded-t-sheet bg-sheet px-6 pt-3" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/[.14]" />
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable onPress={onClose} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[12px] text-muted">‹ 戻る</Text>
              </Pressable>
              <Text className="font-mincho-600 text-[16px] text-ink">旅の履歴</Text>
              <View className="w-[52px]" />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {/* 現在の旅程を保存 */}
              <View className="gap-1.5 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-3">
                <Text className="font-gothic-500 text-[10px] tracking-[.1em] text-muted">今の旅程を保存</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="旅の名前（例: 大阪日帰り）"
                  placeholderTextColor={MUTED}
                  className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
                />
                <Pressable
                  disabled={!canSave}
                  onPress={save}
                  className={`mt-1 rounded-[10px] px-4 py-2.5 ${canSave ? "bg-ink" : "bg-ink/30"}`}
                >
                  <Text className="text-center font-gothic-500 text-[12px] text-kinari">
                    {canSave ? "この旅程を保存" : "行き先を追加してください"}
                  </Text>
                </Pressable>
              </View>

              {/* 保存済みの旅一覧 */}
              <Text className="mb-2 mt-6 font-gothic-500 text-[10px] tracking-[.15em] text-muted">保存した旅（{trips.length}）</Text>
              {trips.length === 0 ? (
                <Text className="mt-2 text-center font-gothic-400 text-[11px] leading-[18px] text-muted-light">
                  まだ保存した旅はありません。{"\n"}気に入った旅程を保存すると、ここから呼び出せます。
                </Text>
              ) : (
                <View className="overflow-hidden rounded-[16px] border border-ink/10">
                  {trips.map((t, i) => (
                    <View key={t.id} className={`px-4 py-3 ${i > 0 ? "border-t border-ink/10" : ""}`}>
                      <View className="flex-row items-center justify-between gap-3">
                        <Pressable onPress={() => onLoad(t.id)} className="flex-1">
                          <Text className="font-mincho-600 text-[15px] text-ink">{t.name}</Text>
                          <Text className="mt-0.5 font-gothic-400 text-[10px] text-muted">
                            {formatDateStrJa(t.tripDate)}
                            {t.tripDayCount > 1 ? `〜${t.tripDayCount}日間` : ""} · 行き先{t.entries.length}件
                          </Text>
                        </Pressable>
                        {confirmId === t.id ? (
                          <View className="flex-row items-center gap-2">
                            <Pressable onPress={() => setConfirmId(null)} hitSlop={6} className="rounded-full border border-black/[.15] px-2.5 py-1">
                              <Text className="font-gothic-400 text-[10px] text-muted">やめる</Text>
                            </Pressable>
                            <Pressable
                              onPress={() => {
                                onDelete(t.id);
                                setConfirmId(null);
                              }}
                              hitSlop={6}
                              className="rounded-full border border-accent px-2.5 py-1"
                            >
                              <Text className="font-gothic-500 text-[10px] text-accent">削除</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <View className="flex-row items-center gap-3">
                            <Pressable onPress={() => onLoad(t.id)} hitSlop={6} className="rounded-full bg-ink px-3 py-1.5">
                              <Text className="font-gothic-500 text-[11px] text-kinari">開く</Text>
                            </Pressable>
                            <Pressable onPress={() => setConfirmId(t.id)} hitSlop={8}>
                              <Text className="font-gothic-400 text-[16px] text-muted-light">×</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
              <Text className="mt-3 font-gothic-400 text-[10px] leading-[15px] text-muted-light">
                旅を「開く」と今の旅程が読み込んだ内容に置き換わります。先に今の旅程を保存しておくと安心です。
              </Text>
            </ScrollView>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
