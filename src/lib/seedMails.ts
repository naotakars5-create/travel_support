import { MailItem } from "./types";
import { addMinutes, formatJstDateJa, formatJstTime } from "./date";

/**
 * 初回起動時のデモ用シードメール。
 * 実在の予約確認メールを模した文面で、実際に /api/parse へ送って解析される
 * （抽出結果はハードコードではなくLLMの応答をそのまま使う）。
 * 時刻は「今」を基準に相対生成し、いつ開いても当日画面の演出が成立するようにしている。
 */
export function buildSeedMails(now: Date): MailItem[] {
  const depart = addMinutes(now, -90);
  const arrive = addMinutes(depart, 75);
  const baggage = addMinutes(arrive, 40);
  const checkin = addMinutes(baggage, 5 * 60);
  const lunch = addMinutes(arrive, 3 * 60 + 10);

  const dateJa = formatJstDateJa(now);

  const jalBody = `件名: 【JAL】ご予約確認（eチケットお客様控え）

お客様

この度はJALをご利用いただき誠にありがとうございます。
ご予約内容は下記の通りです。本メールは搭乗券ではございません。

■予約番号: HNDOSA7
■搭乗日: ${dateJa}

------------------------------
JL105便 東京(羽田)発 → 大阪(伊丹)行
出発: ${formatJstTime(depart)} 羽田空港 第2ターミナル
到着: ${formatJstTime(arrive)} 大阪国際空港(伊丹)
座席: 14A
運賃種別: 普通運賃
------------------------------

eチケット番号: 131-2345678901
ご搭乗手続きは出発の75分前までにお済ませください。

日本航空株式会社`;

  const ikyuBody = `一休.com ご予約確認メール

お客様

一休.comをご利用いただきありがとうございます。
以下の内容でご予約が確定しましたのでお知らせいたします。

▼店舗名
本湖月

▼ご来店日時
${dateJa} ${formatJstTime(lunch)}〜

▼ご利用人数
2名（個室）

▼コース
昼食コース「花」

▼合計金額
16,000円（お一人様8,000円）

▼キャンセルポリシー
前日18時以降のキャンセルはキャンセル料が発生いたします。

一休.com レストラン予約`;

  const nikkoBody = `ホテル日航大阪 ご予約確認

お客様

ホテル日航大阪をご予約いただき誠にありがとうございます。
ご予約内容は下記の通りです。

■ご予約番号: NKO-55210

■宿泊日
${dateJa} 1泊

■チェックイン / チェックアウト
チェックイン：${formatJstTime(checkin)}〜
チェックアウト：翌日 11:00

■プラン
スタンダードダブル（朝食付き）

■料金
18,700円（税込・1室）

■手荷物のお預かりについて
チェックインより前にご到着のお客様は、本日 ${formatJstTime(baggage)} よりフロントにて手荷物のみ先行してお預かりいたします。
正式なチェックインは上記時刻からとなりますので、あらかじめご了承ください。

ホテル日航大阪 予約課`;

  const promoBody = `件名: 【今週末限定】人気温泉宿が最大40%OFF！週末おすすめ特集

お客様

いつもご利用ありがとうございます。今週末のおすすめ特集をお届けします！

★ 人気温泉地ランキング TOP5
★ 今だけのタイムセール対象施設
★ ポイント3倍キャンペーン実施中

配信停止をご希望の方はマイページ設定からお手続きください。

トラベルメールマガジン編集部`;

  return [
    { id: "jal", source: "JAL", subject: "e-チケットお客様控え", body: jalBody, status: "new", events: [] },
    { id: "ikyu", source: "一休.com", subject: "ご予約確認 · 本湖月", body: ikyuBody, status: "new", events: [] },
    { id: "nikko", source: "ホテル日航大阪", subject: "ご予約内容の確認", body: nikkoBody, status: "new", events: [] },
    { id: "promo", source: "週末おすすめ特集", subject: "予約情報なし", body: promoBody, status: "new", events: [] },
  ];
}
