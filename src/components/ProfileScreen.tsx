import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { normalizeAvatar, Profile } from "@/lib/profile";
import { IllustrationName } from "@/lib/illustrations";
import { illustrationUri } from "./Illustration";
import { SlideUp } from "./animations";

/** アイコン表示（写真があれば写真、無ければイラスト）。 */
function Avatar({ profile, size }: { profile: Profile; size: number }) {
  const uri = profile.photo ?? illustrationUri(normalizeAvatar(profile.avatar) as IllustrationName);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2 }} className="overflow-hidden bg-surface">
      <Image source={{ uri }} style={{ width: size, height: size }} resizeMode="cover" />
    </View>
  );
}

interface InfoContent {
  title: string;
  body: string;
}

/** マイページ（プロフィール・旅の履歴・各種設定）。下タブの独立画面。 */
export function ProfileScreen({
  profile,
  onEditProfile,
  onOpenShiori,
  onOpenPacking,
}: {
  profile: Profile;
  onEditProfile: () => void;
  onOpenShiori: () => void;
  onOpenPacking: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState<InfoContent | null>(null);

  const MENU: { key: string; label: string; content: InfoContent; action?: () => void }[] = [
    {
      key: "account",
      label: "プロフィール",
      content: { title: "プロフィール", body: "名前とアイコンを編集できます。" },
      action: onEditProfile,
    },
    {
      key: "privacy",
      label: "データの扱い",
      content: {
        title: "データの扱い",
        body:
          "旅程・プロフィール・しおりは、この端末の中に保存しています。アカウント登録はありません。\n\n" +
          "ただし次の場合だけ、外部に情報が出ます。\n\n" +
          "・住所検索、地図、周辺スポット\n" +
          "　入力した行き先名や住所を Google のサービスへ送って調べています。\n\n" +
          "・AIで旅程を組む／まとめて追加\n" +
          "　行き先・日程・AIへのお願いの文章を、旅程を組み立てるAIへ送っています。\n\n" +
          "・共有リンクを作ったとき\n" +
          "　短いリンクにするため、旅程の中身を当サービスのサーバーに90日間預かります。期限を過ぎると自動で消えます。リンクを知っている人は誰でも中身を見られるので、送り先にはご注意ください。",
      },
    },
    {
      key: "support",
      label: "使い方",
      content: {
        title: "使い方",
        body:
          "1. 行き先を追加するか、AIにゼロから作ってもらいます。\n" +
          "2.「AIで予定を組む」で、移動時間・営業時間・定休日を見て順番と時刻が決まります。\n" +
          "3. 旅程はタップでその場で並べ替え・編集ができます。\n" +
          "4. 当日は「当日」タブ。出発までの残り時間と、近くのスポットが出ます。\n" +
          "5. 旅が終わったら、しおりに写真とともに残せます。",
      },
    },
  ];

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <View className="px-[26px] pb-3 pt-4">
        <Text className="font-mincho-600 text-[26px] text-ink">マイページ</Text>
      </View>
      <View className="h-px w-full bg-black/[.08]" />

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingTop: 16, paddingBottom: 90 }}>
        {/* プロフィール */}
        <View className="items-center">
          <Pressable onPress={onEditProfile}>
            <Avatar profile={profile} size={84} />
          </Pressable>
          <Text className="mt-3 font-mincho-600 text-[18px] text-ink">{profile.name || "ゲスト"}</Text>
          <Pressable onPress={onEditProfile} className="mt-2 rounded-full border border-ink/25 px-4 py-1.5">
            <Text className="font-gothic-500 text-[12px] text-ink">プロフィールを編集</Text>
          </Pressable>
        </View>

        {/* しおり・持ち物は下タブから外したので、ここが入口になる */}
        <View className="mb-2 mt-8 flex-row items-center gap-1.5">
          <View className="h-[11px] w-[3px] rounded-full bg-accent" />
          <Text className="font-gothic-500 text-[11px] tracking-[.15em] text-muted">旅の道具</Text>
        </View>
        <View className="overflow-hidden rounded-[16px] border border-ink/10">
          <Pressable
            onPress={onOpenShiori}
            accessibilityRole="button"
            accessibilityLabel="旅のしおりを開く"
            className="flex-row items-center justify-between px-4 py-3.5"
          >
            <View className="flex-1">
              <Text className="font-gothic-400 text-[13px] text-ink">旅のしおり</Text>
              <Text className="mt-0.5 font-gothic-400 text-[11px] text-muted">保存した旅を表紙つきで残す・見返す</Text>
            </View>
            <Text className="font-gothic-400 text-[14px] text-muted-light">›</Text>
          </Pressable>
          <Pressable
            onPress={onOpenPacking}
            accessibilityRole="button"
            accessibilityLabel="持ち物リストを開く"
            className="flex-row items-center justify-between border-t border-ink/10 px-4 py-3.5"
          >
            <View className="flex-1">
              <Text className="font-gothic-400 text-[13px] text-ink">持ち物リスト</Text>
              <Text className="mt-0.5 font-gothic-400 text-[11px] text-muted">出発前の忘れ物チェック</Text>
            </View>
            <Text className="font-gothic-400 text-[14px] text-muted-light">›</Text>
          </Pressable>
        </View>

        {/* 各種設定 */}
        <View className="mb-2 mt-8 flex-row items-center gap-1.5">
          <View className="h-[11px] w-[3px] rounded-full bg-accent" />
          <Text className="font-gothic-500 text-[11px] tracking-[.15em] text-muted">設定</Text>
        </View>
        <View className="overflow-hidden rounded-[16px] border border-ink/10">
          {MENU.map((m, i) => (
            <Pressable
              key={m.key}
              onPress={() => (m.action ? m.action() : setInfo(m.content))}
              className={`flex-row items-center justify-between px-4 py-3.5 ${i > 0 ? "border-t border-ink/10" : ""}`}
            >
              <Text className="font-gothic-400 text-[13px] text-ink">{m.label}</Text>
              <Text className="font-gothic-400 text-[14px] text-muted-light">›</Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-4 text-center font-gothic-400 text-[12px] leading-[19px] text-muted-light">
          アカウント登録はありません。{"\n"}このアプリのデータは、この端末の中だけにあります。
        </Text>
        <Text className="mt-3 text-center font-gothic-400 text-[11px] text-muted-light">旅ナビ / TABI-NAVI</Text>
      </ScrollView>

      {/* 各種情報 */}
      {info && <InfoSheet title={info.title} body={info.body} onClose={() => setInfo(null)} />}
    </View>
  );
}

/** 情報表示用の簡易ボトムシート。 */
function InfoSheet({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1">
        <Pressable className="flex-1 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger={title}>
          <View className="rounded-t-sheet bg-sheet px-6 pt-3" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/[.14]" />
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="font-mincho-600 text-[16px] text-ink">{title}</Text>
              <Pressable onPress={onClose} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[12px] text-muted">閉じる</Text>
              </Pressable>
            </View>
            <Text className="font-mincho-400 text-[13px] leading-[21px] text-ink">{body}</Text>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
