import { RECAPTCHA_ACTION, RECAPTCHA_MIN_SCORE, RECAPTCHA_VERIFY_URL } from "./constants.js";

// Verify a reCAPTCHA v3 token with Google. Returns { ok, reason }.
// With no secret configured it passes in development and fails closed in production.
export async function verifyRecaptcha(token, ip, { secret = process.env.RECAPTCHA_SECRET, fetchFn = fetch, production = process.env.NODE_ENV === "production" } = {}) {
  if (!secret) return production ? { ok: false, reason: "not-configured" } : { ok: true, reason: "dev-skip" };
  if (typeof token !== "string" || !token) return { ok: false, reason: "missing-token" };
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const res = await fetchFn(RECAPTCHA_VERIFY_URL, { method: "POST", body });
    const data = await res.json();
    if (!data.success) return { ok: false, reason: "rejected" };
    if (data.action && data.action !== RECAPTCHA_ACTION) return { ok: false, reason: "wrong-action" };
    if (typeof data.score === "number" && data.score < RECAPTCHA_MIN_SCORE) return { ok: false, reason: "low-score" };
    return { ok: true, reason: "verified" };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
