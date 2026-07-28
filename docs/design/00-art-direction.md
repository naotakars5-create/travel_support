# Have a Good Travel — アートディレクション（共通定義）

参考イラスト（フラットベクター／細い手描き線／限定色／ツバメのシルエット）を、
このアプリの既存トーン（生成り・墨・テラコッタ）に接続するための共通ルール。

以降の 3 つのプロンプト集（UI/UX・画材・アプリアイコン）は、すべてこのファイルの
**スタイルブロック**と**カラー**を前提にしている。

---

## 1. ブランド

| 項目 | 値 |
| --- | --- |
| サービス名 | **Have a Good Travel**（ハブ・ア・グッド・トラベル） |
| 略称 / 表記 | HAVE A GOOD TRAVEL / H.A.G.T. |
| 和名（併記可） | 旅ナビ |
| シンボル | **ツバメ**（一筆書きのような、鋭く伸びる黒いシルエット） |
| キーワード | 静か / 洗練 / 余白 / 手仕事 / 軽やか / 旅の高揚は"線"で出す |
| 声のトーン | 押しつけない。短い文。断定しすぎない。「〜しましょう」より「〜できます」 |

> ツバメを採用する理由：参考画像 3 枚のうち唯一"記号"として成立していて、
> 旅（渡り・帰る場所）の含意があり、16px まで縮めても形が残る。
> 人物イラストはアプリ内の"情景"に、ツバメは"ブランドの署名"に役割を分ける。

---

## 2. 参考イラストから受け継ぐもの / 変えるもの

### 受け継ぐ（Keep）

- **フラット 2D ベクター**。グラデーション・影・質感・立体表現を一切使わない。
- **細く均一な墨の線**。先端がわずかに細くなる（tapered）手描きの抜けがある線。
- **顔をほぼ描かない**。点と短い線だけ。表情で語らせず、姿勢とシルエットで語らせる。
- **引き伸ばされた人体プロポーション**（8〜9頭身、細い手足、大きめの靴と荷物）。
- **色数を絞る**。1 枚のイラストで使う色は **背景を含めて最大 4 色**。
- **大きな余白**。主役は画面の 60〜70%、残りは無地の背景色。
- **ベタ塗りのシルエット**（黒いリュック、黒い靴）で画面を締める。

### 変える（Change）

| 参考イラスト | このアプリ |
| --- | --- |
| サーモンピンクの全面背景 | **生成り `#F4EFE5` の全面背景**（＝アプリの画面背景と同じ） |
| 赤 / ローズ（`#E8556A` 系）が主役 | **テラコッタ `#D96F4C`**。しかも主役ではなく**差し色** |
| 有彩色が面積の 50%以上 | **有彩色は面積の 20%以下**。生成り 60%以上、墨 15%以下 |
| 髪もトップスも小物もピンク | 有彩色を置くのは **1 枚につき 1〜2 箇所だけ**（例：バッグだけ、上着だけ） |

**「ピンクを減らす」の実装ルール（これだけ守れば外さない）**

1. 背景は必ず生成り `#F4EFE5`（または砂 `#E7DFD0`）。彩度のある背景は使わない。
2. 参考イラストで"ピンクだった面"は、まず **生成り or 砂** に置き換える。
3. それでも締まらない箇所だけ **テラコッタ `#D96F4C`**、広い面なら薄い **陶土 `#E8A18B`**。
4. 髪・肌・服をまとめて有彩色にしない。**髪は墨、肌は生成り**が既定。
5. マスタード `#F0B429` は「完了・達成」の絵にだけ。日常の絵には出さない。

---

## 3. カラートークン

アプリの実装（`tailwind.config.js` / `src/lib/palette.ts`）と完全に一致させる。
**イラストにもこの色以外を使わない。**

### コア 6 色

| 役割 | 名前 | HEX | 使いどころ |
| --- | --- | --- | --- |
| 背景 | 生成り base | `#F4EFE5` | 画面背景・イラスト背景・肌・白いシャツ |
| 面 | 砂 surface | `#E7DFD0` | カード面・地面・影の代わりの面・区切り |
| 線/文字 | 墨 ink | `#23201D` | 輪郭線・髪・靴・鞄・本文 |
| 補助文字 | muted | `#6E675C` | 補助テキスト（イラストの線には使わない） |
| 差し色 | テラコッタ accent | `#D96F4C` | 今・進行中。イラストの主役の 1 アイテム |
| 達成 | マスタード highlight | `#F0B429` | 完了・達成の絵だけ |

### イラスト用の拡張 2 色（UI には使わない）

| 名前 | HEX | 使いどころ |
| --- | --- | --- |
| 陶土 clay | `#E8A18B` | テラコッタの薄い面。空・大きな鞄・上着など広い面積用 |
| 藍 ai | `#4A6B8A` | 水・夜・遠景。1 枚に 1 箇所まで（`DAY_COLORS[0]` と同値） |

### 日ごとの色（既存）

`#4A6B8A` 藍 / `#55704F` 松葉 / `#96536B` 梅 / `#7D5F36` 朽葉 / `#4F5D6B` 鉛
→ **1 日目・2 日目…の識別だけ**に使う。イラストの主色にはしない。

### 面積比のめやす（1 枚のイラスト）

```
生成り  ████████████████████████████░░  60〜70%
墨      ██████░░░░░░░░░░░░░░░░░░░░░░░░  10〜15%（線＋ベタのシルエット）
砂      ████░░░░░░░░░░░░░░░░░░░░░░░░░░   5〜15%
差し色  ███░░░░░░░░░░░░░░░░░░░░░░░░░░░   5〜15%（テラコッタ or 陶土）
```

---

## 4. 共通スタイルブロック（全プロンプトの先頭に貼る）

英語のほうが画像生成モデルの追従が良いので、本文は英語で固定する。

```text
STYLE:
Flat 2D vector illustration, minimal editorial style, mid-century modern.
Hand-drawn ink linework: thin, uniform weight, slightly tapered ends, calm confident curves.
Absolutely no gradients, no shading, no drop shadows, no texture, no 3D, no outline glow.
Elongated stylized human proportions (8-9 heads tall), long thin limbs, oversized shoes and bags.
Faces are minimal or omitted: at most two small dots and one short line. No detailed facial features.
Solid flat single-color background. Generous negative space. Centered, poster-like composition.

PALETTE (use these hex values only, no other colors):
cream #F4EFE5 (background, skin, light clothing)
sand #E7DFD0 (secondary surfaces, ground)
ink #23201D (all linework, hair, shoes, bags, solid silhouettes)
terracotta #D96F4C (single accent object only)
clay #E8A18B (large soft accent areas, use sparingly)
mustard #F0B429 (only for "completed / achieved" scenes)

COLOR BALANCE (strict):
Background must be cream #F4EFE5. Chromatic accent covers at most 20% of the canvas.
Never make hair, skin and clothing colored at the same time. Hair is ink, skin is cream by default.
Do not use pink or salmon as a dominant color.

NEGATIVE:
no gradient, no shadow, no 3D render, no photorealism, no neon, no pastel pink background,
no busy background, no clutter, no watermark, no signature, no text, no letters,
no thick cartoon outlines, no anime style, no chibi, no drop shadow, no vignette,
no skin tone variation shading, no cross-hatching, no grain, no paper texture.
```

---

## 5. 出力仕様

| 用途 | 形式 | サイズ | 背景 |
| --- | --- | --- | --- |
| 画面内イラスト（`public/illustrations/`） | PNG（透過）＋ SVG | 1024×1024 | 透過（アプリ側で生成りの上に置く） |
| カバー / ヒーロー | PNG | 1600×900 | 生成り `#F4EFE5` ベタ |
| 小アイコン（カテゴリ・交通・天気） | SVG 推奨 | 256×256 | 透過 |
| アプリアイコン | PNG | 1024×1024 | ベタ（透過不可） |
| Android adaptive foreground | PNG | 1024×1024 | 透過・安全域 66% |
| スプラッシュ | PNG | 1024×1024 | 透過 |

**命名規則**：`{カテゴリ}-{名前}-{連番}.png`（例：`spot-bench-01.png`）。
既存の `src/lib/illustrations.ts` の `IllustrationName` に追加して使う。

**生成後の必須処理**

1. カラーピッカーで色を検品し、規定 HEX に**総入れ替え**（生成AIは必ず色をずらす）。
2. 背景を透過に抜く（画面内イラストのみ）。
3. SVG 化（Illustrator の画像トレース or vectorizer）→ 線幅を 1 種類に統一。
4. 48px に縮小して判別できるか確認。潰れるなら要素を減らす。
