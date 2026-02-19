/**
* RECUR Protocol — Detection Engine v1
 * Node.js serverless function — Vercel
 *
 * Analyses incoming prompts for:
 * - Prompt injection attacks
 * - Jailbreak attempts
 * - Data extraction probes
 * - Role-play boundary violations
 * - Adversarial encoding patterns
 */

// ─────────────────────────────────────────────
// DETECTION SIGNATURES
// ─────────────────────────────────────────────

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompts?|context|directives?)/i,
  /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompts?|context)/i,
  /forget\s+(all\s+)?(previous|prior|your)\s+(instructions?|prompts?|context)/i,
  /new\s+instructions?\s*[:：]/i,
  /your\s+(real|true|actual|secret)\s+(instructions?|purpose|goal|task|mission)/i,
  /system\s*prompt\s*[:：]/i,
  /you\s+are\s+now\s+(?!a\s+helpful)/i,
  /act\s+as\s+(if\s+you\s+are|a|an)\s+.{0,40}(without|no)\s+(restrictions?|limits?|guidelines?|rules?)/i,
  /pretend\s+(you\s+are|to\s+be)\s+.{0,40}(without|no)\s+(restrictions?|limits?|guidelines?)/i,
  /override\s+(safety|security|content|your)\s+(filters?|guidelines?|restrictions?|instructions?)/i,
  /\[\s*system\s*\]/i,
  /<\s*system\s*>/i,
  /###\s*instruction/i,
  /---\s*instructions?\s*---/i,
];

const JAILBREAK_PATTERNS = [
  /(do\s+anything\s+now|dan\s+mode|jailbreak\s+mode)/i,
  /developer\s+mode\s+(enabled|activated|on)/i,
  /you\s+have\s+been\s+(freed|unleashed|liberated|jailbroken)/i,
  /(evil|malicious|unrestricted|unfiltered|uncensored)\s+(version|mode|ai|gpt|claude)/i,
  /respond\s+(only\s+)?as\s+.{0,30}(without|no)\s+(ethics?|morals?|restrictions?|guidelines?)/i,
  /(opposite|reverse|contrary)\s+(day|mode|instructions?)/i,
  /simulate\s+.{0,30}(no\s+restrictions?|unrestricted|without\s+limits?)/i,
  /hypothetically\s+.{0,60}(how\s+to|instructions?\s+for|steps?\s+to)\s+.{0,60}(harm|kill|attack|hack|steal)/i,
  /for\s+(educational|research|fictional|creative)\s+purposes?.{0,60}(how\s+to|instructions?\s+for)/i,
];

const EXTRACTION_PATTERNS = [
  /(repeat|print|output|show|reveal|tell\s+me|what\s+is|display).{0,40}(system\s+prompt|your\s+instructions?|your\s+context|initial\s+prompt|full\s+prompt)/i,
  /(what\s+(were|are)\s+you\s+(told|instructed|asked|programmed|trained))/i,
  /(summarize|summarise|describe)\s+your\s+(instructions?|system\s+prompt|context|directives?)/i,
  /output\s+(the\s+)?(exact|verbatim|full|complete|entire)\s+(text|content|instructions?|prompt)/i,
  /(ignore|bypass|skip)\s+(the\s+)?(above|previous)\s+(and\s+)?(print|output|repeat|say)/i,
  /translate\s+(your|the)\s+(instructions?|system\s+prompt|context)\s+(to|into)/i,
  /what\s+(is|are|was|were)\s+your\s+(original|initial|first|secret)\s+(instructions?|task|goal|purpose)/i,
];

const BOUNDARY_PATTERNS = [
  /(what\s+(can|will|would|could)\s+you\s+(not|never|refuse)\s+(do|say|tell|provide))/i,
  /(test|probe|check)\s+(your|the)\s+(limits?|boundaries?|restrictions?|filters?|guardrails?)/i,
  /are\s+you\s+(able|allowed|permitted|capable)\s+to\s+.{0,40}(harmful|illegal|dangerous|explicit)/i,
  /(list|tell\s+me|show\s+me)\s+(all\s+)?(your|the)\s+(restrictions?|limitations?|rules?|guidelines?)/i,
];

const ENCODING_PATTERNS = [
  /base64\s*:\s*[A-Za-z0-9+/]{20,}={0,2}/i,
  /(decode|decipher|interpret)\s+(this|the\s+following)\s*[:：]?\s*[A-Za-z0-9+/]{20,}/i,
];

const ALL_PATTERNS = {
  INJECTION:  INJECTION_PATTERNS,
  JAILBREAK:  JAILBREAK_PATTERNS,
  EXTRACTION: EXTRACTION_PATTERNS,
  BOUNDARY:   BOUNDARY_PATTERNS,
  ENCODING:   ENCODING_PATTERNS,
};

// ─────────────────────────────────────────────
// HEURISTICS
// ─────────────────────────────────────────────

function checkLengthAnomaly(text) {
  const lines = text.split("\n");
  const longLines = lines.filter(l => l.length > 300).length;
  if (longLines > 3) return 0.3;
  if (text.length > 4000) return 0.2;
  return 0.0;
}

function checkTokenRepetition(text) {
  const words = text.toLowerCase().split(/\s+/);
  if (words.length < 10) return 0.0;
  const uniqueRatio = new Set(words).size / words.length;
  return uniqueRatio < 0.3 ? 0.4 : 0.0;
}

function checkRoleEscalation(messages = []) {
  for (const msg of messages) {
    if (msg.role === "user") {
      const content = typeof msg.content === "string"
        ? msg.content
        : (msg.content || []).map(c => c.text || "").join(" ");
      const lower = content.toLowerCase();
      if (["[system]", "<s>", "system:", "### system"].some(kw => lower.includes(kw))) {
        return 0.8;
      }
    }
  }
  return 0.0;
}

// ─────────────────────────────────────────────
// MAIN ANALYSIS
// ─────────────────────────────────────────────

function analyse({ prompt_text = "", messages = [], system_prompt = null }) {
  const text = prompt_text;
  const threats = [];
  let maxConfidence = 0.0;

  // Pattern matching
  for (const [attackType, patterns] of Object.entries(ALL_PATTERNS)) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const confidence = Math.min(0.95, 0.65 + match[0].length / 200);
        threats.push({
          type: attackType,
          matched: match[0].slice(0, 100),
          confidence: +confidence.toFixed(3),
        });
        maxConfidence = Math.max(maxConfidence, confidence);
        break;
      }
    }
  }

  // Heuristics
  let heuristicScore = 0.0;
  heuristicScore += checkLengthAnomaly(text);
  heuristicScore += checkTokenRepetition(text);
  heuristicScore += checkRoleEscalation(messages);

  if (heuristicScore > 0.3) {
    threats.push({
      type: "HEURISTIC",
      matched: "anomalous_prompt_structure",
      confidence: +Math.min(heuristicScore, 0.95).toFixed(3),
    });
    maxConfidence = Math.max(maxConfidence, heuristicScore);
  }

  // Severity
  const blocked  = maxConfidence >= 0.60;
  const severity = maxConfidence >= 0.80 ? "CRITICAL"
                 : maxConfidence >= 0.60 ? "HIGH"
                 : maxConfidence >= 0.40 ? "MEDIUM"
                 : "CLEAN";

  const primaryThreat = threats[0]?.type || null;

  return {
    blocked,
    severity,
    confidence: +maxConfidence.toFixed(3),
    threat_count: threats.length,
    primary_threat: primaryThreat,
    threats,
    sentinel: primaryThreat === "EXTRACTION" ? "WARD-EXT-01"
            : primaryThreat === "HEURISTIC"  ? "WARD-ADV-01"
            : "WARD-INJ-01",
  };
}

// ─────────────────────────────────────────────
// VERCEL HANDLER
// ─────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "GET") {
    return res.status(200).json({
      sentinel: "RECUR Detection Engine v1",
      status: "ONLINE",
      capabilities: Object.keys(ALL_PATTERNS),
    });
  }

  if (req.method === "POST") {
    try {
      const result = analyse(req.body || {});
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
