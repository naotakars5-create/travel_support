# アプリ全体 UI/UX リデザイン プロンプト — Have a Good Travel

Figma Make / v0 / Claude Code / Cursor など、どのツールに貼っても成立するように書いた
**そのままコピペできる 1 本のプロンプト**。前提は `00-art-direction.md`。

- 使い方 A（デザイン生成）：Figma Make・v0 に §A をまるごと貼る。
- 使い方 B（実装）：Claude Code に §A ＋「このリポジトリの `src/components/` を
  このデザインシステムに合わせて改修して」と指示する。
- 使い方 C（画面単位）：§A の「共通」＋ §B の該当画面だけを貼る。

---

## §A. マスタープロンプト（全体）

```text
You are the lead product designer for a mobile travel-itinerary app.
Redesign the entire app UI around the art direction below.

────────────────────────────────
1. PRODUCT
────────────────────────────────
Name: "Have a Good Travel" (Japanese sub-name: 旅ナビ / TABI-NAVI)
Platform: Expo (React Native) + Expo Router + NativeWind. iOS / Android / Web.
Primary language of the UI: Japanese.
What it does: you dump the places you want to go, AI fills in the address /
opening hours / travel time, and it builds a day-by-day itinerary ("しおり")
you can share with the people travelling with you.
Emotional target: the quiet excitement of the night before a trip.
Not loud, not gamified, not "productivity". Calm, refined, a little handmade.

────────────────────────────────
2. BRAND & ART DIRECTION
────────────────────────────────
The visual world is a flat 2D editorial illustration style:
thin hand-drawn ink linework, no gradients, no shadows, no 3D, big negative space,
elongated stylized figures with almost no facial features, solid silhouettes.
Brand symbol: a swallow — a single sharp black bird silhouette with long tapered
swooping wings. It is the signature mark, used small and rarely (splash, empty
states, section dividers, the app icon). Never decorate the UI with it repeatedly.

Reference feeling: Scandinavian/mid-century travel poster meets Japanese 和紙 stationery.
IMPORTANT: the source references are dominated by salmon pink / red. Do NOT reproduce
that. Backgrounds are always warm off-white. Chromatic color is a rare accent.

────────────────────────────────
3. COLOR SYSTEM (use these tokens only — no other colors exist)
────────────────────────────────
base      #F4EFE5  cream, the default screen background
surface   #E7DFD0  sand, cards, dividers, inactive fills
ink       #23201D  text, linework, primary buttons
muted     #6E675C  secondary text only
accent    #D96F4C  terracotta — ONLY for "now / in progress / primary action"
highlight #F0B429  mustard — ONLY for "done / achieved"
day colors (to distinguish Day 1, Day 2, … only):
  #4A6B8A 藍 / #55704F 松葉 / #96536B 梅 / #7D5F36 朽葉 / #4F5D6B 鉛
dark theme (the "today" tab only):
  bg #1A1815, text #F4EFE5, text2 rgba(244,239,229,.72), text3 rgba(244,239,229,.55)

COLOR RULES (hard constraints):
- A screen is at least 70% cream or sand. Chromatic color is at most 10% of a screen.
- accent appears at most twice per screen. If everything is accented, nothing is.
- Never use accent and highlight next to each other.
- Day colors are identity, not decoration: a 2px rule, a small dot, a tinted card
  ground at 8-12% alpha. Never a full-bleed colored card.
- Never introduce pink, purple, teal, blue-gray gradients, or pure white #FFFFFF.
- Never use color alone to carry meaning (also change label, weight, or icon).

────────────────────────────────
4. TYPOGRAPHY
────────────────────────────────
Display / headings: Zen Old Mincho (400 / 600 / 700 / 900) — a serif 明朝.
Body / UI: Noto Sans JP (400 / 500 / 700).
The mincho is the personality; use it for trip titles, day headings, dates,
empty-state copy and numbers-as-statement. Everything functional is gothic.
Never mix both inside a single line.

Scale (px): 34 / 28 / 22 / 18 / 16 / 14 / 13 / 12 / 11
- Trip title: mincho 28-34, line-height 1.35, letter-spacing 0.02em
- Day heading: mincho 22
- Card title: gothic 500 / 16
- Body: gothic 400 / 14, line-height 1.7
- Meta & timestamps: gothic 400 / 12, color muted
Japanese text wraps badly — set line-height generously (1.6-1.8) and allow
manual line breaks in headings. Never justify. Never all-caps Japanese.
Latin brand lettering ("Have a Good Travel") is used sparingly, letter-spaced
0.18em, uppercase or handwritten script, as an eyebrow / signature only.

────────────────────────────────
5. SHAPE, SPACING, DEPTH
────────────────────────────────
Radius: sheet 22, card 16, chip 999, button 14, device frame 44 / screen 34.
Spacing scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 48. Screen side padding 20.
Depth: there are NO shadows. Separation comes from (a) a 1px hairline in
ink at 8% alpha, (b) a sand fill, or (c) plain whitespace. Prefer whitespace.
Borders: 1px ink@8% default, 1px ink@16% for emphasis, 2px accent for "now".
Icons: 20-24px, 1.5px stroke, round caps, ink or muted. Line icons only —
no filled icons, no duotone, no emoji as UI icons.
Illustrations: 48 / 120 / 200px square, always on transparent background.
Touch targets: minimum 44×44.

────────────────────────────────
6. NAVIGATION
────────────────────────────────
Bottom tab bar, 4 items only: 旅 / 地図 / 当日 / マイページ.
66px tall, cream background, 1px top hairline, no icons — Japanese label plus
a 2px × 18px rounded rule above the active label (terracotta on light screens,
cream on the dark "today" tab). しおり and 持ち物 live inside マイページ.
Modals are bottom sheets with a 22px top radius and a 36×4 sand grabber.
Sheets never cover more than 92% height; the screen behind stays visible.

────────────────────────────────
7. CORE COMPONENTS
────────────────────────────────
Button (primary): ink fill, cream label, gothic 500 / 15, radius 14, height 50,
  full width inside sheets. Pressed = 92% opacity, no scale bounce.
Button (accent): terracotta fill — reserved for the single most important action
  on the screen (e.g. "AIで旅程を組む").
Button (quiet): transparent, 1px ink@16% border, ink label.
Card: cream on cream, separated by a hairline; 16px radius; 16px padding;
  optional 3px left rule in the day color.
Chip: sand fill, gothic 400 / 12, radius 999, 8×12 padding. Selected = ink fill.
Input: no box. A single 1px bottom rule in ink@16%, label above in muted 12,
  focus = the rule turns terracotta and thickens to 1.5px. Placeholder muted.
List row: 56px min height, title + meta stacked, chevron in muted, hairline between.
Empty state: illustration 120-200px, mincho 18 headline, gothic 13 muted body,
  one quiet button. Never an exclamation mark.
Toast: ink pill, cream text, bottom center, 2.4s, no icon.
Loading: never a spinner-on-blank. Use a skeleton in sand, or a small illustration
  with one line of mincho copy.

────────────────────────────────
8. SCREENS (see §B for detail)
────────────────────────────────
Onboarding (3 cards) / 旅 Trip home / 行きたい場所 Plan / 旅程 Itinerary /
地図 Map / 当日 DayOf (dark) / 持ち物 Packing / しおり Shiori (share) /
マイページ Profile / bottom sheets (add, edit, generate, trip switcher).

────────────────────────────────
9. MOTION
────────────────────────────────
Calm and short. 180-240ms, ease-out. Fade + 8px rise for entering content.
Sheets slide from the bottom in 260ms with a soft spring (no overshoot bounce).
Tab switch: crossfade only, no horizontal slide.
The only playful motion in the whole app: the swallow drawing itself with a
stroke-dash animation on the splash, and a small mustard check that scales
0.9 → 1 when a packing item or an itinerary step is completed.
Respect prefers-reduced-motion: replace all movement with a plain fade.

────────────────────────────────
10. ACCESSIBILITY
────────────────────────────────
Body text ≥ 4.5:1 against its background; large text ≥ 3:1.
muted #6E675C on cream = 5.3:1 (OK). Never put muted on the dark theme —
use base at 72% / 55% alpha instead.
Every illustration has a Japanese accessibilityLabel; decorative ones are "".
Support Dynamic Type up to 200% without clipping — no fixed-height text rows.

────────────────────────────────
11. DELIVERABLE
────────────────────────────────
Produce: (a) a token sheet, (b) a component sheet, (c) every screen above at
390×844, light theme (plus the dark "today" screen), (d) two empty states and
one loading state, (e) redlines for spacing on the Trip home screen.
No lorem ipsum — write realistic Japanese copy in the voice described in §1.
```

---

## §B. 画面別の追記プロンプト

必要な画面のブロックだけを §A の後ろに足す。

### 旅ホーム（`TripScreen`）

```text
SCREEN: 旅ホーム (trip home)
A cover photo of the trip fills the top 38% of the screen, with a cream
gradient-free scrim: instead of a gradient, lay a solid cream panel with a
22px top radius over the bottom edge of the photo so the title sits on cream.
Trip title in mincho 28, dates in gothic 12 muted, a thin terracotta rule
under the day count. Below: "次の予定" as one large card (mincho time + place),
then a horizontally scrollable day strip (Day 1..N chips carrying the day color
as a 2px underline). Primary action "AIで旅程を組む" is the single terracotta
button. If no trip exists, show the empty-suitcase illustration and the copy
"まだ旅がありません / 行きたい場所を1つ入れるところから。"
```

### 行きたい場所 / 旅程（`PlanScreen`, `ItineraryScreen`）

```text
SCREEN: 行きたい場所 & 旅程
Model the itinerary as a vertical 栞 (bookmark ribbon): a 1px ink@12% vertical
rule at x=28 runs down the whole day, with 7px dots on it for each stop, filled
in the day color. The current stop's dot is terracotta and 10px. Completed
stops are mustard with a hairline check.
Between two stops, the travel time is a small sand pill on the rule
("徒歩 12分") with a 1.5px line icon. Empty gaps show a small bench illustration
(48px) and the copy "この時間はまだ空いています".
Cards carry: time (mincho 18), place name (gothic 500 / 16), one meta line
(gothic 12 muted). Drag handles are two 12×1.5px muted rules, right aligned.
No card shadows — only hairlines. Reordering lifts the card 2px with a
1px terracotta border, not a shadow.
```

### 当日（`DayOfScreen`、ダークテーマ）

```text
SCREEN: 当日 (day-of, dark theme)
Background #1A1815, text #F4EFE5. This screen is glanceable at arm's length
outdoors: one thing at a time. The current stop occupies the top half at
mincho 34, with the walking time to the next stop below in gothic 16.
Secondary info uses base at 72% alpha; tertiary at 55%. Do not use muted here.
Terracotta appears exactly once: the "now" marker. Mustard marks finished stops.
The map preview is a flat sand-on-dark line map, never a photo satellite tile.
Everything else is quiet: no cards, no borders, just spacing and hairlines at
base@10%.
```

### 地図（`MapScreen`）

```text
SCREEN: 地図
Style the map itself to match the brand: cream land #F4EFE5, sand roads #E7DFD0,
ink@20% labels, water in 藍 #4A6B8A at 18% alpha, no POI icons, no green parks.
Pins are not teardrops — use a 10px filled circle in the day color with a
1.5px cream ring, and a small ink numeral inside for the stop order.
The route line is a 2px ink line with rounded caps; the leg you are currently
travelling is terracotta. The bottom sheet peeks at 120px showing the next stop.
```

### 持ち物 / しおり / マイページ

```text
SCREEN: 持ち物 (packing)
A checklist, not a form. Rows are 52px, checkbox is a 20px circle with a 1.5px
ink@30% ring; checked = mustard fill + cream check, label goes muted with a
0.5px strike. A slim progress rule sits under the header: sand track, mustard
fill, 3px tall, no percentage number — just "12 / 18" in gothic 12.
When everything is packed, show the packed-done illustration and one mincho line.

SCREEN: しおり (shiori / share)
This is the artefact people screenshot — make it the most beautiful screen.
It reads like a printed booklet: a cover with the trip title in mincho 34 over
the cover photo, a hairline frame inset 12px, the swallow mark small and centered
at the bottom, and the dates letter-spaced in gothic 11. Inside, each day starts
with a full-width day heading (mincho 22 + day-color rule) and a timeline.
Share sheet offers: リンクをコピー / 画像で保存 / カレンダーに追加.

SCREEN: マイページ (profile)
Quiet settings list, 56px rows, section labels in gothic 11 muted with 0.08em
letter-spacing. The avatar is one of the illustration avatars in a 72px circle
with a sand fill — never a photo placeholder. しおり and 持ち物 are the first
two rows, visually separated from the settings below.
```

### オンボーディング（`OnboardingScreen`）

```text
SCREEN: オンボーディング (3 cards)
Full-bleed cream. Each card: a 200px illustration on top, an eyebrow in gothic
11 muted with letter-spacing, a mincho 28 headline over 2-3 lines, gothic 14
muted body over 3 lines. Progress is three 6px dots — the active one is a
20px-wide rounded rule in that card's color (藍 → 松葉 → テラコッタ, so the
last card is the "starting now" color). Skip is a quiet text link, top right.
The final CTA is the only filled button in the flow.
```

---

## §C. 使ってはいけないもの（禁止事項リスト）

このリストも一緒に貼ると事故が減る。

```text
DO NOT:
- add drop shadows, elevation, glassmorphism, blur, or neumorphism
- use pure white (#FFFFFF) or pure black (#000000)
- use gradients anywhere, including on photos and maps
- use pink/salmon as a background or dominant color
- use emoji as UI icons, or filled/duotone icon sets
- use more than two accent-colored elements per screen
- put muted (#6E675C) text on the dark theme
- add a 5th bottom tab, or icons to the tab bar
- use stock 3D illustrations, isometric people, or "corporate memphis" blobs
- animate anything longer than 300ms, or use bouncy overshoot springs
- write exclamation marks, "!", or cheerful marketing copy in the UI
```
