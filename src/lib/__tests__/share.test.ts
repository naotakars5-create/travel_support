import { decodePlan, encodePlan } from "../share";
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
  { id: "e2", title: "自宅", mode: "home", priority: "must", source: "手入力", departAt: "2026-07-25T00:00:00.000Z", travelMode: "rail" },
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
    expect(e2.mode).toBe("home");
    expect(e2.travelMode).toBe("rail");
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
