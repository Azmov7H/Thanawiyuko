import { loadAiConfig, ModelTier } from "./config";

/** Unified AI response shape. */
export interface AiResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  model: string;
  cached: boolean;
}

/** Provider abstraction — swap OpenRouter ↔ other without touching features. */
export interface AiProvider {
  /** Streaming chat completion. */
  completeStream(args: {
    model: ModelTier;
    system: string;
    user: string;
    maxTokens: number;
    temperature?: number;
    onToken: (chunk: string) => void;
    signal?: AbortSignal;
  }): Promise<AiResponse>;

  /** Non-streaming (for eval/budget checks). */
  complete(args: {
    model: ModelTier;
    system: string;
    user: string;
    maxTokens: number;
    temperature?: number;
  }): Promise<AiResponse>;
}

/** OpenRouter-compatible provider (default). */
export class OpenRouterProvider implements AiProvider {
  private baseUrl: string;
  private apiKey: string;
  private config = loadAiConfig();

  constructor() {
    this.baseUrl = process.env.AI_GATEWAY_URL ?? "https://openrouter.ai/api/v1";
    this.apiKey = process.env.AI_GATEWAY_KEY ?? "";
    if (!this.apiKey) {
      console.warn("[AI] AI_GATEWAY_KEY not set — provider will fail on calls");
    }
  }

  private async post(body: Record<string, unknown>, signal?: AbortSignal): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
        "X-Title": "Thanawico",
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`OpenRouter ${res.status}: ${txt}`);
    }
    return res;
  }

  async completeStream(args: {
    model: ModelTier;
    system: string;
    user: string;
    maxTokens: number;
    temperature?: number;
    onToken: (chunk: string) => void;
    signal?: AbortSignal;
  }): Promise<AiResponse> {
    const modelCfg = this.config.models[args.model];
    const res = await this.post(
      {
        model: modelCfg.id,
        messages: [
          { role: "system", content: args.system },
          { role: "user", content: args.user },
        ],
        max_tokens: Math.min(args.maxTokens, modelCfg.maxTokens, this.config.responseCap),
        temperature: args.temperature ?? 0.3,
        stream: true,
      },
      args.signal,
    );

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    let content = "";
    let tokensOut = 0;
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? "";
          if (delta) {
            content += delta;
            tokensOut++;
            args.onToken(delta);
          }
        } catch {
          /* ignore malformed SSE lines */
        }
      }
    }

    // OpenRouter returns usage in final chunk headers or not at all; approximate.
    return {
      content,
      tokensIn: Math.ceil(content.length / 4),
      tokensOut,
      costUsd: this.estimateCost(modelCfg, Math.ceil(content.length / 4), tokensOut),
      model: modelCfg.id,
      cached: false,
    };
  }

  async complete(args: {
    model: ModelTier;
    system: string;
    user: string;
    maxTokens: number;
    temperature?: number;
  }): Promise<AiResponse> {
    const modelCfg = this.config.models[args.model];
    const res = await this.post({
      model: modelCfg.id,
      messages: [
        { role: "system", content: args.system },
        { role: "user", content: args.user },
      ],
      max_tokens: Math.min(args.maxTokens, modelCfg.maxTokens, this.config.responseCap),
      temperature: args.temperature ?? 0.3,
      stream: false,
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0 };
    return {
      content,
      tokensIn: usage.prompt_tokens ?? 0,
      tokensOut: usage.completion_tokens ?? 0,
      costUsd: this.estimateCost(modelCfg, usage.prompt_tokens ?? 0, usage.completion_tokens ?? 0),
      model: modelCfg.id,
      cached: false,
    };
  }

  private estimateCost(cfg: ReturnType<typeof loadAiConfig>["models"][ModelTier], inT: number, outT: number): number {
    return (inT / 1000) * cfg.costPer1kIn + (outT / 1000) * cfg.costPer1kOut;
  }
}

/** Factory — single point to swap implementations. */
let _provider: AiProvider | null = null;
export function getAiProvider(): AiProvider {
  if (!_provider) _provider = new OpenRouterProvider();
  return _provider;
}

/** For tests — inject a fake. */
export function setAiProvider(p: AiProvider) {
  _provider = p;
}