# スマホで使えるように公開する手順（EAS Hosting・固定URL）

Web版として固定URL（`https://…`）で公開し、スマホの Safari で開いて「ホーム画面に追加」すればアプリのように使えます。
毎回 QR を読む必要はありません。以下は**あなたのPCのターミナル**で、このプロジェクトのフォルダ内で実行します。

> 前提: [expo.dev](https://expo.dev) で無料アカウントを作成しておく（初回のみ）。

## 1. Expo にログイン（初回のみ）

```bash
npx eas login
```

## 2. サーバー用の環境変数を EAS に登録（初回のみ）

`.env.local` はデプロイに含まれないため、公開サーバーが使うキーは EAS 側に登録します。
`<...>` は自分の値に置き換えてください。

```bash
# Google Maps（住所→座標・移動時間・周辺スポット・全行程マップ）
npx eas env:create --environment production --name GOOGLE_MAPS_API_KEY --value "<GoogleマップのAPIキー>" --visibility secret

# AI（旅程作成・メール解析）を OpenAI で使う
npx eas env:create --environment production --name LLM_PROVIDER --value "openai" --visibility plaintext
npx eas env:create --environment production --name OPENAI_API_KEY --value "<OpenAIのAPIキー>" --visibility secret
# 任意: モデルを固定したい場合
# npx eas env:create --environment production --name OPENAI_MODEL --value "gpt-4.1" --visibility plaintext
```

## 3. Web版としてビルド

```bash
npx expo export --platform web
```

## 4. デプロイ

```bash
npx eas deploy --prod
```

成功すると `https://<プロジェクト名>.expo.app` のような固定URLが発行されます。

## 5. スマホで開く

- 発行された URL をスマホの Safari で開く
- 共有ボタン →「ホーム画面に追加」→ アプリアイコンとして起動できます
- 位置情報を許可すると、周辺スポット提案と到着の自動記録が有効になります（https 上なので iOS でも動作）

## 更新のしかた（2回目以降）

コードやキーを変えたら、`3 → 4`（`export` → `deploy --prod`）をやり直せば同じURLに反映されます。
環境変数を変えたい場合は `npx eas env:create ...` を再実行（または EXPO の Web ダッシュボードで編集）してから再デプロイします。

## キーの取り扱い

- APIキーは `--visibility secret` で登録し、コードや Git には**書かない**（`.env.local` は Git 管理外）。
- Google Maps キーは Google Cloud Console で「HTTP リファラー制限」＋「使用APIの制限」をかけると安全です。
- OpenAI キーは従量課金です。使いすぎ防止に、OpenAI の管理画面で使用上限（Usage limits）を設定しておくと安心です。
