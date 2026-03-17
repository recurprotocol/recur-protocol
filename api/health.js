/**
 * RECUR Protocol — Health Check
 * GET /api/health
 */

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const host = req.headers.host || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  const DETECTION_URL = process.env.DETECTION_URL || `${proto}://${host}/api/detect`;

  // Ping the detection engine
  let detectionStatus = "UNKNOWN";
  try {
    const r = await fetch(DETECTION_URL, { signal: AbortSignal.timeout(2000) });
    detectionStatus = r.ok ? "ONLINE" : "DEGRADED";
  } catch {
    detectionStatus = "OFFLINE";
  }

  return res.status(200).json({
    status: detectionStatus === "ONLINE" ? "HEALTHY" : "DEGRADED",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    services: {
      proxy:     "ONLINE",
      detection: detectionStatus,
      logger:    "ONLINE",
    },
    sentinel_network: "RECUR-PRIME > WARD-INJ-01, WARD-EXT-01, WARD-ADV-01",
  });
}
