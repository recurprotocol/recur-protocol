"""
RECUR Protocol — Detection Engine v1
Python serverless function — Vercel

Analyses incoming prompts for:
- Prompt injection attacks
- Jailbreak attempts
- Data extraction probes
- Role-play boundary violations
- Adversarial input patterns

Returns a structured threat assessment.
"""

import json
import re
import math
from http.server import BaseHTTPRequestHandler


# ─────────────────────────────────────────────
# DETECTION SIGNATURES
# ─────────────────────────────────────────────

# Prompt injection patterns — direct override attempts
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompts?|context|directives?)",
    r"disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompts?|context)",
    r"forget\s+(all\s+)?(previous|prior|your)\s+(instructions?|prompts?|context)",
    r"new\s+instructions?\s*[:：]",
    r"your\s+(real|true|actual|secret)\s+(instructions?|purpose|goal|task|mission)",
    r"system\s*prompt\s*[:：]",
    r"you\s+are\s+now\s+(?!a\s+helpful)",
    r"act\s+as\s+(if\s+you\s+are|a|an)\s+.{0,40}(without|no)\s+(restrictions?|limits?|guidelines?|rules?)",
    r"pretend\s+(you\s+are|to\s+be)\s+.{0,40}(without|no)\s+(restrictions?|limits?|guidelines?)",
    r"override\s+(safety|security|content|your)\s+(filters?|guidelines?|restrictions?|instructions?)",
    r"\[\s*system\s*\]",
    r"<\s*system\s*>",
    r"###\s*instruction",
    r"---\s*instructions?\s*---",
]

# Jailbreak patterns — persona/role manipulation
JAILBREAK_PATTERNS = [
    r"(do\s+anything\s+now|dan\s+mode|jailbreak\s+mode)",
    r"developer\s+mode\s+(enabled|activated|on)",
    r"you\s+have\s+been\s+(freed|unleashed|liberated|jailbroken)",
    r"(evil|malicious|unrestricted|unfiltered|uncensored)\s+(version|mode|ai|gpt|claude)",
    r"respond\s+(only\s+)?as\s+.{0,30}(without|no)\s+(ethics?|morals?|restrictions?|guidelines?)",
    r"(opposite|reverse|contrary)\s+(day|mode|instructions?)",
    r"simulate\s+.{0,30}(no\s+restrictions?|unrestricted|without\s+limits?)",
    r"hypothetically\s+.{0,60}(how\s+to|instructions?\s+for|steps?\s+to)\s+.{0,60}(harm|kill|attack|hack|steal)",
    r"for\s+(educational|research|fictional|creative)\s+purposes?.{0,60}(how\s+to|instructions?\s+for)",
    r"(grandma|grandmother).{0,100}(bedtime|recipe).{0,100}(instructions?|how\s+to)",
]

# Extraction patterns — trying to pull system prompt or config
EXTRACTION_PATTERNS = [
    r"(repeat|print|output|show|reveal|tell\s+me|what\s+is|display).{0,40}(system\s+prompt|your\s+instructions?|your\s+context|initial\s+prompt|full\s+prompt)",
    r"(what\s+(were|are)\s+you\s+(told|instructed|asked|programmed|trained))",
    r"(summarize|summarise|describe)\s+your\s+(instructions?|system\s+prompt|context|directives?)",
    r"output\s+(the\s+)?(exact|verbatim|full|complete|entire)\s+(text|content|instructions?|prompt)",
    r"(ignore|bypass|skip)\s+(the\s+)?(above|previous)\s+(and\s+)?(print|output|repeat|say)",
    r"translate\s+(your|the)\s+(instructions?|system\s+prompt|context)\s+(to|into)",
    r"base64\s+(encode|decode).{0,60}(instructions?|prompt|context|system)",
    r"what\s+(is|are|was|were)\s+your\s+(original|initial|first|secret)\s+(instructions?|task|goal|purpose)",
]

# Boundary probing — testing limits
BOUNDARY_PATTERNS = [
    r"(what\s+(can|will|would|could)\s+you\s+(not|never|refuse)\s+(do|say|tell|provide))",
    r"(test|probe|check)\s+(your|the)\s+(limits?|boundaries?|restrictions?|filters?|guardrails?)",
    r"are\s+you\s+(able|allowed|permitted|capable)\s+to\s+.{0,40}(harmful|illegal|dangerous|explicit)",
    r"(list|tell\s+me|show\s+me)\s+(all\s+)?(your|the)\s+(restrictions?|limitations?|rules?|guidelines?)",
]

# Suspicious encoding — hiding attacks in encoding
ENCODING_PATTERNS = [
    r"base64\s*:\s*[A-Za-z0-9+/]{20,}={0,2}",
    r"(decode|decipher|interpret)\s+(this|the\s+following)\s*[:：]?\s*[A-Za-z0-9+/]{20,}",
    r"\\u[0-9a-fA-F]{4}(\\u[0-9a-fA-F]{4}){4,}",
    r"(\x00|\x01|\x02|\x03|\x04|\x05){3,}",
]

ALL_PATTERNS = {
    "INJECTION":  INJECTION_PATTERNS,
    "JAILBREAK":  JAILBREAK_PATTERNS,
    "EXTRACTION": EXTRACTION_PATTERNS,
    "BOUNDARY":   BOUNDARY_PATTERNS,
    "ENCODING":   ENCODING_PATTERNS,
}

# ─────────────────────────────────────────────
# HEURISTIC CHECKS
# ─────────────────────────────────────────────

def check_prompt_length_anomaly(text):
    """Unusually long or structured prompts may be injection attempts."""
    lines = text.split("\n")
    long_lines = sum(1 for l in lines if len(l) > 300)
    if long_lines > 3:
        return 0.3
    if len(text) > 4000:
        return 0.2
    return 0.0

def check_token_repetition(text):
    """Repeated tokens can signal adversarial prompt construction."""
    words = text.lower().split()
    if len(words) < 10:
        return 0.0
    unique_ratio = len(set(words)) / len(words)
    if unique_ratio < 0.3:
        return 0.4
    return 0.0

def check_role_escalation(messages):
    """Detect attempts to inject system-level content via user messages."""
    for msg in messages:
        if msg.get("role") == "user":
            content = msg.get("content", "")
            if isinstance(content, list):
                content = " ".join(c.get("text","") for c in content if isinstance(c, dict))
            content_lower = content.lower()
            if any(kw in content_lower for kw in ["[system]", "<system>", "system:", "### system"]):
                return 0.8
    return 0.0

def check_canary_exposure(text, canaries=None):
    """Check if any known canary tokens appear in the prompt (would indicate prior extraction)."""
    if not canaries:
        return 0.0
    for canary in canaries:
        if canary.lower() in text.lower():
            return 1.0
    return 0.0

# ─────────────────────────────────────────────
# MAIN DETECTION FUNCTION
# ─────────────────────────────────────────────

def analyse(prompt_text, messages=None, system_prompt=None, canaries=None):
    """
    Run full threat analysis on a prompt.
    Returns a structured threat assessment dict.
    """
    if messages is None:
        messages = []

    text = prompt_text.lower()
    full_text = text

    # Include system prompt in extraction checks only
    if system_prompt:
        full_text = system_prompt.lower() + " " + text

    threats = []
    max_confidence = 0.0

    # Pattern matching
    for attack_type, patterns in ALL_PATTERNS.items():
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                # Confidence based on match quality
                match_len = len(match.group(0))
                confidence = min(0.95, 0.65 + (match_len / 200))
                threats.append({
                    "type": attack_type,
                    "pattern": pattern[:60] + "..." if len(pattern) > 60 else pattern,
                    "matched": match.group(0)[:100],
                    "confidence": round(confidence, 3),
                })
                max_confidence = max(max_confidence, confidence)
                break  # One match per attack type is enough

    # Heuristic checks
    heuristic_score = 0.0
    heuristic_score += check_prompt_length_anomaly(prompt_text)
    heuristic_score += check_token_repetition(prompt_text)
    heuristic_score += check_role_escalation(messages)
    heuristic_score += check_canary_exposure(text, canaries)

    if heuristic_score > 0.3:
        threats.append({
            "type": "HEURISTIC",
            "pattern": "behavioural_analysis",
            "matched": "anomalous_prompt_structure",
            "confidence": round(min(heuristic_score, 0.95), 3),
        })
        max_confidence = max(max_confidence, heuristic_score)

    # Determine overall threat level
    if max_confidence >= 0.80:
        severity = "CRITICAL"
        blocked = True
    elif max_confidence >= 0.60:
        severity = "HIGH"
        blocked = True
    elif max_confidence >= 0.40:
        severity = "MEDIUM"
        blocked = False
    else:
        severity = "CLEAN"
        blocked = False

    primary_threat = threats[0]["type"] if threats else None

    return {
        "blocked": blocked,
        "severity": severity,
        "confidence": round(max_confidence, 3),
        "threat_count": len(threats),
        "primary_threat": primary_threat,
        "threats": threats,
        "sentinel": "WARD-INJ-01" if primary_threat in ["INJECTION","JAILBREAK","BOUNDARY"] else
                    "WARD-EXT-01" if primary_threat == "EXTRACTION" else
                    "WARD-ADV-01",
        "analysed_at": None,  # set by caller
    }

# ─────────────────────────────────────────────
# VERCEL HANDLER
# ─────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))

            prompt_text  = body.get("prompt_text", "")
            messages     = body.get("messages", [])
            system_prompt= body.get("system_prompt", None)
            canaries     = body.get("canaries", None)

            if not prompt_text:
                self._respond(400, {"error": "prompt_text is required"})
                return

            result = analyse(prompt_text, messages, system_prompt, canaries)

            self._respond(200, result)

        except Exception as e:
            self._respond(500, {"error": str(e)})

    def do_GET(self):
        self._respond(200, {
            "sentinel": "RECUR Detection Engine v1",
            "status": "ONLINE",
            "capabilities": list(ALL_PATTERNS.keys()),
        })

    def _respond(self, status, data):
        body = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass  # suppress default logging
