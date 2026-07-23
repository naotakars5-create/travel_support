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

## 実装状況

- **フェーズ1（解析エンジン）**: `/api/parse`（`app/api/parse/route.ts`）実装済み。正規表現ではなくLLMに文面を読ませる方式。JSONのみを厳格に返すようプロンプトで指示し、コードフェンス混入を想定したstrip処理あり。複数イベント抽出・年の補完・skip判定・confidenceに対応。同一本文の再解析を避けるプロセスローカルキャッシュあり。
  - **cURLでの実地検証は未実施**（このセッションでは `ANTHROPIC_API_KEY` を用意できなかったため）。`ANTHROPIC_API_KEY` を設定後、実在のJAL/じゃらん/えきねっと等のメール文面で検証することを推奨。
- **フェーズ2（3画面）**: 受信箱・旅程（路線図）・当日（発車標）を実装済み。
- **フェーズ3（状態遷移）**: locked→move→free→done の想定デモ動線を実装済み（`hooks/useAppState.ts`）。

## アーキテクチャメモ

- `lib/types.ts` — `ParsedEvent` 等の共通スキーマ。
- `lib/itinerary.ts` — イベント配列から node/edge/gap の路線図データを構築。所要時間は実時刻の差分から計算、60分以上の空きは「空き時間」、見積もり移動時間が空き時間を超える場合や前後が重なる場合は「矛盾（間に合わない）」として検出。
- `lib/transit.ts` — 移動手段・所要時間の見積もりインターフェース（`TransitEstimator`）。現在は簡易ヒューリスティック実装。Google Maps Directions API に差し替え可能な形にしてある。
- `lib/spots.ts` — 空き時間の周辺スポット取得インターフェース（`SpotProvider`）。現在は固定データ実装。Google Places API に差し替え可能な形にしてある。
- `lib/dayof.ts` — 当日画面の状態（locked/move/free/done）を rail と現在地から導出し、出発カウントダウンを計算。
- `hooks/useAppState.ts` — 受信箱メールの状態管理、解析API呼び出し、到着記録、localStorage永続化を集約。

## やっていないこと（スコープ外）

- ユーザー認証・課金・プッシュ通知
- Gmail / Outlook 連携（貼り付け方式のみ）
- 予約サイトのAPI連携
- 複数日程（1日のみ）
- 天気表示（デザインには存在するが、天気APIがスコープ外のため実データを捏造せず省略）
