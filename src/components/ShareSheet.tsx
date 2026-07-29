import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { copyToClipboard, nativeShare } from "@/lib/share";
import { SlideUp } from "./animations";
import { Button } from "./ui";
import { COLORS } from "@/lib/palette";

/**
 * 共有シート。
 *
 * 以前は「共有」を押すとすぐ navigator.share() を呼んでいたが、
 * リンクを作るのに圧縮とサーバー問い合わせで待ちが入るため、
 * その頃には**ユーザー操作の有効期限が切れていて**ブラウザに拒否されていた。
 * （これが「共有が機能しない」の原因）
 *
 * そこで、押した瞬間にこのシートを開いてリンクを作り、
 * 「送る」「コピー」はシートの中のボタン＝新しい操作として実行する。
 * リンク自体も文字で見せるので、最悪でも手で選んでコピーできる。
 */
export function ShareSheet({
  url,
  error,
  onClose,
  onRetry,
  onShareImage,
}: {
  /** 発行できた共有リンク。作成中は null */
  url: string | null;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  /** 旅程を画像1枚にして共有する（アプリを使っていない相手向け） */
  onShareImage: () => Promise<"shared" | "cancelled" | "downloaded" | "failed">;
}) {
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  const send = async () => {
    if (!url) return;
    const res = await nativeShare(url);
    if (res === "unsupported") {
      const ok = await copyToClipboard(url);
      setNotice(ok ? "リンクをコピーしました" : "下のリンクを長押しでコピーしてください");
      return;
    }
    if (res === "failed") setNotice("送信アプリを開けませんでした。コピーしてお使いください");
    if (res === "shared") onClose();
  };

  const sendImage = async () => {
    if (imageBusy) return;
    setImageBusy(true);
    try {
      const res = await onShareImage();
      if (res === "downloaded") setNotice("画像を保存しました。写真から送ってください");
      if (res === "failed") setNotice("画像を作れませんでした");
      if (res === "shared") onClose();
    } finally {
      setImageBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    const ok = await copyToClipboard(url);
    setNotice(ok ? "リンクをコピーしました" : "コピーできませんでした。下のリンクを長押しで選んでください");
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-[rgba(28,25,21,.28)]" onPress={onClose} />
        <SlideUp trigger="share" style={{ maxHeight: "88%" }}>
          <View className="rounded-t-sheet bg-sheet px-6 pt-3" style={{ maxHeight: "100%", paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/[.14]" />
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable onPress={onClose} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[12px] text-muted">‹ 閉じる</Text>
              </Pressable>
              <Text className="font-mincho-600 text-[17px] text-ink">旅程を共有</Text>
              <View className="w-[64px]" />
            </View>

            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
              {error ? (
                <>
                  <Text className="font-gothic-400 text-[13px] leading-[21px] text-ink">{error}</Text>
                  <View className="mt-4">
                    <Button label="もう一度試す" onPress={onRetry} />
                  </View>
                </>
              ) : !url ? (
                <View className="flex-row items-center gap-3 py-6">
                  <ActivityIndicator size="small" color={COLORS.muted} />
                  <Text className="font-gothic-400 text-[13px] text-muted">共有リンクを作っています…</Text>
                </View>
              ) : (
                <>
                  {/* 相手がこのアプリを使っているかで、渡すものを変える。
                      リンクは旅程がそのまま開けて取り込めるが、使っていない人には踏まれにくい。
                      その場合は画像1枚で渡すほうが確実に読んでもらえる。 */}
                  <View className="rounded-[12px] border border-accent/[.45] bg-accent/[.08] px-4 py-3">
                    <Text className="font-gothic-700 text-[12px] text-accent">アプリを使っている人へ</Text>
                    <Text className="mt-1 font-gothic-400 text-[11px] leading-[17px] text-muted">
                      リンクを開くと、同じ旅程がそのままアプリに表示されます。「自分の旅として取り込む」を押せば、
                      まったく同じ内容を自分の旅として編集できます。
                    </Text>

                    {/* リンクは必ず文字でも見せる。コピーの仕組みが使えない環境でも手で選べるように */}
                    <View className="mt-2.5 rounded-[10px] border border-black/[.12] bg-white/70 px-3 py-2.5">
                      <Text selectable className="font-gothic-400 text-[12px] leading-[19px] text-ink">
                        {url}
                      </Text>
                    </View>

                    <View className="mt-3 gap-2">
                      <Button label="リンクを送る（LINE・メールなど）" onPress={() => void send()} />
                      <Button label="リンクをコピー" tone="secondary" onPress={() => void copy()} />
                    </View>
                  </View>

                  <View className="mt-3 rounded-[12px] border border-ink/[.15] bg-white/50 px-4 py-3">
                    <Text className="font-gothic-700 text-[12px] text-ink">アプリを使っていない人へ</Text>
                    <Text className="mt-1 font-gothic-400 text-[11px] leading-[17px] text-muted">
                      旅程を画像1枚にして送ります。アプリもリンクも不要で、そのまま読めます。
                    </Text>
                    <View className="mt-3">
                      <Button
                        label={imageBusy ? "画像を作っています…" : "旅程を画像で送る"}
                        tone="secondary"
                        loading={imageBusy}
                        onPress={() => void sendImage()}
                      />
                    </View>
                  </View>

                  <Text className="mt-3 font-gothic-400 text-[11px] leading-[17px] text-muted-light">
                    リンクを知っている人は旅程を見られます（そのままでは編集できません）。90日で自動的に開けなくなります。
                  </Text>

                  {notice && (
                    <Text className="mt-3 text-center font-gothic-500 text-[12px] text-accent">{notice}</Text>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
