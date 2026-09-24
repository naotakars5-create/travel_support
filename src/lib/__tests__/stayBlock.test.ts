import { fillIntoGaps, sequentialSchedule, stayWindows } from "../plan";
import { PlanEntry } from "../types";

/** ローカルタイムの基準日（9:00始まりの前提に合わせる） */
const REF = new Date("2026-07-24T00:00:00");

function visit(id: string, over: Partial<PlanEntry> = {}): PlanEntry {
  return { id, title: id, mode: "activity", priority: "want", stayMin: 60, source: "テスト", ...over };
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
    source: "テスト",
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

describe("AIが割り当てた時刻でも宿泊中は避ける", () => {
  it("AIが宿泊中の時刻を返しても、チェックアウト後へ押し出す", () => {
    // 以前は anchors がある場合に宿泊中の判定を素通りしていたため、
    // AIが「22:00に観光」と返すとそのまま泊まっている最中へ差し込まれていた
    const night = new Date(REF);
    night.setHours(22, 0, 0, 0);
    const anchors = new Map([["a", night.toISOString()]]);

    const slots = sequentialSchedule([hotel(), visit("a")], REF, anchors);
    const a = slots.find((s) => s.entryId === "a")!;
    const [win] = stayWindows([hotel()]);
    const at = new Date(a.arriveAt).getTime();

    expect(at >= win.start && at < win.end).toBe(false);
    expect(at).toBe(win.end); // チェックアウト時刻へ寄る
  });

  it("「チェックイン後でも可」の行き先はAIの時刻をそのまま使う", () => {
    const night = new Date(REF);
    night.setHours(20, 0, 0, 0);
    const anchors = new Map([["dinner", night.toISOString()]]);

    const slots = sequentialSchedule([hotel(), visit("dinner", { mode: "dining", allowDuringStay: true })], REF, anchors);
    const d = slots.find((s) => s.entryId === "dinner")!;
    expect(new Date(d.arriveAt).getTime()).toBe(night.getTime());
  });

  it("時刻固定（予約・便）は宿泊中でも動かさない", () => {
    // ユーザーが自分で決めた時刻は、宿泊中に見えても勝手に動かさない
    const early = new Date(REF.getTime() + 86400000);
    early.setHours(7, 0, 0, 0);
    const flight = visit("flight", { mode: "air", fixedTime: true, arriveBy: early.toISOString() });

    const slots = sequentialSchedule([hotel(), flight], REF);
    const f = slots.find((s) => s.entryId === "flight")!;
    expect(new Date(f.arriveAt).getTime()).toBe(early.getTime());
  });
});
