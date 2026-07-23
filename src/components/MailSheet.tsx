import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MailItem } from "@/lib/types";
import { MODE_COLOR } from "@/lib/modeMeta";
import { ManualEntryForm } from "./ManualEntryForm";
import { ManualEventInput } from "@/lib/manualEntry";
import { Tab } from "@/hooks/useAppState";
import { Spinner, SlideUp } from "./animations";

export function MailSheet({
  mail,
  onClose,
  onParse,
  onManualSubmit,
  onGoToItinerary,
}: {
  mail: MailItem;
  onClose: () => void;
  onParse: () => void;
  onManualSubmit: (input: ManualEventInput) => void;
  onGoToItinerary: (tab: Tab) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1">
        <Pressable className="flex-1 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger={mail.id}>
          <View className="max-h-[86%] rounded-t-sheet bg-sheet px-6 pt-3" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-4 h-1 w-9 rounded-full bg-black/[.14]" />

            <View className="mb-5 flex-row items-center justify-between">
              <Text className="font-mincho-600 text-[14px] text-ink">{mail.source}</Text>
              <StatusLabel status={mail.status} />
            </View>

            <ScrollView>
              {mail.status === "new" && (
                <View className="gap-4">
                  <Text className="font-gothic-400 text-[12px] leading-[19px] text-muted">
                    「{mail.subject}」の本文をAIが読み取り、予約内容を旅程に組み込みます。
                  </Text>
                  <Pressable onPress={onParse} className="rounded-[12px] bg-ink px-4 py-3">
                    <Text className="text-center font-gothic-500 text-[12px] text-kinari">解析する</Text>
                  </Pressable>
                </View>
              )}

              {mail.status === "parsing" && (
                <View className="items-center gap-3 py-6">
                  <Spinner size={26} color="#a8804a" />
                  <Text className="font-gothic-400 text-[11px] text-muted">解析中… 予約内容を読み取っています</Text>
                </View>
              )}

              {mail.status === "done" && (
                <View className="gap-4">
                  {mail.events.map((event) => (
                    <View key={event.id} className="gap-2">
                      {mail.events.length > 1 && <Text className="font-mincho-600 text-[13px] text-ink">{event.title}</Text>}
                      {event.confidence < 0.5 && (
                        <View className="self-start rounded-full border border-mode-bus/60 px-2 py-0.5">
                          <Text className="font-gothic-400 text-[9px] text-mode-bus">要確認 · 抽出の確度が低い項目があります</Text>
                        </View>
                      )}
                      <View className="gap-1.5">
                        {event.fields.map((f, i) => (
                          <FieldRow key={i} k={f.key} v={f.value} />
                        ))}
                        {event.placeFrom && <FieldRow k="出発地" v={event.placeFrom} />}
                        {event.placeTo && <FieldRow k="到着地" v={event.placeTo} />}
                        {event.reservationNo && <FieldRow k="予約番号" v={event.reservationNo} />}
                        {typeof event.price === "number" && <FieldRow k="料金" v={`${event.price.toLocaleString()}円`} />}
                      </View>
                    </View>
                  ))}
                  <Pressable
                    onPress={() => onGoToItinerary("itin")}
                    className="rounded-[12px] border px-4 py-3"
                    style={{ borderColor: MODE_COLOR[mail.events[0]?.mode ?? "activity"] }}
                  >
                    <Text className="text-center font-gothic-500 text-[12px]" style={{ color: MODE_COLOR[mail.events[0]?.mode ?? "activity"] }}>
                      旅程に追加済み — 旅程を見る
                    </Text>
                  </Pressable>
                </View>
              )}

              {mail.status === "error" && (
                <View className="gap-4">
                  <Text className="font-gothic-400 text-[12px] leading-[19px] text-mode-bus">{mail.errorMessage ?? "解析に失敗しました。"}</Text>
                  <ManualEntryForm onSubmit={onManualSubmit} />
                </View>
              )}
            </ScrollView>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}

function FieldRow({ k, v }: { k: string; v: string }) {
  return (
    <View className="flex-row gap-4">
      <Text className="w-20 font-gothic-400 text-[11px] text-muted">{k}</Text>
      <Text className="flex-1 font-mincho-400 text-[13px] text-ink">{v}</Text>
    </View>
  );
}

function StatusLabel({ status }: { status: MailItem["status"] }) {
  const map: Record<MailItem["status"], string> = {
    new: "未解析",
    parsing: "解析中",
    done: "解析済",
    skip: "対象外",
    error: "要手入力",
  };
  const color: Record<MailItem["status"], string> = {
    new: "text-mode-bus",
    parsing: "text-mode-bus",
    done: "text-mode-rail",
    skip: "text-muted-light",
    error: "text-mode-bus",
  };
  return <Text className={`font-gothic-700 text-[10px] ${color[status]}`}>{map[status]}</Text>;
}
