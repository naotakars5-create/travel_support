# 旅ナビ / TABI-NAVI

日本の個人旅行者向け旅程アプリ。予約確認メールの本文を LLM で読み取って1日の旅程を組み、旅行当日は「次に何をするか」だけを示す。

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

# 3. Web版としてビルド
npx expo export --platform web

# 4. デプロイ（初回は本番エイリアスに固定URLを付ける）
npx eas deploy --prod
```

デプロイが成功すると `https://<プロジェクト名>.expo.app` のような固定URLが発行されます。以降はコードを変えたら `npx expo export --platform web && npx eas deploy --prod` を実行すれば同じURLに反映されます。

> 注: EAS Hosting は無料枠があります。GPSはブラウザの位置情報許可で動作します（iOS Safari では https 必須なので、この公開URL上では有効）。

## 実機ネイティブアプリにする（任意・有料）

ホーム画面から起動する「本物のネイティブアプリ」にしたい場合は EAS Build を使います。ただし **iPhone に継続的にインストールするには Apple Developer Program（年額約$99）が必要** です（Apple の制約）。Android は無料で `.apk` を作って直接インストールできます。今回はここまでは未対応（Web版公開までを実装）。

### 環境変数（`.env.local`）

| 変数 | 必須 | 説明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | ◯ | Anthropic API キー。`/api/parse`（メール解析）が使用する既定のプロバイダ。 |
| `LLM_PROVIDER` | - | `openai` を指定すると `OPENAI_API_KEY`/`OPENAI_MODEL` を使う検証用プロバイダに切り替わる（開発時の暫定検証用。本番仕様は Anthropic）。 |
| `GOOGLE_MAPS_API_KEY` | - | Google Maps Platform キー（**Geocoding API・Directions API・Places API（レガシー版、"Places API (New)" ではない）** を有効化したもの）。未設定でもアプリは動作する（ヒューリスティック推定・固定スポットにフォールバック）。設定すると住所→座標変換・地点間の実測移動時間・周辺観光スポット提案が実データになる。実キーで動作確認済み。 |
| `EXPO_PUBLIC_API_BASE_URL` | - | API呼び出しの起点URLを固定したい場合に指定（本番ビルド向け）。未指定時は開発中は Expo の dev server ホストを自動解決する（`src/lib/apiBase.ts`）。 |

`ANTHROPIC_API_KEY` が未設定でも起動でき、解析ボタンを押すと自動的に手入力フォームへフォールバックします。

## 実装状況

- **解析エンジン**: `/api/parse`（`src/app/api/parse+api.ts`）実装済み。正規表現ではなくLLMに文面を読ませる方式。JSONのみを厳格に返すようプロンプトで指示し、コードフェンス混入を想定したstrip処理あり。複数イベント抽出・年の補完・skip判定・confidenceに対応。同一本文の再解析を避けるプロセスローカルキャッシュあり。
  - **cURLでの実地検証は未実施**（`ANTHROPIC_API_KEY` 未用意のため）。設定後、実在のJAL/じゃらん/えきねっと等のメール文面で検証することを推奨。
- **3画面**: 受信箱・旅程（路線図）・当日（発車標）を実装済み。
- **状態遷移**: locked→move→free→done の想定デモ動線を実装済み（`src/hooks/useAppState.ts`）。
- **Google Maps 連携**: 住所のジオコーディング（`/api/geocode`）、地点間の実測移動時間（`/api/directions`）、空き時間の周辺観光スポット（`/api/nearby-spots`）を実装済み。`GOOGLE_MAPS_API_KEY` 未設定時はヒューリスティック推定・固定スポットに自動フォールバックする。**実キーでE2E検証済み**（実際の住所→実測移動時間・実在スポット名で動作確認）。
- **手入力での旅程登録**: メール解析を介さず場所（住所推奨）・時刻を直接入力して旅程に追加できる（受信箱の「＋」→「手入力で追加」）。
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
      parse+api.ts       メール解析（Anthropic）
      geocode+api.ts      住所→座標（Geocoding API）
      directions+api.ts   2地点間の移動時間（Directions API）
      nearby-spots+api.ts 周辺観光スポット（Places API）
  components/            画面・UIパーツ（React Native / NativeWind）
  hooks/useAppState.ts   状態管理の中枢
  lib/                   フレームワーク非依存のドメインロジック（型・計算・API呼び出しヘルパー）
```

- `lib/types.ts` — `ParsedEvent` 等の共通スキーマ。`placeFromGeo`/`placeToGeo` に地点の座標を保持できる。
- `lib/itinerary.ts` — イベント配列から node/edge/gap の路線図データを構築。所要時間は実時刻の差分から計算、60分以上の空きは「空き時間」、見積もり移動時間が空き時間を超える場合や前後が重なる場合は「矛盾（間に合わない）」として検出。
- `lib/transit.ts` — 移動手段・所要時間の見積もりインターフェース（`TransitEstimator`）。`heuristicTransitEstimator`（簡易推定・既定のフォールバック）と `createPrecomputedEstimator`（Directions APIの実測値キャッシュを参照する実装）。
- `lib/googleMaps.ts` — Geocoding / Directions / Places Nearby Search の呼び出しをまとめたサーバー専用ヘルパー。
- `lib/spots.ts` — 空き時間の周辺スポット取得インターフェース（`SpotProvider`）。座標の有無で固定データ/Google Places実データを自動選択。
- `lib/dayof.ts` — 当日画面の状態（locked/move/free/done）を rail と現在地から導出し、出発カウントダウンを計算。
- `lib/storage.ts` — AsyncStorageベースの永続化。
- `lib/apiBase.ts` — React Native には「相対URL」の概念が無いため、Expo dev server / 本番APIの絶対URLを解決する。
- `hooks/useAppState.ts` — 受信箱メールの状態管理、解析API呼び出し、到着記録、AsyncStorage永続化、地点のジオコーディングと隣接イベント間のDirections APIキャッシュ取得を非同期に行う。
- `components/animations.tsx` — Web版のCSSアニメーション（pulse/spin/blink/sheetup/flashfade/nodein）をReact NativeのAnimated APIで再現した共通部品。

### デザイン上の注意（Web版からの意図的な差分）

- **偽のステータスバー行は廃止**：Web版プロトタイプは「9:41」を表示する偽のステータスバーを画面内に描画していたが、実機では本物のOSステータスバーが表示されるため冗長。`expo-status-bar` でアイコン色（当日=白文字／それ以外=黒文字）のみ制御し、`SafeAreaView`/`useSafeAreaInsets` で余白を確保する方式に変更。
- **端末フレーム（PhoneFrame）は廃止**：Web版はデスクトップ閲覧時に端末モックアップを表示していたが、実機アプリではアプリ自体が画面いっぱいに表示されるため不要。

## やっていないこと（スコープ外）

- ユーザー認証・課金・プッシュ通知
- Gmail / Outlook 連携（貼り付け方式のみ）
- 予約サイトのAPI連携
- 複数日程（1日のみ）
- 天気表示（デザインには存在するが、天気APIがスコープ外のため実データを捏造せず省略）
- EAS Build等によるスタンドアロンアプリ化（今回は Expo Go での動作確認まで）
