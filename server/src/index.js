import { createApp } from "./app.js";
import { loadKb } from "./kb.js";
import { gatesRequested } from "./localtest.js";

const port = Number(process.env.PORT) || 8787;
const app = createApp({ kb: loadKb(), allowedOrigin: process.env.ALLOWED_ORIGIN || "http://localhost:5173" });
// With the gates off, listen on loopback only so nothing else on the network can reach it.
const host = gatesRequested() ? "127.0.0.1" : undefined;
if (gatesRequested()) console.warn("WARNING: DISABLE_GATES=1. reCAPTCHA and rate limits are OFF for localhost requests. Never set this in production.");
if (process.env.DISABLE_GATES === "1" && process.env.NODE_ENV === "production") console.warn("DISABLE_GATES ignored: NODE_ENV is production.");
app.listen(port, host, () => {
  console.log(`SIWES Guide API on :${port} (${process.env.GROQ_API_KEY ? "model" : "offline"} answers)`);
});
