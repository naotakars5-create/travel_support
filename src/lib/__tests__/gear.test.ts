import { gearLinkFor } from "../gear";
import { buildDefaultPacking } from "../packing";

const TAG = "tabinavi-22";

describe("gearLinkFor", () => {
  it("トラッキングID未設定なら何も出さない（設定しなくてもアプリが成立する）", () => {
    expect(gearLinkFor("モバイルバッテリー", "")).toBeNull();
    expect(gearLinkFor("モバイルバッテリー", "   ")).toBeNull();
  });

  it("買う必要のない持ち物にはリンクを出さない", () => {
    expect(gearLinkFor("財布・現金", TAG)).toBeNull();
    expect(gearLinkFor("健康保険証・身分証", TAG)).toBeNull();
    expect(gearLinkFor("パスポート", TAG)).toBeNull();
    expect(gearLinkFor("", TAG)).toBeNull();
  });

  it("既定の持ち物のうち、モノを買う項目にはリンクが付く", () => {
    const labels = buildDefaultPacking().map((i) => i.label);
    const linked = labels.filter((l) => gearLinkFor(l, TAG) !== null);
    // 充電器・モバイルバッテリー・常備薬・着替え・洗面用具・折りたたみ傘
    expect(linked.length).toBeGreaterThanOrEqual(5);
    expect(linked).not.toContain("財布・現金");
    expect(linked).not.toContain("健康保険証・身分証");
  });

  it("ユーザーが自分で足した持ち物にも部分一致で当たる", () => {
    expect(gearLinkFor("海外用の変換プラグ", TAG)?.label).toBe("変換プラグ");
    expect(gearLinkFor("ネックピロー", TAG)?.label).toBe("ネックピロー");
  });

  it("具体的なルールが一般的なルールより先に当たる", () => {
    // 「モバイルバッテリー」は「充電」も含むが、より具体的な方を採る
    expect(gearLinkFor("モバイルバッテリー", TAG)?.label).toBe("モバイルバッテリー");
  });

  it("トラッキングIDが必ずURLに載る（載らないと収益が発生しない）", () => {
    const link = gearLinkFor("折りたたみ傘", TAG);
    expect(link).not.toBeNull();
    expect(link!.url).toContain(`tag=${TAG}`);
    expect(link!.url.startsWith("https://www.amazon.co.jp/s?k=")).toBe(true);
  });

  it("検索語はURLエンコードされる", () => {
    const link = gearLinkFor("折りたたみ傘", TAG)!;
    expect(link.url).not.toMatch(/[ 　]/);
  });
});
