import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { copyToClipboard, nativeShare } from "@/lib/share";
import { SlideUp } from "./animations";
import { Button } from "./ui";

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
}: {
  /** 発行できた共有リンク。作成中は null */
  url: string | null;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [notice, setNotice] = useState<string | null>(null);

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
                  <ActivityIndicator size="small" color="#6E675C" />
                  <Text className="font-gothic-400 text-[13px] text-muted">共有リンクを作っています…</Text>
                </View>
              ) : (
                <>
                  <Text className="font-gothic-400 text-[12px] leading-[19px] text-muted">
                    このリンクを知っている人は、旅程を見られます（編集はできません）。90日で自動的に開けなくなります。
                  </Text>

                  {/* リンクは必ず文字でも見せる。コピーの仕組みが使えない環境でも手で選べるように */}
                  <View className="mt-3 rounded-[10px] border border-black/[.12] bg-white/70 px-3 py-2.5">
                    <Text selectable className="font-gothic-400 text-[12px] leading-[19px] text-ink">
                      {url}
                    </Text>
                  </View>

                  <View className="mt-4 gap-2.5">
                    <Button label="送る（LINE・メールなど）" size="lg" onPress={() => void send()} />
                    <Button label="リンクをコピー" tone="secondary" onPress={() => void copy()} />
                  </View>

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
