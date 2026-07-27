import { tripPhase, tripRangeLabel } from "../date";
import { computeCountdown, countdownLabel } from "../dayof";

describe("tripPhase", () => {
  const at = (s: string) => new Date(`${s}T10:00:00`);

  it("出発前は残り日数を返す", () => {
    expect(tripPhase("2026-08-01", 3, at("2026-07-20"))).toEqual({ phase: "before", daysUntil: 12 });
    expect(tripPhase("2026-08-01", 3, at("2026-07-31"))).toEqual({ phase: "before", daysUntil: 1 });
  });

  it("開始日は1日目", () => {
    expect(tripPhase("2026-08-01", 3, at("2026-08-01"))).toEqual({ phase: "during", day: 1, dayCount: 3 });
  });

  it("最終日までは旅行中", () => {
    expect(tripPhase("2026-08-01", 3, at("2026-08-03"))).toEqual({ phase: "during", day: 3, dayCount: 3 });
  });

  it("最終日を過ぎたら終了", () => {
    expect(tripPhase("2026-08-01", 3, at("2026-08-04"))).toEqual({ phase: "after" });
  });

  it("壊れた日付でも落ちない", () => {
    expect(tripPhase("", 1, at("2026-08-01")).phase).toBe("before");
  });
});

describe("tripRangeLabel", () => {
  it("1日なら1つだけ", () => {
    expect(tripRangeLabel("2026-08-01", 1)).toBe("8月1日(土)");
  });
  it("複数日なら開始と終了", () => {
    expect(tripRangeLabel("2026-08-01", 3)).toBe("8月1日(土) 〜 8月3日(月)");
  });
});

describe("computeCountdown", () => {
  const base = new Date("2026-08-01T09:00:00Z");
  const after = (sec: number) => new Date(base.getTime() + sec * 1000).toISOString();

  it("1時間未満は分:秒の大時計", () => {
    const c = computeCountdown(after(600), base);
    expect(c.scale).toBe("soon");
    expect(c.mm).toBe("10");
    expect(countdownLabel(c)).toBe("10分");
  });

  it("1日未満は時間と分", () => {
    const c = computeCountdown(after(3 * 3600 + 20 * 60), base);
    expect(c.scale).toBe("hours");
    expect(c.hours).toBe(3);
    expect(c.minutes).toBe(20);
    expect(countdownLabel(c)).toBe("3時間20分");
  });

  it("1日以上は日と時間（分:秒で桁あふれしない）", () => {
    const c = computeCountdown(after(3 * 86400 + 7 * 3600), base);
    expect(c.scale).toBe("days");
    expect(c.days).toBe(3);
    expect(c.hours).toBe(7);
    expect(countdownLabel(c)).toBe("3日7時間");
  });

  it("過ぎた時刻は0で止める", () => {
    const c = computeCountdown(after(-500), base);
    expect(c.totalSec).toBe(0);
    expect(countdownLabel(c)).toBe("まもなく");
  });
});
