import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyRecaptcha } from "../src/recaptcha.js";

const reply = (data) => async () => ({ json: async () => data });

test("passes in development with no secret, fails closed in production", async () => {
  assert.equal((await verifyRecaptcha("t", "1.1.1.1", { secret: "", production: false })).ok, true);
  assert.equal((await verifyRecaptcha("t", "1.1.1.1", { secret: "", production: true })).ok, false);
});

test("requires a token when a secret is set", async () => {
  assert.equal((await verifyRecaptcha("", "ip", { secret: "s" })).reason, "missing-token");
});

test("accepts a good score, rejects low score, bad action and failure", async () => {
  const run = (data) => verifyRecaptcha("t", "ip", { secret: "s", fetchFn: reply(data) });
  assert.equal((await run({ success: true, score: 0.9, action: "chat" })).ok, true);
  assert.equal((await run({ success: true, score: 0.1, action: "chat" })).reason, "low-score");
  assert.equal((await run({ success: true, score: 0.9, action: "other" })).reason, "wrong-action");
  assert.equal((await run({ success: false })).reason, "rejected");
});

test("fails closed when Google is unreachable", async () => {
  const r = await verifyRecaptcha("t", "ip", {
    secret: "s",
    fetchFn: async () => {
      throw new Error("down");
    },
  });
  assert.deepEqual(r, { ok: false, reason: "unreachable" });
});
