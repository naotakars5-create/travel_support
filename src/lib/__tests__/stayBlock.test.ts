import { fillIntoGaps, sequentialSchedule, stayWindows } from "../plan";
import { PlanEntry } from "../types";

/** ローカルタイムの基準日（9:00始まりの前提に合わせる） */
const REF = new Date("2026-07-24T00:00:00");

function visit(id: string, over: Partial<PlanEntry> = {}): PlanEntry {
  return { id, title: id, mode: "activity", priority: "want", stayMin: 60, ...over };
}

function hotel(over: Partial<PlanEntry> = {}): PlanEntry {
  const checkIn = new Date(REF);
  checkIn.setHours(18, 0, 0, 0);
  const checkOut = new Date(REF.getTime() + 86400000);
  checkOut.setHours(9, 0, 0, 0);
  return {
    id: "hotel",
    title: "ホテル",
    mode: "stay",
    priority: "must",
    arriveBy: checkIn.toISOString(),
    checkOut: checkOut.toISOString(),
    fixedTime: true,
    ...over,
  };
}

describe("宿のチェックイン〜チェックアウトには予定を入れない", () => {
  it("stayWindows はチェックイン〜チェックアウトの区間を返す", () => {
    const wins = stayWindows([hotel(), visit("a")]);
    expect(wins).toHaveLength(1);
    expect(new Date(wins[0].start).getHours()).toBe(18);
    expect(new Date(wins[0].end).getHours()).toBe(9);
  });

  it("sequentialSchedule: 宿の時間帯に食い込む自動配置はチェックアウト後へ送られる", () => {
    // 9:00 開始で 480分滞在 → 17:00 終了。次は 17:15 開始で 18:00 の宿時間帯の手前だが、
    // その次（3件目）は 18:00 以降に食い込むので翌朝 9:00 へ送られる。
    const entries = [visit("a", { stayMin: 480 }), visit("b", { stayMin: 30 }), visit("c"), hotel()];
    const slots = sequentialSchedule(entries, REF);
    const c = slots.find((s) => s.entryId === "c")!;
    const t = new Date(c.arriveAt);
    expect(t.getDate()).toBe(REF.getDate() + 1);
    expect(t.getHours()).toBe(9);
  });

  it("sequentialSchedule: 「チェックイン後でも可」の行き先は宿の時間帯に置ける", () => {
    const entries = [visit("a", { stayMin: 480 }), visit("b", { stayMin: 30 }), visit("dinner", { allowDuringStay: true }), hotel()];
    const slots = sequentialSchedule(entries, REF);
    const d = slots.find((s) => s.entryId === "dinner")!;
    expect(new Date(d.arriveAt).getDate()).toBe(REF.getDate());
  });

  it("fillIntoGaps: 宿の時間帯は塞がった時間として扱う", () => {
    const h = hotel();
    const wins = stayWindows([h]);
    // 9:00〜17:30 を既存予定で塞ぐ → 残りは 17:30〜18:00 の30分だけ（宿時間帯を除くと60分は入らない）
    const dayStart = new Date(REF);
    dayStart.setHours(9, 0, 0, 0);
    const busy = [{ entryId: "busy", arriveAt: dayStart.toISOString(), stayMin: 8.5 * 60 }];
    const added = fillIntoGaps([visit("x", { stayMin: 60 })], busy, REF, 1, { stayWindows: wins });
    expect(added).toHaveLength(0);
    // 「チェックイン後でも可」なら 18:00 以降に入れられる
    const ok = fillIntoGaps([visit("y", { stayMin: 60, allowDuringStay: true })], busy, REF, 1, { stayWindows: wins });
    expect(ok).toHaveLength(1);
  });
});
