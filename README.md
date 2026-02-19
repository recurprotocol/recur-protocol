# RECUR Protocol — Backend v1

Recursive AI security sentinel backend. Intercepts prompts destined for OpenAI and Anthropic, runs threat detection, blocks attacks, and logs every event.

---

## Architecture

```
Client
  ↓
POST /api/proxy          ← Node.js — receives & routes requests
  ↓
POST /api/detect         ← Python — injection/jailbreak/extraction detection
  ↓ (blocked or clean)
OpenAI / Anthropic       ← clean requests forwarded to provider
  ↓
POST /api/threats        ← event logged with full threat metadata
  ↓
Response to client       ← provider response + RECUR metadata attached
```

---

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/proxy` | POST | Main entry point — wraps OpenAI/Anthropic |
| `/api/detect` | POST | Python detection engine — threat analysis |
| `/api/threats` | GET | Retrieve threat event log + stats |
| `/api/threats` | POST | Log a threat event (called internally by proxy) |
| `/api/health` | GET | Service health check |

---

## Using the Proxy

Replace your OpenAI or Anthropic API call with a call to RECUR's proxy:

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
const response = await fetch("https://your-recur-backend.vercel.app/api/proxy", {
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
const response = await fetch("https://your-recur-backend.vercel.app/api/proxy", {
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

## Detection Capabilities v1

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
RECUR_API_SECRET=your-secret-key-here
DETECTION_URL=https://your-recur-backend.vercel.app/api/detect
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

- [ ] Vercel KV / Upstash Redis for persistent event storage
- [ ] Solana on-chain attestation of threat events
- [ ] Sentinel mutation — detection models update from observed attacks
- [ ] Canary token injection and monitoring
- [ ] Rate limiting and abuse detection
- [ ] Dashboard integration with frontend

 
