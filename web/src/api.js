// Where the API lives. Empty means the same site (local development uses the Vite proxy).
const BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

async function call(path, options) {
  let res;
  try {
    res = await fetch(BASE + path, options);
  } catch {
    throw new Error("Can't reach the server. Check your data connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

const post = (path, body) =>
  call(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const getKb = () => call("/api/kb");
export const lookup = (message) => post("/api/lookup", { message });
export const chat = (message, history, captchaToken) => post("/api/chat", { message, history, captchaToken });

// Anonymous counts: a kind and a topic id, nothing else. Never blocks the page and never shows an error.
export const sendEvent = (type, id) => {
  if (!id) return;
  fetch(BASE + "/api/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, id }),
    keepalive: true,
  }).catch(() => {});
};

export const getStats = (key) => call("/api/stats", { headers: { Authorization: `Bearer ${key}` } });

// reCAPTCHA v3 loads only when the student asks the bot, and only after they allow it.
let loading;
function loadRecaptcha(siteKey) {
  if (window.grecaptcha?.execute) return Promise.resolve();
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    s.async = true;
    s.onload = () => window.grecaptcha.ready(resolve);
    s.onerror = () => {
      loading = undefined;
      reject(new Error("The security check could not load. Check your connection and try again."));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export async function captchaToken(siteKey) {
  if (!siteKey) return null; // development: the server skips the check when it has no secret
  await loadRecaptcha(siteKey);
  return window.grecaptcha.execute(siteKey, { action: "chat" });
}
