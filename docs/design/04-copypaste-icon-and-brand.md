# コピペ用プロンプト ① アイコン・ロゴ・ブランド

**1 ブロック＝1 プロンプト。そのまま貼れば完結**するように書いてある（スタイル指定を各文に埋め込み済み）。
画材（アプリ内イラスト 78 点）は [`05-copypaste-illustrations.md`](./05-copypaste-illustrations.md)。

---

## 0. 最初に読む — 78 点の絵柄を揃えるコツ

バラバラに生成すると必ず絵柄がズレます。この順でやると揃います。

1. **まず「スタイルシート」を 1 枚だけ生成する**（下の §1）。気に入るまでここを粘る。
2. その 1 枚を**参照画像として毎回添付**する。
   - Midjourney → 生成した画像の URL を `--sref <URL>` で指定
   - GPT-image / Nano Banana / Gemini → 画像を添付して「この絵柄と線幅・配色を厳密に合わせて」
   - Stable Diffusion → IP-Adapter or Style LoRA
3. その上で下の各プロンプトを貼る。
4. 生成後は**必ずカラーピッカーで色を実測して規定 HEX に置換**する。
   生成 AI は指定しても色を 5〜15% ずらすので、ここは手作業が要る。

### ツール別の末尾パラメータ

| ツール | 追記するもの |
| --- | --- |
| Midjourney v7 | `--ar 1:1 --style raw --stylize 150 --no text, letters, watermark, gradient, shadow, 3d, photorealism, pink, salmon, clutter, anime` |
| GPT-image / DALL·E | パラメータ不要。プロンプト末尾に「Do not include any text or letters.」を足すと効く |
| Nano Banana / Gemini | 参照画像を添付し「Match the reference exactly in line weight, color palette and margin.」を追記 |
| Stable Diffusion (SDXL) | Negative prompt 欄に `text, letters, watermark, gradient, shadow, 3d, photorealistic, pink, salmon, cluttered, anime, thick outline, grain, texture` |
| Recraft / Illustrator 系 | スタイル「Vector / Flat」を選択。SVG 直出しできるのでカテゴリアイコンはこれが最適 |

---

## 1. スタイルシート（最初にこれを 1 枚）★必須

```
A 3x3 grid style reference sheet for a minimal travel app illustration system.
Nine small objects arranged in a clean grid with equal spacing: a travel bag, a swallow bird, a park bench, a folded paper map, a coffee cup, a camera, a train, a suitcase, a house.

Art style: flat 2D vector illustration, minimal editorial style, mid-century modern. Every object is drawn with thin hand-drawn ink linework of one uniform weight with slightly tapered stroke ends. Absolutely no gradients, no shadows, no 3D, no texture, no highlights.

Color palette, strictly these four colors only: cream #F4EFE5 for the background, sand #E7DFD0 for secondary fills, ink #23201D for all linework and solid silhouettes, terracotta #D96F4C used sparingly as a single accent on only three of the nine objects. Chromatic color covers at most 20% of the image.

Flat solid cream #F4EFE5 background edge to edge. Generous even negative space around each object. Square 1:1 composition.

Do not include: text, letters, numbers, watermarks, gradients, drop shadows, 3D rendering, photorealism, pink or salmon tones, busy detail, anime style, thick cartoon outlines, paper texture, grain.
```

---

## 2. アプリアイコン

### 案 A ★推奨 — バッグ＋ツバメ（文字なし）

```
An app icon design. A soft leather duffel travel bag seen from a slight three-quarter front angle, centered in the frame, occupying 62 percent of the canvas height with even generous margins on all sides. The bag has a flat terracotta #D96F4C body, thin uniform ink #23201D outlines, ink handles and an ink shoulder strap, and one small rectangular cream luggage tag hanging from the handle. A single solid ink swallow silhouette is stamped on the side panel of the bag, with long razor-sharp tapered wings that read clearly as a bird even at small size.

Art style: flat 2D vector, minimal, mid-century modern. Thin hand-drawn ink linework of one uniform weight with slightly tapered ends. Absolutely no gradients, no shadows, no 3D, no bevel, no glossy highlight, no texture. Bold simple silhouette that stays legible when scaled down to 60x60 pixels.

Colors, strictly these four only: cream #F4EFE5, sand #E7DFD0, ink #23201D, terracotta #D96F4C. Flat solid cream #F4EFE5 background edge to edge, no border, no rounded corner drawn into the image. Square 1:1.

Do not include: text, letters, watermarks, gradients, drop shadows, 3D rendering, photorealism, glossy highlights, app store bevel, rounded corner mask, pink or salmon tones, zipper teeth detail, clutter, anime style, thick cartoon outlines.
```

### 案 B — バッグ＋手書きタグ（文字を読ませない粋な入れ方）

```
An app icon design. A soft leather duffel travel bag seen from a slight three-quarter front angle, centered, occupying 62 percent of the canvas height. Flat terracotta #D96F4C body, thin uniform ink #23201D outlines, ink handles. A small cream luggage tag hangs from the handle, and on that tag the words "Have a Good Travel" are written in a fine elegant slightly slanted handwritten monoline script in ink, set on three short lines. The lettering is deliberately small and unobtrusive, occupying only about 12 percent of the canvas width, clearly handwriting rather than a typeface.

Art style: flat 2D vector, minimal, mid-century modern. Thin hand-drawn ink linework of one uniform weight. Absolutely no gradients, no shadows, no 3D, no bevel, no texture.

Colors, strictly these four only: cream #F4EFE5, sand #E7DFD0, ink #23201D, terracotta #D96F4C. Flat solid cream #F4EFE5 background edge to edge. Square 1:1.

Spelling must be exactly "Have a Good Travel".

Do not include: large display lettering, all-caps text, a logo lockup, serif or sans-serif typefaces, watermarks, gradients, drop shadows, 3D rendering, photorealism, pink or salmon tones, clutter.
```

### 案 C — ツバメのみ（最もミニマル）

```
An app icon design. A single swallow in flight, rendered as a pure solid ink #23201D silhouette with no outline and no interior detail. Long razor-sharp tapered wings sweeping into fine points, one continuous calligraphic curve as if drawn in a single brush stroke, tiny pointed beak, no visible eye, no legs. The bird flies upward to the right, centered in the frame, occupying 56 percent of the canvas with generous even margins.

Art style: flat 2D vector, minimal, calligraphic, mid-century modern. Absolutely no gradients, no shadows, no 3D, no texture, no glow.

Flat solid terracotta #D96F4C background edge to edge, no border, no rounded corner drawn into the image. Only two colors exist in the image: terracotta #D96F4C and ink #23201D. Square 1:1.

Do not include: text, letters, watermarks, gradients, drop shadows, 3D rendering, photorealism, feather detail, pink or salmon tones, clutter, multiple birds.
```

> 反転版も作る：`background` を `cream #F4EFE5` に、鳥を `ink #23201D` のままに変えて 1 枚。

### 案 D — バッグからツバメが飛び立つ（スプラッシュ向き）

```
An app icon design. A small open travel bag sits at the bottom of the frame, drawn with thin uniform ink #23201D linework and a flat terracotta #D96F4C body. One solid ink swallow silhouette flies up and to the right out of the open top of the bag, leaving a short thin dashed ink arc behind it. The composition is balanced on a gentle diagonal from lower left to upper right, with generous empty space.

Art style: flat 2D vector, minimal, mid-century modern. Thin hand-drawn ink linework of one uniform weight with slightly tapered ends. Absolutely no gradients, no shadows, no 3D, no texture.

Colors, strictly these four only: cream #F4EFE5, sand #E7DFD0, ink #23201D, terracotta #D96F4C. Flat solid cream #F4EFE5 background edge to edge. Square 1:1.

Do not include: text, letters, watermarks, gradients, drop shadows, 3D rendering, photorealism, pink or salmon tones, clutter, motion blur, sparkles.
```

---

## 3. アイコンの派生（`app.json` で使う各ファイル）

### Android adaptive foreground（透過・中央 66% に収める）

```
A soft leather duffel travel bag seen from a slight three-quarter front angle with a solid ink swallow silhouette stamped on its side panel, drawn in flat 2D vector style with thin uniform ink #23201D linework and a flat terracotta #D96F4C body.

Fully transparent background, no background color at all. The entire subject fits inside the central safe circle covering 66 percent of the canvas, perfectly centered, with nothing important outside that circle.

Absolutely no gradients, no shadows, no 3D, no texture. Colors strictly limited to cream #F4EFE5, sand #E7DFD0, ink #23201D, terracotta #D96F4C. Square 1:1.

Do not include: text, letters, background color, watermarks, gradients, drop shadows, 3D rendering, photorealism, pink or salmon tones.
```

### Android monochrome（テーマアイコン用・単色ベタ）

```
A pure solid black silhouette of a duffel travel bag with a swallow shape cut out of its side panel as negative space. Filled shape only, no linework, no interior detail, no outline. Fully transparent background. The silhouette fits inside the central safe circle covering 66 percent of the canvas, centered.

Flat 2D vector, one single solid black fill, absolutely no gray tones, no gradients, no shadows, no texture. Square 1:1.

Do not include: text, letters, color, gray, background, gradients, shadows, outlines, interior detail.
```

### スプラッシュ用（透過・ツバメ）

```
A single swallow in flight rendered as a pure solid ink #23201D silhouette, long razor-sharp tapered wings sweeping into fine points, one continuous calligraphic curve, flying upward to the right. Fully transparent background, no background color at all. The bird is centered and occupies 70 percent of the canvas.

Flat 2D vector, minimal, calligraphic. Absolutely no gradients, no shadows, no 3D, no texture, no glow, no outline. Square 1:1.

Do not include: text, letters, background color, watermarks, gradients, shadows, feather detail, multiple birds.
```

### favicon（16〜48px 用・要素を 1 つに）

```
An extremely simplified favicon. One solid ink #23201D swallow silhouette with two long tapered wings forming a single bold shape, centered on a flat solid cream #F4EFE5 background edge to edge. The shape is thick and simple enough to remain readable at 16x16 pixels, with no thin details, no gaps narrower than 4 percent of the canvas.

Flat 2D vector, two colors only: cream #F4EFE5 and ink #23201D. No gradients, no shadows, no outlines, no texture. Square 1:1.

Do not include: text, letters, thin details, small elements, watermarks, gradients, shadows, extra objects.
```

---

## 4. 手書きロゴタイプ「Have a Good Travel」

アイコンには入れず、スプラッシュ・しおり表紙・ストア画像・OGP で使う素材。

### 4-1. 主版（2 行・左揃え）

```
A hand-lettered logotype reading exactly "Have a Good Travel", written in a single elegant modern calligraphic script with thin monoline strokes of one uniform weight, a gentle consistent slant, generous letter spacing, and long relaxed entry and exit strokes. Set on two lines, left aligned: "Have a" smaller on the first line, "Good Travel" larger on the second line. The crossbar of the capital G extends into a long tapered swoop that echoes the wing of a swallow.

The lettering feels handwritten by a calm person with a fine pen: refined, understated, editorial. Not a brush script, not a marker, not a signature scrawl, not a wedding font. No flourishes or swashes beyond the single G swoop.

Color: ink #23201D only, on a fully transparent background. Clean vector-ready curves, even optical weight. Wide horizontal composition, 3:1 aspect ratio.

Spelling must be exactly "Have a Good Travel" with no missing or extra letters.

Do not include: serif typefaces, sans-serif typefaces, 3D effects, drop shadows, gradients, outlined text, thick brush strokes, grunge texture, ribbon banners, circular badges, underlines, frames, any color other than ink, misspellings.
```

### 4-2. 1 行版（ヘッダー用）

```
A hand-lettered logotype reading exactly "Have a Good Travel" on a single horizontal line, written in an elegant modern calligraphic script with thin monoline strokes of one uniform weight, gentle slant, generous letter spacing, long relaxed entry and exit strokes. The crossbar of the capital G extends into a long tapered swoop echoing a swallow's wing.

Refined, understated, editorial. Handwritten with a fine pen, not a brush, not a marker.

Color: ink #23201D only, on a fully transparent background. Clean vector-ready curves. Very wide horizontal composition, 6:1 aspect ratio.

Spelling must be exactly "Have a Good Travel".

Do not include: typefaces, 3D, shadows, gradients, outlined text, thick brush strokes, texture, banners, badges, frames, other colors, misspellings.
```

### 4-3. ロックアップ（ロゴ＋ツバメ）

```
A logo lockup. The hand-lettered phrase "Have a Good Travel" on a single line in an elegant thin monoline calligraphic script, ink #23201D, with one small solid ink swallow silhouette flying just above and to the right of the final letter, its tapered wings visually rhyming with the script's exit stroke. The swallow is small, about 15 percent of the height of the lettering block, and is clearly a separate mark, not attached to the letters.

Refined, understated, editorial. Fully transparent background. Clean vector-ready curves. Wide horizontal composition, 4:1 aspect ratio.

Spelling must be exactly "Have a Good Travel".

Do not include: typefaces, 3D, shadows, gradients, outlined text, thick brush strokes, texture, banners, badges, frames, colors other than ink, misspellings, multiple birds.
```

> **綴りは AI が高確率で崩します。**1 文字ずつ目視で確認してください。
> 何度やっても崩れる場合は `Petit Formal Script` / `La Belle Aurore` / `Cormorant Italic`
> あたりで組んでからパスを手で整えたほうが早くて確実です。

---

## 5. ブランドマーク（ツバメ）派生 5 点

### `mark-swallow` — 基本形

```
A single swallow in flight, pure solid ink #23201D silhouette on a fully transparent background. Long razor-sharp tapered wings sweeping into fine points, one continuous elegant calligraphic curve as if drawn in a single stroke, a tiny pointed beak, a deeply forked tail, no legs, no visible eye, no outline, no interior detail. Side view, flying upward to the right, centered with generous margin.

Flat 2D vector, minimal, calligraphic. No gradients, no shadows, no 3D, no texture. Square 1:1.

Do not include: text, background color, feather detail, outlines, gradients, shadows, multiple birds, realistic anatomy.
```

### `mark-swallow-pair` — 共有・同行者

```
Two swallows in flight, both pure solid ink #23201D silhouettes on a fully transparent background, with the same long tapered calligraphic wing shape. One larger bird in front and lower, one smaller bird behind and above, arranged on a gentle diagonal with generous empty space between them. No outlines, no interior detail, no eyes.

Flat 2D vector, minimal, calligraphic. No gradients, no shadows, no 3D, no texture. Square 1:1.

Do not include: text, background color, feather detail, gradients, shadows, more than two birds, realistic anatomy.
```

### `mark-swallow-trail` — 見出しの装飾罫

```
One small solid ink #23201D swallow silhouette positioned at the right end of a long thin horizontal arcing line. The line is drawn in ink at a single hairline weight and gradually breaks into evenly spaced short dashes toward the left, fading out entirely at the left edge. Fully transparent background, very wide horizontal composition, 8:1 aspect ratio.

Flat 2D vector, minimal. No gradients, no shadows, no 3D, no texture. Nothing else in the frame.

Do not include: text, background color, extra objects, gradients, shadows, thick lines, arrows.
```

### `mark-swallow-circle` — スタンプ・認証

```
A small solid ink #23201D swallow silhouette centered inside a single thin perfect ink ring, like a minimal wax seal or a passport stamp. The ring is one hairline circle with no double border and no tick marks. Nothing else inside the ring. Fully transparent background, centered, the ring occupying 70 percent of the canvas.

Flat 2D vector, minimal. No gradients, no shadows, no 3D, no texture. Square 1:1.

Do not include: text, letters, numbers, background color, double rings, star bursts, gradients, shadows, grunge texture.
```

### `mark-monogram` — 署名・フッター

```
A minimal monogram of the three letters H G T, drawn with thin ink #23201D strokes of one uniform weight in a geometric high-contrast serif construction, set on a single line with wide letter spacing. The crossbar of the H extends to the left and right into long tapered points that echo a swallow's wings. Fully transparent background, wide horizontal composition, 3:1 aspect ratio.

Flat 2D vector, minimal, refined, editorial. No box, no frame, no underline. No gradients, no shadows, no 3D, no texture.

The letters must be exactly H, G, T in that order.

Do not include: other letters, background color, boxes, frames, circles, gradients, shadows, 3D, outlined text, colors other than ink.
```

---

## 6. ストア掲載画像・OGP

### App Store / Google Play 1 枚目（1284×2778）

```
A vertical app store feature image on a flat solid cream #F4EFE5 background, 9:19.5 aspect ratio.

Upper half: the hand-lettered phrase "Have a Good Travel" centered, written in a fine elegant thin monoline calligraphic script in ink #23201D, with one small solid ink swallow silhouette flying just above the last word. Below the lettering, a much smaller line of Japanese text in a thin serif mincho typeface, ink colored, reading 旅のしおりを、いちばん静かに。

Lower half: a soft leather duffel travel bag in flat terracotta #D96F4C with thin uniform ink linework, standing on a bare cream ground with a single thin ink horizon line running across the frame.

Art style: flat 2D vector, minimal editorial poster. Thin hand-drawn ink linework of one uniform weight. Absolutely no gradients, no shadows, no 3D, no texture. Huge negative space between the elements. Colors strictly limited to cream #F4EFE5, sand #E7DFD0, ink #23201D, terracotta #D96F4C.

Do not include: watermarks, gradients, drop shadows, 3D rendering, photorealism, pink or salmon tones, phone mockups, UI screenshots, clutter, misspellings.
```

### OGP / 共有カード（1200×630）

```
A wide horizontal share card on a flat solid cream #F4EFE5 background, 1.91:1 aspect ratio.

On the left, the hand-lettered phrase "Have a Good Travel" in a fine thin monoline calligraphic script in ink #23201D, left aligned on two lines. On the right, a soft leather duffel travel bag in flat terracotta #D96F4C with thin uniform ink linework, and one small solid ink swallow flying above it. A single thin ink horizon line runs across the lower third of the frame.

Art style: flat 2D vector, minimal editorial poster. Thin ink linework of one uniform weight. No gradients, no shadows, no 3D, no texture. Generous negative space. Colors strictly limited to cream #F4EFE5, sand #E7DFD0, ink #23201D, terracotta #D96F4C.

Do not include: watermarks, gradients, shadows, 3D, photorealism, pink or salmon tones, clutter, misspellings.
```
