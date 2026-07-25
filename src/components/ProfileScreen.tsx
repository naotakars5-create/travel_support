import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Profile } from "@/lib/profile";
import { SavedTrip } from "@/lib/trips";
import { formatDateStrJa } from "@/lib/date";
import { SlideUp } from "./animations";

const MUTED = "#8a8378";

/** アイコン表示（写真があれば写真、無ければ絵文字）。 */
function Avatar({ profile, size }: { profile: Profile; size: number }) {
  if (profile.photo) {
    return <Image source={{ uri: profile.photo }} style={{ width: size, height: size, borderRadius: size / 2 }} resizeMode="cover" />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2 }} className="items-center justify-center bg-white/70">
      <Text style={{ fontSize: size * 0.5 }}>{profile.avatar}</Text>
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
  savedTrips,
  canSaveTrip,
  onSaveTrip,
  onLoadTrip,
  onDeleteTrip,
}: {
  profile: Profile;
  onEditProfile: () => void;
  savedTrips: SavedTrip[];
  canSaveTrip: boolean;
  onSaveTrip: (name: string) => void;
  onLoadTrip: (id: string) => void;
  onDeleteTrip: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [tripName, setTripName] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [info, setInfo] = useState<InfoContent | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);

  const MENU: { key: string; label: string; content: InfoContent; action?: () => void }[] = [
    {
      key: "account",
      label: "アカウント設定",
      content: { title: "アカウント設定", body: "名前とアイコンを編集できます。" },
      action: onEditProfile,
    },
    {
      key: "privacy",
      label: "プライバシー",
      content: {
        title: "プライバシー",
        body: "旅程・プロフィール・履歴はこの端末の中だけに保存されます（クラウドには送信していません）。共有リンクを送った場合のみ、その相手に旅程が渡ります。",
      },
    },
    {
      key: "support",
      label: "サポート・使い方",
      content: {
        title: "サポート・使い方",
        body: "行き先を追加 →「AIで旅程を組む」で順路を自動作成します。当日タブで出発カウントダウンや近くのスポットを確認できます。ご不明点はこの画面から順にお試しください。",
      },
    },
    {
      key: "logout",
      label: "ログアウト",
      content: {
        title: "ログアウト",
        body: "アカウント連携（複数端末での同期・相互編集）は現在準備中です。今はアカウント無しで、この端末内にデータを保存して利用しています。",
      },
    },
  ];

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      {/* ヘッダー：タイトル＋通知ベル */}
      <View className="flex-row items-center justify-between px-[26px] pb-3 pt-4">
        <Text className="font-mincho-600 text-[26px] text-ink">マイページ</Text>
        <Pressable
          onPress={() => setNotifOpen(true)}
          className="h-10 w-10 items-center justify-center rounded-full border border-black/[.08] bg-white/70"
        >
          <Text className="text-[18px]">🔔</Text>
        </Pressable>
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
            <Text className="font-gothic-500 text-[11px] text-ink">プロフィールを編集</Text>
          </Pressable>
        </View>

        {/* 旅の履歴 */}
        <Text className="mb-2 mt-8 font-gothic-500 text-[10px] tracking-[.15em] text-muted">旅の履歴</Text>
        <View className="gap-1.5 rounded-[12px] border border-ink/10 bg-white/40 px-4 py-3">
          <Text className="font-gothic-500 text-[10px] tracking-[.1em] text-muted">今の旅程を保存</Text>
          <TextInput
            value={tripName}
            onChangeText={setTripName}
            placeholder="旅の名前（例: 大阪日帰り）"
            placeholderTextColor={MUTED}
            className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
          />
          <Pressable
            disabled={!canSaveTrip}
            onPress={() => {
              onSaveTrip(tripName);
              setTripName("");
            }}
            className={`mt-1 rounded-[10px] px-4 py-2.5 ${canSaveTrip ? "bg-ink" : "bg-ink/30"}`}
          >
            <Text className="text-center font-gothic-500 text-[12px] text-kinari">
              {canSaveTrip ? "この旅程を保存" : "行き先を追加してください"}
            </Text>
          </Pressable>
        </View>

        {savedTrips.length === 0 ? (
          <Text className="mt-3 text-center font-gothic-400 text-[11px] leading-[18px] text-muted-light">
            まだ保存した旅はありません。{"\n"}気に入った旅程を保存すると、ここから呼び出せます。
          </Text>
        ) : (
          <View className="mt-3 overflow-hidden rounded-[16px] border border-ink/10">
            {savedTrips.map((t, i) => (
              <View key={t.id} className={`px-4 py-3 ${i > 0 ? "border-t border-ink/10" : ""}`}>
                <View className="flex-row items-center justify-between gap-3">
                  <Pressable onPress={() => onLoadTrip(t.id)} className="flex-1">
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
                          onDeleteTrip(t.id);
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
                      <Pressable onPress={() => onLoadTrip(t.id)} hitSlop={6} className="rounded-full bg-ink px-3 py-1.5">
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

        {/* 各種設定 */}
        <Text className="mb-2 mt-8 font-gothic-500 text-[10px] tracking-[.15em] text-muted">設定</Text>
        <View className="overflow-hidden rounded-[16px] border border-ink/10">
          {MENU.map((m, i) => (
            <Pressable
              key={m.key}
              onPress={() => (m.action ? m.action() : setInfo(m.content))}
              className={`flex-row items-center justify-between px-4 py-3.5 ${i > 0 ? "border-t border-ink/10" : ""}`}
            >
              <Text className={`font-gothic-400 text-[13px] ${m.key === "logout" ? "text-accent" : "text-ink"}`}>{m.label}</Text>
              <Text className="font-gothic-400 text-[14px] text-muted-light">›</Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-3 text-center font-gothic-400 text-[10px] text-muted-light">旅ナビ / TABI-NAVI</Text>
      </ScrollView>

      {/* お知らせ */}
      {notifOpen && (
        <InfoSheet
          title="お知らせ"
          body="現在お知らせはありません。旅程の遅れ・巻きは「当日」タブでお知らせします。"
          onClose={() => setNotifOpen(false)}
        />
      )}
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
