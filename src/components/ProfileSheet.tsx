import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AVATAR_CHOICES, Profile } from "@/lib/profile";
import { PhotoPicker } from "./PhotoPicker";
import { SlideUp } from "./animations";

const MUTED = "#8a8378";

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
      <View className="flex-1">
        <Pressable className="flex-1 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger="profile">
          <View className="max-h-[88%] rounded-t-sheet bg-sheet px-6 pt-3" style={{ paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/[.14]" />
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable onPress={onClose} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[12px] text-muted">‹ 戻る</Text>
              </Pressable>
              <Text className="font-mincho-600 text-[16px] text-ink">プロフィール</Text>
              <View className="w-[52px]" />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled">
              {/* アイコンプレビュー（写真優先） */}
              <View className="items-center gap-3">
                {photo ? (
                  <Image source={{ uri: photo }} style={{ width: 84, height: 84, borderRadius: 42 }} resizeMode="cover" />
                ) : (
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-white/70">
                    <Text className="text-[40px]">{avatar}</Text>
                  </View>
                )}
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
                <View className="flex-row flex-wrap gap-2">
                  {AVATAR_CHOICES.map((a) => {
                    const active = a === avatar;
                    return (
                      <Pressable
                        key={a}
                        onPress={() => setAvatar(a)}
                        className={`h-11 w-11 items-center justify-center rounded-full border ${active ? "border-ink bg-white" : "border-black/[.12] bg-white/50"}`}
                      >
                        <Text className="text-[22px]">{a}</Text>
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
                  placeholderTextColor={MUTED}
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
