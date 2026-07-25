import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PlanEntry } from "@/lib/types";
import { PlanEntryInput } from "@/lib/plan";
import { PlanEntryForm } from "./PlanEntryForm";
import { SlideUp } from "./animations";

/** 追加済みの行き先を編集する半モーダル。既存値を初期表示し、保存すると更新する。 */
export function EditEntrySheet({
  entry,
  tripDate,
  tripDayCount,
  onClose,
  onSave,
  onDelete,
}: {
  entry: PlanEntry;
  tripDate: string;
  tripDayCount: number;
  onClose: () => void;
  onSave: (input: PlanEntryInput) => void;
  onDelete: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1">
        <Pressable className="flex-1 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger={entry.id}>
          <View className="max-h-[88%] rounded-t-sheet bg-sheet px-6 pt-3" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/[.14]" />
            <View className="mb-3 flex-row items-center justify-between">
              <Pressable onPress={onClose} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[12px] text-muted">‹ 戻る</Text>
              </Pressable>
              <Text className="font-mincho-600 text-[16px] text-ink">行き先を編集</Text>
              <Pressable onPress={onDelete} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[11px] text-muted">削除</Text>
              </Pressable>
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              <PlanEntryForm
                initial={entry}
                tripDate={tripDate}
                tripDayCount={tripDayCount}
                submitLabel="保存"
                resetAfterSubmit={false}
                lockMode={entry.mode === "stay" || entry.mode === "home"}
                onSubmit={(input) => {
                  onSave(input);
                  onClose();
                }}
              />
            </ScrollView>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
