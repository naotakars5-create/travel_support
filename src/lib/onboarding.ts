import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 初回起動時のオンボーディング（3枚のカード）を見終えたかどうか。
 * 端末ごとに保存するだけなので、失敗しても「毎回出る」以上の害は無い。
 */
const ONBOARDING_KEY = "tabinavi.onboarded.v1";

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(ONBOARDING_KEY)) === "1";
  } catch {
    // 読めない環境（プライベートモード等）では出しっぱなしにせず、通常利用を優先する
    return true;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
  } catch {
    // 保存できなくても操作は続けられる
  }
}
