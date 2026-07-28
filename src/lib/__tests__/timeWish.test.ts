import { fillIntoGaps, sequentialSchedule, timeWishOf, violatesWish, wishFullLabel, wishLabel, wishWindowMin } from "../plan";
import { PlanEntry } from "../types";

const base = (over: Partial<PlanEntry>): PlanEntry => ({
  id: "e1",
  title: "行き先",
  mode: "activity",
  priority: "want",
  stayMin: 60,
  source: "手入力",
  ...over,
});

const hhmm = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const REF = new Date("2026-08-01T09:00:00");

describe("timeWishOf", () => {
  it("指定があればそれを使う", () => {
    expect(timeWishOf(base({ wish: "period" }))).toBe("period");
  });

  it("古いデータは fixedTime / day から推測する", () => {
    expect(timeWishOf(base({ fixedTime: true }))).toBe("fixed");
    expect(timeWishOf(base({ day: 2 }))).toBe("day");
    expect(timeWishOf(base({}))).toBe("any");
  });
});

describe("wishWindowMin", () => {
  it("時間帯は既定の帯を返す", () => {
    expect(wishWindowMin(base({ wish: "period", period: "afternoon" }))).toEqual({ fromMin: 720, toMin: 1020 });
  });

  it("範囲指定はその範囲を返す", () => {
    expect(wishWindowMin(base({ wish: "window", windowFrom: "10:00", windowTo: "12:00" }))).toEqual({
      fromMin: 600,
      toMin: 720,
    });
  });

  it("こだわらない・日だけの指定は帯を持たない", () => {
    expect(wishWindowMin(base({ wish: "any" }))).toBeNull();
    expect(wishWindowMin(base({ wish: "day", day: 2 }))).toBeNull();
  });
});

describe("wishLabel", () => {
  it("希望を短い言葉にする", () => {
    expect(wishLabel(base({ wish: "any" }))).toBe("いつでもいい");
    expect(wishLabel(base({ wish: "day", day: 2 }))).toBe("この日ならいつでも");
    expect(wishLabel(base({ wish: "period", period: "evening" }))).toBe("夕方");
    expect(wishLabel(base({ wish: "window", windowFrom: "10:00", windowTo: "12:00" }))).toBe("10:00〜12:00");
    expect(wishLabel(base({ wish: "fixed" }))).toBe("時刻が決まっている");
  });
});

describe("sequentialSchedule と希望", () => {
  it("午後希望なら、リストの先頭にあっても12時より前には置かない", () => {
    const slots = sequentialSchedule([base({ id: "a", wish: "period", period: "afternoon" })], REF);
    expect(hhmm(slots[0].arriveAt)).toBe("12:00");
  });

  it("範囲指定なら、その開始時刻より前には置かない", () => {
    const slots = sequentialSchedule([base({ id: "a", wish: "window", windowFrom: "14:30", windowTo: "16:00" })], REF);
    expect(hhmm(slots[0].arriveAt)).toBe("14:30");
  });

  it("こだわらない予定は朝から前詰めのまま", () => {
    const slots = sequentialSchedule([base({ id: "a" })], REF);
    expect(hhmm(slots[0].arriveAt)).toBe("09:00");
  });

  it("希望が既に過ぎている時間帯なら、前の予定の後ろにそのまま続く", () => {
    const slots = sequentialSchedule(
      [base({ id: "a", stayMin: 300 }), base({ id: "b", wish: "period", period: "morning" })],
      REF
    );
    // a は 9:00〜14:00。午前希望の b はもう午前に入らないので、その後ろへ置かれる
    expect(hhmm(slots[1].arriveAt)).toBe("14:20");
  });
});

describe("fillIntoGaps と希望", () => {
  it("夕方希望の予定は空き時間の中でも夕方へ入る", () => {
    const placed = sequentialSchedule([base({ id: "a", stayMin: 60 })], REF);
    const added = fillIntoGaps([base({ id: "b", wish: "period", period: "evening" })], placed, REF, 1);
    expect(added).toHaveLength(1);
    expect(hhmm(added[0].arriveAt)).toBe("17:00");
  });

  it("2日目希望の予定は2日目に入る", () => {
    const added = fillIntoGaps([base({ id: "b", wish: "day", day: 2 })], [], REF, 2);
    expect(added).toHaveLength(1);
    expect(new Date(added[0].arriveAt).getDate()).toBe(2);
  });

  it("希望どおりに入らない場合は希望を緩めてでも入れる", () => {
    // 1日目を朝から晩まで埋めておく
    const full = sequentialSchedule([base({ id: "a", stayMin: 11 * 60 })], REF);
    const added = fillIntoGaps([base({ id: "b", wish: "day", day: 1, stayMin: 60 })], full, REF, 2);
    expect(added).toHaveLength(1);
    expect(new Date(added[0].arriveAt).getDate()).toBe(2); // 1日目に入らないので2日目へ
  });
});

describe("violatesWish", () => {
  const e = base({ wish: "period", period: "afternoon" });
  it("帯の中なら問題なし", () => {
    expect(violatesWish(e, "2026-08-01T13:00:00")).toBe(false);
  });
  it("帯より前は外れている", () => {
    expect(violatesWish(e, "2026-08-01T10:00:00")).toBe(true);
  });
  it("帯より後も外れている", () => {
    expect(violatesWish(e, "2026-08-01T18:00:00")).toBe(true);
  });
  it("希望が無ければ常に問題なし", () => {
    expect(violatesWish(base({}), "2026-08-01T23:00:00")).toBe(false);
  });
});

describe("希望がAIに伝わるか（何日目の指定）", () => {
  it("1日目の指定も日として扱う（violatesWish が別日を検出できる）", () => {
    const e = base({ wish: "day", day: 1 });
    expect(violatesWish(e, "2026-08-01T13:00:00", "2026-08-01")).toBe(false);
    expect(violatesWish(e, "2026-08-02T13:00:00", "2026-08-01")).toBe(true);
  });

  it("時間帯は合っていても日がずれていれば希望外れ", () => {
    const e = base({ wish: "period", period: "afternoon", day: 2 });
    expect(violatesWish(e, "2026-08-02T13:00:00", "2026-08-01")).toBe(false);
    expect(violatesWish(e, "2026-08-03T13:00:00", "2026-08-01")).toBe(true);
  });

  it("こだわらない予定は日がどこでも問題なし", () => {
    expect(violatesWish(base({ wish: "any", day: 1 }), "2026-08-03T13:00:00", "2026-08-01")).toBe(false);
  });

  it("ずれた時の説明は日を含める", () => {
    expect(wishFullLabel(base({ wish: "period", period: "afternoon", day: 2 }))).toBe("2日目・午後");
    expect(wishFullLabel(base({ wish: "any" }))).toBe("いつでもいい");
  });
});
