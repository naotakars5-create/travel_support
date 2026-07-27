import { DAY_COLORS, dayColor, tint } from "../palette";

/** 相対輝度（WCAG）。 */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("palette", () => {
  it("日ごとの色は1日目から順に割り当てられ、6日目で先頭へ戻る", () => {
    expect(dayColor(1)).toBe(DAY_COLORS[0]);
    expect(dayColor(3)).toBe(DAY_COLORS[2]);
    expect(dayColor(6)).toBe(DAY_COLORS[0]);
  });

  it("0日目や負の日でも落ちない", () => {
    expect(dayColor(0)).toBe(DAY_COLORS[0]);
    expect(dayColor(-3)).toBe(DAY_COLORS[0]);
  });

  it("どの日の色にも生成りの文字が読める濃さがある（コントラスト4.5以上）", () => {
    for (const c of DAY_COLORS) {
      expect(contrast(c, "#F4EFE5")).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("薄い面は同じ色のrgbaになる", () => {
    expect(tint("#4A6B8A", 0.1)).toBe("rgba(74, 107, 138, 0.1)");
  });

  it("色として読めない文字列はそのまま返す（描画を壊さない）", () => {
    expect(tint("transparent", 0.2)).toBe("transparent");
  });
});
