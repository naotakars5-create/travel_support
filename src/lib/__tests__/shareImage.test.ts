import { buildItineraryImageData } from "../shareImage";
import { PlanEntry, ScheduleSlot } from "../types";

const TRIP_DATE = "2026-07-24";

function entry(id: string, over: Partial<PlanEntry> = {}): PlanEntry {
  return { id, title: id, mode: "activity", priority: "want", stayMin: 60, source: "テスト", ...over };
}

/**
 * その日の「JSTの壁時計時刻」の ISO を作る。
 * 表示は formatJstTime（JST固定）を通るので、実行環境のTZに依らず結果が決まるようにする。
 */
function at(day: number, hour: number, min = 0): string {
  const base = new Date(`${TRIP_DATE}T00:00:00+09:00`);
  return new Date(base.getTime() + (day - 1) * 86400000 + hour * 3600000 + min * 60000).toISOString();
}

function slot(entryId: string, arriveAt: string, stayMin = 60): ScheduleSlot {
  return { entryId, arriveAt, stayMin };
}

describe("buildItineraryImageData", () => {
  it("日ごとに分け、時刻順に通し番号を振る", () => {
    const entries = [entry("b", { title: "夕食" }), entry("a", { title: "美術館" })];
    const slots = [slot("b", at(1, 18)), slot("a", at(1, 10))];
    const data = buildItineraryImageData(entries, slots, TRIP_DATE, 1, "夏の旅");

    expect(data.title).toBe("夏の旅");
    expect(data.days).toHaveLength(1);
    expect(data.days[0].stops.map((s) => s.title)).toEqual(["美術館", "夕食"]);
    expect(data.days[0].stops.map((s) => s.num)).toEqual([1, 2]);
    expect(data.days[0].stops[0].time).toBe("10:00–11:00");
  });

  it("2日目の予定は2日目にまとまる", () => {
    const entries = [entry("a"), entry("b", { day: 2 })];
    const slots = [slot("a", at(1, 10)), slot("b", at(2, 10))];
    const data = buildItineraryImageData(entries, slots, TRIP_DATE, 2, "旅");
    expect(data.days.map((d) => d.day)).toEqual([1, 2]);
    expect(data.days[1].stops).toHaveLength(1);
  });

  it("レンタカーは載せない（地点ではないため）", () => {
    const entries = [entry("a"), entry("car", { mode: "rental" })];
    const data = buildItineraryImageData(entries, [slot("a", at(1, 10))], TRIP_DATE, 1, "旅");
    expect(data.days[0].stops).toHaveLength(1);
    expect(data.days[0].stops[0].title).toBe("a");
  });

  it("時刻が割り当てられていない行き先も「時刻未定」で必ず載せる", () => {
    const entries = [entry("a"), entry("z", { title: "未定の場所" })];
    const data = buildItineraryImageData(entries, [slot("a", at(1, 10))], TRIP_DATE, 1, "旅");
    const stops = data.days[0].stops;
    expect(stops).toHaveLength(2);
    expect(stops[1].time).toBe("時刻未定");
  });

  it("旅の名前が空なら既定の見出しを使う", () => {
    const data = buildItineraryImageData([entry("a")], [], TRIP_DATE, 1, "  ");
    expect(data.title).toBe("旅のしおり");
  });

  it("住所が行き先名と同じときは重ねて出さない", () => {
    const entries = [entry("a", { title: "大阪城", place: "大阪城" })];
    const data = buildItineraryImageData(entries, [slot("a", at(1, 10))], TRIP_DATE, 1, "旅");
    expect(data.days[0].stops[0].place).toBeUndefined();
  });
});
