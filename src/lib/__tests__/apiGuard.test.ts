import { guardRequest, LruCache } from "../apiGuard";
import { closedDaysFromPeriods } from "../googleMaps";

function req(path: string, headers: Record<string, string> = {}): Request {
  return new Request(`https://example.com${path}`, { method: "POST", headers });
}

describe("guardRequest", () => {
  it("同一オリジンとオリジン無し（ネイティブ）は通す", () => {
    expect(guardRequest(req("/api/a", { origin: "https://example.com" }), 100)).toBeNull();
    expect(guardRequest(req("/api/b"), 100)).toBeNull();
  });

  it("別オリジンのブラウザリクエストは 403", () => {
    const res = guardRequest(req("/api/c", { origin: "https://evil.example.net" }), 100);
    expect(res?.status).toBe(403);
  });

  it("localhost からの開発アクセスは通す", () => {
    expect(guardRequest(req("/api/d", { origin: "http://localhost:8081" }), 100)).toBeNull();
  });

  it("制限回数を超えると 429", () => {
    const headers = { "x-forwarded-for": "203.0.113.7" };
    for (let i = 0; i < 3; i++) {
      expect(guardRequest(req("/api/limited", headers), 3)).toBeNull();
    }
    const res = guardRequest(req("/api/limited", headers), 3);
    expect(res?.status).toBe(429);
  });

  it("IPが違えば別カウント", () => {
    for (let i = 0; i < 3; i++) guardRequest(req("/api/per-ip", { "x-forwarded-for": "203.0.113.1" }), 3);
    expect(guardRequest(req("/api/per-ip", { "x-forwarded-for": "203.0.113.2" }), 3)).toBeNull();
  });
});

describe("LruCache", () => {
  it("上限を超えると最も古いものから消える", () => {
    const c = new LruCache<number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.set("c", 3);
    expect(c.has("a")).toBe(false);
    expect(c.get("b")).toBe(2);
    expect(c.get("c")).toBe(3);
  });

  it("get で触れたものは新しい扱いになる", () => {
    const c = new LruCache<number>(2);
    c.set("a", 1);
    c.set("b", 2);
    c.get("a"); // a を最新へ
    c.set("c", 3); // b が追い出される
    expect(c.has("a")).toBe(true);
    expect(c.has("b")).toBe(false);
  });
});

describe("closedDaysFromPeriods", () => {
  it("open.day に現れない曜日が定休日", () => {
    // 火(2)〜日(0) 営業・月(1) 休み
    const periods = [0, 2, 3, 4, 5, 6].map((d) => ({ open: { day: d, time: "0930" } }));
    expect(closedDaysFromPeriods(periods)).toEqual([1]);
  });

  it("データが無ければ不明（undefined）", () => {
    expect(closedDaysFromPeriods([])).toBeUndefined();
  });

  it("24時間営業（day=0, time=0000 の1件のみ）は定休日なし", () => {
    expect(closedDaysFromPeriods([{ open: { day: 0, time: "0000" } }])).toEqual([]);
  });
});
