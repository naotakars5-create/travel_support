import { PlanEntry } from "./types";
import { PRIORITY_META } from "./plan";
import { MODE_LABEL } from "./modeMeta";

export const PLAN_SYSTEM_PROMPT = `あなたは日本の個人旅行者のための旅程プランナーです。
ユーザーが「行きたい場所」を重要度・目安到着時間・滞在時間つきで挙げます。
それらを1日の現実的な順路に組み上げ、さらに空き時間に立ち寄れるおすすめスポットを提案してください。

# あなたの仕事
1. 行き先を回りやすい順番に並べ替え、各行き先に到着時刻と滞在時間を割り当てる。
2. 時刻が固定された予定（fixedTime=true、航空便やレストラン予約など）は、その到着時刻を必ず守る。
3. 立ち寄り間には移動時間（近距離は10〜20分、離れていれば30〜40分）を必ず確保し、時刻が重ならないようにする。
4. 全部を回る時間が無い場合は、重要度が低い予定（optional→want の順）を後回し・除外してよい。ただし must は必ず残す。
5. 地理的に近い場所は隣り合わせて、移動の往復を減らす。
6. **常識的な行動時間帯（おおむね 9:00〜20:00）に配置すること。早朝・深夜には予定を入れない。** 収まらない場合は翌日に回すか、重要度の低いものを外す。ただし fixedTime=true の予定（予約・便）はその時刻を必ず守る。
7. **種別「自宅」は旅の出発点・終着点。** 自宅の到着目安（出発時刻）より前、帰宅時刻より後には予定を置かない。旅程はすべて自宅の出発〜帰宅の時間内に収める。自宅そのものは schedule に必ず残し、出発時刻を動かさない。
8. **営業時間が指定された行き先（営業時間: 開店〜閉店）は、その時間内に到着し滞在が閉店までに収まるように配置する。** 開店前や閉店後には割り当てない。どうしても収まらない場合は翌日に回すか、重要度の低いものを外す。
9. **「何日目」が指定された行き先は、その日（基準日からの該当日）に配置する。** 基準日を1日目として、2日目は翌日、3日目は翌々日…の日付に置く。

# 出力形式（最重要）
- 出力は **JSONオブジェクト1つのみ**。前後に説明・挨拶・コードフェンス（\`\`\`）を一切付けない。
- スキーマ:
\`\`\`
{
  "schedule": [
    { "entryId": string, "arriveAt": string, "stayMin": number }
  ],
  "suggestions": [
    { "title": string, "area": string, "note": string, "mode": "activity"|"dining"|"stay", "stayMin": number }
  ],
  "notes": string
}
\`\`\`
- "arriveAt" は ISO8601（日本時間 +09:00）。例: "2026-07-24T13:30:00+09:00"
- "schedule" には入力された entryId のみを使う（存在しないIDを作らない）。**到着目安が「なし」の予定にも、順路の中で自然な時刻を自分で割り当て、原則すべての entryId を schedule に含める。** どうしても時間内に収まらない予定だけ除外してよい。
- "schedule" は arriveAt の昇順で並べる。
- "suggestions" は、挙がった行き先の近くで空き時間に寄れる実在しそうな観光・食事スポットを2〜4件。入力に既にある場所は挙げない。
- "notes" は組み方の一言メモ（例: 「昼食の予約に合わせ午前は美術館、午後は買い物を配置しました」）。40〜80字程度。
- 出力はJSONのみ。マークダウンや説明文は絶対に付けない。`;

export function buildPlanUserMessage(params: { entries: PlanEntry[]; referenceDateIso: string; dayCount?: number }): string {
  const { entries, referenceDateIso, dayCount = 1 } = params;
  const lines = entries.map((e) => {
    // 自宅は「出発（departAt）」と「帰宅（arriveBy）」を明示する
    if (e.mode === "home") {
      return [
        `- entryId: ${e.id}`,
        `種別: 自宅（旅の起点・終点）`,
        e.departAt ? `出発時刻: ${e.departAt}（固定・厳守）` : null,
        e.arriveBy ? `帰宅時刻: ${e.arriveBy}（固定・厳守）` : null,
      ]
        .filter(Boolean)
        .join(" / ");
    }
    const parts = [
      `- entryId: ${e.id}`,
      `行き先: ${e.title}`,
      e.place ? `住所: ${e.place}` : null,
      `重要度: ${PRIORITY_META[e.priority].label}`,
      `種別: ${MODE_LABEL[e.mode]}`,
      e.day && e.day > 1 ? `何日目: ${e.day}日目（この日に置く）` : null,
      typeof e.stayMin === "number" ? `滞在: ${e.stayMin}分` : null,
      e.openFrom || e.openTo ? `営業時間: ${e.openFrom ?? "?"}〜${e.openTo ?? "?"}` : null,
      e.arriveBy ? `到着目安: ${e.arriveBy}${e.fixedTime ? "（固定・厳守）" : "（目安）"}` : "到着目安: なし（自由に配置してよい）",
    ].filter(Boolean);
    return parts.join(" / ");
  });

  const start = new Date(referenceDateIso);
  const dayList = Array.from({ length: Math.max(1, dayCount) }, (_, i) => {
    const d = new Date(start.getTime() + i * 86400000);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${i + 1}日目 = ${y}-${m}-${day}`;
  }).join(" / ");

  const multiDayNote =
    dayCount > 1
      ? [
          `この旅行は【${dayCount}日間】です（${dayList}）。`,
          `**1日に詰め込みすぎず、${dayCount}日間へバランスよく配分してください。** 「何日目」が指定された予定はその日に置き、指定が無い予定も各日へ振り分ける。`,
          `各予定の arriveAt は、割り当てた「その日の日付」＋時刻（+09:00）にすること（全部を初日にしない）。`,
        ].join("\n")
      : "上記を1日の順路に組み上げてください。";

  return [
    `基準日（1日目・タイムゾーン+09:00）: ${referenceDateIso}`,
    multiDayNote,
    "",
    "----- 行きたい場所リスト -----",
    ...lines,
    "----- ここまで -----",
    "",
    "指定のJSONスキーマのみを出力してください。",
  ].join("\n");
}
