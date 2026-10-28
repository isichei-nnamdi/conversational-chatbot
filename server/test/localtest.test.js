import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { loadKb } from "../src/kb.js";
import { gatesRequested, skipGates } from "../src/localtest.js";
import { LOOKUP_RATE_LIMIT } from "../src/constants.js";

const serve = async (env) => {
  let verified = 0;
  const app = createApp({ kb: loadKb(), llm: async () => "- ok", apiKey: "t", verify: async () => (verified++, { ok: false, reason: "rejected" }), log: () => {}, env });
  const server = await new Promise((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
  return { server, base: `http://127.0.0.1:${server.address().port}`, verified: () => verified };
};
const post = (base, path, body) => fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

test("flag is ignored in production", () => {
  assert.equal(gatesRequested({ DISABLE_GATES: "1", NODE_ENV: "production" }), false);
  assert.equal(gatesRequested({ DISABLE_GATES: "1", NODE_ENV: "development" }), true);
  assert.equal(gatesRequested({}), false);
});

test("non-loopback sockets never skip the gates", () => {
  const env = { DISABLE_GATES: "1" };
  assert.equal(skipGates({ socket: { remoteAddress: "192.168.1.9" } }, env), false);
  assert.equal(skipGates({ socket: { remoteAddress: "127.0.0.1" } }, env), true);
});

test("with the flag on, localhost skips captcha and limits", async () => {
  const { server, base, verified } = await serve({ DISABLE_GATES: "1", RECAPTCHA_SITE_KEY: "site" });
  try {
    assert.equal((await (await fetch(base + "/api/kb")).json()).recaptchaSiteKey, null);
    assert.equal((await post(base, "/api/chat", { message: "hello" })).status, 200);
    assert.equal(verified(), 0);
    for (let i = 0; i < LOOKUP_RATE_LIMIT.max + 5; i++) assert.equal((await post(base, "/api/lookup", { message: "log book" })).status, 200);
  } finally { server.close(); }
});

test("with the flag off, or in production, captcha and limits still apply", async () => {
  for (const env of [{}, { DISABLE_GATES: "1", NODE_ENV: "production" }]) {
    const { server, base } = await serve(env);
    try {
      assert.equal((await post(base, "/api/chat", { message: "hello" })).status, 403);
      let last = 200;
      for (let i = 0; i < LOOKUP_RATE_LIMIT.max + 2; i++) last = (await post(base, "/api/lookup", { message: "log book" })).status;
      assert.equal(last, 429);
    } finally { server.close(); }
  }
});
