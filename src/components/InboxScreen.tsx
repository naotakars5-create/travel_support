import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MailItem } from "@/lib/types";
import { MODE_COLOR } from "@/lib/modeMeta";
import { formatMailSummary } from "@/lib/format";
import { MailStatusDot } from "./icons";

const STATUS_MICRO_LABEL: Record<MailItem["status"], string> = {
  new: "未解析",
  parsing: "解析中",
  done: "解析済",
  skip: "対象外",
  error: "要手入力",
};

export function InboxScreen({
  mails,
  onOpen,
  onAddMail,
}: {
  mails: MailItem[];
  onOpen: (id: string) => void;
  onAddMail: () => void;
}) {
  const insets = useSafeAreaInsets();
  const unresolvedCount = mails.filter((m) => m.status === "new" || m.status === "error" || m.status === "parsing").length;
  const doneCount = mails.filter((m) => m.status === "done").length;

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <View className="px-[26px] pb-3 pt-4">
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="font-gothic-400 text-[10px] tracking-[.2em] text-muted">TABI-NAVI</Text>
            <Text className="mt-1 font-mincho-600 text-[26px] text-ink">受信箱</Text>
          </View>
          <Pressable onPress={onAddMail} className="mt-1 h-7 w-7 items-center justify-center rounded-[8px] border border-ink/25">
            <View className="relative h-[10px] w-[10px]">
              <View className="absolute left-1/2 top-0 h-full w-[1.5px] -translate-x-1/2 bg-ink" />
              <View className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 bg-ink" />
            </View>
          </Pressable>
        </View>
        <Text className="mt-1 font-gothic-400 text-[11px] text-muted">
          未整理 {unresolvedCount}件 · 解析済 {doneCount}件
        </Text>
      </View>
      <View className="h-px w-full bg-black/[.08]" />

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingBottom: 66 }}>
        {mails.map((mail) => {
          const isSkip = mail.status === "skip";
          const color = mail.status === "done" ? MODE_COLOR[mail.events[0]?.mode ?? "activity"] : undefined;
          return (
            <Pressable
              key={mail.id}
              disabled={isSkip}
              onPress={() => onOpen(mail.id)}
              className="flex-row gap-3 border-b border-black/[.06] py-4"
            >
              <View className="w-4 pt-1.5">
                <MailStatusDot status={mail.status} color={color} />
              </View>
              <View className="flex-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text numberOfLines={1} className={`flex-1 font-mincho-600 text-[14px] ${isSkip ? "text-muted-light" : "text-ink"}`}>
                    {mail.source}
                  </Text>
                  <Text className="font-gothic-700 text-[9px] text-muted">{STATUS_MICRO_LABEL[mail.status]}</Text>
                </View>
                <Text numberOfLines={1} className="mt-0.5 font-gothic-400 text-[11px] text-muted">
                  {mail.subject}
                </Text>
                {mail.status === "done" && (
                  <Text className="mt-1 font-mincho-400 text-[12px]" style={{ color, fontVariant: ["tabular-nums"] }}>
                    {formatMailSummary(mail.events)}
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
