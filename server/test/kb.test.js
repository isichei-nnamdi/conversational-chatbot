import { test } from "node:test";
import assert from "node:assert/strict";
import { loadKb } from "../src/kb.js";
import { COORDINATOR_EMAIL, KB_VERSION } from "../src/constants.js";

const kb = loadKb();
const text = JSON.stringify(kb);

test("KB version matches the constants registry", () => assert.equal(kb.version, KB_VERSION));

test("every segment is well formed and grouped", () => {
  const ids = new Set();
  for (const s of kb.segments) {
    assert.ok(!ids.has(s.id), `duplicate ${s.id}`);
    ids.add(s.id);
    assert.ok(kb.groups.includes(s.group), `${s.id} group`);
    assert.ok(s.title && s.blurb && s.keywords.length, `${s.id} fields`);
    assert.ok(s.steps.length || s.facts.length || s.faqs.length, `${s.id} empty`);
  }
  assert.ok(kb.segments.length >= 12);
});

test("every fact carries a valid source; ama facts carry a timestamp", () => {
  for (const s of kb.segments) {
    for (const f of s.facts) {
      assert.ok(["sheet", "ama", "policy"].includes(f.src), `${s.id}: ${f.src}`);
      if (f.src === "ama") assert.match(f.at, /^\d{2}:\d{2}$/, `${s.id}: ${f.t}`);
    }
  }
});

test("no personal data: only the coordinator email, no matric-like ids", () => {
  const emails = text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
  for (const e of emails) assert.equal(e.replace(/\.$/, ""), COORDINATOR_EMAIL);
  assert.doesNotMatch(text, /\b[A-Za-z]{2,6}[/-]\d{2,}(?:[/-]\d+)+\b/);
  assert.doesNotMatch(text, /\+?\d[\d\s().-]{8,}\d/);
});
