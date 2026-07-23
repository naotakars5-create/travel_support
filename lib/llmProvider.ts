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
 * 検証用の暫定プロバイダ（本番仕様は Anthropic）。
 * ANTHROPIC_API_KEY が無い開発環境で、同一のプロンプト/スキーマのまま
 * OpenAI 互換 API を使って動作確認するためだけに用意している。
 * LLM_PROVIDER=openai かつ OPENAI_API_KEY がある場合のみ有効になる。
 */
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1";

export const openaiProvider: LlmProvider = {
  name: "openai",
  async complete({ system, user }) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
    });
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
  if (process.env.LLM_PROVIDER === "openai") return openaiProvider;
  return anthropicProvider;
}
