import { useMemo, useState } from "react";
import { Image, ImageBackground, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SavedTrip, MAX_TRIP_PHOTOS } from "@/lib/trips";
import { PlanEntry } from "@/lib/types";
import { dateForDay, formatJstTime } from "@/lib/date";
import { MODE_LABEL } from "@/lib/modeMeta";
import { PhotoPicker } from "./PhotoPicker";
import { IllustrationPlate, illustrationUri } from "./Illustration";
import { SlideUp } from "./animations";

const PLACEHOLDER = "rgba(111, 98, 90, 0.5)"; // muted の薄い版（入力済みと見間違えない濃さ）

/** "2023-09-01" → "2023.09.01" */
function dot(dateStr: string): string {
  return dateStr.split("-").join(".");
}

/** 旅の期間表記（開始 〜 終了）。 */
function dateRange(trip: SavedTrip): string {
  const start = dot(trip.tripDate);
  if (trip.tripDayCount <= 1) return start;
  const end = dateForDay(trip.tripDate, trip.tripDayCount);
  return `${start} 〜 ${dot(end)}`;
}

function entryTime(e: PlanEntry): number {
  const t = e.departAt ?? e.arriveBy;
  return t ? new Date(t).getTime() : Number.MAX_SAFE_INTEGER;
}

/**
 * しおりの表紙画像。優先順位は「自分で設定した写真 > 地域から自動取得した風景 > 既定イラスト」。
 * 自動表紙は Unsplash 由来で、規約により撮影者クレジットの表示が必要。
 */
function coverOf(trip: SavedTrip): { uri: string; isPhoto: boolean; credit?: string } {
  if (trip.coverPhoto) return { uri: trip.coverPhoto, isPhoto: true };
  if (trip.autoCover) return { uri: trip.autoCover.url, isPhoto: true, credit: `Photo: ${trip.autoCover.credit} / Unsplash` };
  return { uri: illustrationUri("cover-default"), isPhoto: false };
}

/** 1枚のしおりカード（表紙写真＋タイトル＋期間）。 */
function ShioriCard({ trip, onPress, active }: { trip: SavedTrip; onPress: () => void; active?: boolean }) {
  // 上部に墨のグラデを重ねて白文字を可読にする。
  const cover = coverOf(trip);
  // 墨の半透明を上から下へ段階的に薄くして擬似グラデにする（追加ライブラリなし）。
  const Header = (
    <View>
      <View className="absolute inset-x-0 top-0 h-[34px] bg-ink/55" />
      <View className="absolute inset-x-0 top-[34px] h-[14px] bg-ink/30" />
      <View className="absolute inset-x-0 top-[48px] h-[10px] bg-ink/12" />
      <View className="px-2.5 pb-4 pt-2.5">
        <Text numberOfLines={1} className="font-mincho-600 text-[14px] text-white">
          {trip.name}
        </Text>
        <View className="mt-1 h-px w-full bg-white/40" />
        <Text className="mt-1 font-gothic-400 text-[11px] text-white/90">{dateRange(trip)}</Text>
      </View>
    </View>
  );
  return (
    <Pressable onPress={onPress} className="mb-3 w-[48%] overflow-hidden rounded-[14px] border border-black/[.08] bg-surface" style={{ aspectRatio: 0.82 }}>
      {/* いま開いている旅が一覧の中で分かるようにする */}
      {active && (
        <View className="absolute bottom-2 left-2 z-10 rounded-full bg-highlight/90 px-2 py-[3px]">
          <Text className="font-gothic-700 text-[10px] text-ink">編集中</Text>
        </View>
      )}
      <ImageBackground
        source={{ uri: cover.uri }}
        resizeMode="cover"
        // 既定イラストは下側（人物）を見せたいので bottom 寄せ
        imageStyle={cover.isPhoto ? undefined : { resizeMode: "cover", top: undefined, bottom: 0 }}
        style={{ flex: 1, justifyContent: "flex-start" }}
      >
        {Header}
      </ImageBackground>
    </Pressable>
  );
}

/** 旅のしおり一覧（写真つきカードのグリッド）。 */
export function ShioriScreen({
  trips,
  activeTripId,
  canCreate,
  onCreate,
  onNavigatePlan,
  onBack,
  onOpen,
  onDelete,
  onSetCover,
  onAddPhotos,
  onRemovePhoto,
}: {
  trips: SavedTrip[];
  /** いま開いている旅（一覧の中で「編集中」と分かるようにする） */
  activeTripId: string | null;
  canCreate: boolean;
  onCreate: (name: string, coverPhoto?: string) => void;
  /** 行き先を決めにいく導線（旅タブへ移動） */
  onNavigatePlan: () => void;
  /** 下タブから外したので、マイページへ戻る導線を置く */
  onBack: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onSetCover: (id: string, coverPhoto?: string) => void;
  onAddPhotos: (id: string, photos: string[]) => void;
  onRemovePhoto: (id: string, index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = detailId ? trips.find((t) => t.id === detailId) ?? null : null;

  return (
    <View className="flex-1 bg-kinari" style={{ paddingTop: insets.top }}>
      <View className="px-[26px] pb-3 pt-4">
        <Pressable onPress={onBack} hitSlop={8} accessibilityRole="button" accessibilityLabel="マイページへ戻る" className="self-start">
          <Text className="font-gothic-400 text-[12px] text-muted">‹ マイページ</Text>
        </Pressable>
        <Text className="mt-1 font-mincho-600 text-[26px] text-ink">旅のしおり</Text>
      </View>
      <View className="h-px w-full bg-black/[.08]" />

      <ScrollView className="flex-1 px-[26px]" contentContainerStyle={{ paddingTop: 16, paddingBottom: 110 }}>
        {trips.length === 0 ? (
          <View className="mt-14 items-center">
            <IllustrationPlate name="empty-suitcase" size="lg" alt="" />
            <Text className="mt-3 font-mincho-600 text-[16px] text-ink">まだしおりがありません</Text>
            <Text className="mt-1.5 text-center font-gothic-400 text-[12px] leading-[20px] text-muted">
              しおりは、作った旅がそのまま並びます。{"\n"}まず「旅」タブで行き先を決めましょう。
            </Text>
            {canCreate ? (
              <Pressable onPress={() => setCreateOpen(true)} className="mt-5 rounded-[12px] bg-ink px-6 py-3">
                <Text className="font-gothic-500 text-[12px] text-kinari">今の計画をしおりに登録する</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onNavigatePlan} className="mt-5 rounded-[12px] bg-ink px-6 py-3">
                <Text className="font-gothic-500 text-[12px] text-kinari">計画を立てにいく</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {trips.map((t) => (
              <ShioriCard key={t.id} trip={t} active={t.id === activeTripId} onPress={() => setDetailId(t.id)} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* ＋ 今の旅に表紙と名前を付ける（行き先が無ければ旅タブへ誘導） */}
      <Pressable
        onPress={() => (canCreate ? setCreateOpen(true) : onNavigatePlan())}
        accessibilityRole="button"
        accessibilityLabel="今の計画をしおりに登録"
        className="absolute right-6 h-14 w-14 items-center justify-center rounded-full bg-ink shadow"
        style={{ bottom: insets.bottom + 20 }}
      >
        <View className="relative h-[16px] w-[16px]">
          <View className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-kinari" />
          <View className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-kinari" />
        </View>
      </Pressable>

      {createOpen && (
        <CreateShioriSheet
          canCreate={canCreate}
          onClose={() => setCreateOpen(false)}
          onCreate={(name, cover) => {
            onCreate(name, cover);
            setCreateOpen(false);
          }}
        />
      )}

      {detail && (
        <ShioriDetail
          trip={detail}
          onClose={() => setDetailId(null)}
          onOpen={() => {
            onOpen(detail.id);
            setDetailId(null);
          }}
          onDelete={() => {
            onDelete(detail.id);
            setDetailId(null);
          }}
          onSetCover={(photo) => onSetCover(detail.id, photo)}
          onAddPhotos={(photos) => onAddPhotos(detail.id, photos)}
          onRemovePhoto={(index) => onRemovePhoto(detail.id, index)}
        />
      )}
    </View>
  );
}

/** しおりを新規作成する（名前＋表紙写真、今の旅程から）。 */
function CreateShioriSheet({
  canCreate,
  onClose,
  onCreate,
}: {
  canCreate: boolean;
  onClose: () => void;
  onCreate: (name: string, coverPhoto?: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [cover, setCover] = useState<string | undefined>(undefined);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-[rgba(26,26,26,.28)]" onPress={onClose} />
        <SlideUp trigger="create-shiori" style={{ maxHeight: "90%" }}>
          <View className="rounded-t-sheet bg-sheet px-6 pt-3" style={{ maxHeight: "100%", paddingBottom: insets.bottom + 24 }}>
            <View className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/[.14]" />
            <View className="mb-4 flex-row items-center justify-between">
              <Pressable onPress={onClose} hitSlop={8} className="rounded-full border border-black/[.15] px-3 py-1">
                <Text className="font-gothic-400 text-[12px] text-muted">‹ 戻る</Text>
              </Pressable>
              <Text className="font-mincho-600 text-[16px] text-ink">しおりを作る</Text>
              <View className="w-[52px]" />
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingBottom: 8 }}>
              {/* 表紙プレビュー */}
              <View className="items-center gap-3">
                <View className="h-40 w-full overflow-hidden rounded-[14px] border border-black/[.1] bg-surface">
                  <ImageBackground
                    source={{ uri: cover ?? illustrationUri("cover-default") }}
                    resizeMode="cover"
                    imageStyle={cover ? undefined : { top: undefined, bottom: 0 }}
                    style={{ flex: 1, justifyContent: "flex-start" }}
                  >
                    <View className="bg-ink/45 p-3">
                      <Text numberOfLines={1} className="font-mincho-600 text-[16px] text-white">{name || "旅のタイトル"}</Text>
                    </View>
                  </ImageBackground>
                </View>
                <View className="flex-row items-center gap-2">
                  <PhotoPicker onPicked={setCover} maxSize={800} label={cover ? "写真を変更" : "表紙写真を選ぶ"} />
                  {cover && (
                    <Pressable onPress={() => setCover(undefined)} className="rounded-full border border-black/[.15] px-3 py-1.5">
                      <Text className="font-gothic-400 text-[12px] text-muted">写真を外す</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              <View className="mt-5 gap-1">
                <Text className="font-gothic-400 text-[11px] text-muted">タイトル（絵文字も使えます）</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="例: 沖縄弾丸旅行 ✈️"
                  placeholderTextColor={PLACEHOLDER}
                  className="rounded-[10px] border border-black/[.1] bg-white/60 px-3 py-2.5 font-mincho-400 text-[14px] text-ink"
                />
              </View>

              <Pressable
                disabled={!canCreate}
                onPress={() => onCreate(name, cover)}
                className={`mt-5 rounded-[12px] px-4 py-3 ${canCreate ? "bg-ink" : "bg-ink/30"}`}
              >
                <Text className="text-center font-gothic-500 text-[12px] text-kinari">
                  {canCreate ? "今の旅に表紙と名前を付ける" : "先に行き先を追加してください"}
                </Text>
              </Pressable>
              <Text className="mt-2 text-center font-gothic-400 text-[11px] text-muted-light">
                今の「行き先リスト」の内容がこのしおりに保存されます。
              </Text>
            </ScrollView>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}

/** しおりの中身（表紙＋期間＋日別の行き先＋思い出写真）。 */
function ShioriDetail({
  trip,
  onClose,
  onOpen,
  onDelete,
  onSetCover,
  onAddPhotos,
  onRemovePhoto,
}: {
  trip: SavedTrip;
  onClose: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onSetCover: (photo?: string) => void;
  onAddPhotos: (photos: string[]) => void;
  onRemovePhoto: (index: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const detailCover = coverOf(trip);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const photos = trip.photos ?? [];

  // 日別に行き先をまとめる
  const byDay = useMemo(() => {
    const map = new Map<number, PlanEntry[]>();
    for (const e of trip.entries) {
      const d = e.day && e.day > 0 ? e.day : 1;
      const arr = map.get(d) ?? [];
      arr.push(e);
      map.set(d, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => entryTime(a) - entryTime(b));
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [trip.entries]);

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-[rgba(26,26,26,.4)]" onPress={onClose} />
        <SlideUp trigger={trip.id} style={{ maxHeight: "90%" }}>
          <View className="rounded-t-sheet bg-sheet" style={{ maxHeight: "100%", paddingBottom: insets.bottom + 20 }}>
            {/* 表紙 */}
            <View className="h-44 overflow-hidden rounded-t-sheet">
              {/* 戻るボタン */}
              <Pressable
                onPress={onClose}
                hitSlop={8}
                className="absolute left-3 top-3 z-10 flex-row items-center rounded-full bg-black/45 px-3 py-1.5"
              >
                <Text className="font-gothic-500 text-[12px] text-white">‹ 戻る</Text>
              </Pressable>
              <ImageBackground
                source={{ uri: detailCover.uri }}
                resizeMode="cover"
                imageStyle={detailCover.isPhoto ? undefined : { top: undefined, bottom: 0 }}
                style={{ flex: 1, justifyContent: "flex-end" }}
              >
                <View className="bg-ink/45 p-4">
                  <Text className="font-mincho-700 text-[22px] text-white">{trip.name}</Text>
                  <Text className="mt-1 font-gothic-400 text-[12px] text-white/90">{dateRange(trip)}</Text>
                  {detailCover.credit && (
                    <Text className="mt-1 font-gothic-400 text-[10px] text-white/70">{detailCover.credit}</Text>
                  )}
                </View>
              </ImageBackground>
            </View>

            <ScrollView className="px-6" style={{ flexShrink: 1 }} contentContainerStyle={{ paddingTop: 14, paddingBottom: 14 }}>
              {byDay.map(([day, list]) => (
                <View key={day} className="mb-4">
                  {trip.tripDayCount > 1 && (
                    <Text className="mb-1.5 font-gothic-500 text-[12px] text-ink">{day}日目</Text>
                  )}
                  <View className="gap-2">
                    {list.map((e) => (
                      <View key={e.id} className="flex-row gap-3">
                        <Text className="w-[42px] font-mincho-600 text-[13px] text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                          {e.arriveBy ? formatJstTime(new Date(e.arriveBy)) : e.departAt ? formatJstTime(new Date(e.departAt)) : "—"}
                        </Text>
                        <View className="flex-1">
                          <Text className="font-mincho-600 text-[14px] text-ink">{e.title}</Text>
                          <Text className="font-gothic-400 text-[11px] text-muted-light">
                            {MODE_LABEL[e.mode]}
                            {e.place ? ` · ${e.place}` : ""}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              {trip.entries.length === 0 && (
                <Text className="py-6 text-center font-gothic-400 text-[12px] text-muted">行き先がありません。</Text>
              )}

              {/* 思い出写真（最大30枚） */}
              <View className="mt-2 border-t border-black/[.08] pt-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-gothic-500 text-[12px] text-ink">
                    旅の思い出 <Text className="font-gothic-400 text-[11px] text-muted">{photos.length}/{MAX_TRIP_PHOTOS}</Text>
                  </Text>
                  {photos.length < MAX_TRIP_PHOTOS && (
                    <PhotoPicker onPickedMany={onAddPhotos} multiple maxSize={1000} label="＋ 写真を追加" />
                  )}
                </View>
                {photos.length === 0 ? (
                  <Text className="mt-2 font-gothic-400 text-[11px] text-muted-light">
                    旅の写真を追加して、思い出のしおりにできます（最大{MAX_TRIP_PHOTOS}枚）。
                  </Text>
                ) : (
                  <View className="mt-2 flex-row flex-wrap gap-2">
                    {photos.map((p, i) => (
                      <View key={`${i}-${p.slice(0, 16)}`} className="overflow-hidden rounded-[10px]">
                        <Image source={{ uri: p }} style={{ width: 88, height: 88 }} resizeMode="cover" />
                        <Pressable
                          onPress={() => onRemovePhoto(i)}
                          hitSlop={6}
                          accessibilityRole="button"
                          accessibilityLabel={`写真${i + 1}を削除`}
                          className="absolute right-1 top-1 h-5 w-5 items-center justify-center rounded-full bg-black/55"
                        >
                          <Text className="text-[12px] text-white">×</Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* 操作 */}
            {confirmOpen && (
              <Text className="px-6 pb-1 text-center font-gothic-400 text-[11px] leading-[17px] text-ink">
                今の「行き先リスト」はこのしおりの内容に置き換わります。先に計画を保存していなければ戻せません。
              </Text>
            )}
            <View className="flex-row items-center gap-2 px-6 pt-2">
              {confirmOpen ? (
                <Pressable onPress={onOpen} className="flex-1 rounded-[12px] bg-ink py-3">
                  <Text className="text-center font-gothic-500 text-[12px] text-kinari">今の計画を置き換えて開く</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setConfirmOpen(true)} className="flex-1 rounded-[12px] bg-ink py-3">
                  <Text className="text-center font-gothic-500 text-[12px] text-kinari">このしおりを開いて編集</Text>
                </Pressable>
              )}
              <PhotoPicker onPicked={onSetCover} maxSize={800} label="表紙" />
              {confirmDelete ? (
                <Pressable onPress={onDelete} className="rounded-[12px] border border-ink px-3 py-3">
                  <Text className="font-gothic-500 text-[12px] text-ink">削除する</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setConfirmDelete(true)} className="rounded-[12px] border border-black/[.15] px-3 py-3">
                  <Text className="font-gothic-400 text-[12px] text-muted">削除</Text>
                </Pressable>
              )}
            </View>
          </View>
        </SlideUp>
      </View>
    </Modal>
  );
}
