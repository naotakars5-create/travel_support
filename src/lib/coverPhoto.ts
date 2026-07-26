import { apiUrl } from "./apiBase";
import { fetchWithTimeout } from "./http";

export interface CoverPhoto {
  url: string;
  credit: string;
  creditUrl: string;
}

/**
 * 地域名（例: 香川県）から、しおりの表紙にする風景写真を取得する。
 * 未設定・見つからない・通信失敗はすべて null（呼び出し側は既定のイラストを使う）。
 */
export async function fetchCoverPhoto(region: string): Promise<CoverPhoto | null> {
  try {
    const res = await fetchWithTimeout(apiUrl(`/api/cover-photo?q=${encodeURIComponent(region)}`));
    if (!res.ok) return null;
    const data = (await res.json()) as { photo?: CoverPhoto };
    return data.photo ?? null;
  } catch {
    return null;
  }
}
