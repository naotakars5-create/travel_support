/**
 * 診断用エンドポイント：サーバーに環境変数（APIキー）が届いているかを確認する。
 * キーの「値」は返さず、設定されているかどうか（真偽）だけを返す。
 * デプロイ後に /api/config-check を開けば、AIや地図が動かない原因（キー未反映か）を切り分けられる。
 */
export async function GET(): Promise<Response> {
  return Response.json({
    provider: process.env.LLM_PROVIDER || "anthropic",
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    hasOpenAIKey: Boolean(process.env.OPENAI_API_KEY),
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1",
    hasGoogleMapsKey: Boolean(process.env.GOOGLE_MAPS_API_KEY),
  });
}
