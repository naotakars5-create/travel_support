import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AVATAR_CHOICES, normalizeAvatar, Profile } from "@/lib/profile";
import { IllustrationName } from "@/lib/illustrations";
import { illustrationUri } from "./Illustration";
import { PhotoPicker } from "./PhotoPicker";
import { SlideUp } from "./animations";

const PLACEHOLDER = "rgba(110,103,92,0.5)"; // muted の薄い版（入力済みと見間違えない濃さ）

/** 名前・アイコン（絵文字/写真）を登録/編集するプロフィール画面（半モーダル）。 */
export function ProfileSheet({
  profile,
  onClose,
  onSave,
}: {
  profile: Profile;
  onClose: () => void;
  onSave: (p: Profile) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [photo, setPhoto] = useState<string | undefined>(profile.photo);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger="profile" style={{ maxHeight: "90%" }}>
          <View className="rounded-t-sheet bg-sheet px-6 pt-3" style={{ maxHeight: "100%", paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/[.14]" />
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable onPress={onClose} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[12px] text-muted">‹ 戻る</Text>
              </Pressable>
              <Text className="font-mincho-600 text-[16px] text-ink">プロフィール</Text>
              <View className="w-[52px]" />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
              {/* アイコンプレビュー（写真優先・無ければ選択中のイラスト） */}
              <View className="items-center gap-3">
                <View className="h-[84px] w-[84px] overflow-hidden rounded-full bg-surface">
                  <Image
                    source={{ uri: photo ?? illustrationUri(normalizeAvatar(avatar) as IllustrationName) }}
                    style={{ width: 84, height: 84 }}
                    resizeMode="cover"
                  />
                </View>
                <View className="flex-row items-center gap-2">
                  <PhotoPicker onPicked={setPhoto} maxSize={256} label="写真を選ぶ" />
                  {photo && (
                    <Pressable onPress={() => setPhoto(undefined)} className="rounded-full border border-black/[.15] px-3 py-1.5">
                      <Text className="font-gothic-400 text-[11px] text-muted">写真を外す</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View className="mt-5 gap-1.5">
                <Text className="font-gothic-400 text-[10px] text-muted">アイコン（写真が無いとき使われます）</Text>
                <View className="flex-row gap-3">
                  {AVATAR_CHOICES.map((a) => {
                    const active = normalizeAvatar(avatar) === a;
                    return (
                      <Pressable
                        key={a}
                        onPress={() => setAvatar(a)}
                        className={`h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 ${active ? "border-ink bg-white" : "border-black/[.12] bg-white/50"}`}
                      >
                        <Image source={{ uri: illustrationUri(a as IllustrationName) }} style={{ width: 60, height: 60 }} resizeMode="cover" />
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View className="mt-4 gap-1">
                <Text className="font-gothic-400 text-[10px] text-muted">名前・ニックネーム</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="例: なおたか"
                  placeholderTextColor={PLACEHOLDER}
                  className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
                />
              </View>

              <Pressable
                onPress={() => {
                  onSave({ name: name.trim(), avatar, photo });
                  onClose();
                }}
                className="mt-5 rounded-[12px] bg-ink px-4 py-3"
              >
                <Text className="text-center font-gothic-500 text-[12px] text-kinari">保存</Text>
              </Pressable>
            </ScrollView>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
