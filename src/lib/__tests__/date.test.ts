import { dateForDay, dayOfIso } from "../date";

describe("dateForDay", () => {
  it("returns the start date for day 1", () => {
    expect(dateForDay("2026-07-25", 1)).toBe("2026-07-25");
  });
  it("advances by whole days", () => {
    expect(dateForDay("2026-07-25", 2)).toBe("2026-07-26");
    expect(dateForDay("2026-07-25", 3)).toBe("2026-07-27");
  });
  it("crosses month boundaries", () => {
    expect(dateForDay("2026-07-31", 2)).toBe("2026-08-01");
  });
  it("clamps day < 1 to the start date", () => {
    expect(dateForDay("2026-07-25", 0)).toBe("2026-07-25");
  });
});

describe("dayOfIso", () => {
  it("is 1 on the start date", () => {
    expect(dayOfIso("2026-07-25", "2026-07-25T10:00:00")).toBe(1);
  });
  it("counts subsequent days", () => {
    expect(dayOfIso("2026-07-25", "2026-07-26T10:00:00")).toBe(2);
    expect(dayOfIso("2026-07-25", "2026-07-27T23:59:00")).toBe(3);
  });
  it("never goes below 1 for earlier dates", () => {
    expect(dayOfIso("2026-07-25", "2026-07-24T10:00:00")).toBe(1);
  });
  it("defaults to 1 for missing/invalid input", () => {
    expect(dayOfIso("2026-07-25", undefined)).toBe(1);
  });
});
