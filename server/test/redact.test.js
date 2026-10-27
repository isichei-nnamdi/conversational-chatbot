import { test } from "node:test";
import assert from "node:assert/strict";
import { redact } from "../src/redact.js";

test("removes emails, phone numbers and matric-style ids", () => {
  assert.equal(redact("mail me at ada@gmail.com"), "mail me at [email]");
  assert.equal(redact("call 0803 123 4567 now"), "call [number] now");
  assert.equal(redact("my id is MIVA/2023/00123"), "my id is [id]");
});

test("keeps ordinary SIWES text intact", () => {
  const t = "I am in 300L, session 2023/2024, doing SIWES I for 3 months";
  assert.equal(redact(t), t);
});
