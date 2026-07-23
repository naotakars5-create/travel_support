# 旅ナビ / TABI-NAVI

日本の個人旅行者向け旅程アプリ。予約確認メールの本文を LLM で読み取って1日の旅程を組み、旅行当日は「次に何をするか」だけを示す。

Next.js (App Router) + TypeScript + Tailwind CSS。状態は React state + localStorage（DB・認証なし）。

## セットアップ

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY を設定
npm run dev
```

`/api/parse` は Anthropic API（`claude-sonnet-4-6`）でメール本文を解析します。`ANTHROPIC_API_KEY` が未設定の場合、解析は失敗し、UIは自動的に手入力フォームへフォールバックします（UI自体は確認可能）。

### 環境変数

| 変数 | 必須 | 説明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ◯ | Anthropic API キー。`/api/parse` が使用する既定のプロバイダ。 |
| `LLM_PROVIDER` | - | `openai` を指定すると `OPENAI_API_KEY`/`OPENAI_MODEL` を使う検証用プロバイダに切り替わる（開発時の暫定検証用。本番仕様は Anthropic）。 |
| `GOOGLE_MAPS_API_KEY` | - | Google Maps Platform キー（Geocoding API・Directions API・Places API を有効化したもの）。未設定でもアプリは動作する（ヒューリスティック推定・固定スポットにフォールバック）。設定すると住所→座標変換・地点間の実測移動時間・周辺観光スポット提案が実データになる。 |

## 実装状況

- **フェーズ1（解析エンジン）**: `/api/parse`（`app/api/parse/route.ts`）実装済み。正規表現ではなくLLMに文面を読ませる方式。JSONのみを厳格に返すようプロンプトで指示し、コードフェンス混入を想定したstrip処理あり。複数イベント抽出・年の補完・skip判定・confidenceに対応。同一本文の再解析を避けるプロセスローカルキャッシュあり。
  - **cURLでの実地検証は未実施**（このセッションでは `ANTHROPIC_API_KEY` を用意できなかったため）。`ANTHROPIC_API_KEY` を設定後、実在のJAL/じゃらん/えきねっと等のメール文面で検証することを推奨。
- **フェーズ2（3画面）**: 受信箱・旅程（路線図）・当日（発車標）を実装済み。
- **フェーズ3（状態遷移）**: locked→move→free→done の想定デモ動線を実装済み（`hooks/useAppState.ts`）。
- **Google Maps 連携**: 住所のジオコーディング（`/api/geocode`）、地点間の実測移動時間（`/api/directions`）、空き時間の周辺観光スポット（`/api/nearby-spots`）を実装済み。`GOOGLE_MAPS_API_KEY` 未設定時はヒューリスティック推定・固定スポットに自動フォールバックする。モックしたAPIレスポンスでのE2E検証は実施済み（実キーでの検証は未実施）。

## アーキテクチャメモ

- `lib/types.ts` — `ParsedEvent` 等の共通スキーマ。`placeFromGeo`/`placeToGeo` に地点の座標を保持できる。
- `lib/itinerary.ts` — イベント配列から node/edge/gap の路線図データを構築。所要時間は実時刻の差分から計算、60分以上の空きは「空き時間」、見積もり移動時間が空き時間を超える場合や前後が重なる場合は「矛盾（間に合わない）」として検出。
- `lib/transit.ts` — 移動手段・所要時間の見積もりインターフェース（`TransitEstimator`）。`heuristicTransitEstimator`（簡易推定・既定のフォールバック）と `createPrecomputedEstimator`（Directions APIの実測値キャッシュを参照する実装）を用意。
- `lib/googleMaps.ts` — Geocoding / Directions / Places Nearby Search の呼び出しをまとめたサーバー専用ヘルパー。`GOOGLE_MAPS_API_KEY` を使用。
- `lib/spots.ts` — 空き時間の周辺スポット取得インターフェース（`SpotProvider`）。`fixedSpotProvider`（固定データ）と `googlePlacesSpotProvider`（`/api/nearby-spots` 経由の実データ）、両者を座標の有無で自動選択する `createSpotProvider`。
- `lib/dayof.ts` — 当日画面の状態（locked/move/free/done）を rail と現在地から導出し、出発カウントダウンを計算。
- `hooks/useAppState.ts` — 受信箱メールの状態管理、解析API呼び出し、到着記録、localStorage永続化に加え、地点のジオコーディングと隣接イベント間のDirections APIキャッシュ取得を非同期に行う。
- **手入力での旅程登録**: 受信箱の「＋」→「手入力で追加」から、メール解析を介さず場所（住所推奨）・時刻を直接入力して旅程に追加できる（`components/ManualEntryForm.tsx`）。住所を入れると上記のGoogle Maps連携により移動時間・周辺スポットの精度が上がる。

## やっていないこと（スコープ外）

- ユーザー認証・課金・プッシュ通知
- Gmail / Outlook 連携（貼り付け方式のみ）
- 予約サイトのAPI連携
- 複数日程（1日のみ）
- 天気表示（デザインには存在するが、天気APIがスコープ外のため実データを捏造せず省略）
