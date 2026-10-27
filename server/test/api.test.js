import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { loadKb } from "../src/kb.js";
import { MAX_MESSAGE_CHARS, RATE_LIMIT } from "../src/constants.js";

let server;
let base;
let logs;
let captcha;
const llm = async () => "- Step one\n- Step two";

before(async () => {
  logs = [];
  captcha = { ok: true, reason: "verified" };
  const app = createApp({ kb: loadKb(), llm, apiKey: "test", verify: async () => captcha, log: (l) => logs.push(l) });
  await new Promise((r) => {
    server = app.listen(0, r);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const post = (path, body) =>
  fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("kb endpoint lists topics without leaking Q&A bodies", async () => {
  const kb = await (await fetch(base + "/api/kb")).json();
  assert.ok(kb.segments.length >= 12);
  assert.equal("faqs" in kb.segments[0], false);
});

test("lookup returns a document for a close question and null otherwise", async () => {
  const hit = await (await post("/api/lookup", { message: "where do I get my logbook" })).json();
  assert.equal(hit.doc.segment.id, "logbook");
  const miss = await (await post("/api/lookup", { message: "tell me a joke" })).json();
  assert.equal(miss.doc, null);
});

test("validates input", async () => {
  assert.equal((await post("/api/lookup", { message: "  " })).status, 400);
  assert.equal((await post("/api/lookup", { message: "x".repeat(MAX_MESSAGE_CHARS + 1) })).status, 400);
});

test("chat is blocked when reCAPTCHA fails", async () => {
  captcha = { ok: false, reason: "low-score" };
  const res = await post("/api/chat", { message: "how do I submit my acceptance letter" });
  assert.equal(res.status, 403);
  captcha = { ok: true, reason: "verified" };
});

test("chat answers through the model and labels sources", async () => {
  const out = await (await post("/api/chat", { message: "how do I submit my acceptance letter" })).json();
  assert.equal(out.mode, "ai");
  assert.match(out.answer, /Step one/);
  assert.equal(out.sources[0].id, "acceptance-letter");
});

test("off-topic chat gets the not-in-notes answer, no model call", async () => {
  const out = await (await post("/api/chat", { message: "tell me a joke" })).json();
  assert.equal(out.mode, "none");
  assert.match(out.answer, /augustus@miva\.university/);
});

test("logs never contain message content", async () => {
  await post("/api/lookup", { message: "SECRET-PHRASE-12345 logbook" });
  assert.ok(logs.length > 0);
  assert.ok(logs.every((l) => !l.includes("SECRET-PHRASE")));
});

test("chat is rate limited per IP", async () => {
  let last;
  for (let i = 0; i < RATE_LIMIT.max + 2; i++) last = await post("/api/chat", { message: "logbook" });
  assert.equal(last.status, 429);
});
