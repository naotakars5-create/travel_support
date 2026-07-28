# イラスト生成プロンプト（ChatGPT / GPT Image 用）

旅ナビのイラストを、ブランドのテイスト
**「フラットベクター・太い黒線・コーラルピンク地・4色だけ」** で描き起こすための指示書。

`public/illustrations/*.png` の10点をこの手順で作り直すと、UI のカラートークン
（`tailwind.config.js` / `src/lib/palette.ts`）とぴったり同じ絵の具の絵になる。

> 現在リポジトリに入っている PNG は、旧イラスト（手描き風の棒人間）を
> `scripts/recolor_illustrations.py` で新パレットに塗り替えただけの**つなぎ**。
> 色は合っているが絵柄はまだ旧テイストなので、このプロンプトで描き直して差し替える。

---

## 0. 使い方（これだけ読めば描ける）

1. ChatGPT を開き、**新しいチャットを1本**立てる。10点はそこで続けて作る。
2. §2 の各ブロック（```で囲まれた英文）を、**1枚につき1ブロックだけ、そのままコピーして貼る**。
   ブロックには画風の指定が全部入っているので、他の部分と組み合わせる必要はない。
3. 2枚目以降は、貼り付けたプロンプトの**先頭にこの1行を足す**と絵柄が揃いやすい。

   ```text
   Same style, same palette, same line weight and same character design as the previous image.
   ```

4. 10枚そろったら §3 の後処理（色の検算 → 背景抜き → リサイズ → 上書き）をする。

**このファイル全体を1回で貼らないこと。** 10枚ぶんの指示が混ざって、
1枚に全部詰め込もうとしたおかしな絵になる。

---

## 1. パレット（この4色以外は使わない）

| 役割 | HEX | 使いどころ |
| --- | --- | --- |
| コーラルピンク | `#F69B96` | 背景（地）。イラストの下地は必ずこれ |
| ローズレッド | `#DD5967` | 服・鞄・小物の主役色。髪もこの色 |
| クリーム | `#F5EAD6` | 肌・シャツ・地図の紙・スーツケース |
| 黒 | `#000000` | 輪郭線・靴・リュック・髪の一部・目鼻口 |

UI 側の対応トークンは `base=#F5EAD6` / `accent=#DD5967` / `highlight=#F69B96` / `ink=#1A1A1A`。
（UI の文字色だけは真っ黒を少し和らげた `#1A1A1A`。イラストの線は `#000000` のままでよい）

---

## 2. そのまま貼るプロンプト（10点）

英語のほうが画風が安定するので、プロンプトは英語。
先頭の STYLE RULES は10点すべてで**まったく同じ文面**なので、
画風やパレットを変えるときは10か所すべてを直す。

| # | ファイル名 | サイズ | 背景 | 用途 |
| --- | --- | --- | --- | --- |
| 1 | `cover-default.png` | 1024×1536（縦長 2:3） | コーラル地のまま使う | しおりの既定表紙 |
| 2 | `empty-suitcase.png` | 1024×1024 | 背景を抜く | 空の画面・初回紹介1枚目 |
| 3 | `loading-map.png` | 1024×1024 | 背景を抜く | 旅程作成中・行き先ゼロ |
| 4 | `packed-done.png` | 1024×1024 | 背景を抜く | 持ち物すべて完了 |
| 5 | `avatar-01.png` | 1024×1024 | 背景を抜く | アバター（男性） |
| 6 | `avatar-02.png` | 1024×1024 | 背景を抜く | アバター（女性） |
| 7 | `spot-bench-01.png` | 1024×1024 | 背景を抜く | 空き時間チップ（男性） |
| 8 | `spot-bench-02.png` | 1024×1024 | 背景を抜く | 空き時間チップ（女性） |
| 9 | `icon-home.png` | 1024×1024 | 背景を抜く | 出発地アイコン |
| 10 | `icon-bed.png` | 1024×1024 | 背景を抜く | 宿泊アイコン |

透明背景の素材も、**まずコーラル地で描かせてから背景を抜く**（§3）ほうが線と色が安定する。
GPT Image が透過 PNG に対応している場合は、ブロック末尾の
`- Clean flat coral pink background, nothing else in the background.` を
`- Transparent background, no background color at all.` に差し替えてもよい。

### 1. `cover-default.png` — しおりの既定表紙

```text
Flat vector illustration in a modern Japanese editorial style.

STYLE RULES (follow strictly):
- Completely flat. No gradients, no shading, no highlights, no texture, no drop shadows, no 3D.
- Bold, uniform-weight black outlines (#000000) with rounded caps, drawn like a single confident pen stroke.
- Strictly limited palette. Use ONLY these four colors and nothing else:
  coral pink background #F69B96, rose red #DD5967, cream #F5EAD6, black #000000.
- Characters have stylized, elongated, slightly exaggerated proportions with long slim legs.
- Faces are minimal: two small black dots for eyes, a tiny curved line for nose and mouth.
  No eyebrows, no blush, no detailed features.
- Hair is rose red #DD5967 with simple curled loose strands drawn as thin black lines.
- Skin and shirts are cream #F5EAD6. Backpacks, shoes and bag straps are solid black.
- Calm, quiet, contemporary mood. Not cute-kawaii, not cartoonish, not childish.
- Clean flat coral pink background, nothing else in the background.

DO NOT INCLUDE: text, letters, numbers, logos, watermarks, signatures, frames, borders,
paper texture, grain, halftone, sketch lines, extra colors, photographic elements.

SUBJECT:
Two young travelers walking to the right in profile, full body, side view.
On the left: a man in a cream short-sleeve shirt and black slim trousers,
wearing a cream bucket hat, pulling a rose red carry-on suitcase with black wheels.
On the right, half a step behind: a woman with rose red shoulder-length hair,
a cream oversized shirt, a rose red skirt, a black backpack, black sneakers,
holding an open cream folded paper map with both hands and looking down at it.

COMPOSITION:
Vertical 2:3 portrait. Both figures placed in the LOWER THIRD of the frame,
standing on an invisible ground line. The entire upper two thirds is empty flat
coral pink -- this area is reserved for the app title, so keep it completely clear.
Small black dashes under the feet suggest the ground. No horizon, no scenery.
```

### 2. `empty-suitcase.png` — 空の画面・初回紹介1枚目

```text
Flat vector illustration in a modern Japanese editorial style.

STYLE RULES (follow strictly):
- Completely flat. No gradients, no shading, no highlights, no texture, no drop shadows, no 3D.
- Bold, uniform-weight black outlines (#000000) with rounded caps, drawn like a single confident pen stroke.
- Strictly limited palette. Use ONLY these four colors and nothing else:
  coral pink background #F69B96, rose red #DD5967, cream #F5EAD6, black #000000.
- Characters have stylized, elongated, slightly exaggerated proportions with long slim legs.
- Faces are minimal: two small black dots for eyes, a tiny curved line for nose and mouth.
  No eyebrows, no blush, no detailed features.
- Hair is rose red #DD5967 with simple curled loose strands drawn as thin black lines.
- Skin and shirts are cream #F5EAD6. Backpacks, shoes and bag straps are solid black.
- Calm, quiet, contemporary mood. Not cute-kawaii, not cartoonish, not childish.
- Clean flat coral pink background, nothing else in the background.

DO NOT INCLUDE: text, letters, numbers, logos, watermarks, signatures, frames, borders,
paper texture, grain, halftone, sketch lines, extra colors, photographic elements.

SUBJECT:
A single cream hard-shell carry-on suitcase standing upright, lid closed,
telescopic handle pulled up, black wheels, rose red luggage tag hanging from the grip.
Vertical ribbed lines on the shell drawn as thin black lines.
Next to it on the ground, a folded cream paper map lying flat, slightly open.
Nothing else. No person.

COMPOSITION:
Square. The suitcase centered, occupying about 60% of the frame height,
with generous even margins on all sides. Flat coral pink background.
```

### 3. `loading-map.png` — 旅程作成中・行き先ゼロ

```text
Flat vector illustration in a modern Japanese editorial style.

STYLE RULES (follow strictly):
- Completely flat. No gradients, no shading, no highlights, no texture, no drop shadows, no 3D.
- Bold, uniform-weight black outlines (#000000) with rounded caps, drawn like a single confident pen stroke.
- Strictly limited palette. Use ONLY these four colors and nothing else:
  coral pink background #F69B96, rose red #DD5967, cream #F5EAD6, black #000000.
- Characters have stylized, elongated, slightly exaggerated proportions with long slim legs.
- Faces are minimal: two small black dots for eyes, a tiny curved line for nose and mouth.
  No eyebrows, no blush, no detailed features.
- Hair is rose red #DD5967 with simple curled loose strands drawn as thin black lines.
- Skin and shirts are cream #F5EAD6. Backpacks, shoes and bag straps are solid black.
- Calm, quiet, contemporary mood. Not cute-kawaii, not cartoonish, not childish.
- Clean flat coral pink background, nothing else in the background.

DO NOT INCLUDE: text, letters, numbers, logos, watermarks, signatures, frames, borders,
paper texture, grain, halftone, sketch lines, extra colors, photographic elements.

SUBJECT:
Two young travelers crouching side by side, seen from the front, leaning in over a
large open cream paper map spread between them. Both are pointing at the map with
one index finger. Left: a man in a cream shirt with a cream bucket hat and a black
backpack. Right: a woman with rose red shoulder-length hair, a cream shirt and a
rose red skirt. They look absorbed and calm.

COMPOSITION:
Square. The pair and the map form a wide, stable triangle centered in the frame,
occupying about 70% of the width. Flat coral pink background, nothing else.
```

### 4. `packed-done.png` — 持ち物すべて完了

```text
Flat vector illustration in a modern Japanese editorial style.

STYLE RULES (follow strictly):
- Completely flat. No gradients, no shading, no highlights, no texture, no drop shadows, no 3D.
- Bold, uniform-weight black outlines (#000000) with rounded caps, drawn like a single confident pen stroke.
- Strictly limited palette. Use ONLY these four colors and nothing else:
  coral pink background #F69B96, rose red #DD5967, cream #F5EAD6, black #000000.
- Characters have stylized, elongated, slightly exaggerated proportions with long slim legs.
- Faces are minimal: two small black dots for eyes, a tiny curved line for nose and mouth.
  No eyebrows, no blush, no detailed features.
- Hair is rose red #DD5967 with simple curled loose strands drawn as thin black lines.
- Skin and shirts are cream #F5EAD6. Backpacks, shoes and bag straps are solid black.
- Calm, quiet, contemporary mood. Not cute-kawaii, not cartoonish, not childish.
- Clean flat coral pink background, nothing else in the background.

DO NOT INCLUDE: text, letters, numbers, logos, watermarks, signatures, frames, borders,
paper texture, grain, halftone, sketch lines, extra colors, photographic elements.

SUBJECT:
A young traveler sitting happily on top of a closed rose red suitcase,
both arms raised in a relaxed cheer, legs crossed, cream shirt, black trousers,
black sneakers, cream bucket hat. Cream folded clothes peek out from under the lid.
A single bold black check mark floats in the upper right corner, drawn with the
same confident brush stroke as the outlines.

COMPOSITION:
Square. Figure and suitcase centered, occupying about 70% of the frame height.
Flat coral pink background, nothing else.
```

### 5. `avatar-01.png` — アバター（男性）

```text
Flat vector illustration in a modern Japanese editorial style.

STYLE RULES (follow strictly):
- Completely flat. No gradients, no shading, no highlights, no texture, no drop shadows, no 3D.
- Bold, uniform-weight black outlines (#000000) with rounded caps, drawn like a single confident pen stroke.
- Strictly limited palette. Use ONLY these four colors and nothing else:
  coral pink background #F69B96, rose red #DD5967, cream #F5EAD6, black #000000.
- Characters have stylized, elongated, slightly exaggerated proportions with long slim legs.
- Faces are minimal: two small black dots for eyes, a tiny curved line for nose and mouth.
  No eyebrows, no blush, no detailed features.
- Hair is rose red #DD5967 with simple curled loose strands drawn as thin black lines.
- Skin and shirts are cream #F5EAD6. Backpacks, shoes and bag straps are solid black.
- Calm, quiet, contemporary mood. Not cute-kawaii, not cartoonish, not childish.
- Clean flat coral pink background, nothing else in the background.

DO NOT INCLUDE: text, letters, numbers, logos, watermarks, signatures, frames, borders,
paper texture, grain, halftone, sketch lines, extra colors, photographic elements.

SUBJECT:
Head-and-shoulders portrait of a young man facing forward, cream skin,
short black hair, wearing a CREAM bucket hat, cream shirt collar visible at the
bottom edge. Face is minimal: two small black dots for eyes, a tiny curved nose,
a small calm smile. Shoulders cropped by the bottom edge of the frame.

COMPOSITION:
Square, centered, symmetric, head occupying about 60% of the frame height.
Flat coral pink background. This will be used as a small circular avatar,
so keep the head well inside the frame with even margins.
```

### 6. `avatar-02.png` — アバター（女性）

```text
Flat vector illustration in a modern Japanese editorial style.

STYLE RULES (follow strictly):
- Completely flat. No gradients, no shading, no highlights, no texture, no drop shadows, no 3D.
- Bold, uniform-weight black outlines (#000000) with rounded caps, drawn like a single confident pen stroke.
- Strictly limited palette. Use ONLY these four colors and nothing else:
  coral pink background #F69B96, rose red #DD5967, cream #F5EAD6, black #000000.
- Characters have stylized, elongated, slightly exaggerated proportions with long slim legs.
- Faces are minimal: two small black dots for eyes, a tiny curved line for nose and mouth.
  No eyebrows, no blush, no detailed features.
- Hair is rose red #DD5967 with simple curled loose strands drawn as thin black lines.
- Skin and shirts are cream #F5EAD6. Backpacks, shoes and bag straps are solid black.
- Calm, quiet, contemporary mood. Not cute-kawaii, not cartoonish, not childish.
- Clean flat coral pink background, nothing else in the background.

DO NOT INCLUDE: text, letters, numbers, logos, watermarks, signatures, frames, borders,
paper texture, grain, halftone, sketch lines, extra colors, photographic elements.

SUBJECT:
Head-and-shoulders portrait of a young woman facing forward, cream skin,
ROSE RED shoulder-length hair with one loose curled strand drawn as a thin black line,
wearing a CREAM wide-brim sun hat with a black band, cream shirt collar visible at the
bottom edge. Face is minimal: two small black dots for eyes, a tiny curved nose,
a small calm smile. Shoulders cropped by the bottom edge of the frame.

COMPOSITION:
Square, centered, symmetric, head occupying about 60% of the frame height.
Flat coral pink background. This will be used as a small circular avatar,
so keep the head well inside the frame with even margins.
This must read as a clearly different person from the male avatar --
rose red hair and a wide-brim hat versus short black hair and a bucket hat.
```

### 7. `spot-bench-01.png` — 空き時間チップ（男性）

```text
Flat vector illustration in a modern Japanese editorial style.

STYLE RULES (follow strictly):
- Completely flat. No gradients, no shading, no highlights, no texture, no drop shadows, no 3D.
- Bold, uniform-weight black outlines (#000000) with rounded caps, drawn like a single confident pen stroke.
- Strictly limited palette. Use ONLY these four colors and nothing else:
  coral pink background #F69B96, rose red #DD5967, cream #F5EAD6, black #000000.
- Characters have stylized, elongated, slightly exaggerated proportions with long slim legs.
- Faces are minimal: two small black dots for eyes, a tiny curved line for nose and mouth.
  No eyebrows, no blush, no detailed features.
- Hair is rose red #DD5967 with simple curled loose strands drawn as thin black lines.
- Skin and shirts are cream #F5EAD6. Backpacks, shoes and bag straps are solid black.
- Calm, quiet, contemporary mood. Not cute-kawaii, not cartoonish, not childish.
- Clean flat coral pink background, nothing else in the background.

DO NOT INCLUDE: text, letters, numbers, logos, watermarks, signatures, frames, borders,
paper texture, grain, halftone, sketch lines, extra colors, photographic elements.

SUBJECT:
A young man sitting on a simple cream bench, seen from the side in profile,
legs crossed, holding a small rose red paper cup of coffee in one hand,
three thin black curls of steam rising from it. Cream shirt, black trousers,
black sneakers, cream bucket hat. Relaxed, unhurried posture.

COMPOSITION:
Square. Figure and bench centered, occupying about 65% of the frame width.
Flat coral pink background. This is shown very small in the UI (48px),
so keep the silhouette simple and readable, with thick outlines and no fine detail.
```

### 8. `spot-bench-02.png` — 空き時間チップ（女性）

```text
Flat vector illustration in a modern Japanese editorial style.

STYLE RULES (follow strictly):
- Completely flat. No gradients, no shading, no highlights, no texture, no drop shadows, no 3D.
- Bold, uniform-weight black outlines (#000000) with rounded caps, drawn like a single confident pen stroke.
- Strictly limited palette. Use ONLY these four colors and nothing else:
  coral pink background #F69B96, rose red #DD5967, cream #F5EAD6, black #000000.
- Characters have stylized, elongated, slightly exaggerated proportions with long slim legs.
- Faces are minimal: two small black dots for eyes, a tiny curved line for nose and mouth.
  No eyebrows, no blush, no detailed features.
- Hair is rose red #DD5967 with simple curled loose strands drawn as thin black lines.
- Skin and shirts are cream #F5EAD6. Backpacks, shoes and bag straps are solid black.
- Calm, quiet, contemporary mood. Not cute-kawaii, not cartoonish, not childish.
- Clean flat coral pink background, nothing else in the background.

DO NOT INCLUDE: text, letters, numbers, logos, watermarks, signatures, frames, borders,
paper texture, grain, halftone, sketch lines, extra colors, photographic elements.

SUBJECT:
A young woman sitting on a simple cream bench, seen from the side in profile,
legs crossed, holding a small rose red coffee cup in one hand,
three thin black curls of steam rising from it. Rose red shoulder-length hair
with one loose curled strand, cream shirt, rose red skirt, black boots,
cream wide-brim sun hat. Relaxed, unhurried posture.

COMPOSITION:
Square. Figure and bench centered, occupying about 65% of the frame width.
Flat coral pink background. This is shown very small in the UI (48px),
so keep the silhouette simple and readable, with thick outlines and no fine detail.
```

### 9. `icon-home.png` — 出発地アイコン

```text
Flat vector illustration in a modern Japanese editorial style.

STYLE RULES (follow strictly):
- Completely flat. No gradients, no shading, no highlights, no texture, no drop shadows, no 3D.
- Bold, uniform-weight black outlines (#000000) with rounded caps, drawn like a single confident pen stroke.
- Strictly limited palette. Use ONLY these four colors and nothing else:
  coral pink background #F69B96, rose red #DD5967, cream #F5EAD6, black #000000.
- Characters have stylized, elongated, slightly exaggerated proportions with long slim legs.
- Faces are minimal: two small black dots for eyes, a tiny curved line for nose and mouth.
  No eyebrows, no blush, no detailed features.
- Hair is rose red #DD5967 with simple curled loose strands drawn as thin black lines.
- Skin and shirts are cream #F5EAD6. Backpacks, shoes and bag straps are solid black.
- Calm, quiet, contemporary mood. Not cute-kawaii, not cartoonish, not childish.
- Clean flat coral pink background, nothing else in the background.

DO NOT INCLUDE: text, letters, numbers, logos, watermarks, signatures, frames, borders,
paper texture, grain, halftone, sketch lines, extra colors, photographic elements.

SUBJECT:
A single small house seen straight from the front, drawn as a simple pictogram:
cream walls, a ROSE RED triangular roof, a cream front door with a small black
round knob, one square window divided into four panes, a small chimney on the roof.
No garden, no ground, no people, no other objects.

COMPOSITION:
Square, centered, the house occupying about 55% of the frame with generous even
margins. Flat coral pink background. Thick uniform black outlines throughout.
Must stay legible at 32px.
```

### 10. `icon-bed.png` — 宿泊アイコン

```text
Flat vector illustration in a modern Japanese editorial style.

STYLE RULES (follow strictly):
- Completely flat. No gradients, no shading, no highlights, no texture, no drop shadows, no 3D.
- Bold, uniform-weight black outlines (#000000) with rounded caps, drawn like a single confident pen stroke.
- Strictly limited palette. Use ONLY these four colors and nothing else:
  coral pink background #F69B96, rose red #DD5967, cream #F5EAD6, black #000000.
- Characters have stylized, elongated, slightly exaggerated proportions with long slim legs.
- Faces are minimal: two small black dots for eyes, a tiny curved line for nose and mouth.
  No eyebrows, no blush, no detailed features.
- Hair is rose red #DD5967 with simple curled loose strands drawn as thin black lines.
- Skin and shirts are cream #F5EAD6. Backpacks, shoes and bag straps are solid black.
- Calm, quiet, contemporary mood. Not cute-kawaii, not cartoonish, not childish.
- Clean flat coral pink background, nothing else in the background.

DO NOT INCLUDE: text, letters, numbers, logos, watermarks, signatures, frames, borders,
paper texture, grain, halftone, sketch lines, extra colors, photographic elements.

SUBJECT:
A single bed seen straight from the front, drawn as a simple pictogram:
black headboard and footboard frame with rounded posts, a ROSE RED blanket
covering the mattress, one cream pillow. No room, no floor, no people,
no other objects.

COMPOSITION:
Square, centered, the bed occupying about 55% of the frame with generous even
margins. Flat coral pink background. Thick uniform black outlines throughout.
Must stay legible at 32px.
```

---

## 3. 生成したあとの手順

1. **色を確認する。** スポイトで拾って `#F69B96` / `#DD5967` / `#F5EAD6` / `#000000` から
   ずれていたら、「Use exactly #DD5967 for the skirt, not a different red.」のように
   HEX を名指しして描き直させる。生成モデルは色をよく外す。
2. **背景を抜く。**（表紙 `cover-default.png` 以外の9点）
   コーラル地で描かせたものから背景だけを透明にする。Figma / Photoshop の
   「近似色を選択」や、macOS のプレビュー、`remove.bg` 等どれでもよい。
   絵の中にコーラルを使っていなければ、背景の抜き取りで絵が欠けることはない。
3. **リサイズして配置する。** 正方形9点は 512×512、表紙は 1024×1536 で
   `public/illustrations/` に**同じファイル名で**上書きする。
   ファイル名は `src/lib/illustrations.ts` の `IllustrationName` と対応しているので、
   名前を変える場合はそちらも直す。
4. **実機で見る。** `npm run web` で、初回紹介 → しおり（空）→ 旅（行き先ゼロ）→
   持ち物（全チェック）→ マイページ（アバター）の順に一巡すると、10点すべてが出る。
5. 全点を差し替えたら、つなぎ用の `scripts/recolor_illustrations.py` は削除してよい。

---

## 4. うまくいかないときの追加指示

生成結果がテイストから外れたら、次の一文をそのまま送って描き直させる。

| 症状 | 送る一文 |
| --- | --- |
| 影やグラデーションが乗る | `Absolutely flat fills only. Remove every gradient, shadow and highlight.` |
| 線が細い／かすれる | `Make all outlines noticeably thicker and perfectly uniform in weight.` |
| 指定外の色が混ざる | `Reduce the palette to exactly four colors: #F69B96, #DD5967, #F5EAD6, #000000.` |
| 顔が描き込まれすぎる | `Simplify the face to two dots and one small curved line. Nothing else.` |
| かわいくなりすぎる | `Make it more restrained and editorial. Not cute, not chibi, not a mascot.` |
| 背景に風景が入る | `The background must be a single flat field of #F69B96 with nothing in it.` |
| 人物が切れる | `Show the full figure with clear margins on all four sides. Do not crop.` |
| 文字やロゴが入る | `No text of any kind anywhere in the image.` |
| 前の絵と絵柄が違う | `Match the previous image exactly: same line weight, same face style, same proportions.` |
