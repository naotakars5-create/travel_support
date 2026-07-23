import "../global.css";

import { useEffect } from "react";
import { Slot } from "expo-router";
import { useFonts } from "expo-font";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";

SplashScreen.preventAutoHideAsync().catch(() => {});

// パッケージの index.js を経由すると未使用ウェイトまで全てバンドルされるため、
// 使用するファイルだけを個別 import する（フォント資産を約80MB→7ファイル分に削減）。
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ZenOldMincho_400Regular: require("@expo-google-fonts/zen-old-mincho/400Regular/ZenOldMincho_400Regular.ttf"),
    ZenOldMincho_600SemiBold: require("@expo-google-fonts/zen-old-mincho/600SemiBold/ZenOldMincho_600SemiBold.ttf"),
    ZenOldMincho_700Bold: require("@expo-google-fonts/zen-old-mincho/700Bold/ZenOldMincho_700Bold.ttf"),
    ZenOldMincho_900Black: require("@expo-google-fonts/zen-old-mincho/900Black/ZenOldMincho_900Black.ttf"),
    NotoSansJP_400Regular: require("@expo-google-fonts/noto-sans-jp/400Regular/NotoSansJP_400Regular.ttf"),
    NotoSansJP_500Medium: require("@expo-google-fonts/noto-sans-jp/500Medium/NotoSansJP_500Medium.ttf"),
    NotoSansJP_700Bold: require("@expo-google-fonts/noto-sans-jp/700Bold/NotoSansJP_700Bold.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Slot />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
