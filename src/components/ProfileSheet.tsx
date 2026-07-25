import { createElement, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AVATAR_CHOICES, Profile } from "@/lib/profile";
import { SlideUp } from "./animations";

const MUTED = "#8a8378";

/** 画像を最大256pxへ縮小して JPEG の data URL にする（端末保存の容量オーバーを防ぐ）。 */
function downscaleToDataUrl(dataUrl: string, onDone: (out: string) => void) {
  const img = new window.Image();
  img.onload = () => {
    const max = 256;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      onDone(dataUrl);
      return;
    }
    ctx.drawImage(img, 0, 0, w, h);
    onDone(canvas.toDataURL("image/jpeg", 0.85));
  };
  img.onerror = () => onDone(dataUrl);
  img.src = dataUrl;
}

/** Web: 画像ファイルを選んで（縮小して）data URL を返すボタン。 */
function WebPhotoPicker({ onPicked }: { onPicked: (dataUrl: string) => void }) {
  const input = createElement("input", {
    type: "file",
    accept: "image/*",
    style: { display: "none" },
    id: "tabinavi-photo-input",
    onChange: (e: { target: { files?: FileList | null } }) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") downscaleToDataUrl(reader.result, onPicked);
      };
      reader.readAsDataURL(file);
    },
  });
  const openPicker = () => {
    if (typeof document !== "undefined") {
      const el = document.getElementById("tabinavi-photo-input") as HTMLInputElement | null;
      el?.click();
    }
  };
  return (
    <>
      {input}
      <Pressable onPress={openPicker} className="rounded-full border border-ink/25 px-4 py-1.5">
        <Text className="font-gothic-500 text-[11px] text-ink">写真を選ぶ</Text>
      </Pressable>
    </>
  );
}

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
                  {Platform.OS === "web" ? (
                    <WebPhotoPicker onPicked={setPhoto} />
                  ) : (
                    <Text className="font-gothic-400 text-[10px] text-muted-light">写真の設定はブラウザ版でご利用ください</Text>
                  )}
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
