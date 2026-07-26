import { getDayOfState } from "../dayof";
import { RailItem } from "../itinerary";
import { ParsedEvent } from "../types";

function ev(id: string): ParsedEvent {
  return { id, mode: "activity", title: id, startAt: "", source: "手入力", fields: [], confidence: 1 };
}

function node(key: string, time: string, nodeIndex: number): RailItem {
  return { type: "node", key, time, nodeIndex, place: key, stayMin: 60, event: ev(key) } as RailItem;
}

const RAIL: RailItem[] = [
  node("a", "2026-07-25T09:00:00+09:00", 0),
  node("b", "2026-07-25T11:00:00+09:00", 1),
  node("c", "2026-07-25T14:00:00+09:00", 2),
];

describe("getDayOfState: 時刻ベースの自動進行", () => {
  it("到着記録が無くても、予定時刻を過ぎたノードは通過扱いになる", () => {
    // 12:00 時点 → b(11:00) まで開始済み。次は c。
    const state = getDayOfState(RAIL, null, { now: new Date("2026-07-25T12:00:00+09:00") });
    expect(state.mode).toBe("move");
    if (state.mode === "move") {
      expect(state.currentNode?.key).toBe("b");
      expect(state.nextNode.key).toBe("c");
    }
  });

  it("先頭ノードの前は従来どおり（何も通過していない）", () => {
    const state = getDayOfState(RAIL, null, { now: new Date("2026-07-25T08:00:00+09:00") });
    expect(state.mode).toBe("move");
    if (state.mode === "move") expect(state.nextNode.key).toBe("a");
  });

  it("全ノードの時刻を過ぎたら done になる", () => {
    const state = getDayOfState(RAIL, null, { now: new Date("2026-07-25T20:00:00+09:00") });
    expect(state.mode).toBe("done");
  });

  it("手動記録が自動進行より先なら記録を優先する（早着）", () => {
    // 10:00 に c への到着を記録（自動では a のはず）→ c が現在地
    const state = getDayOfState(RAIL, "c", {
      now: new Date("2026-07-25T10:00:00+09:00"),
      currentNodeSetAt: "2026-07-25T10:00:00+09:00",
    });
    expect(state.mode).toBe("done"); // c が最後のノードなので next が無い
  });

  it("遅れの自己申告（次の予定時刻を過ぎてからの記録）は自動進行で上書きしない", () => {
    // 15:00（c の予定 14:00 を過ぎている）に「まだ b にいる」と記録 → b のまま
    const state = getDayOfState(RAIL, "b", {
      now: new Date("2026-07-25T15:00:00+09:00"),
      currentNodeSetAt: "2026-07-25T15:00:00+09:00",
    });
    expect(state.mode).toBe("move");
    if (state.mode === "move") {
      expect(state.currentNode?.key).toBe("b");
      expect(state.nextNode.key).toBe("c");
    }
  });

  it("now を渡さなければ従来の記録ベースの挙動のまま", () => {
    const state = getDayOfState(RAIL, null);
    expect(state.mode).toBe("move");
    if (state.mode === "move") expect(state.nextNode.key).toBe("a");
  });
});
