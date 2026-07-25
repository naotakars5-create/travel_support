import { useEffect, useState } from "react";
import { Animated, Easing } from "react-native";

/** CSS `animate-spin`相当：一定速度で回転し続けるリング */
export function Spinner({ size = 20, color = "#6E675C" }: { size?: number; color?: string }) {
  const [rotation] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [rotation]);

  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: `${color}59`,
        borderTopColor: color,
        transform: [{ rotate: spin }],
      }}
    />
  );
}

/** CSS `animate-pulse` 相当：脈打って外側へ広がり消えるリング（現在地ドットの背後に重ねる） */
export function PulseRing({ size = 13, color = "rgba(35,32,29,.5)" }: { size?: number; color?: string }) {
  const [scale] = useState(() => new Animated.Value(1));
  const [opacity] = useState(() => new Animated.Value(0.6));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, { toValue: 2.1, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 1400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => {
      loop.stop();
      scale.setValue(1);
      opacity.setValue(0.6);
    };
  }, [scale, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

/** CSS `animate-blink` 相当：一定間隔で表示/非表示を繰り返す（カウントダウンのコロン用） */
export function Blinker({ children }: { children: React.ReactNode }) {
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 1, delay: 550, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 1, delay: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return <Animated.View style={{ opacity }}>{children}</Animated.View>;
}

const ABSOLUTE_FILL = { position: "absolute" as const, top: 0, left: 0, right: 0, bottom: 0 };

/** CSS `animate-flashfade` 相当：フェードイン→保持→フェードアウトして親から消える */
export function FlashFade({
  visible,
  children,
  durationMs = 1700,
}: {
  visible: boolean;
  children: React.ReactNode;
  durationMs?: number;
}) {
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      return;
    }
    const fadeInMs = Math.round(durationMs * 0.12);
    const holdMs = Math.round(durationMs * 0.7);
    const fadeOutMs = durationMs - fadeInMs - holdMs;
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: fadeInMs, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: holdMs, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: fadeOutMs, useNativeDriver: true }),
    ]).start();
  }, [visible, durationMs, opacity]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="auto" style={{ opacity, ...ABSOLUTE_FILL }}>
      {children}
    </Animated.View>
  );
}

/** CSS `animate-sheetup` 相当：下からスライドインする半モーダル用ラッパー */
export function SlideUp({ children, trigger }: { children: React.ReactNode; trigger: unknown }) {
  const [translateY] = useState(() => new Animated.Value(40));
  const [fadeIn] = useState(() => new Animated.Value(0));

  useEffect(() => {
    translateY.setValue(40);
    fadeIn.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return <Animated.View style={{ transform: [{ translateY }], opacity: fadeIn }}>{children}</Animated.View>;
}

/** CSS `animate-nodein` 相当：新規追加ノードのフェード＋わずかな下降 */
export function useNodeInStyle(active: boolean) {
  const [translateY] = useState(() => new Animated.Value(active ? -6 : 0));
  const [opacity] = useState(() => new Animated.Value(active ? 0 : 1));

  useEffect(() => {
    if (!active) return;
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { transform: [{ translateY }], opacity };
}
