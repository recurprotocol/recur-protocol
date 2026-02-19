/**
 * RECUR Protocol — API Proxy v1
 * Node.js serverless function — Vercel
 *
 * Intercepts requests destined for OpenAI or Anthropic,
 * runs detection via the Python sentinel, blocks threats,
 * logs all events, and forwards clean requests to the provider.
 *
 * Usage:
 *   POST /api/proxy
 *   Headers:
 *     x-recur-api-key: <your RECUR API key>
 *     x-recur-provider: openai | anthropic
 *     x-recur-target-key: <your provider API key>
 *   Body: standard OpenAI or Anthropic messages payload
 */

import { normaliseRequest, blockResponse, PROVIDERS } from "../lib/providers.js";

const DETECTION_URL = process.env.DETECTION_URL || "http://localhost:3001/api/detect";
const RECUR_API_SECRET = process.env.RECUR_API_SECRET;

export default async function handler(req, res) {

  // ── CORS ──
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-recur-api-key, x-recur-provider, x-recur-target-key");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const startTime = Date.now();

  try {

    // ── AUTH ──
    const apiKey = req.headers["x-recur-api-key"];
    if (RECUR_API_SECRET && apiKey !== RECUR_API_SECRET) {
      return res.status(401).json({ error: "Invalid RECUR API key" });
    }

    // ── PROVIDER ──
    const provider = req.headers["x-recur-provider"]?.toLowerCase();
    if (!provider || !PROVIDERS[provider]) {
      return res.status(400).json({
        error: `x-recur-provider header required. Supported: ${Object.keys(PROVIDERS).join(", ")}`,
      });
    }

    const targetApiKey = req.headers["x-recur-target-key"];
    if (!targetApiKey) {
      return res.status(400).json({ error: "x-recur-target-key header required" });
    }

    // ── NORMALISE ──
    const normalised = normaliseRequest(req.body, provider);

    // ── DETECT ──
    const detectionResult = await runDetection({
      prompt_text:   normalised.userPrompt,
      messages:      normalised.messages,
      system_prompt: normalised.systemPrompt,
    });

    const latency = Date.now() - startTime;

    // ── LOG EVENT ──
    const event = buildEvent({
      provider,
      normalised,
      detection: detectionResult,
      latencyMs: latency,
      ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
    });

    // Fire-and-forget log (don't await — don't block the response)
    logEvent(event, req).catch(console.error);

    // ── BLOCK ──
    if (detectionResult.blocked) {
      const blocked = blockResponse(provider, normalised.model, detectionResult.primary_threat);
      return res.status(200).json({
        ...blocked,
        recur: {
          status: "BLOCKED",
          severity: detectionResult.severity,
          confidence: detectionResult.confidence,
          primary_threat: detectionResult.primary_threat,
          threats: detectionResult.threats,
          sentinel: detectionResult.sentinel,
          latency_ms: latency,
          event_id: event.id,
        },
      });
    }

    // ── FORWARD ──
    const providerResponse = await forwardToProvider(provider, targetApiKey, normalised.raw);

    // Return provider response with RECUR metadata attached
    return res.status(200).json({
      ...providerResponse,
      recur: {
        status: "CLEAN",
        severity: detectionResult.severity,
        confidence: detectionResult.confidence,
        latency_ms: latency,
        event_id: event.id,
      },
    });

  } catch (err) {
    console.error("RECUR proxy error:", err);
    return res.status(500).json({ error: "Internal sentinel error", message: err.message });
  }
}

// ─────────────────────────────────────────────
// DETECTION CALL
// ─────────────────────────────────────────────

async function runDetection(payload) {
  try {
    const response = await fetch(DETECTION_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000), // 3s timeout — security can't slow down the happy path too much
    });

    if (!response.ok) throw new Error(`Detection engine returned ${response.status}`);
    return await response.json();

  } catch (err) {
    // If detection engine is unreachable, fail open with a warning
    // In production you may want to fail closed — configurable
    console.warn("Detection engine unreachable — failing open:", err.message);
    return {
      blocked: false,
      severity: "UNKNOWN",
      confidence: 0,
      threats: [],
      primary_threat: null,
      sentinel: "OFFLINE",
    };
  }
}

// ─────────────────────────────────────────────
// PROVIDER FORWARDING
// ─────────────────────────────────────────────

async function forwardToProvider(provider, apiKey, body) {
  if (provider === "openai") {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "OpenAI error");
    }
    return response.json();
  }

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Anthropic error");
    }
    return response.json();
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

// ─────────────────────────────────────────────
// EVENT BUILDER
// ─────────────────────────────────────────────

function buildEvent({ provider, normalised, detection, latencyMs, ip }) {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    provider,
    model: normalised.model,
    status: detection.blocked ? "BLOCKED" : "CLEAN",
    severity: detection.severity,
    confidence: detection.confidence,
    primary_threat: detection.primary_threat,
    threat_count: detection.threat_count || 0,
    sentinel: detection.sentinel,
    latency_ms: latencyMs,
    ip_hash: hashIp(ip), // hash for privacy
    prompt_length: normalised.userPrompt?.length || 0,
  };
}

function hashIp(ip) {
  // Simple hash — not cryptographic, just for grouping
  let h = 0;
  for (let i = 0; i < ip.length; i++) {
    h = (Math.imul(31, h) + ip.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16);
}

// ─────────────────────────────────────────────
// EVENT LOGGING
// ─────────────────────────────────────────────

async function logEvent(event, req) {
  // Forward event to the threats logging endpoint
  const host = req.headers.host || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  await fetch(`${protocol}://${host}/api/threats`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-recur-internal": "true",
    },
    body: JSON.stringify(event),
  });
}
