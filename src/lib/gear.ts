import { amazonTag } from "./ads";

/**
 * 持ち物リストの項目から「旅行用品を探すリンク」を引く。
 *
 * ## PackingItem に url を持たせない理由
 *
 * 持ち物は AsyncStorage に永続化されている（lib/storage.ts）。
 * ここに URL を入れてしまうと、
 *
 * - 保存形式が変わるのでマイグレーションが要る
 * - 提携終了・タグ変更のときに、**端末内に古いURLが残り続けて回収できない**
 *
 * ので、保存するのはこれまで通りラベルだけにして、
 * リンクは表示のたびにこの関数で引き直す。
 *
 * ## 個別商品ではなく検索結果へ送る理由
 *
 * 個別商品（ASIN直リンク）は在庫切れ・終売・価格改定でリンクが腐り、
 * そのたびにコード修正が要る。検索結果なら維持コストがほぼゼロで、
 * ユーザーが自分で選べるぶん納得感もある。
 *
 * ## ラベルの部分一致にしている理由
 *
 * 既定の8項目（lib/packing.ts）だけでなく、ユーザーが自分で足した
 * 「変換プラグ」「ネックピロー」にも自然にリンクが付く。
 * 逆に「パスポート」「財布」のように買う必要が無いものは
 * どのルールにも当たらず null になり、**何も表示されない**。
 * これが「押し付けにならない」ための条件なので、ルールは安易に増やさない。
 */

interface GearRule {
  /** 持ち物ラベルに含まれていたら当たり、とみなす語 */
  keywords: string[];
  /** Amazon に投げる検索語 */
  query: string;
  /** リンクの文言（「〜を探す」の〜の部分） */
  label: string;
}

/**
 * ラベル→検索語の対応。上から順に見て最初に当たったものを使うので、
 * 具体的なもの（モバイルバッテリー）を、一般的なもの（充電器）より前に置く。
 */
const RULES: GearRule[] = [
  { keywords: ["モバイルバッテリー"], query: "モバイルバッテリー 軽量 大容量 機内持ち込み", label: "モバイルバッテリー" },
  { keywords: ["充電器", "ケーブル", "充電"], query: "USB充電器 急速 コンパクト 旅行", label: "充電器" },
  { keywords: ["折りたたみ傘", "傘", "レインコート", "カッパ"], query: "折りたたみ傘 軽量 自動開閉", label: "折りたたみ傘" },
  { keywords: ["洗面", "歯ブラシ", "シャンプー"], query: "トラベル 洗面用具 セット 詰め替え", label: "旅行用洗面セット" },
  { keywords: ["常備薬", "薬", "絆創膏"], query: "携帯 ピルケース 常備薬 持ち運び", label: "携帯ピルケース" },
  { keywords: ["着替え", "衣類", "圧縮"], query: "衣類圧縮袋 旅行 トラベルポーチ", label: "衣類ポーチ" },
  { keywords: ["変換プラグ", "変圧器", "コンセント"], query: "海外 変換プラグ マルチ", label: "変換プラグ" },
  { keywords: ["ネックピロー", "アイマスク", "耳栓"], query: "ネックピロー 携帯 旅行", label: "ネックピロー" },
  { keywords: ["スーツケース", "キャリー", "バックパック", "リュック"], query: "スーツケース 機内持ち込み 軽量", label: "スーツケース" },
  { keywords: ["日焼け止め", "帽子"], query: "日焼け止め 旅行用 携帯サイズ", label: "日焼け止め" },
  { keywords: ["カメラ", "三脚", "SDカード"], query: "旅行 カメラ アクセサリー", label: "カメラ用品" },
];

export interface GearLink {
  /** リンクに出す文言 */
  label: string;
  /** 遷移先 */
  url: string;
}

/**
 * 持ち物ラベルに対応する商品リンク。該当しない・タグ未設定なら null。
 *
 * @param tag テスト用に上書きできるようにしてある。既定は環境変数のトラッキングID。
 */
export function gearLinkFor(label: string, tag: string = amazonTag()): GearLink | null {
  const id = tag.trim();
  if (!id) return null;
  const text = label.trim();
  if (!text) return null;
  const hit = RULES.find((r) => r.keywords.some((k) => text.includes(k)));
  if (!hit) return null;
  return {
    label: hit.label,
    url: `https://www.amazon.co.jp/s?k=${encodeURIComponent(hit.query)}&tag=${encodeURIComponent(id)}`,
  };
}
