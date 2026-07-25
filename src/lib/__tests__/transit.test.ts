import { createPrecomputedEstimator, isWithinCarWindow, CarWindow } from "../transit";
import { directionsUrl } from "../mapsLink";
import { ParsedEvent } from "../types";

function ev(over: Partial<ParsedEvent> & { id: string }): ParsedEvent {
  return {
    title: over.title ?? over.id,
    mode: "activity",
    confidence: 1,
    source: "手入力",
    ...over,
  } as ParsedEvent;
}

const WINDOWS: CarWindow[] = [{ fromIso: "2026-07-25T10:00:00+09:00", toIso: "2026-07-25T18:00:00+09:00" }];

describe("isWithinCarWindow", () => {
  it("returns true inside the window and false outside it", () => {
    expect(isWithinCarWindow("2026-07-25T12:00:00+09:00", WINDOWS)).toBe(true);
    expect(isWithinCarWindow("2026-07-25T09:00:00+09:00", WINDOWS)).toBe(false);
    expect(isWithinCarWindow("2026-07-25T19:00:00+09:00", WINDOWS)).toBe(false);
  });

  it("returns false for missing or unparsable times, and when there is no window", () => {
    expect(isWithinCarWindow(undefined, WINDOWS)).toBe(false);
    expect(isWithinCarWindow("not-a-date", WINDOWS)).toBe(false);
    expect(isWithinCarWindow("2026-07-25T12:00:00+09:00", [])).toBe(false);
  });
});

describe("createPrecomputedEstimator with rental car windows", () => {
  const cache = { "a:b": { driving: 20, walking: 90 } };

  it("uses the car while the rental car is held", () => {
    const est = createPrecomputedEstimator(cache, "walk", WINDOWS);
    const from = ev({ id: "a", startAt: "2026-07-25T11:00:00+09:00", endAt: "2026-07-25T12:00:00+09:00" });
    const to = ev({ id: "b" });
    expect(est.estimate(from, to)).toMatchObject({ mode: "car", durationMin: 20 });
  });

  it("falls back to public transport outside the rental period when the walk is long", () => {
    const est = createPrecomputedEstimator(cache, "walk", WINDOWS);
    const from = ev({ id: "a", startAt: "2026-07-25T19:00:00+09:00", endAt: "2026-07-25T19:30:00+09:00" });
    const to = ev({ id: "b" });
    expect(est.estimate(from, to).mode).toBe("rail");
  });

  it("walks short legs outside the rental period", () => {
    const est = createPrecomputedEstimator({ "a:b": { driving: 5, walking: 12 } }, "walk", WINDOWS);
    const from = ev({ id: "a", startAt: "2026-07-25T19:00:00+09:00", endAt: "2026-07-25T19:30:00+09:00" });
    const to = ev({ id: "b" });
    expect(est.estimate(from, to)).toMatchObject({ mode: "walk", durationMin: 12 });
  });

  it("keeps the car for the whole trip when the base mode is car", () => {
    const est = createPrecomputedEstimator(cache, "car", WINDOWS);
    const from = ev({ id: "a", startAt: "2026-07-25T21:00:00+09:00", endAt: "2026-07-25T21:30:00+09:00" });
    const to = ev({ id: "b" });
    expect(est.estimate(from, to).mode).toBe("car");
  });
});

describe("directionsUrl", () => {
  it("prefers coordinates and maps the mode to a Google travelmode", () => {
    const url = directionsUrl({ fromGeo: { lat: 34.7, lng: 135.5 }, toGeo: { lat: 34.6, lng: 135.4 } }, "rail");
    expect(url).toContain("origin=34.7%2C135.5");
    expect(url).toContain("destination=34.6%2C135.4");
    expect(url).toContain("travelmode=transit");
  });

  it("falls back to place names and returns null when an endpoint is missing", () => {
    expect(directionsUrl({ fromPlace: "東京駅", toPlace: "渋谷駅" }, "car")).toContain("travelmode=driving");
    expect(directionsUrl({ fromPlace: "東京駅" }, "car")).toBeNull();
    expect(directionsUrl(undefined, "car")).toBeNull();
  });
});
