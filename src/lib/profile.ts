import AsyncStorage from "@react-native-async-storage/async-storage";

/** 端末ローカルのユーザープロフィール（名前・アイコン）。認証なしの簡易登録。 */
export interface Profile {
  name: string;
  /** アイコンのイラスト名（"avatar-01" | "avatar-02"）。 */
  avatar: string;
  /** 自分で設定した写真（data URL）。あればイラストより優先して表示する。 */
  photo?: string;
}

const PROFILE_KEY = "tabinavi.profile.v1";

/** アイコン候補（イラスト名）。 */
export const AVATAR_CHOICES = ["avatar-01", "avatar-02"];

export const DEFAULT_PROFILE: Profile = { name: "", avatar: "avatar-01" };

/** 保存済みの値が旧仕様（絵文字）なら既定のイラストへ寄せる。 */
export function normalizeAvatar(value: string): string {
  return AVATAR_CHOICES.includes(value) ? value : AVATAR_CHOICES[0];
}

export async function loadProfile(): Promise<Profile | null> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.name !== "string" || typeof parsed?.avatar !== "string") return null;
    return {
      name: parsed.name,
      // 旧仕様（絵文字）で保存されていてもイラスト名へ移行する
      avatar: normalizeAvatar(parsed.avatar),
      photo: typeof parsed.photo === "string" ? parsed.photo : undefined,
    };
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
