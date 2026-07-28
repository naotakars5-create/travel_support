import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SavedTrip } from "@/lib/trips";
import { tripRangeLabel } from "@/lib/date";
import { SlideUp } from "./animations";
import { Button } from "./ui";

const PLACEHOLDER = "rgba(111, 98, 90, 0.5)";

/**
 * 旅の切り替えと、名前・行き先の編集。
 *
 * 「複数の旅を持てる」ために新しいタブや概念は増やさない。
 * しおり（＝保存された旅の一覧）がそのまま切り替え先になる。
 * ふだんは見出しの旅名を押した時だけ出てくるので、邪魔にならない。
 */
export function TripSwitcherSheet({
  trips,
  activeTripId,
  name,
  destination,
  tripDate,
  tripDayCount,
  onClose,
  onSetName,
  onSetDestination,
  onOpenTrip,
  onNewTrip,
}: {
  trips: SavedTrip[];
  activeTripId: string | null;
  name: string;
  destination: string;
  tripDate: string;
  tripDayCount: number;
  onClose: () => void;
  onSetName: (v: string) => void;
  onSetDestination: (v: string) => void;
  onOpenTrip: (id: string) => void;
  onNewTrip: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draftName, setDraftName] = useState(name);
  const [draftDest, setDraftDest] = useState(destination);

  const commit = () => {
    onSetName(draftName.trim());
    onSetDestination(draftDest.trim());
  };

  const others = trips.filter((t) => t.id !== activeTripId);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-[rgba(26,26,26,.28)]" onPress={onClose} />
        <SlideUp trigger="trip-switcher" style={{ maxHeight: "88%" }}>
          <View className="rounded-t-sheet bg-sheet px-6 pt-3" style={{ maxHeight: "100%", paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/[.14]" />
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable onPress={onClose} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[12px] text-muted">‹ 閉じる</Text>
              </Pressable>
              <Text className="font-mincho-600 text-[17px] text-ink">旅の設定</Text>
              <View className="w-[64px]" />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
              <View className="gap-1.5">
                <Text className="font-gothic-500 text-[11px] text-muted">旅の名前</Text>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  onBlur={commit}
                  placeholder="例: 香川ふたり旅"
                  placeholderTextColor={PLACEHOLDER}
                  accessibilityLabel="旅の名前"
                  className="rounded-[10px] border border-black/[.12] bg-white/70 px-3.5 py-3 font-mincho-600 text-[16px] text-ink"
                />
              </View>

              <View className="mt-4 gap-1.5">
                <Text className="font-gothic-500 text-[11px] text-muted">行き先</Text>
                <TextInput
                  value={draftDest}
                  onChangeText={setDraftDest}
                  onBlur={commit}
                  placeholder="例: 香川県 高松・小豆島"
                  placeholderTextColor={PLACEHOLDER}
                  accessibilityLabel="行き先"
                  className="rounded-[10px] border border-black/[.12] bg-white/70 px-3.5 py-3 font-gothic-400 text-[14px] text-ink"
                />
                <Text className="font-gothic-400 text-[11px] leading-[17px] text-muted-light">
                  しおりの表紙は、この行き先の風景から自動で選ばれます。
                </Text>
              </View>

              <View className="mt-6">
                <Button
                  label="保存して閉じる"
                  onPress={() => {
                    commit();
                    onClose();
                  }}
                />
              </View>

              {/* 他の旅への切り替え。作った旅は自動でここに残っている */}
              <View className="mt-8">
                <Text className="mb-2 font-gothic-700 text-[11px] tracking-[.14em] text-ink">ほかの旅</Text>
                {others.length === 0 ? (
                  <Text className="font-gothic-400 text-[12px] leading-[19px] text-muted">
                    いまはこの旅だけです。新しい旅を始めても、今の旅はしおりに残ります。
                  </Text>
                ) : (
                  <View className="overflow-hidden rounded-[14px] border border-ink/12 bg-white/50">
                    {others.map((t, i) => (
                      <Pressable
                        key={t.id}
                        onPress={() => {
                          commit();
                          onOpenTrip(t.id);
                          onClose();
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${t.name}に切り替える`}
                        className={`flex-row items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-ink/10" : ""}`}
                      >
                        <View className="flex-1">
                          <Text numberOfLines={1} className="font-mincho-600 text-[15px] text-ink">
                            {t.name}
                          </Text>
                          <Text numberOfLines={1} className="mt-0.5 font-gothic-400 text-[11px] text-muted">
                            {tripRangeLabel(t.tripDate, t.tripDayCount)} · 行き先{t.entries.length}件
                          </Text>
                        </View>
                        <Text className="font-gothic-400 text-[16px] text-muted-light">›</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View className="mt-4">
                <Button
                  label="＋ 新しい旅をはじめる"
                  tone="secondary"
                  onPress={() => {
                    commit();
                    onNewTrip();
                    onClose();
                  }}
                />
                <Text className="mt-2 text-center font-gothic-400 text-[11px] leading-[17px] text-muted-light">
                  いまの「{name.trim() || tripRangeLabel(tripDate, tripDayCount)}」はしおりに残るので、いつでも戻れます。
                </Text>
              </View>
            </ScrollView>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
