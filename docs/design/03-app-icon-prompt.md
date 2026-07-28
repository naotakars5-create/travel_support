# アプリアイコン プロンプト — Have a Good Travel

前提は `00-art-direction.md`。差し替え先は `assets/images/`（`app.json` 参照）。

---

## 先に一つだけ

「旅行バッグに *Have a Good Travel* が手書きで書いてある、おしゃれで洗練された感じ」——
方向性は完全に正しいのですが、**その文字はホーム画面では読めません**。
iPhone のホーム画面アイコンは実寸 **約 60×60pt**、設定アプリの一覧では **29pt** です。
1024px のキャンバスに 22 文字を手書きで入れると、60pt では潰れて灰色のノイズになります。

なので、こう分けるのを推奨します。

| 面 | 表示サイズ | 文字 | 中身 |
| --- | --- | --- | --- |
| **アプリアイコン**（本体） | 60pt | **入れない**（または `HGT` の 3 文字だけ） | バッグ＋ツバメ |
| スプラッシュ | 200pt 相当 | 手書きロゴを**下に添える** | バッグ or ツバメ＋ロゴ |
| ストア掲載画像 / OGP | 大きい | **手書きロゴが主役** | バッグ＋手書きレタリング |
| アプリ内ヘッダー・しおり表紙 | 中 | 手書きロゴ | ロゴのみ |

「手書きの Have a Good Travel」は**ロゴタイプとして別素材で作り**、アイコンには入れない。
これが一番おしゃれで、一番洗練されて見えます。以下、両方のプロンプトを用意しました。

---

## 1. アイコンの案（4 方向）

### 案 A ★推奨 — バッグ＋ツバメ（文字なし）

旅行バッグを正面やや斜めから。バッグのタグ部分に**ツバメのシルエット**が刻印されている。
60pt でも「鞄」と「鳥」が両方読める。ブランドマークとアイコンが一致するので記憶に残る。

```text
App icon design, 1024x1024, flat 2D vector, minimal, no text.

SUBJECT:
A soft leather duffel travel bag seen from a slight three-quarter front angle,
centered, drawn with thin uniform ink #23201D linework, flat terracotta #D96F4C body,
ink handles and ink shoulder strap, one small rectangular luggage tag hanging from
the handle. A single solid ink swallow silhouette is stamped on the side of the bag,
wings sharply tapered, reading clearly as a bird.
Background: solid cream #F4EFE5, edge to edge, no border, no rounded corner drawn in.

STYLE:
Flat 2D vector, mid-century minimal, thin hand-drawn tapered ink linework of uniform
weight, absolutely no gradients, no shadows, no 3D, no texture, no glow, no bevel.
Only these colors: cream #F4EFE5, sand #E7DFD0, ink #23201D, terracotta #D96F4C.
The bag occupies 62% of the canvas height, perfectly centered, generous even margin.
Bold simple silhouette that stays legible when scaled down to 60x60 pixels.

NEGATIVE:
no text, no letters, no watermark, no gradient, no drop shadow, no 3D render,
no photorealism, no glossy highlight, no app store bevel, no rounded corner mask,
no pink, no salmon, no busy detail, no straps clutter, no zipper teeth detail.
```

### 案 B — バッグ＋手書きタグ（文字を"読ませない"入れ方）

タグに手書き文字が**ある**が、読ませることは目的にしない。近くで見た時だけ気づく粋。
60pt では「タグに何か書いてある」に見えて、それで正解。

```text
（案 A の SUBJECT を下記に差し替え）
SUBJECT:
A soft leather duffel travel bag seen from a slight three-quarter front angle, centered,
thin uniform ink #23201D linework, flat terracotta #D96F4C body, ink handles.
A small cream luggage tag hangs from the handle, and on the tag the words
"Have a Good Travel" are written in a fine, elegant, slightly slanted handwritten
script in ink, small and unobtrusive — roughly 12% of the canvas width, three short
lines, clearly handwriting rather than a typeface.
Background: solid cream #F4EFE5, edge to edge.
（NEGATIVE から "no text, no letters" を外し、代わりに以下を足す）
no bold display lettering, no large text, no all-caps, no logo lockup, no serif type.
```

### 案 C — ツバメだけ（最もミニマル）

参考画像のツバメをそのまま。旅行バッグは捨てる案。
判別性は最強だが「旅行アプリ」だとは分からない。ブランドが育ってから移行する着地点。

```text
SUBJECT:
A single swallow in flight, solid ink #23201D silhouette, long razor-sharp tapered
wings sweeping into a fine point, one continuous calligraphic curve, flying up to
the right, centered with generous margin, occupying 56% of the canvas.
Background: solid terracotta #D96F4C, edge to edge.
（または背景 cream #F4EFE5 の反転版も作る）
```

### 案 D — バッグの中からツバメ（ストーリー型）

開いたバッグから 1 羽のツバメが飛び立つ。意味は一番きれいだが、60pt では要素が 2 つで少し混む。
スプラッシュやストア画像向き。

```text
SUBJECT:
A small open travel bag at the bottom of the frame, thin ink linework with a flat
terracotta #D96F4C body, and one solid ink swallow flying up and to the right out of
the open top, leaving a short thin dashed ink arc behind it.
Background: solid cream #F4EFE5, edge to edge. Composition balanced on a diagonal.
```

---

## 2. 手書きロゴタイプ（別素材）

アイコンには入れず、スプラッシュ・しおり表紙・ストア画像・OGP で使う。

```text
Logotype design, transparent background, 2400x800, vector.

SUBJECT:
The phrase "Have a Good Travel" hand-lettered in a single elegant modern calligraphic
script, thin monoline strokes of uniform weight, gentle slant, generous letter spacing,
long relaxed entry and exit strokes, the crossbar of the "G" extending into a long
tapered swoop that echoes a swallow's wing. Set on two lines:
"Have a" smaller on the first line, "Good Travel" larger on the second, left aligned.
Color: ink #23201D only, on transparent background.

STYLE:
Refined, understated, editorial. Feels handwritten by a calm person with a fine pen —
not a brush script, not a marker, not a signature scrawl, not a wedding font.
No flourishes, no swashes beyond the single G swoop, no underline, no frame.
Even optical weight, clean vector-ready curves.

VARIANTS to produce:
1. two-line left aligned (primary)
2. one-line horizontal (for headers)
3. one-line + small solid ink swallow at the end of the "l" (lockup)
4. all the above in cream #F4EFE5 for dark backgrounds

NEGATIVE:
no serif typeface, no sans-serif typeface, no 3D, no shadow, no gradient, no outline
text, no thick brush strokes, no grunge texture, no ribbon banner, no circle badge,
no color other than ink, no misspelling — the text must read exactly
"Have a Good Travel".
```

> レタリングの綴りは生成 AI が高確率で崩します。**必ず 1 文字ずつ目視確認**するか、
> `Cormorant` + 手書き系（`Petit Formal Script` / `La Belle Aurore`）で組んでから
> パスを手で整える方が確実です。

---

## 3. 書き出しが必要なファイル（`app.json` 対応）

| ファイル | サイズ | 内容 | 追加プロンプト |
| --- | --- | --- | --- |
| `assets/images/icon.png` | 1024×1024 | 案 A。背景ベタ（透過不可） | — |
| `assets/images/android-icon-foreground.png` | 1024×1024 | バッグ＋ツバメのみ・**透過** | `Transparent background. The subject fits inside the central 66% safe circle — nothing important outside a 660px centered circle.` |
| `assets/images/android-icon-background.png` | 1024×1024 | 生成り `#F4EFE5` のベタ 1 色 | 画像生成不要。単色で書き出す |
| `assets/images/android-icon-monochrome.png` | 1024×1024 | 同シルエットを**単色ベタ黒＋透過** | `Pure solid black silhouette of the same bag-and-swallow shape on transparent background, no linework, no interior detail, filled shape only.` |
| `assets/images/splash-icon.png` | 1024×1024 | ツバメ or バッグ・透過 | `Transparent background, the subject at 70% of the canvas, centered.` |
| `assets/images/favicon.png` | 48×48 相当 | ツバメのみ（案 C） | 要素を 1 つに落とす |
| ✚ `public/logo-wordmark.png` / `.svg` | 2400×800 | §2 の手書きロゴ・透過 | — |
| ✚ ストア用 1 枚目 | 1284×2778 | バッグ＋手書きロゴ | 下記 |

### ストア掲載画像 1 枚目

```text
App Store feature image, 1284x2778, flat 2D vector, cream #F4EFE5 background.
Upper half: the hand-lettered phrase "Have a Good Travel" in a fine ink monoline
script, centered, with a small solid ink swallow flying above the last word, and
below it the Japanese line 旅のしおりを、いちばん静かに。in a thin serif 明朝, ink,
much smaller.
Lower half: a soft leather duffel travel bag in flat terracotta #D96F4C with thin ink
linework, standing on a bare cream ground with a single thin ink horizon line.
No shadows, no gradients, huge negative space, editorial poster composition.
```

---

## 4. 検品

- [ ] 60×60px に縮小して、何のアプリか 1 秒で分かる
- [ ] 29×29px でも輪郭が保たれる（潰れたら要素を減らす）
- [ ] iOS の角丸マスク（22.37% コーナー半径）で主題が欠けない
- [ ] Android の円形・角丸・スクワークル全マスクで欠けない（中央 66% に収まっている）
- [ ] ダークモードのホーム画面でも沈まない（背景が生成りなので基本 OK）
- [ ] 純白 `#FFFFFF` と純黒 `#000000` が混ざっていない
- [ ] 文字を入れた版は、綴りが `Have a Good Travel` で 1 文字も間違っていない
