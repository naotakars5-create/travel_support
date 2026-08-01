import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * 広告（送客リンク）の共通ルール。
 *
 * このアプリの広告は、外部の広告ネットワーク（AdMob 等）ではなく
 * **自前の送客リンク（アフィリエイト）** で出す。理由は2つ。
 *
 * 1. AdMob は Expo Go では動かず、Development Build / EAS Build が必要になる。
 *    いまは Expo Go と Web版で配っているので、SDK を入れた時点で配布方法ごと変わる。
 * 2. このアプリは「行き先・日程・泊数・予算・現在地」を既に持っている。
 *    広告ネットワークにターゲティングを外注して数円/imp をもらうより、
 *    自分で文脈に合う先へ送客したほうが単価が2〜3桁ちがう。
 *
 * 守っている決まりごと:
 *
 * - **必ず PR と明示する**（景表法・ステマ規制／2023年10月〜）。
 *   広告と、アプリ自身の提案（AIのおすすめスポット等）が
 *   見分けられない置き方はしない。
 * - **枠の識別子（AdSlotId）を増やすときは、必ずここに足す**。
 *   どこに広告が出るのかを1か所で数えられる状態を保つ。
 * - **accent（ローズレッド）を広告に使わない**。accent は「今・進行中」専用で、
 *   アプリで最も目を引く色。ここを広告へ明け渡すと当日画面の視認性が落ちる。
 *   広告は surface（砂）と muted（補助文字色）だけで組む。
 * - **当日画面（DayOfScreen）には置かない**。「次に何をするかだけを示す」が
 *   この製品の核なので、ここに広告を差し込むと製品価値そのものが壊れる。
 * - **提携IDが未設定なら、枠ごと出さない**。Maps キーや Upstash と同じく、
 *   「設定しなくてもアプリは完全に動く」状態を崩さない。
 */

/** 広告非表示（有料プラン）の保存キー。 */
const AD_FREE_KEY = "tabinavi.adfree.v1";

/**
 * 広告枠の識別子。増やすときは必ずここに足す。
 *
 * - `packing-gear`  … 持ち物リストの未チェック項目に添える商品リンク
 * - `plan-lodging`  … 宿泊先の枠で、まだ宿が決まっていない泊に出す宿探しボタン
 * - `plan-rental`   … 「車の移動」枠で、レンタカーが未登録のときに出す探すボタン
 */
export type AdSlotId = "packing-gear" | "plan-lodging" | "plan-rental";

/** 広告であることの明示。すべての枠に必ず添える（省略可能な装飾ではない）。 */
export const AD_LABEL = "PR";

/** 広告枠のまとめ表示に使う一文。 */
export const AD_DISCLOSURE = "リンク先での購入・予約により、当サービスに収益が入ることがあります。";

/** Amazonアソシエイト規約が掲示を求める定型文。Amazonへのリンクを出す画面には必ず置く。 */
export const AMAZON_DISCLOSURE = "Amazonのアソシエイトとして、旅ナビは適格販売により収入を得ています。";

/**
 * AmazonアソシエイトのトラッキングID。
 *
 * 秘匿情報ではない（リンクに載って公開される）ので、サーバー経由にはせず
 * `EXPO_PUBLIC_` で持つ。未設定なら空文字を返し、リンクは組み立てられない。
 */
export function amazonTag(): string {
  return (process.env.EXPO_PUBLIC_AMAZON_TAG ?? "").trim();
}

/** 楽天アフィリエイトID。未設定なら空文字（＝宿の送客枠は出ない）。 */
export function rakutenAffiliateId(): string {
  return (process.env.EXPO_PUBLIC_RAKUTEN_AFFILIATE_ID ?? "").trim();
}

/**
 * 広告を出さない状態か（有料プラン加入者）。
 *
 * **課金そのものはまだ実装していない**（認証もサーバー側の購入検証も無いため、
 * いま入れても「誰が払ったか」を端末をまたいで判定できない）。
 * ここは受け皿だけを用意してあり、保存された値が無ければ常に false になる。
 *
 * 課金を入れるときは、この関数の中で購入状態を見るようにすれば
 * 画面側（useAdFree を読んでいる各コンポーネント）は一切変えなくてよい。
 */
export async function loadAdFree(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(AD_FREE_KEY)) === "1";
  } catch {
    return false;
  }
}

/** 広告非表示の状態を保存する。 */
export async function saveAdFree(adFree: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(AD_FREE_KEY, adFree ? "1" : "0");
  } catch {
    // 保存に失敗しても広告が出るだけなので、アプリは止めない
  }
}
