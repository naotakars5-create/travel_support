import AsyncStorage from "@react-native-async-storage/async-storage";

/** 端末ローカルのユーザープロフィール（名前・アイコン）。認証なしの簡易登録。 */
export interface Profile {
  name: string;
  /** アイコン（絵文字1つ） */
  avatar: string;
}

const PROFILE_KEY = "tabinavi.profile.v1";

/** アイコン候補（絵文字）。 */
export const AVATAR_CHOICES = ["🧳", "🗺️", "✈️", "🚄", "🏔️", "🌊", "🍜", "📷", "🐤", "🐱", "🌸", "⛩️"];

export const DEFAULT_PROFILE: Profile = { name: "", avatar: "🧳" };

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.name !== "string" || typeof parsed?.avatar !== "string") return null;
    return parsed as Profile;
  } catch {
    return null;
  }
}

export async function saveProfile(profile: Profile): Promise<void> {
  try {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // 無視
  }
}
