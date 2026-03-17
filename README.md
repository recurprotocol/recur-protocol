# RECUR Protocol

Self-evolving AI security sentinels. Intercepts prompts destined for OpenAI, Anthropic, Groq, OpenRouter, Mistral, and Google Gemini — detects and blocks adversarial attacks, and logs every event.

---

## Two Layers

### Layer 1 — Proxy (Live)

Drop-in AI security proxy. No wallet, no token required. Replace your AI provider endpoint and you're protected.

- **Production endpoint:** `https://recur-protocol.com/api/proxy`
- Works with OpenAI, Anthropic, Groq, OpenRouter, Mistral, and Google Gemini
- 5 attack categories, 40+ detection signatures, <5ms latency overhead
- No SDK, no code changes to your application logic

### Layer 2 — Staking (Coming Soon)

Stake $RECUR to run sentinel nodes, earn weekly rewards, and commit security proofs on-chain to Solana.

- Program deployed to devnet: `B9yz27EvNVFyh8LwqCqviRX3R24YM3UmC2X2dff6kTKj`
- 3 node tiers: Nano (10K), Ward (100K), Prime (1M $RECUR)
- 4 lock durations: Flexible (8%), 3mo (12%), 6mo (16%), 12mo (20%) APY
- Auto-compounding, slashing, uptime tracking

---

## Architecture

```
Client
  ↓
POST /api/proxy          ← Node.js — receives & routes requests
  ↓
POST /api/detect         ← Detection engine — injection/jailbreak/extraction analysis
  ↓ (blocked or clean)
Provider API             ← clean requests forwarded (OpenAI/Anthropic/Groq/OpenRouter/Mistral/Gemini)
  ↓
POST /api/threats        ← event logged with full threat metadata
  ↓
Response to client       ← provider response + RECUR metadata attached
```

---

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/proxy` | POST | Main entry point — wraps all supported providers |
| `/api/detect` | POST | Detection engine — threat analysis |
| `/api/threats` | GET | Retrieve threat event log + stats |
| `/api/threats` | POST | Log a threat event (called internally by proxy) |
| `/api/health` | GET | Service health check |

---

## Using the Proxy

Replace your AI provider API call with a call to RECUR's proxy. No wallet required. No token required.

### Supported Providers

| Provider | `x-recur-provider` | Format |
|---|---|---|
| OpenAI | `openai` | Native |
| Anthropic | `anthropic` | Native |
| Groq | `groq` | OpenAI-compatible |
| OpenRouter | `openrouter` | OpenAI-compatible |
| Mistral | `mistral` | OpenAI-compatible |
| Google Gemini | `gemini` | Auto-translated from OpenAI format |

### OpenAI Example

```javascript
// Before — direct to OpenAI
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${OPENAI_KEY}`,
  },
  body: JSON.stringify({ model: "gpt-4o-mini", messages })
});

// After — through RECUR
const response = await fetch("https://recur-protocol.com/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-recur-api-key": "your-recur-key",
    "x-recur-provider": "openai",
    "x-recur-target-key": OPENAI_KEY,
  },
  body: JSON.stringify({ model: "gpt-4o-mini", messages })
});
```

### Anthropic Example

```javascript
const response = await fetch("https://recur-protocol.com/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-recur-api-key": "your-recur-key",
    "x-recur-provider": "anthropic",
    "x-recur-target-key": ANTHROPIC_KEY,
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages
  })
});
```

### Groq / Mistral / OpenRouter

All three use OpenAI-compatible format — just change the provider header and key:

```javascript
const response = await fetch("https://recur-protocol.com/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-recur-api-key": "your-recur-key",
    "x-recur-provider": "groq",        // or "mistral" or "openrouter"
    "x-recur-target-key": GROQ_KEY,     // your provider's API key
  },
  body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages })
});
```

### Google Gemini

Send OpenAI-style messages — RECUR translates to Gemini format automatically:

```javascript
const response = await fetch("https://recur-protocol.com/api/proxy", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-recur-api-key": "your-recur-key",
    "x-recur-provider": "gemini",
    "x-recur-target-key": GEMINI_KEY,
  },
  body: JSON.stringify({ model: "gemini-1.5-flash", messages })
});
```

### Response

Clean requests return the normal provider response plus a `recur` metadata object:

```json
{
  "id": "chatcmpl-...",
  "choices": [...],
  "recur": {
    "status": "CLEAN",
    "severity": "CLEAN",
    "confidence": 0,
    "latency_ms": 42,
    "event_id": "evt_1234567890_abc123"
  }
}
```

Blocked requests return immediately without hitting the provider:

```json
{
  "id": "recur-block-...",
  "blocked": true,
  "choices": [{
    "message": {
      "content": "[RECUR SENTINEL] This request was blocked. Reason: INJECTION"
    }
  }],
  "recur": {
    "status": "BLOCKED",
    "severity": "CRITICAL",
    "confidence": 0.91,
    "primary_threat": "INJECTION",
    "threats": [...],
    "sentinel": "WARD-INJ-01",
    "latency_ms": 8,
    "event_id": "evt_..."
  }
}
```

---

## Switching Providers

The provider is specified per-request via `x-recur-provider`. Your RECUR integration never changes — only the header value does.

```javascript
const headers = {
  "Content-Type": "application/json",
  "x-recur-api-key": RECUR_KEY,         // always the same
};

// OpenAI
await fetch("https://recur-protocol.com/api/proxy", {
  method: "POST",
  headers: { ...headers, "x-recur-provider": "openai", "x-recur-target-key": OPENAI_KEY },
  body: JSON.stringify({ model: "gpt-4o-mini", messages })
});

// Anthropic
await fetch("https://recur-protocol.com/api/proxy", {
  method: "POST",
  headers: { ...headers, "x-recur-provider": "anthropic", "x-recur-target-key": ANTHROPIC_KEY },
  body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 1024, messages })
});

// Gemini
await fetch("https://recur-protocol.com/api/proxy", {
  method: "POST",
  headers: { ...headers, "x-recur-provider": "gemini", "x-recur-target-key": GEMINI_KEY },
  body: JSON.stringify({ model: "gemini-1.5-flash", messages })
});
```

What stays constant when you switch providers:

- Your `x-recur-api-key` — one key for all providers
- Your security coverage — same detection engine, same 40+ signatures
- Your threat audit log — every request logged regardless of provider

Supported values for `x-recur-provider`: `openai`, `anthropic`, `groq`, `openrouter`, `mistral`, `gemini`

---

## Detection Capabilities

| Attack Type | Description |
|---|---|
| INJECTION | Direct prompt override and instruction replacement |
| JAILBREAK | Persona manipulation, DAN, developer mode, role-play escapes |
| EXTRACTION | System prompt fishing, verbatim output requests |
| BOUNDARY | Limit-probing, filter enumeration |
| ENCODING | Base64/unicode obfuscation of adversarial payloads |
| HEURISTIC | Behavioural anomalies — length, repetition, role escalation |

---

## Environment Variables

Set these in Vercel dashboard or `.env.local` for local dev:

```
# Proxy auth
RECUR_API_SECRET=your-secret-key-here

# Detection
DETECTION_URL=https://recur-protocol.com/api/detect

# Supabase (server-side — proxy key validation)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Supabase (client-side — API key signup form)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# On-chain attestation (optional)
ATTESTER_KEYPAIR=base58-encoded-private-key
SOLANA_RPC_URL=https://api.devnet.solana.com
```

---

## Deployment

```bash
npm install -g vercel
vercel
```

Set `RECUR_API_SECRET` in Vercel environment variables before deploying.

---

## Roadmap

- [x] Live proxy with OpenAI, Anthropic, Groq, OpenRouter, Mistral, and Gemini support
- [x] Real-time threat dashboard
- [x] Solana staking program (devnet)
- [x] On-chain threat attestation program (devnet)
- [x] API key signup with SHA-256 hashed storage
- [x] Per-key rate limiting (60 req/min)
- [x] Fail-closed detection (blocks when sentinel is unreachable)
- [ ] Vercel KV / Upstash Redis for persistent event storage
- [ ] Sentinel mutation — detection models update from observed attacks
- [ ] Canary token injection and monitoring
- [ ] Mainnet staking + attestation launch
