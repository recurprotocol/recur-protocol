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
 *     x-recur-provider: openai | anthropic | groq | openrouter | mistral | gemini
 *     x-recur-target-key: <your provider API key>
 *   Body: standard OpenAI or Anthropic messages payload
 *
 * Required env vars:
 *   RECUR_API_SECRET          — master API secret
 *   SUPABASE_URL              — Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key
 *   ATTESTER_KEYPAIR          — base58-encoded Solana private key for on-chain attestation
 *   SOLANA_RPC_URL             — Solana RPC endpoint (defaults to devnet)
 */

import { createHash } from "crypto";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor";
import { createClient } from "@supabase/supabase-js";
import { normaliseRequest, blockResponse, PROVIDERS } from "../lib/providers.js";

const DETECTION_URL    = process.env.DETECTION_URL || "http://localhost:3001/api/detect";
const RECUR_API_SECRET = process.env.RECUR_API_SECRET;
const SUPABASE_URL     = process.env.SUPABASE_URL     || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RATE_LIMIT_MAX     = 60;   // requests per window
const RATE_LIMIT_WINDOW  = 60000; // 1 minute in ms

const SOLANA_RPC_URL       = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const ATTESTER_KEYPAIR_B58 = process.env.ATTESTER_KEYPAIR;
const ATTESTATION_PROGRAM  = new PublicKey("3ZLSqgGoUH3cQbDLV6QXDLRXGzgCsmY9oMGx8qwMM24Y");

const supabaseAdmin = (SUPABASE_URL && SUPABASE_SERVICE)
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE)
  : null;

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

// ─────────────────────────────────────────────
// IN-MEMORY RATE LIMITER
// ─────────────────────────────────────────────

const rateBuckets = new Map();

function checkRateLimit(keyHash) {
  const now = Date.now();
  let bucket = rateBuckets.get(keyHash);

  if (!bucket) {
    bucket = { timestamps: [] };
    rateBuckets.set(keyHash, bucket);
  }

  // Evict expired entries
  bucket.timestamps = bucket.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);

  if (bucket.timestamps.length >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  bucket.timestamps.push(now);
  return { allowed: true, remaining: RATE_LIMIT_MAX - bucket.timestamps.length };
}

// Periodic cleanup to prevent memory leak from expired keys
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    bucket.timestamps = bucket.timestamps.filter(ts => now - ts < RATE_LIMIT_WINDOW);
    if (bucket.timestamps.length === 0) rateBuckets.delete(key);
  }
}, 60000);

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
    if (!apiKey) {
      return res.status(401).json({ error: "x-recur-api-key header required" });
    }

    const authResult = await validateApiKey(apiKey);
    if (!authResult.valid) {
      return res.status(401).json({ error: authResult.reason });
    }

    // ── RATE LIMIT ──
    const keyIdentifier = authResult.keyHash || sha256(apiKey);
    const rateResult = checkRateLimit(keyIdentifier);
    res.setHeader("X-RateLimit-Limit", RATE_LIMIT_MAX);
    res.setHeader("X-RateLimit-Remaining", rateResult.remaining);
    if (!rateResult.allowed) {
      return res.status(429).json({ error: "Rate limit exceeded. Max 60 requests per minute." });
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
      // Fire-and-forget on-chain attestation for blocked threats
      attestOnChain(event, normalised.userPrompt).catch(err =>
        console.error("Attestation failed:", err.message)
      );

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
    return res.status(500).json({ error: "Internal sentinel error" });
  }
}

// ─────────────────────────────────────────────
// DETECTION CALL
// ─────────────────────────────────────────────

async function runDetection(payload) {
  try {
    const headers = { "Content-Type": "application/json" };
    if (RECUR_API_SECRET) headers["x-recur-internal-secret"] = RECUR_API_SECRET;

    const response = await fetch(DETECTION_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000), // 3s timeout — security can't slow down the happy path too much
    });

    if (!response.ok) throw new Error(`Detection engine returned ${response.status}`);
    return await response.json();

  } catch (err) {
    // Fail closed — if detection is unreachable, block the request
    console.error("Detection engine unreachable — failing closed:", err.message);
    return {
      blocked: true,
      severity: "UNKNOWN",
      confidence: 0,
      threats: [{ type: "SENTINEL_OFFLINE", matched: "detection_unreachable", confidence: 0 }],
      primary_threat: "SENTINEL_OFFLINE",
      sentinel: "OFFLINE",
    };
  }
}

// ─────────────────────────────────────────────
// PROVIDER FORWARDING
// ─────────────────────────────────────────────

async function forwardToProvider(provider, apiKey, body) {
  // ── OpenAI ──
  if (provider === "openai") {
    return fetchJson("https://api.openai.com/v1/chat/completions", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    }, body, "OpenAI");
  }

  // ── Anthropic ──
  if (provider === "anthropic") {
    return fetchJson("https://api.anthropic.com/v1/messages", {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }, body, "Anthropic");
  }

  // ── Groq (OpenAI-compatible) ──
  if (provider === "groq") {
    return fetchJson("https://api.groq.com/openai/v1/chat/completions", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    }, body, "Groq");
  }

  // ── OpenRouter (OpenAI-compatible + extra headers) ──
  if (provider === "openrouter") {
    return fetchJson("https://openrouter.ai/api/v1/chat/completions", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://recur-protocol.com",
      "X-Title": "RECUR Protocol",
    }, body, "OpenRouter");
  }

  // ── Mistral (OpenAI-compatible) ──
  if (provider === "mistral") {
    return fetchJson("https://api.mistral.ai/v1/chat/completions", {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    }, body, "Mistral");
  }

  // ── Google Gemini (needs format translation) ──
  if (provider === "gemini") {
    return forwardToGemini(apiKey, body);
  }

  throw new Error(`Unsupported provider: ${provider}`);
}

async function fetchJson(url, headers, body, label) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `${label} error (${response.status})`);
  }
  return response.json();
}

async function forwardToGemini(apiKey, body) {
  const model = body.model || "gemini-1.5-flash";

  // Translate OpenAI messages → Gemini contents
  const systemParts = [];
  const contents = [];
  for (const msg of (body.messages || [])) {
    if (msg.role === "system") {
      systemParts.push({ text: msg.content });
    } else {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }
  }

  const geminiBody = { contents };
  if (systemParts.length > 0) {
    geminiBody.systemInstruction = { parts: systemParts };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(geminiBody),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini error (${response.status})`);
  }
  const geminiRes = await response.json();

  // Translate Gemini response → OpenAI-compatible format
  const text = geminiRes.candidates?.[0]?.content?.parts
    ?.map(p => p.text).join("") || "";
  return {
    id: `gemini-${Date.now()}`,
    object: "chat.completion",
    model,
    choices: [{
      index: 0,
      message: { role: "assistant", content: text },
      finish_reason: "stop",
    }],
    usage: {
      prompt_tokens: geminiRes.usageMetadata?.promptTokenCount || 0,
      completion_tokens: geminiRes.usageMetadata?.candidatesTokenCount || 0,
      total_tokens: geminiRes.usageMetadata?.totalTokenCount || 0,
    },
  };
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
// API KEY VALIDATION
// ─────────────────────────────────────────────

async function validateApiKey(key) {
  // 1. Legacy: accept the master secret (for internal/testing use)
  if (RECUR_API_SECRET && key === RECUR_API_SECRET) {
    return { valid: true, keyHash: sha256(key) };
  }

  // 2. Supabase: look up recur_live_ keys by SHA-256 hash
  if (supabaseAdmin && key.startsWith("recur_live_")) {
    const keyHash = sha256(key);
    try {
      const { data, error } = await supabaseAdmin
        .from("api_keys")
        .select("id, active")
        .eq("api_key", keyHash)
        .limit(1)
        .single();

      if (error || !data)     return { valid: false, reason: "Invalid API key" };
      if (!data.active)       return { valid: false, reason: "API key has been deactivated" };
      return { valid: true, keyHash };
    } catch {
      console.warn("Supabase unreachable during key validation");
      return { valid: false, reason: "Authentication service unavailable" };
    }
  }

  // 3. No Supabase configured — accept any key if no secret is set (open beta)
  if (!RECUR_API_SECRET && !supabaseAdmin) {
    return { valid: true, keyHash: sha256(key) };
  }

  return { valid: false, reason: "Invalid API key" };
}

// ─────────────────────────────────────────────
// ON-CHAIN ATTESTATION
// ─────────────────────────────────────────────

const SEVERITY_MAP = { CLEAN: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4, UNKNOWN: 3 };

// Minimal IDL — only the attest_threat instruction
const ATTESTATION_IDL = {
  version: "0.1.0",
  name: "recur_attestation",
  instructions: [{
    name: "attestThreat",
    accounts: [
      { name: "attester", isMut: true, isSigner: true },
      { name: "attestation", isMut: true, isSigner: false },
      { name: "systemProgram", isMut: false, isSigner: false },
    ],
    args: [
      { name: "eventId", type: "string" },
      { name: "threatType", type: "string" },
      { name: "severity", type: "u8" },
      { name: "timestamp", type: "i64" },
      { name: "promptHash", type: { array: ["u8", 32] } },
    ],
  }],
  accounts: [],
  errors: [],
};

async function attestOnChain(event, promptText) {
  if (!ATTESTER_KEYPAIR_B58) return; // attestation disabled if no keypair

  const bs58 = await import("bs58");
  const attesterKeypair = Keypair.fromSecretKey(bs58.default.decode(ATTESTER_KEYPAIR_B58));

  const connection = new Connection(SOLANA_RPC_URL, "confirmed");
  const wallet = new Wallet(attesterKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(ATTESTATION_IDL, ATTESTATION_PROGRAM, provider);

  // SHA-256 hash of the prompt text for on-chain storage (no raw prompt stored)
  const promptHash = Array.from(createHash("sha256").update(promptText || "").digest());

  const eventId = (event.id || "").slice(0, 36);
  const threatType = (event.primary_threat || "UNKNOWN").toLowerCase().slice(0, 32);
  const severity = SEVERITY_MAP[event.severity] || 2;
  const timestamp = Math.floor(Date.now() / 1000);

  const [attestationPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("attestation"), Buffer.from(eventId)],
    ATTESTATION_PROGRAM,
  );

  const txSig = await program.methods
    .attestThreat(eventId, threatType, severity, new BN(timestamp), promptHash)
    .accounts({
      attester: attesterKeypair.publicKey,
      attestation: attestationPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([attesterKeypair])
    .rpc();

  console.log(`Attestation committed: ${txSig} for event ${eventId}`);

  // Store tx_sig in Supabase if available
  if (supabaseAdmin) {
    await supabaseAdmin
      .from("threat_events")
      .update({ tx_sig: txSig })
      .eq("event_id", eventId)
      .catch(err => console.error("Failed to store tx_sig:", err.message));
  }
}

// ─────────────────────────────────────────────
// EVENT LOGGING
// ─────────────────────────────────────────────

async function logEvent(event, req) {
  // Forward event to the threats logging endpoint
  const host = req.headers.host || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  const headers = { "Content-Type": "application/json" };
  if (RECUR_API_SECRET) {
    headers["x-recur-internal-secret"] = RECUR_API_SECRET;
  }

  await fetch(`${protocol}://${host}/api/threats`, {
    method: "POST",
    headers,
    body: JSON.stringify(event),
  });
}
