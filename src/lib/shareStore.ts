import { randomBytes } from "crypto";

/**
 * 共有リンクの短縮に使う保存先（サーバー専用）。
 *
 * 旅程そのものをURLに埋め込むと、実データで1,000〜1,700文字になり
 * LINE・SMS・QRで扱いづらい。ここに本体を預けて短いIDだけをURLに載せる。
 *
 * Upstash Redis の REST API（Vercel KV も同じ形式）を使う。
 * 環境変数が未設定なら「保存先なし」として扱い、呼び出し側は
 * 従来どおりURL埋め込み方式へフォールバックする（アプリは動き続ける）。
 */

/** 共有リンクの保持期間（90日）。旅行の共有には十分で、KVも無限に育たない。 */
const TTL_SECONDS = 90 * 24 * 60 * 60;

/** 預かるペイロードの上限（圧縮済み文字列）。異常なサイズを弾く。 */
const MAX_PAYLOAD_CHARS = 200_000;

const KEY_PREFIX = "share:";

function restUrl(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || undefined;
}

function restToken(): string | undefined {
  return process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || undefined;
}

/** 短縮リンクの保存先が設定されているか。 */
export function hasShareStore(): boolean {
  return Boolean(restUrl() && restToken());
}

/** Redis コマンドを REST 経由で実行する。失敗時は null。 */
async function command(args: (string | number)[]): Promise<unknown> {
  const url = restUrl();
  const token = restToken();
  if (!url || !token) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url.replace(/\/$/, ""), {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: unknown; error?: string };
    if (data.error) return null;
    return data.result ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * 推測されにくい短いID（既定10文字・約8.4×10^17通り）。
 * 62で割り切れない値は捨てて偏りを無くす（rejection sampling）。
 */
export function randomShareId(length = 10): string {
  let out = "";
  while (out.length < length) {
    for (const b of randomBytes(length * 2)) {
      if (b >= 248) continue; // 248 = 62*4。これ以上は偏るので捨てる
      out += ALPHABET[b % 62];
      if (out.length === length) break;
    }
  }
  return out;
}

/** IDとして妥当な形か（KVへ投げる前の入力検証）。 */
export function isValidShareId(id: string): boolean {
  return /^[0-9A-Za-z]{6,32}$/.test(id);
}

/**
 * プラン（圧縮済み文字列）を預けて短いIDを返す。
 * 保存先が無い・失敗した場合は null（呼び出し側はURL埋め込みへフォールバック）。
 */
export async function putSharedPlan(payload: string): Promise<string | null> {
  if (!hasShareStore()) return null;
  if (!payload || payload.length > MAX_PAYLOAD_CHARS) return null;
  const id = randomShareId();
  const result = await command(["SET", `${KEY_PREFIX}${id}`, payload, "EX", TTL_SECONDS, "NX"]);
  // NX なので既存キーと衝突すると null が返る。その時は発行しない（呼び出し側がフォールバック）。
  return result === "OK" ? id : null;
}

/** IDからプラン（圧縮済み文字列）を取り出す。無ければ null。 */
export async function getSharedPlan(id: string): Promise<string | null> {
  if (!hasShareStore() || !isValidShareId(id)) return null;
  const result = await command(["GET", `${KEY_PREFIX}${id}`]);
  return typeof result === "string" ? result : null;
}
