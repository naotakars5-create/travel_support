import { fetchWithTimeout } from "./http";
import Anthropic from "@anthropic-ai/sdk";

export interface LlmCallParams {
  system: string;
  user: string;
}

export interface LlmProvider {
  name: string;
  complete(params: LlmCallParams): Promise<string>;
}

const ANTHROPIC_MODEL = "claude-sonnet-4-6";

export const anthropicProvider: LlmProvider = {
  name: "anthropic",
  async complete({ system, user }) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system,
      messages: [{ role: "user", content: user }],
    });
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") throw new Error("No text response from model");
    return textBlock.text;
  },
};

/**
 * OpenAI（ChatGPT の API）プロバイダ。Anthropic と同一のプロンプト/スキーマのまま利用できる。
 * LLM_PROVIDER=openai かつ OPENAI_API_KEY がある場合に有効になり、旅程作成・メール解析の
 * 両方がこちらを使う。モデルは OPENAI_MODEL（既定 gpt-4.1）。
 * ※ 必要なのは OpenAI Platform の APIキー（従量課金）で、ChatGPT Plus サブスクとは別物。
 */
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

export const openaiProvider: LlmProvider = {
  name: "openai",
  async complete({ system, user }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    const res = await fetchWithTimeout(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0,
        }),
      },
      80000 // 応答しないモデルを待ち続けない
    );
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error ${res.status}: ${errText}`);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new Error("No text response from model");
    return text;
  },
};

export function getLlmProvider(): LlmProvider {
  // 明示指定が最優先
  if (process.env.LLM_PROVIDER === "openai") return openaiProvider;
  if (process.env.LLM_PROVIDER === "anthropic") return anthropicProvider;
  // 未指定なら「持っているキー」で自動選択する。
  // OPENAI_API_KEY だけ登録して LLM_PROVIDER を設定し忘れると、
  // 既定の Anthropic がキー無しで呼ばれて全AI機能が失敗するため。
  if (!process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY) return openaiProvider;
  return anthropicProvider;
}
