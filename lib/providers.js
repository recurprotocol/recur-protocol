// lib/providers.js
// Handles request formatting and response normalisation
// for all supported AI providers

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
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    defaultModel: "llama-3.3-70b-versatile",
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    models: ["openai/gpt-4o", "anthropic/claude-sonnet-4-5", "meta-llama/llama-3.3-70b-instruct"],
    defaultModel: "openai/gpt-4o-mini",
  },
  mistral: {
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "open-mistral-nemo"],
    defaultModel: "mistral-small-latest",
  },
  gemini: {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
    defaultModel: "gemini-1.5-flash",
  },
};

// OpenAI-compatible providers all use the same message format
const OPENAI_COMPATIBLE = ["openai", "groq", "openrouter", "mistral"];

// Normalise any incoming request to a standard internal format
export function normaliseRequest(body, provider) {
  if (OPENAI_COMPATIBLE.includes(provider)) {
    return {
      provider,
      model: body.model || PROVIDERS[provider].defaultModel,
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

  if (provider === "gemini") {
    // Accept OpenAI-style messages and normalise for detection
    // The actual Gemini translation happens in forwardToProvider
    return {
      provider: "gemini",
      model: body.model || PROVIDERS.gemini.defaultModel,
      messages: body.messages || [],
      systemPrompt: body.messages?.find((m) => m.role === "system")?.content || null,
      userPrompt: body.messages?.filter((m) => m.role === "user").map((m) => m.content).join(" ") || "",
      raw: body,
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

// Format a RECUR block response back to the client
// in OpenAI-compatible response shape (used by all providers)
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

  // OpenAI-compatible format (openai, groq, openrouter, mistral, gemini)
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
