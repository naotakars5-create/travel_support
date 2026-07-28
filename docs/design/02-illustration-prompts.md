# 画材（イラスト素材）プロンプト集 — Have a Good Travel

全 **78 点**。前提は `00-art-direction.md`。

## 使い方

生成時は必ず **①共通スタイルブロック ＋ ②各素材の SUBJECT 行** の順で貼る。
SUBJECT だけを渡すと、モデルは勝手にピンクと影を足す。

```text
（ここに 00-art-direction.md §4 の STYLE / PALETTE / COLOR BALANCE / NEGATIVE をまるごと貼る）

SUBJECT:
（下の表の SUBJECT を 1 行貼る）

OUTPUT: 1024x1024, transparent background, centered, 12% margin on all sides.
```

保存先は `public/illustrations/{ファイル名}.png`。
既存の 10 点（`cover-default` / `empty-suitcase` / `loading-map` / `packed-done` /
`avatar-01,02` / `spot-bench-01,02` / `icon-home` / `icon-bed`）は
**同じ名前のまま新スタイルで描き直す**（コード変更なしで差し替わる）。
`✚` が付いているものは新規追加。追加後 `src/lib/illustrations.ts` の
`IllustrationName` に名前を足す。

---

## A. ブランドマーク（ツバメ）— 5 点

ここだけは **単色（墨 `#23201D`）のみ**。色を入れない。

| ファイル名 | 用途 | SUBJECT |
| --- | --- | --- |
| ✚ `mark-swallow` | ブランドシンボル | A single swallow in flight, pure solid ink #23201D silhouette on transparent background, long razor-sharp tapered wings sweeping into a fine point, one continuous elegant curve, tiny pointed beak, no legs, no eye, no outline, calligraphic one-stroke feeling, side view, flying up to the right |
| ✚ `mark-swallow-pair` | 共有・同行者 | Two swallows in flight, solid ink silhouettes, one large in front and one smaller behind and above, same tapered calligraphic wing shape, arranged on a gentle diagonal, generous space between them |
| ✚ `mark-swallow-trail` | 見出しの装飾罫 | One small solid ink swallow at the end of a long thin horizontal dashed arc, the arc drawn as a 1px ink line that fades into short dashes on the left, minimal, wide horizontal composition |
| ✚ `mark-swallow-circle` | 認証・スタンプ | A small solid ink swallow centered inside a thin 1px ink circle, like a wax seal or a passport stamp, the circle is a single perfect thin ring, nothing else inside |
| ✚ `mark-monogram` | 署名・フッター | The letters H G T as a minimal monogram, thin uniform ink strokes, geometric serif, the crossbar of the H extended into a swallow-wing taper, wide letter spacing, no box |

---

## B. オンボーディング（3 枚組）— 3 点

各カード 200px 表示。既存の 3 枚を差し替える。

| ファイル名 | 用途 | SUBJECT |
| --- | --- | --- |
| `empty-suitcase` | 1枚目「旅ナビとは」 | An open empty suitcase standing upright, ink linework, cream interior, one terracotta #D96F4C luggage strap as the only accent, a folded map and a single swallow silhouette floating just above the open lid, calm and inviting, three-quarter view |
| `loading-map` | 2枚目「共有できる」 | Two elongated stylized travellers standing side by side looking at a large folded paper map held between them, faceless, ink hair, cream clothing, one traveller's tote bag in terracotta, the map is cream with thin ink route lines and one small terracotta pin |
| ✚ `onboarding-shiori` | 3枚目「しおりができる」 | A slim hand holding an open booklet, the booklet pages in cream with thin ink lines suggesting a timetable and a small map, a sand bookmark ribbon hanging from the spine, a tiny swallow flying out of the page, minimal, side view |

---

## C. 空状態（エンプティ）— 9 点

| ファイル名 | 用途 | SUBJECT |
| --- | --- | --- |
| ✚ `empty-trips` | 旅がまだない | A single empty travel bag sitting alone on the ground, ink linework, cream body with a sand base and ink handles, one small terracotta luggage tag, a lot of empty space around it, quiet and still |
| ✚ `empty-plan` | 行きたい場所が0件 | A blank cream notepad lying flat with three thin ruled ink lines and no writing, a pencil resting diagonally across it, one small terracotta dot at the top of the first line, top-down view |
| ✚ `empty-itinerary` | 旅程が未生成 | Loose paper cards floating in a gentle vertical arc, waiting to be arranged into a timeline, each card cream with two thin ink text lines, one card is terracotta, thin ink dotted line threading through them |
| ✚ `empty-map` | 地図にピンがない | A large minimal cream map sheet with thin ink coastline and grid lines, completely empty of markers, one thin ink dashed line curving off the right edge, no labels |
| ✚ `empty-photos` | 写真が未登録 | A simple ink-outlined camera resting on a sand surface with its lens cap off beside it, cream body, one terracotta shutter button, no strap, side view |
| ✚ `empty-packing` | 持ち物リストが空 | An empty cream packing cube unzipped and flat, thin ink zipper line, sand interior, one terracotta zipper pull, top-down view, nothing inside |
| ✚ `empty-search` | 検索結果0件 | A thin ink magnifying glass lying at rest on a cream surface, its circle empty, a single small terracotta dot just outside the glass as if the answer is elsewhere, minimal |
| ✚ `empty-shared` | 共有相手がいない | Two chairs facing each other at a small round cafe table, one chair empty, thin ink linework, sand tabletop, one terracotta cup on the table, side view |
| ✚ `empty-weather` | 天気が取れない | A small cloud drawn with a single thin ink outline, hollow, with a short dashed ink line under it, nothing else, very minimal |

---

## D. 達成・完了 — 5 点

マスタード `#F0B429` を使ってよいのはこのカテゴリだけ。

| ファイル名 | 用途 | SUBJECT |
| --- | --- | --- |
| `packed-done` | 持ち物完了 | A closed packed travel bag with a mustard #F0B429 luggage tag, ink linework, cream body, a small mustard check mark floating beside it, three short ink motion lines suggesting readiness |
| ✚ `done-itinerary` | 旅程が組み上がった | A completed timeline: a thin vertical ink line with five filled dots, the top four in ink and the last in mustard, a tiny swallow flying off the top end, vertical composition |
| ✚ `done-trip` | 旅が終わった | A traveller seen from behind walking away with a bag over the shoulder, elongated proportions, ink hair and shoes, cream clothing, one terracotta scarf trailing, a mustard sun low on the horizon drawn as a thin circle outline |
| ✚ `done-stamp` | 達成スタンプ | A passport stamp shape: a thin ink irregular rounded rectangle frame with a small swallow and two thin horizontal rule lines inside, slightly rotated 8 degrees, mustard fill at 15% behind the frame |
| ✚ `done-checklist` | 全部チェックした | A short vertical list of four cream rows, each with a small mustard filled circle and a thin cream check, the last row's check mid-draw, minimal, no text |

---

## E. 旅人キャラクター（情景）— 10 点

参考イラストに一番近いカテゴリ。**顔は描かない**。有彩色は 1 人につき 1 アイテムだけ。

| ファイル名 | 用途 | SUBJECT |
| --- | --- | --- |
| ✚ `scene-traveller-hat` | ヒーロー / 見出し | A single elongated traveller standing in three-quarter back view, wide-brim cream sun hat held with one raised hand, cream shirt and shorts, ink hair and ink boots, a large backpack in terracotta #D96F4C as the only colored object, 9 heads tall, thin ink linework, standing on a bare cream ground |
| ✚ `scene-traveller-phone` | 計画中 | An elongated traveller standing and looking down at a phone held in both hands, faceless, ink bob hair, cream shirt, sand skirt, a small ink camera hanging at the hip, one terracotta sneaker accent, calm posture |
| ✚ `scene-two-planning` | 二人で計画 | Two elongated travellers standing and talking, one pointing forward, the other looking at a phone, both faceless with ink hair, cream and sand clothing, exactly one terracotta item total (a single jacket), ink backpacks and ink shoes, wide gap of empty cream between them |
| ✚ `scene-walking` | 移動中 | A traveller mid-stride walking to the right, long thin legs, ink boots, cream coat flowing back, a sand tote bag, thin ink line under the feet as the ground, a small swallow flying ahead |
| ✚ `scene-waiting-bench` | 待ち時間 | A traveller sitting on a long thin bench, legs crossed, a bag placed beside them, cream clothing, ink hair, sand bench, one terracotta cup in hand, side view, lots of empty space to the right |
| ✚ `scene-train-window` | 電車移動 | A traveller seen from behind sitting and looking out a large rounded train window, the window frame in thin ink, sand seat, cream interior, outside is empty cream with two thin ink horizontal lines and a tiny swallow |
| ✚ `scene-photo` | 写真を撮る | A traveller standing on tiptoe raising a small camera to frame a shot, elongated silhouette, ink hair and camera, cream clothing, one terracotta strap, three thin ink lines radiating from the lens |
| ✚ `scene-map-reading` | 道を確かめる | A traveller crouching on one knee with a large paper map spread on the ground, the map in cream with thin ink route lines and one terracotta pin, ink hair tied up, cream clothing |
| ✚ `scene-arrival` | 到着 | A traveller standing still with a bag set down beside them, both arms relaxed, looking up, cream clothing, ink boots, one terracotta hat, three very thin ink arcs above suggesting open sky |
| ✚ `scene-night-walk` | 夜の街歩き | Two elongated travellers walking side by side at night, ink silhouettes almost fully solid, cream background, one small 藍 #4A6B8A street lamp glow drawn as a flat circle, no gradient, very quiet |

---

## F. アバター（マイページ）— 8 点

**72px の円の中**に入る。バストアップ、輪郭が円で切れても成立する構図で。

| ファイル名 | SUBJECT |
| --- | --- |
| `avatar-01` | Bust portrait of a faceless traveller wearing a wide-brim cream sun hat, ink bob hair, cream collar, centered head and shoulders, flat sand circular background, no facial features except two tiny ink dots |
| `avatar-02` | Bust portrait of a faceless traveller with short ink hair and round thin ink glasses, cream shirt, one terracotta collar detail, flat sand circular background |
| ✚ `avatar-03` | Bust portrait of a faceless traveller with a long ink ponytail and a cream scarf, sand circular background, minimal |
| ✚ `avatar-04` | Bust portrait of a faceless traveller wearing a terracotta beanie, ink hair edges showing, cream turtleneck, sand circular background |
| ✚ `avatar-05` | Bust portrait of a faceless traveller with an ink bucket hat and a camera strap across the chest, cream shirt, sand circular background |
| ✚ `avatar-06` | Bust portrait of a faceless traveller with curly ink hair and small ink hoop earrings, cream shirt, sand circular background |
| ✚ `avatar-07` | Bust portrait of a faceless traveller wearing cream headphones around the neck, ink short hair, sand circular background |
| ✚ `avatar-08` | A solid ink swallow silhouette centered on a sand circular background, for users who do not want a person |

---

## G. 空き時間・すきま — 5 点

旅程の空白ブロックに 48px で出る。**細部を捨てて、48px で読める形**にする。

| ファイル名 | SUBJECT |
| --- | --- |
| `spot-bench-01` | A simple park bench in side view, thin ink linework, sand seat, three thin ink legs, a single small swallow perched on the backrest, nothing else |
| `spot-bench-02` | A park bench seen at a slight angle with a paper cup left on it, thin ink linework, sand seat, one terracotta cup |
| ✚ `spot-cafe` | A small round cafe table with one cup and a saucer, thin ink linework, sand tabletop, one terracotta cup, top-down-ish three-quarter view |
| ✚ `spot-tree` | A single slender tree with a thin ink trunk and a simple rounded sand canopy, no leaf detail, a tiny swallow above it |
| ✚ `spot-fountain` | A small round fountain with three thin ink water arcs, sand basin, 藍 #4A6B8A water at 20% flat fill, no ripples |

---

## H. スポットのカテゴリアイコン — 12 点

**線画のみ・256px・SVG 化前提**。塗りは使わず、アクセントは 1 点だけ許可。

| ファイル名 | 用途 | SUBJECT |
| --- | --- | --- |
| `icon-home` | 自宅・出発地 | A minimal house drawn with a single continuous thin ink line, simple triangular roof and one square window, no door detail, 1.5px uniform stroke, line-art icon, transparent background |
| `icon-bed` | 宿 | A minimal bed in side view drawn with thin uniform ink lines, one pillow, flat sand blanket, no legs detail, line-art icon |
| ✚ `icon-food` | 食事 | A fork and a knife crossed at a shallow angle, thin uniform ink lines, no plate, line-art icon |
| ✚ `icon-cafe` | カフェ | A cup on a saucer with one thin ink steam curl, thin uniform lines, line-art icon |
| ✚ `icon-shrine` | 神社・寺 | A torii gate seen straight on, two uprights and two crossbeams, thin uniform ink lines, line-art icon |
| ✚ `icon-museum` | 美術館・博物館 | A simple building facade with three thin columns and a flat pediment, thin uniform ink lines, line-art icon |
| ✚ `icon-nature` | 自然・公園 | Two simple mountains with a thin ink outline and a small circle sun between them, line-art icon |
| ✚ `icon-beach` | 海・海岸 | Two thin horizontal wave lines and a small palm-free horizon with one tiny swallow above, line-art icon |
| ✚ `icon-onsen` | 温泉 | A wide shallow oval basin with three thin rising steam curls, thin uniform ink lines, line-art icon |
| ✚ `icon-shop` | 買い物 | A simple tote bag with two handles, thin uniform ink lines, one terracotta dot on the bag face, line-art icon |
| ✚ `icon-photo-spot` | 撮影スポット | A minimal camera body with a circle lens, thin uniform ink lines, line-art icon |
| ✚ `icon-airport` | 空港 | A minimal airplane seen from above drawn with thin uniform ink lines, swept wings echoing the swallow silhouette, line-art icon |

---

## I. 交通手段 — 7 点

旅程の移動チップに 20〜24px で入る。**アプリ側の `mode` トークンに対応**。

| ファイル名 | 用途 | SUBJECT |
| --- | --- | --- |
| ✚ `mode-walk` | 徒歩 | Two minimal footprint shapes at a slight angle, thin ink outlines only, line-art icon, 1.5px uniform stroke |
| ✚ `mode-rail` | 電車 | A train seen head-on, rounded top, one wide window and two round lights, thin uniform ink lines, line-art icon |
| ✚ `mode-bus` | バス | A bus seen from the side, rounded corners, two windows and two wheels, thin uniform ink lines, line-art icon |
| ✚ `mode-air` | 飛行機 | A single airplane silhouette with long tapered swept wings, solid ink, deliberately echoing the brand swallow, side-top view |
| ✚ `mode-car` | 車 | A small car seen from the side with a rounded cabin and two wheels, thin uniform ink lines, line-art icon |
| ✚ `mode-bike` | 自転車 | A bicycle in side view, two thin ink circles and a minimal frame, line-art icon |
| ✚ `mode-ferry` | 船 | A small ferry hull with one thin ink wave line beneath, line-art icon |

---

## J. 天気 — 8 点

`api/weather` の表示用。**線画のみ**。雨と晴れだけ色を許す。

| ファイル名 | SUBJECT |
| --- | --- |
| ✚ `weather-sun` | A single thin ink circle with six short straight rays evenly spaced, line-art icon, one mustard #F0B429 flat fill inside the circle at 20% |
| ✚ `weather-cloud` | One simple cloud drawn with a single thin continuous ink outline, hollow, line-art icon |
| ✚ `weather-partly` | A thin ink circle sun partly behind a single thin ink cloud outline, line-art icon |
| ✚ `weather-rain` | A thin ink cloud outline with three short vertical strokes below in 藍 #4A6B8A, line-art icon |
| ✚ `weather-snow` | A thin ink cloud outline with three tiny six-point ink asterisks below, line-art icon |
| ✚ `weather-wind` | Three thin horizontal ink lines with curled ends, no cloud, line-art icon |
| ✚ `weather-night` | A thin ink crescent moon outline with one tiny four-point star, line-art icon |
| ✚ `weather-hot` | A thin ink thermometer outline with a terracotta #D96F4C filled bulb, line-art icon |

---

## K. 持ち物 — 10 点

持ち物リストのカテゴリ見出しに 48px で使う。

| ファイル名 | SUBJECT |
| --- | --- |
| ✚ `pack-clothes` | A neatly folded stack of three garments, thin ink outlines, cream and sand alternating, one terracotta edge on the middle item |
| ✚ `pack-toiletry` | A small zip pouch with a thin ink zipper line and a toothbrush sticking out, cream body, sand base |
| ✚ `pack-charger` | A coiled charging cable and a small square adapter, thin ink lines, cream adapter |
| ✚ `pack-documents` | A passport and a boarding pass slightly fanned out, thin ink outlines, cream pages, one terracotta cover, a tiny swallow embossed on the cover |
| ✚ `pack-medicine` | A small first-aid pouch with a thin ink cross on the front, cream body, sand trim |
| ✚ `pack-camera` | A compact camera with a strap looped beside it, thin ink lines, cream body, one terracotta shutter button |
| ✚ `pack-shoes` | A pair of ankle boots seen from the side, solid ink, thick soles, cream laces drawn as thin loops |
| ✚ `pack-umbrella` | A folded umbrella lying diagonally, thin ink lines, sand fabric, one terracotta handle |
| ✚ `pack-snack` | A paper bag with a rolled top and one thin ink fold line, cream body, sand shadowless base |
| ✚ `pack-water` | A slim reusable water bottle standing upright, thin ink outline, cream body, one 藍 #4A6B8A cap |

---

## L. カバー / ヒーロー（横長 1600×900）— 8 点

写真が無い旅のカバーに使う。**背景は生成りベタ、被写体は下 2/3 に寄せる**
（上にタイトルが乗るため、上部 1/3 は空ける）。

| ファイル名 | 用途 | SUBJECT（`OUTPUT: 1600x900` に変える） |
| --- | --- | --- |
| `cover-default` | 既定カバー | A wide horizontal minimal landscape: a thin ink horizon line, two simple sand hills on the right, one small solid ink swallow flying in the upper right, a lone elongated traveller with a backpack standing small at the lower left, terracotta backpack, the top third of the canvas left completely empty cream |
| ✚ `cover-city` | 街 | A wide horizontal skyline of simple rectangular buildings drawn with thin ink outlines and sand fills, varying heights, no windows detail, one terracotta rooftop, two swallows above, top third empty |
| ✚ `cover-sea` | 海 | A wide horizontal seascape: two thin ink wave lines, a flat 藍 #4A6B8A band at 18% for the water, one small sailboat in ink outline, one swallow, top third empty |
| ✚ `cover-mountain` | 山 | A wide horizontal range of three overlapping simple peaks in thin ink outline with sand fills, one thin winding ink trail, one swallow, top third empty |
| ✚ `cover-onsen` | 温泉・旅館 | A wide horizontal composition of a low traditional roof line in thin ink, a stone lantern silhouette in ink, three thin steam curls, sand ground, top third empty |
| ✚ `cover-spring` | 春 | A wide horizontal composition with one slender tree branch entering from the right, tiny simple five-petal blossoms in clay #E8A18B, two swallows, everything else empty cream |
| ✚ `cover-summer` | 夏 | A wide horizontal composition with a thin ink horizon, a mustard sun circle outline high right, two thin cloud outlines, a small traveller silhouette walking at the lower left |
| ✚ `cover-winter` | 冬 | A wide horizontal composition with a thin ink horizon, three bare thin trees in ink, sand ground band, a few tiny ink dots as snow, one swallow |

---

## M. 状態表示（ローディング / エラー / オフライン）— 5 点

| ファイル名 | 用途 | SUBJECT |
| --- | --- | --- |
| `loading-map` | 読込中（既存流用） | A folded paper map partly unfolded, thin ink linework, cream paper with sand fold panels, one thin ink route line curving across it ending in a small terracotta pin, three tiny ink dots trailing after the pin to suggest progress |
| ✚ `loading-swallow` | AI生成中 | A single ink swallow mid-flight with a long thin dashed ink trail curving behind it, the trail drawn as evenly spaced dashes, designed to be animated with a stroke-dash offset, horizontal composition |
| ✚ `state-offline` | オフライン | A paper airplane resting nose-down on a flat sand ground, thin ink outline, cream body, one short ink dashed arc above it that stops abruptly |
| ✚ `state-error` | エラー | A signpost with two arm boards pointing in opposite directions, thin ink lines, sand boards with no text, slightly tilted post, minimal |
| ✚ `state-notfound` | 見つからない | A thin ink dashed route line that ends in the middle of empty cream space with a small open circle instead of a pin, nothing else |

---

## N. 装飾パーツ — 6 点

UI に敷く飾り。**SVG 必須**（伸縮するため）。

| ファイル名 | 用途 | SUBJECT |
| --- | --- | --- |
| ✚ `deco-rule-swallow` | セクション区切り | A long thin horizontal ink rule with a small solid swallow sitting at its center, the rule fading into short dashes toward both ends, very wide aspect ratio |
| ✚ `deco-corner-frame` | しおり表紙の枠 | Four thin ink corner brackets forming an implied rectangle frame, each corner a simple right angle with a tiny inward tick, nothing in the middle |
| ✚ `deco-ribbon` | 栞のリボン | A slim vertical bookmark ribbon hanging down with a notched V end, flat terracotta #D96F4C fill and one thin ink outline, no folds, no shading |
| ✚ `deco-ticket` | チケット風の見出し | A horizontal ticket stub shape with two semicircular notches on the sides and a vertical dashed perforation line, thin ink outline, cream fill, sand stub end |
| ✚ `deco-dotted-path` | 移動の点線 | A gently curving thin ink dotted path from the lower left to the upper right, evenly spaced round dots, ending with a small filled circle |
| ✚ `deco-stamp-frame` | 日付スタンプ | A slightly irregular thin ink double-ring circular stamp frame, empty inside, rotated 6 degrees, designed to have a date typeset in the middle |

---

## 生成後チェックリスト

各素材について、この 7 項目を通す。1 つでも落ちたら描き直し。

- [ ] 背景に彩度のある色が残っていない（生成り or 透過）
- [ ] 使っている色が規定 6+2 色だけ（スポイトで実測）
- [ ] 有彩色の面積が 20% 以下
- [ ] 影・グラデーション・立体感が 1 箇所も無い
- [ ] 線幅が 1 種類に揃っている
- [ ] 48px に縮小しても何の絵か分かる
- [ ] 生成り `#F4EFE5` の上に置いても輪郭が消えない（純白が混ざっていない）
