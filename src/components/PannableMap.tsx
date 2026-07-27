import { useEffect, useMemo, useState } from "react";
import { Animated, Image, LayoutChangeEvent, PanResponder, Pressable, Text, View } from "react-native";
import { GeoPoint } from "@/lib/types";
import { areaMapImageUrl } from "@/lib/routeMap";
import { MAX_ZOOM, MIN_ZOOM, panCenter } from "@/lib/mercator";

/** Static Maps が1枚で返せる最大の論理サイズ（scale=2 で実解像度はこの2倍）。 */
const MAX_IMAGE_SIDE = 640;
/** 指でずらした時に端が透けないよう、画面より一回り大きく描く倍率。 */
const OVERSCAN = 1.6;

export interface MapMarker {
  p: GeoPoint;
  label?: string;
}

/**
 * 指でずらせる地図。
 *
 * Google の地図をアプリ内でそのまま動かすには、ブラウザから見えるAPIキーが要る。
 * それはサーバー専用のキーを露出させることになるため、ここでは静止画（Static Maps）を
 * 使い、ドラッグ量をメルカトル計算で緯度経度に直して中心を動かしている。
 * 指を離した時点で新しい画像を読み直すので、キーを出さずに「動かせる地図」になる。
 */
export function PannableMap({
  center,
  zoom,
  markers,
  me,
  onCenterChange,
  onZoomChange,
  children,
}: {
  center: GeoPoint;
  zoom: number;
  markers: MapMarker[];
  me?: GeoPoint | null;
  onCenterChange: (next: GeoPoint) => void;
  onZoomChange: (next: number) => void;
  /** 地図の上に重ねるもの（候補カードの一覧など） */
  children?: React.ReactNode;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  // ドラッグ中の見た目のずれ。描画のたびに作り直さないよう遅延初期化で1つだけ持つ
  const [pan] = useState(() => new Animated.ValueXY({ x: 0, y: 0 }));

  const side = Math.max(size.width, size.height) * OVERSCAN;
  const hasSize = side > 0;
  // 取得する画像の一辺。画面より大きい場合は上限で頭打ちにし、その分は引き伸ばす。
  const requested = Math.max(100, Math.min(MAX_IMAGE_SIDE, Math.round(side) || MAX_IMAGE_SIDE));
  // 画面1pxが地図の何pxにあたるか（引き伸ばした分だけドラッグ量を割り戻す）
  const renderScale = side > 0 ? side / requested : 1;

  // マーカーは毎回新しい配列で渡ってくるので、中身から安定したキーを作って比較する
  const markerKey = markers
    .map(({ p, label }) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)},${label ?? ""}`)
    .join(";");

  const uri = useMemo(
    () => (hasSize ? areaMapImageUrl(center, zoom, markers, me, requested, requested) : null),
    // 座標や markerKey の「値」で比較する（配列・オブジェクトの参照は毎回変わってしまう）
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [center.lat, center.lng, zoom, markerKey, me?.lat, me?.lng, requested, hasSize]
  );

  /* eslint-disable react-hooks/set-state-in-effect -- 新しい画像に切り替わったら失敗状態を解く */
  useEffect(() => {
    setFailed(false);
  }, [uri]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // 毎回作り直す（今の中心・ズーム・拡大率をそのまま閉じ込められるので、
  // ref で最新値を持ち回る必要がない）。ドラッグ中は再描画されないため負荷にもならない。
  const responder = PanResponder.create({
    // 少し動いてから地図の移動と見なす（重ねたカードのタップを邪魔しない）
    onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
    onPanResponderMove: (_e, g) => {
      pan.setValue({ x: g.dx, y: g.dy });
    },
    onPanResponderRelease: (_e, g) => {
      pan.setValue({ x: 0, y: 0 });
      if (Math.abs(g.dx) < 2 && Math.abs(g.dy) < 2) return;
      onCenterChange(panCenter(center, zoom, g.dx / renderScale, g.dy / renderScale));
    },
    onPanResponderTerminate: () => {
      pan.setValue({ x: 0, y: 0 });
    },
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1 ? prev : { width, height }
    );
  };

  return (
    <View className="flex-1 overflow-hidden bg-surface" onLayout={onLayout}>
      <View style={{ flex: 1 }} {...responder.panHandlers}>
        {hasSize && (
          <Animated.View
            style={{
              position: "absolute",
              left: (size.width - side) / 2,
              top: (size.height - side) / 2,
              width: side,
              height: side,
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
            }}
          >
            {/* 読み込み中は前の画像を下に残す（真っ白にしない） */}
            {loadedUri && loadedUri !== uri && (
              <Image source={{ uri: loadedUri }} resizeMode="cover" style={{ width: side, height: side }} />
            )}
            {uri && !failed && (
              <Image
                source={{ uri }}
                onLoad={() => setLoadedUri(uri)}
                onError={() => setFailed(true)}
                resizeMode="cover"
                style={{ position: "absolute", left: 0, top: 0, width: side, height: side }}
              />
            )}
          </Animated.View>
        )}

        {/* 中心の印。どこを基準に探しているかが分かるようにする */}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className="h-5 w-5 items-center justify-center rounded-full border-2 border-accent bg-accent/25">
            <View className="h-1.5 w-1.5 rounded-full bg-accent" />
          </View>
        </View>

        {failed && (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center px-8">
            <Text className="text-center font-gothic-400 text-[12px] leading-[19px] text-muted">
              地図を読み込めませんでした。{"\n"}通信状況を確かめて、もう一度お試しください。
            </Text>
          </View>
        )}
      </View>

      {/* ズーム（地図の上に重ねる） */}
      <View className="absolute right-3 top-3 overflow-hidden rounded-[12px] border border-ink/15 bg-kinari/95">
        <Pressable
          disabled={zoom >= MAX_ZOOM}
          onPress={() => onZoomChange(zoom + 1)}
          accessibilityRole="button"
          accessibilityLabel="地図を拡大"
          className={`h-9 w-9 items-center justify-center ${zoom >= MAX_ZOOM ? "opacity-30" : ""}`}
        >
          <Text className="font-gothic-500 text-[17px] text-ink">＋</Text>
        </Pressable>
        <View className="h-px w-full bg-ink/10" />
        <Pressable
          disabled={zoom <= MIN_ZOOM}
          onPress={() => onZoomChange(zoom - 1)}
          accessibilityRole="button"
          accessibilityLabel="地図を縮小"
          className={`h-9 w-9 items-center justify-center ${zoom <= MIN_ZOOM ? "opacity-30" : ""}`}
        >
          <Text className="font-gothic-500 text-[17px] text-ink">−</Text>
        </Pressable>
      </View>

      {children}
    </View>
  );
}
