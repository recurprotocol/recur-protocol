/**
 * RECUR Protocol — Threat Logger v1
 * Node.js serverless function — Vercel
 *
 * POST /api/threats  — log a threat event (internal, called by proxy)
 * GET  /api/threats  — retrieve recent threat events
 *
 * Storage: In-memory for v1 (Vercel KV or Upstash Redis in v2)
 * Events are also written to console for Vercel log capture.
 */

// In-memory store — persists within a function instance lifecycle
// Replace with Vercel KV / Upstash Redis for production persistence
const eventStore = [];
const MAX_EVENTS = 500;

export default async function handler(req, res) {

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-recur-api-key, x-recur-internal");

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── POST: receive and store event ──
  if (req.method === "POST") {
    const isInternal = req.headers["x-recur-internal"] === "true";
    const apiKey     = req.headers["x-recur-api-key"];
    const secret     = process.env.RECUR_API_SECRET;

    if (!isInternal && secret && apiKey !== secret) {
      return res.status(401).json({ error: "Unauthorised" });
    }

    const event = req.body;
    if (!event?.id) return res.status(400).json({ error: "Invalid event" });

    // Store
    eventStore.unshift(event);
    if (eventStore.length > MAX_EVENTS) eventStore.splice(MAX_EVENTS);

    // Structured log — captured by Vercel's log drain
    console.log(JSON.stringify({
      recur_event: true,
      ...event,
    }));

    return res.status(200).json({ received: true, event_id: event.id });
  }

  // ── GET: return recent events with stats ──
  if (req.method === "GET") {
    const apiKey = req.headers["x-recur-api-key"];
    const secret = process.env.RECUR_API_SECRET;

// GET is public — stats and events are not sensitive

    const limit  = Math.min(parseInt(req.query?.limit || "50"), 200);
    const filter = req.query?.status; // BLOCKED | CLEAN
    const since  = req.query?.since ? new Date(req.query.since) : null;

    let events = [...eventStore];

    if (filter) events = events.filter(e => e.status === filter.toUpperCase());
    if (since)  events = events.filter(e => new Date(e.timestamp) >= since);

    events = events.slice(0, limit);

    // Compute stats over the full store
    const stats = computeStats(eventStore);

    return res.status(200).json({
      events,
      stats,
      total: eventStore.length,
      returned: events.length,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

// ─────────────────────────────────────────────
// STATS COMPUTATION
// ─────────────────────────────────────────────

function computeStats(events) {
  if (!events.length) return {
    total: 0, blocked: 0, clean: 0, block_rate: 0,
    by_severity: {}, by_threat: {}, by_provider: {},
    avg_confidence: 0, avg_latency_ms: 0,
  };

  const blocked = events.filter(e => e.status === "BLOCKED").length;
  const clean   = events.length - blocked;

  const by_severity = {};
  const by_threat   = {};
  const by_provider = {};
  let total_confidence = 0;
  let total_latency    = 0;
  let conf_count       = 0;

  for (const e of events) {
    // Severity
    by_severity[e.severity] = (by_severity[e.severity] || 0) + 1;

    // Threat type
    if (e.primary_threat) {
      by_threat[e.primary_threat] = (by_threat[e.primary_threat] || 0) + 1;
    }

    // Provider
    if (e.provider) {
      by_provider[e.provider] = (by_provider[e.provider] || 0) + 1;
    }

    // Averages
    if (e.confidence > 0) {
      total_confidence += e.confidence;
      conf_count++;
    }
    if (e.latency_ms) total_latency += e.latency_ms;
  }

  return {
    total:           events.length,
    blocked,
    clean,
    block_rate:      +((blocked / events.length) * 100).toFixed(1),
    by_severity,
    by_threat,
    by_provider,
    avg_confidence:  conf_count ? +(total_confidence / conf_count).toFixed(3) : 0,
    avg_latency_ms:  +(total_latency / events.length).toFixed(0),
  };
}
