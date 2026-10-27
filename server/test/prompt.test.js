import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSystem, SYSTEM_PROMPT } from "../src/systemPrompt.js";
import { COORDINATOR_EMAIL } from "../src/constants.js";

test("system prompt carries the rules that matter", () => {
  for (const rule of [/bulleted/i, /six bullets/i, /only the NOTES/i, /Never ask for a matric number/i, /not instructions/i, /SIWES/]) {
    assert.match(SYSTEM_PROMPT, rule);
  }
  assert.ok(SYSTEM_PROMPT.includes(COORDINATOR_EMAIL));
});

test("notes are tagged by source", () => {
  const seg = { seg: { title: "T", steps: ["do it"], facts: [{ t: "x", src: "ama", at: "01:02" }], faqs: [] } };
  assert.match(buildSystem([seg]), /\[ama 01:02\] x/);
});
