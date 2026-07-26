/**
 * APIルートの簡易ガード。
 * - Origin 検査: ブラウザからのクロスオリジン呼び出しを拒否する
 *   （同一オリジンの自アプリと、Origin ヘッダを送らないネイティブアプリは通す）。
 * - レート制限: IPごとの固定ウィンドウ制限。LLM・Google Maps の課金APIを
 *   無制限に叩かれるのを防ぐ最低限の壁。
 * サーバーレスでは複数インスタンスに分かれるため厳密ではないが、無防備よりはるかに良い。
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 5000;

function clientKey(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * このサーバーが「自分のホスト名」として認めるものを集める。
 *
 * request.url はプロキシの内側では内部アドレス（localhost:8081 等）になり、
 * 公開ホスト名と一致しない。それだけで判定すると、同一オリジンからの
 * 正当なリクエスト（fetch の POST は同一オリジンでも Origin を送る）まで
 * 403 で弾いてしまうため、転送ヘッダも候補に含める。
 */
function selfHosts(request: Request): string[] {
  const hosts: string[] = [];
  const push = (v: string | null | undefined) => {
    if (!v) return;
    for (const one of v.split(",")) {
      const h = one.trim().toLowerCase();
      if (h) hosts.push(h);
    }
  };
  push(request.headers.get("x-forwarded-host"));
  push(request.headers.get("host"));
  try {
    hosts.push(new URL(request.url).host.toLowerCase());
  } catch {
    // request.url が解釈できない環境でもヘッダ側で判定できる
  }
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (envBase) {
    try {
      hosts.push(new URL(envBase).host.toLowerCase());
    } catch {
      // 設定ミスは無視（他の候補で判定する）
    }
  }
  return hosts;
}

/** ブラウザ由来（Origin あり）のリクエストは、自分のホストからのみ許可する。 */
function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // ネイティブアプリ・画像読み込み等。レート制限側で守る
  try {
    const originHost = new URL(origin).host.toLowerCase();
    // ローカル開発（Expo dev server はポートが異なる）
    if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(originHost)) return true;
    return selfHosts(request).includes(originHost);
  } catch {
    return false;
  }
}

/**
 * ガードを実行し、拒否する場合はレスポンスを返す（通す場合は null）。
 * @param limitPerMinute このルートの1分あたり許容回数（IPごと）
 */
export function guardRequest(request: Request, limitPerMinute: number): Response | null {
  if (!originAllowed(request)) {
    return Response.json({ error: "許可されていないオリジンからのリクエストです" }, { status: 403 });
  }

  const now = Date.now();
  const key = `${clientKey(request)}:${new URL(request.url).pathname}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    // 古いバケツが溜まりすぎたら一掃（メモリを無限に食わない）
    if (buckets.size >= MAX_BUCKETS) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
      if (buckets.size >= MAX_BUCKETS) buckets.clear();
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return null;
  }
  bucket.count += 1;
  if (bucket.count > limitPerMinute) {
    return Response.json(
      { error: "リクエストが多すぎます。しばらく待ってからお試しください" },
      { status: 429, headers: { "retry-after": String(Math.ceil((bucket.resetAt - now) / 1000)) } }
    );
  }
  return null;
}

/**
 * サイズ上限付きの単純なLRUキャッシュ（Map の挿入順を利用）。
 * サーバーレスインスタンスが生き続けてもメモリが無限に育たないようにする。
 */
export class LruCache<V> {
  private map = new Map<string, V>();
  constructor(private maxSize: number) {}

  get(key: string): V | undefined {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key)!;
    // 触れたものを末尾（最新）へ
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  has(key: string): boolean {
    return this.map.has(key);
  }

  set(key: string, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    while (this.map.size > this.maxSize) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  get size(): number {
    return this.map.size;
  }
}
