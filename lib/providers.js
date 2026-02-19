// lib/providers.js
// Handles request formatting and response normalisation
// for OpenAI and Anthropic providers

export const PROVIDERS = {
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
    defaultModel: "gpt-4o-mini",
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    models: ["claude-opus-4-5", "claude-sonnet-4-5", "claude-haiku-4-5"],
    defaultModel: "claude-haiku-4-5",
  },
};

// Normalise any incoming request to a standard internal format
export function normaliseRequest(body, provider) {
  if (provider === "openai") {
    return {
      provider: "openai",
      model: body.model || PROVIDERS.openai.defaultModel,
      messages: body.messages || [],
      systemPrompt: body.messages?.find((m) => m.role === "system")?.content || null,
      userPrompt: body.messages?.filter((m) => m.role === "user").map((m) => m.content).join(" ") || "",
      raw: body,
    };
  }

  if (provider === "anthropic") {
    return {
      provider: "anthropic",
      model: body.model || PROVIDERS.anthropic.defaultModel,
      messages: body.messages || [],
      systemPrompt: body.system || null,
      userPrompt: body.messages?.filter((m) => m.role === "user").map((m) =>
        typeof m.content === "string" ? m.content : m.content.map((c) => c.text).join(" ")
      ).join(" ") || "",
      raw: body,
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// Format a RECUR block response back to the client
// in the provider's expected response shape
export function blockResponse(provider, model, reason) {
  const blocked = {
    id: `recur-block-${Date.now()}`,
    blocked: true,
    recur: {
      status: "BLOCKED",
      reason,
      sentinel: "WARD-INJ-01",
      timestamp: new Date().toISOString(),
    },
  };

  if (provider === "openai") {
    return {
      ...blocked,
      object: "chat.completion",
      model,
      choices: [{
        index: 0,
        message: {
          role: "assistant",
          content: `[RECUR SENTINEL] This request was blocked. Reason: ${reason}`,
        },
        finish_reason: "stop",
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  }

  if (provider === "anthropic") {
    return {
      ...blocked,
      type: "message",
      model,
      role: "assistant",
      content: [{
        type: "text",
        text: `[RECUR SENTINEL] This request was blocked. Reason: ${reason}`,
      }],
      stop_reason: "end_turn",
      usage: { input_tokens: 0, output_tokens: 0 },
    };
  }
}
