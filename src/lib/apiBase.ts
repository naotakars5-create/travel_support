import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * API呼び出しの起点URLを解決する。
 * React Native にはWebのような「相対URL」の概念が無いため、
 * Expo Go / dev client 実行時は Metro dev server のホストから絶対URLを組み立てる。
 * EXPO_PUBLIC_API_BASE_URL が設定されていればそれを優先する（本番ビルド向け）。
 */
export function getApiBaseUrl(): string {
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBase) return envBase.replace(/\/$/, "");

  if (Platform.OS === "web") return "";

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.hostUri;
  if (hostUri) return `http://${hostUri}`;

  return "";
}

export function apiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}
