import { buildShareUrl, copyToClipboard, decodePlan, encodePlan, nativeShare } from "../share";
import { PlanEntry, ScheduleSlot } from "../types";

const ENTRIES: PlanEntry[] = [
  {
    id: "e1",
    title: "中之島美術館",
    mode: "activity",
    priority: "must",
    source: "手入力",
    place: "大阪府大阪市北区中之島4-3-1",
    placeGeo: { lat: 34.69123456, lng: 135.49198765 },
    stayMin: 90,
    arriveBy: "2026-07-25T01:30:00.000Z",
    fixedTime: true,
    cost: 1200,
    detail: "予約番号 ABC-123",
    day: 2,
    openFrom: "09:30",
    openTo: "17:00",
    closedDays: [1],
  },
  { id: "e2", title: "ホテルグランヴィア大阪", mode: "stay", priority: "must", source: "手入力", arriveBy: "2026-07-25T09:00:00.000Z", checkOut: "2026-07-26T01:00:00.000Z" },
];

const SLOTS: ScheduleSlot[] = [{ entryId: "e1", arriveAt: "2026-07-25T01:30:00.000Z", stayMin: 90 }];

describe("share: 圧縮表現の往復", () => {
  it("encode → decode で内容が保たれる（座標は丸め誤差内）", async () => {
    const encoded = await encodePlan(ENTRIES, SLOTS);
    expect(encoded).toMatch(/^[12]\./); // 新形式のプレフィックス
    const decoded = await decodePlan(encoded);
    expect(decoded).not.toBeNull();
    const e1 = decoded!.entries.find((e) => e.id === "e1")!;
    expect(e1.title).toBe("中之島美術館");
    expect(e1.priority).toBe("must");
    expect(e1.fixedTime).toBe(true);
    expect(e1.closedDays).toEqual([1]);
    expect(e1.day).toBe(2);
    expect(e1.detail).toBe("予約番号 ABC-123");
    expect(e1.placeGeo!.lat).toBeCloseTo(34.69123, 4);
    expect(e1.source).toBe("共有");
    const e2 = decoded!.entries.find((e) => e.id === "e2")!;
    expect(e2.mode).toBe("stay");
    expect(e2.checkOut).toBe("2026-07-26T01:00:00.000Z");
    expect(decoded!.slots).toEqual(SLOTS);
  });

  it("旧形式（プレフィックス無しのフルJSON）も読める", async () => {
    const legacyJson = JSON.stringify({ entries: ENTRIES, slots: SLOTS });
    const legacy = Buffer.from(legacyJson, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const decoded = await decodePlan(legacy);
    expect(decoded).not.toBeNull();
    expect(decoded!.entries[0].title).toBe("中之島美術館");
  });

  it("壊れた文字列は null", async () => {
    expect(await decodePlan("2.@@@@")).toBeNull();
    expect(await decodePlan("not-base64!!")).toBeNull();
  });

  it("18件の旅程でもURLに収まる長さになる", async () => {
    const many = Array.from({ length: 18 }, (_, i) => ({
      ...ENTRIES[0],
      id: `entry-8f14e45f-ceea-167a-5a36-dedd4bea2543-${i}`,
    }));
    const slots = many.map((e) => ({ entryId: e.id, arriveAt: "2026-07-25T01:30:00.000Z", stayMin: 90 }));
    const encoded = await encodePlan(many, slots);
    // 旧形式では約12,000文字だった。LINE・QRで扱える範囲に収まること。
    expect(encoded.length).toBeLessThan(4000);
    const decoded = await decodePlan(encoded);
    expect(decoded!.entries).toHaveLength(18);
  });
});

describe("share: 短縮リンク", () => {
  const origFetch = global.fetch;
  afterEach(() => {
    global.fetch = origFetch;
  });

  it("サーバーがIDを返せば短いURLになる", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "a7Bx9K2mQd" }),
    }) as unknown as typeof fetch;
    const url = await buildShareUrl(ENTRIES, SLOTS);
    expect(url).toContain("?s=a7Bx9K2mQd");
    expect(url.length).toBeLessThan(80);
  });

  it("保存先が無い（503）ときは従来のURL埋め込みへ戻る", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }) as unknown as typeof fetch;
    const url = await buildShareUrl(ENTRIES, SLOTS);
    expect(url).toContain("?p=");
    const encoded = url.split("?p=")[1];
    expect(await decodePlan(encoded)).not.toBeNull();
  });

  it("通信そのものが失敗しても共有URLは作れる", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    const url = await buildShareUrl(ENTRIES, SLOTS);
    expect(url).toContain("?p=");
  });
});

describe("copyToClipboard", () => {
  const original = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", { value: original, configurable: true, writable: true });
  });

  const setNavigator = (value: unknown) => {
    Object.defineProperty(globalThis, "navigator", { value, configurable: true, writable: true });
  };

  it("クリップボードAPIが使えればコピーする", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    setNavigator({ clipboard: { writeText } });
    await expect(copyToClipboard("https://example.com/?s=abc")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.com/?s=abc");
  });

  it("拒否されても落ちない（手でコピーしてもらう）", async () => {
    setNavigator({ clipboard: { writeText: jest.fn().mockRejectedValue(new Error("denied")) } });
    await expect(copyToClipboard("x")).resolves.toBe(false);
  });

  it("クリップボードが無い環境では false", async () => {
    setNavigator({});
    await expect(copyToClipboard("x")).resolves.toBe(false);
  });
});

describe("nativeShare", () => {
  const original = globalThis.navigator;
  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", { value: original, configurable: true, writable: true });
  });
  const setNavigator = (value: unknown) => {
    Object.defineProperty(globalThis, "navigator", { value, configurable: true, writable: true });
  };

  it("共有機能が無ければ unsupported（呼び出し側はコピーへ切り替える）", async () => {
    setNavigator({});
    await expect(nativeShare("https://example.com")).resolves.toBe("unsupported");
  });

  it("ユーザーが閉じただけなら cancelled（失敗表示は出さない）", async () => {
    const err = new Error("abort");
    err.name = "AbortError";
    setNavigator({ share: jest.fn().mockRejectedValue(err) });
    await expect(nativeShare("https://example.com")).resolves.toBe("cancelled");
  });

  it("共有できたら shared", async () => {
    setNavigator({ share: jest.fn().mockResolvedValue(undefined) });
    await expect(nativeShare("https://example.com")).resolves.toBe("shared");
  });
});
