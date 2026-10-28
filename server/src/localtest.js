// Local testing switch: skips reCAPTCHA and the per-IP rate limits.
// Needs DISABLE_GATES=1, a non-production NODE_ENV, and a request that really arrived
// over the loopback interface. Forwarded headers are ignored on purpose.
const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

export function gatesRequested(env = process.env) {
  return env.DISABLE_GATES === "1" && env.NODE_ENV !== "production";
}

export function isLoopback(req) {
  return LOOPBACK.has(req.socket?.remoteAddress);
}

// True when this request may skip the gates.
export function skipGates(req, env = process.env) {
  return gatesRequested(env) && isLoopback(req);
}
