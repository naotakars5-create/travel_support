/**
 * タイムアウト付き fetch。
 * モバイル回線で相手が応答しない時に、スピナーが永久に回り続けるのを防ぐ。
 * 既定8秒・LLM系は呼び出し側で長め（45秒等）を指定する。
 */
export async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    // Abort はユーザー向けに分かるメッセージへ変換する
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("通信がタイムアウトしました。電波の良い場所でもう一度お試しください");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
