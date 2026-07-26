# 旅ナビ / TABI-NAVI

日本の個人旅行者向け旅程アプリ。**行きたい場所を自分で追加していくと、AI が到着時刻・重要度・移動時間をもとに1日の順路へ組み上げる**。計画中も当日も周辺の立ち寄りスポットを提案し、旅行当日は「次に何をするか」だけを示す。予約確認メールを貼り付けて確定予定として取り込むこともできる（補助機能）。

Expo Router（React Native）+ TypeScript + NativeWind（Tailwind for RN）。サーバー処理は Expo Router の API Routes（`src/app/api/*+api.ts`）。状態は React state + AsyncStorage（DB・認証なし）。

> 以前は Next.js（Web）で実装していましたが、実機で動く「アプリ」として使いたいという要望を受けて Expo/React Native に全面移行しました。

## セットアップ

```bash
npm install
cp .env.example .env.local   # ANTHROPIC_API_KEY / GOOGLE_MAPS_API_KEY を設定
npx expo start
```

ターミナルに表示される QR コードをスマホの **Expo Go** アプリ（App Store / Google Play）で読み取ると実機で動きます。クラウド環境（Codespaces 等）から実機で確認する場合は、スマホと dev サーバーが同じLANに乗らないため `npx expo start --tunnel` を使ってください（`@expo/ngrok` が必要。初回は自動でインストールされます）。

## Web版として固定URLで公開する（QR不要・推奨）

毎回 QR を読む代わりに、Web版としてビルドして固定の `https://...` URL で公開できます。スマホの Safari で開いて「ホーム画面に追加」すれば、アプリのアイコンとして起動できます（サーバー起動も QR も不要）。React Native の画面がそのままブラウザで動きます（日時入力だけはブラウザ標準の `datetime-local` に自動で切り替わります）。

このアプリはメール解析・地図用のサーバーAPI（`+api.ts`）とAPIキーを持つため、静的ホスティングではなくサーバー実行できる **EAS Hosting** を使います。

```bash
# 1. 無料の Expo アカウントでログイン（初回のみ）
npx eas login

# 2. サーバー用の環境変数を EAS 側に登録（初回のみ）
#    production 環境にキーを保存する
npx eas env:create --environment production --name ANTHROPIC_API_KEY --value "sk-ant-..." --visibility secret
npx eas env:create --environment production --name GOOGLE_MAPS_API_KEY --value "AIza..." --visibility secret
#    （任意）共有リンクを短くする場合は Upstash Redis の認証情報も登録する
npx eas env:create --environment production --name UPSTASH_REDIS_REST_URL --value "https://xxx.upstash.io" --visibility secret
npx eas env:create --environment production --name UPSTASH_REDIS_REST_TOKEN --value "AX...." --visibility secret

# 3. Web版としてビルド
npx expo export --platform web

# 4. デプロイ（初回は本番エイリアスに固定URLを付ける）
npx eas deploy --prod
```

デプロイが成功すると `https://<プロジェクト名>.expo.app` のような固定URLが発行されます。以降はコードを変えたら `npx expo export --platform web && npx eas deploy --prod` を実行すれば同じURLに反映されます。

> 注: EAS Hosting は無料枠があります。GPSはブラウザの位置情報許可で動作します（iOS Safari では https 必須なので、この公開URL上では有効）。

## 公開（デプロイ）をGitHubに任せる

`.github/workflows/deploy-web.yml` を入れてあるので、ターミナルを使わずに公開できます。

**初回だけ必要な設定（すべてブラウザで完結）**

1. <https://expo.dev> → 右上のアカウントメニュー → **Access tokens** → **Create token**
   （名前は任意。表示されたトークンをコピーする）
2. GitHub のリポジトリ → **Settings** → **Secrets and variables** → **Actions**
   → **New repository secret**
   - Name: `EXPO_TOKEN`
   - Secret: 1でコピーしたトークン

**以降の使い方**

- **プルリクエストをマージする** → 自動でビルド・デプロイされる
- **コードを変えずに公開し直したい**（環境変数を追加した時など）
  → GitHub の **Actions** タブ → 左の **Deploy Web** → **Run workflow** ボタン

デプロイの進行状況と結果は Actions タブで確認できます。

## 共有リンクを短くする（任意）

共有は既定で「旅程そのものをURLに埋め込む」方式です。サーバー不要で動く代わりに、
18スポットの旅程で **1,000〜1,700文字** のURLになり、LINE や QR では扱いづらくなります。

保存先（Redis互換のKV）を1つ用意すると、旅程をサーバーに預けて
`https://<アプリのURL>/?s=a7Bx9K2mQd`（**全体で約40文字**）の短いリンクになります。

1. <https://upstash.com> で無料アカウントを作り、Redis データベースを1つ作成する（無料枠あり）
2. ダッシュボードの **REST API** から `UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` をコピー
3. ローカルなら `.env.local`、本番なら上記の `eas env:create` で登録する

未設定・通信失敗のときは自動的に従来のURL埋め込み方式へ戻るので、
設定しなくてもアプリは問題なく動きます。共有された旅程は **90日** で失効します。

## 実機ネイティブアプリにする（任意・有料）

ホーム画面から起動する「本物のネイティブアプリ」にしたい場合は EAS Build を使います。ただし **iPhone に継続的にインストールするには Apple Developer Program（年額約$99）が必要** です（Apple の制約）。Android は無料で `.apk` を作って直接インストールできます。今回はここまでは未対応（Web版公開までを実装）。

### 環境変数（`.env.local`）

| 変数 | 必須 | 説明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | △ | Anthropic API キー。AIの旅程作成（`/api/plan`）とメール解析（`/api/parse`）が使う既定プロバイダ。OpenAI を使う場合は不要。未設定でもローカル・ヒューリスティックで旅程は組める。 |
| `LLM_PROVIDER` | - | `openai` を指定すると Anthropic の代わりに OpenAI（ChatGPT の API）を使う。旅程作成・メール解析の両方が切り替わる。 |
| `OPENAI_API_KEY` | △ | `LLM_PROVIDER=openai` のとき必須。**platform.openai.com で発行する APIキー（従量課金）。ChatGPT Plus サブスクとは別物**。 |
| `OPENAI_MODEL` | - | OpenAI 利用時のモデル名（未指定なら `gpt-4.1`）。 |
| `GOOGLE_MAPS_API_KEY` | - | Google Maps Platform キー（**Geocoding API・Directions API・Places API（レガシー版、"Places API (New)" ではない）・Maps Static API** を有効化したもの）。未設定でもアプリは動作する（ヒューリスティック推定・固定スポットにフォールバックし、全行程マップは非表示）。設定すると住所→座標変換・地点間の実測移動時間・周辺観光スポット提案・全行程マップが実データになる。 |
| `EXPO_PUBLIC_API_BASE_URL` | - | API呼び出しの起点URLを固定したい場合に指定（本番ビルド向け）。未指定時は開発中は Expo の dev server ホストを自動解決する（`src/lib/apiBase.ts`）。 |
| `UNSPLASH_ACCESS_KEY` | - | しおりの表紙にする地域の風景写真（Unsplash）。未設定なら表紙は既定のイラストのまま。<https://unsplash.com/developers> で無料アプリを登録して Access Key を取得する。 |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | - | 共有リンクを短くするための保存先（Upstash Redis の REST 認証情報。Vercel KV の `KV_REST_API_URL` / `KV_REST_API_TOKEN` でも可）。未設定でも共有はできるが、旅程をURLに埋め込むため1,000〜1,700文字の長いURLになる。設定すると `?s=a7Bx9K2mQd`（全体で約40文字）になる。保持期間90日。 |

`ANTHROPIC_API_KEY`・`OPENAI_API_KEY` のどちらか一方があれば AI 機能が動きます。両方とも未設定でも起動でき、その場合はローカル・ヒューリスティックで旅程を組み、メール解析は手入力フォームへフォールバックします。

## 実装状況

- **解析エンジン**: `/api/parse`（`src/app/api/parse+api.ts`）実装済み。正規表現ではなくLLMに文面を読ませる方式。JSONのみを厳格に返すようプロンプトで指示し、コードフェンス混入を想定したstrip処理あり。複数イベント抽出・年の補完・skip判定・confidenceに対応。同一本文の再解析を避けるプロセスローカルキャッシュあり。
  - **cURLでの実地検証は未実施**（`ANTHROPIC_API_KEY` 未用意のため）。設定後、実在のJAL/じゃらん/えきねっと等のメール文面で検証することを推奨。
- **4画面**: 計画（行き先リスト＋AI旅程作成）・旅程（路線図＋全行程マップ）・当日（発車標・天気連動）・持ち物（チェックリスト）を実装済み。
- **行き先の追加と旅程化**: `計画`画面で「行き先・住所・重要度（必ず/できれば/余れば）・滞在時間・目安到着時刻・費用」を入力して追加する。追加のたびにローカル・ヒューリスティックで即座に順路を組み（`lib/plan.ts` の `localSchedule`）、「AIで旅程を組む」ボタンで LLM（`/api/plan`）が並べ替え・時刻割り当て・おすすめスポット提案を返す。**AIは順路と時刻だけを決め、座標などの実データはローカル保持**なので、`ANTHROPIC_API_KEY` が無くてもローカル計算で旅程は成立する。
- **AI提案の取り込み**: `/api/plan` が返すおすすめスポットは計画画面に表示され、ワンタップで行き先リストへ追加できる。
- **状態遷移**: locked→move→free→done の想定デモ動線を実装済み（`src/lib/dayof.ts`）。空き時間（free）では周辺スポットを、当日が雨天なら屋内スポットを優先提案する。
- **Google Maps 連携**: 住所のジオコーディング（`/api/geocode`）、地点間の実測移動時間（`/api/directions`）、空き時間の周辺観光スポット（`/api/nearby-spots`）を実装済み。`GOOGLE_MAPS_API_KEY` 未設定時はヒューリスティック推定・固定スポットに自動フォールバックする。**実キーでE2E検証済み**（実際の住所→実測移動時間・実在スポット名で動作確認）。
- **予約メール取り込み（補助）**: 計画画面の「＋」→「メールから追加」で予約確認メールを貼り付けると、`/api/parse` が解析して**時刻固定の確定予定（アンカー）**として行き先リストへ取り込む。AIはこのアンカー時刻を必ず守って前後の予定を配置する。
- **全行程マップ**: 旅程画面の先頭に、全地点を経路線でつないだ静的地図を表示（`/api/staticmap` が Static Maps API 画像をプロキシしAPIキーを秘匿）。座標未取得・キー未設定時はそっと非表示。
- **予算・費用**: 各行き先に費用を入力でき、計画画面ヘッダーに合計を表示。
- **持ち物チェックリスト**: `持ち物`画面で準備物をチェック管理（初期雛形あり・追加/削除可・永続化）。
- **天気連動**: `/api/weather`（Open-Meteo・APIキー不要）で当日の天気を取得し、当日画面に表示。雨天時は空き時間の提案を屋内スポットへ切り替える。
- **GPS連携**: `expo-location` で実機の現在地を取得（`src/hooks/useLiveLocation.ts`）。空き時間の周辺スポット提案は、到着記録した地点の座標ではなく実際の現在地を優先して使う。また、当日画面が move/free 状態のとき、次の目的地（座標がジオコーディング済みの場合）から120m以内に近づくと「到着を記録」ボタンを押さなくても自動で到着記録される（`src/hooks/useAppState.ts`）。位置情報の許可が得られない場合は自動検知のみ無効化され、手動の到着記録ボタンは常に使える。
- **Web版対応**: `npx expo export --platform web` でWeb版として書き出せる。日時入力は、ネイティブでは `@react-native-community/datetimepicker`、Webではブラウザ標準の `<input type="datetime-local">` に自動で切り替わる（`src/components/DateField.tsx` の `Platform.OS` 分岐）。Web版はブラウザ（iPhone幅）で受信箱→解析→旅程→当日の一連の流れ・日時ピッカーが動作することを確認済み。
- **Expo Go 実機確認**: このサンドボックスからは tunnel 接続がネットワークポリシーでブロックされているため未実施。iOS/Android 双方の Metro バンドルが正常にビルドされること、4つのAPIルートがdevサーバー上で正しく応答することは確認済み。

## アーキテクチャメモ

```
src/
  app/
    _layout.tsx        フォント読み込み・SafeAreaProvider・GestureHandlerRootView
    index.tsx           メイン画面（タブ状態・各画面の組み立て）
    api/
      plan+api.ts         行き先リスト→順路・時刻・おすすめ提案（Anthropic）
      parse+api.ts        メール解析（Anthropic・補助）
      geocode+api.ts      住所→座標（Geocoding API）
      directions+api.ts   2地点間の移動時間（Directions API）
      nearby-spots+api.ts 周辺観光スポット（Places API）
      weather+api.ts      当日の天気（Open-Meteo・キー不要）
      staticmap+api.ts    全行程マップ画像のプロキシ（Static Maps API）
  components/            画面・UIパーツ（React Native / NativeWind）
  hooks/useAppState.ts   状態管理の中枢
  lib/                   フレームワーク非依存のドメインロジック（型・計算・API呼び出しヘルパー）
```

- `lib/types.ts` — `PlanEntry`（ユーザーが追加する行き先）・`ScheduleSlot`（時刻割り当て）・`ParsedEvent`（路線図イベント）・`SpotSuggestion`・`PackingItem` 等の共通スキーマ。
- `lib/plan.ts` — 計画ドメインの中枢。`localSchedule`（AI不要のヒューリスティック順路）、`buildEventsFromSchedule`（行き先＋時刻割り当て→路線図イベント）、`scheduleSignature`（座標補完では変化しない構造署名。ローカル再計算の発火判定に使用）、重要度メタ・費用集計・入力/提案/メール取り込みの変換関数。
- `lib/planPrompt.ts` — `/api/plan` 用のシステムプロンプト。AIは entryId 参照の順路と時刻だけを返す（場所データは捏造させない）。
- `lib/itinerary.ts` — イベント配列から node/edge/gap の路線図データを構築。所要時間は実時刻の差分から計算、60分以上の空きは「空き時間」、見積もり移動時間が空き時間を超える場合や前後が重なる場合は「矛盾（間に合わない）」として検出。
- `lib/transit.ts` — 移動手段・所要時間の見積もりインターフェース（`TransitEstimator`）。`heuristicTransitEstimator`（簡易推定・既定のフォールバック）と `createPrecomputedEstimator`（Directions APIの実測値キャッシュを参照する実装）。
- `lib/googleMaps.ts` — Geocoding / Directions / Places Nearby Search / Static Maps の呼び出しをまとめたサーバー専用ヘルパー。
- `lib/spots.ts` — 空き時間の周辺スポット取得インターフェース（`SpotProvider`）。座標の有無で固定データ/Google Places実データを自動選択し、雨天時は屋内施設を優先。
- `lib/weather.ts` / `lib/weatherClient.ts` — 天気の型・WMOコード変換（サーバー）と取得ヘルパー（クライアント）。
- `lib/routeMap.ts` — 全行程マップ画像（`/api/staticmap`）のGET用URL組み立て（クライアント）。
- `lib/packing.ts` — 持ち物チェックリストの雛形と進捗計算。
- `lib/dayof.ts` — 当日画面の状態（locked/move/free/done）を rail と現在地から導出し、出発カウントダウンを計算。
- `lib/storage.ts` — AsyncStorageベースの永続化（v2: 行き先・時刻割り当て・持ち物・到着記録）。
- `lib/apiBase.ts` — React Native には「相対URL」の概念が無いため、Expo dev server / 本番APIの絶対URLを解決する。
- `hooks/useAppState.ts` — 行き先リストの状態管理、ローカル/AI旅程作成、メール取り込み、到着記録、AsyncStorage永続化、地点のジオコーディングと隣接イベント間のDirections APIキャッシュ取得を非同期に行う。
- `components/animations.tsx` — Web版のCSSアニメーション（pulse/spin/blink/sheetup/flashfade/nodein）をReact NativeのAnimated APIで再現した共通部品。

### デザイン上の注意（Web版からの意図的な差分）

- **偽のステータスバー行は廃止**：Web版プロトタイプは「9:41」を表示する偽のステータスバーを画面内に描画していたが、実機では本物のOSステータスバーが表示されるため冗長。`expo-status-bar` でアイコン色（当日=白文字／それ以外=黒文字）のみ制御し、`SafeAreaView`/`useSafeAreaInsets` で余白を確保する方式に変更。
- **端末フレーム（PhoneFrame）は廃止**：Web版はデスクトップ閲覧時に端末モックアップを表示していたが、実機アプリではアプリ自体が画面いっぱいに表示されるため不要。

## やっていないこと（スコープ外）

- ユーザー認証・課金・プッシュ通知
- Gmail / Outlook 連携（メールは貼り付け方式のみ）
- 予約サイトのAPI連携
- 複数日程（1日のみ）
- EAS Build等によるスタンドアロンアプリ化（今回は Expo Go / Web版での動作確認まで）
