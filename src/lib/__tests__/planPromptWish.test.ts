import { buildPlanUserMessage } from "../planPrompt";
import { PlanEntry } from "../types";

const e = (o: Partial<PlanEntry>): PlanEntry => ({
  id: "x",
  title: "行き先",
  mode: "activity",
  priority: "want",
  source: "手入力",
  ...o,
});

const build = (entries: PlanEntry[]) =>
  buildPlanUserMessage({ entries, referenceDateIso: "2026-08-01T09:00:00+09:00", dayCount: 3 });

describe("AIプロンプトに「いつ行く？」が載る", () => {
  it("時間帯の希望は帯の時刻つきで渡る", () => {
    expect(build([e({ wish: "period", period: "morning" })])).toContain("希望: 午前（09:00〜12:00 の間に開始");
  });

  it("時間の範囲の希望はそのまま渡る", () => {
    expect(build([e({ wish: "window", windowFrom: "10:00", windowTo: "12:00" })])).toContain(
      "希望: 10:00〜12:00 の間に開始"
    );
  });

  it("時刻固定は動かすなと伝える", () => {
    expect(build([e({ wish: "fixed", fixedTime: true, arriveBy: "2026-08-01T15:00:00+09:00" })])).toContain(
      "希望: 時刻固定（絶対に動かさない）"
    );
  });

  it("1日目の指定も「何日目」として渡る（以前は2日目以降しか渡っていなかった）", () => {
    const msg = build([e({ wish: "day", day: 1 })]);
    expect(msg).toContain("何日目: 1日目");
    expect(msg).toContain("希望: この日ならいつでも");
  });

  it("2日目以降の指定も渡る", () => {
    expect(build([e({ wish: "period", period: "afternoon", day: 2 })])).toContain("何日目: 2日目");
  });

  it("こだわらない予定は日を書かず、調整に使ってよいと伝える", () => {
    const msg = build([e({ wish: "any", day: 1 })]);
    // 行き先の行そのものに「何日目」が入らないことを見る（前書きの説明文には出てくる）
    const line = msg.split("\n").find((l) => l.startsWith("- entryId:")) ?? "";
    expect(line).not.toContain("何日目");
    expect(line).toContain("希望: いつでもいい（日も時刻も自由。順路の調整に使ってよい）");
  });

  it("守る強さの順番がシステムプロンプト側に書かれている", () => {
    const { PLAN_SYSTEM_PROMPT } = jest.requireActual<typeof import("../planPrompt")>("../planPrompt");
    expect(PLAN_SYSTEM_PROMPT).toContain("「希望」の指定");
    expect(PLAN_SYSTEM_PROMPT).toContain("「いつでもいい」");
  });
});
