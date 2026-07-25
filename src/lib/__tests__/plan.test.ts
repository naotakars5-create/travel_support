import { sequentialSchedule, computePlanTotals, costCategoryOf } from "../plan";
import { PlanEntry } from "../types";

const REF = new Date("2026-07-25T09:00:00.000Z"); // 各日の起点（テストは差分で検証しTZ非依存）

function entry(over: Partial<PlanEntry> & { id: string }): PlanEntry {
  return {
    title: over.title ?? over.id,
    mode: "activity",
    priority: "want",
    source: "手入力",
    ...over,
  } as PlanEntry;
}

/** slot の arriveAt をミリ秒に。 */
function ms(iso: string): number {
  return new Date(iso).getTime();
}

describe("sequentialSchedule", () => {
  it("places the first item at the day start and stacks the rest by stay+buffer", () => {
    const entries = [
      entry({ id: "a", stayMin: 60 }),
      entry({ id: "b", stayMin: 30 }),
    ];
    const slots = sequentialSchedule(entries, REF);
    expect(slots).toHaveLength(2);
    expect(slots[0].arriveAt).toBe(REF.toISOString());
    // b は a の 60分滞在 + 20分バッファ = 80分後
    expect((ms(slots[1].arriveAt) - ms(slots[0].arriveAt)) / 60000).toBe(80);
  });

  it("respects the array order (reordering changes times)", () => {
    const a = entry({ id: "a", stayMin: 60 });
    const b = entry({ id: "b", stayMin: 60 });
    const forward = sequentialSchedule([a, b], REF);
    const reversed = sequentialSchedule([b, a], REF);
    expect(forward[0].entryId).toBe("a");
    expect(reversed[0].entryId).toBe("b");
    expect(reversed[0].arriveAt).toBe(REF.toISOString());
  });

  it("honors a fixed-time entry as an anchor", () => {
    const fixedIso = "2026-07-25T14:00:00.000Z";
    const entries = [entry({ id: "fixed", fixedTime: true, arriveBy: fixedIso, stayMin: 60 })];
    const slots = sequentialSchedule(entries, REF);
    expect(slots[0].arriveAt).toBe(fixedIso);
  });

  it("treats a non-fixed 到着目安 as a soft lower bound", () => {
    const floorIso = "2026-07-25T13:00:00.000Z";
    // 目安13:00（非固定）が先頭 → 9:00ではなく13:00以降に置かれる
    const entries = [entry({ id: "a", arriveBy: floorIso, stayMin: 60 })];
    const slots = sequentialSchedule(entries, REF);
    expect(ms(slots[0].arriveAt)).toBeGreaterThanOrEqual(ms(floorIso));
  });

  it("pins lodging (stay) without advancing the cursor for other items", () => {
    const checkin = "2026-07-25T15:00:00.000Z";
    const entries = [
      entry({ id: "a", stayMin: 60 }),
      entry({ id: "hotel", mode: "stay", fixedTime: true, arriveBy: checkin, checkOut: "2026-07-26T10:00:00.000Z" }),
      entry({ id: "b", stayMin: 60 }),
    ];
    const slots = sequentialSchedule(entries, REF);
    const byId = new Map(slots.map((s) => [s.entryId, s]));
    expect(byId.get("hotel")!.arriveAt).toBe(checkin);
    // b は a の80分後のまま（宿泊がカーソルを15:00へ進めていない）
    expect((ms(byId.get("b")!.arriveAt) - ms(byId.get("a")!.arriveAt)) / 60000).toBe(80);
  });

  it("groups by day and starts day 2 roughly 24h after day 1", () => {
    const entries = [entry({ id: "d1", day: 1, stayMin: 60 }), entry({ id: "d2", day: 2, stayMin: 60 })];
    const slots = sequentialSchedule(entries, REF);
    const byId = new Map(slots.map((s) => [s.entryId, s]));
    const diffH = (ms(byId.get("d2")!.arriveAt) - ms(byId.get("d1")!.arriveAt)) / 3600000;
    expect(diffH).toBeGreaterThanOrEqual(23);
    expect(diffH).toBeLessThanOrEqual(25);
  });

  it("prefers AI-provided anchor times when given", () => {
    const entries = [entry({ id: "a", stayMin: 60 }), entry({ id: "b", stayMin: 60 })];
    const anchors = new Map([["a", "2026-07-25T11:00:00.000Z"]]);
    const slots = sequentialSchedule(entries, REF, anchors);
    const a = slots.find((s) => s.entryId === "a")!;
    expect(a.arriveAt).toBe("2026-07-25T11:00:00.000Z");
  });

  it("returns a slot for every entry (undetermined times are not dropped)", () => {
    const entries = [entry({ id: "a" }), entry({ id: "b" }), entry({ id: "c" })];
    const slots = sequentialSchedule(entries, REF);
    expect(slots.map((s) => s.entryId).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("computePlanTotals / costCategoryOf", () => {
  it("maps modes to categories", () => {
    expect(costCategoryOf("rail")).toBe("transit");
    expect(costCategoryOf("stay")).toBe("stay");
    expect(costCategoryOf("dining")).toBe("dining");
    expect(costCategoryOf("activity")).toBe("sightseeing");
  });
  it("sums costs by category", () => {
    const entries = [
      entry({ id: "t", mode: "rail", cost: 1000 }),
      entry({ id: "h", mode: "stay", cost: 8000 }),
      entry({ id: "m", mode: "dining", cost: 2000 }),
      entry({ id: "s", mode: "activity", cost: 500 }),
      entry({ id: "free", mode: "activity" }),
    ];
    const totals = computePlanTotals(entries);
    expect(totals.totalCost).toBe(11500);
    expect(totals.costedCount).toBe(4);
    expect(totals.byCategory).toEqual({ transit: 1000, stay: 8000, dining: 2000, sightseeing: 500 });
  });
});
