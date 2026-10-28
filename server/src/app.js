import express from "express";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { answer } from "./answer.js";
import { COORDINATOR_EMAIL, KB_VERSION, LOOKUP_RATE_LIMIT, MAX_MESSAGE_CHARS, RATE_LIMIT } from "./constants.js";
import { gatesRequested, skipGates } from "./localtest.js";
import { lookup } from "./lookup.js";
import { verifyRecaptcha } from "./recaptcha.js";
import { buildIndex } from "./retrieve.js";

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp({ kb, llm, apiKey, verify = verifyRecaptcha, log = console.log, allowedOrigin = process.env.ALLOWED_ORIGIN, env = process.env } = {}) {
  const index = buildIndex(kb);
  const allowed = String(allowedOrigin || "").split(",").map((o) => o.trim()).filter(Boolean);
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(express.json({ limit: "16kb" }));

  // Log method, path, status and time only. Never the request body.
  app.use((req, res, next) => {
    const t0 = Date.now();
    res.on("finish", () => log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - t0}ms`));
    next();
  });

  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (allowedOrigin && origin && allowed.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  const makeLimiter = ({ windowMs, max }) => {
    const hits = new Map();
    return (req, res, next) => {
      if (skipGates(req, env)) return next();
      const now = Date.now();
      const rec = hits.get(req.ip);
      if (!rec || now - rec.start > windowMs) hits.set(req.ip, { start: now, n: 1 });
      else if (++rec.n > max) {
        return res.status(429).json({ error: "Too many questions at once. Please wait a minute and try again." });
      }
      next();
    };
  };
  const chatLimiter = makeLimiter(RATE_LIMIT);
  const lookupLimiter = makeLimiter(LOOKUP_RATE_LIMIT);

  const validate = (req, res, next) => {
    const { message } = req.body ?? {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Type a question first." });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return res.status(400).json({ error: `Please keep it under ${MAX_MESSAGE_CHARS} characters.` });
    }
    next();
  };

  app.get("/api/kb", (_req, res) => {
    const { version, glossary, groups, segments } = kb;
    res.json({
      version,
      glossary,
      groups,
      coordinatorEmail: COORDINATOR_EMAIL,
      maxChars: MAX_MESSAGE_CHARS,
      recaptchaSiteKey: gatesRequested(env) ? null : env.RECAPTCHA_SITE_KEY || null,
      segments: segments.map(({ id, group, title, icon, blurb, steps }) => ({ id, group, title, icon, blurb, steps })),
    });
  });

  // Step 1: is there a written document for this? Free, no model call.
  app.post("/api/lookup", lookupLimiter, validate, (req, res) => {
    res.json({ doc: lookup(index, req.body.message.trim()) });
  });

  // Step 2 (when the document did not help): the chatbot. Rate limited and reCAPTCHA gated.
  app.post("/api/chat", chatLimiter, validate, async (req, res) => {
    const check = skipGates(req, env) ? { ok: true, reason: "local-testing" } : await verify(req.body.captchaToken, req.ip);
    if (!check.ok) {
      return res.status(403).json({ error: "We could not confirm you are a person. Please try again.", reason: check.reason });
    }
    const { message, history } = req.body;
    const out = await answer({ index, message: message.trim(), history, llm, ...(apiKey !== undefined && { apiKey }) });
    res.json(out);
  });

  app.get("/api/health", (_req, res) => res.json({ ok: true, kbVersion: KB_VERSION }));

  const dist = path.resolve(here, "../../web/dist");
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  }
  return app;
}
