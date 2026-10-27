import { test } from "node:test";
import assert from "node:assert/strict";
import { loadKb } from "../src/kb.js";
import { buildIndex, retrieve } from "../src/retrieve.js";
import { lookup } from "../src/lookup.js";

const index = buildIndex(loadKb());
const top = (q) => retrieve(index, q).segments[0]?.seg.id;

test("questions land in the right segment", () => {
  const cases = {
    "where do I get my logbook": "logbook",
    "how do I submit my acceptance letter": "acceptance-letter",
    "my supervisor is not replying": "supervisor",
    "how do I generate my siwes letter": "siwes-letter",
    "can I do siwes remotely": "placement",
    "what is a scaf form": "scaf-itf",
  };
  for (const [q, id] of Object.entries(cases)) assert.equal(top(q), id, q);
});

test("off-topic questions match nothing", () => {
  assert.equal(top("tell me a joke"), undefined);
  assert.equal(top("what is the weather in lagos"), undefined);
});

test("a close question gets a Read this document", () => {
  const doc = lookup(index, "where do I get my logbook");
  assert.equal(doc.segment.id, "logbook");
  assert.match(doc.body, /log ?book/i);
  assert.ok(doc.steps.length > 0);
});

test("a loose question gets no document, so the bot takes over", () => {
  assert.equal(lookup(index, "tell me a joke"), null);
  assert.equal(lookup(index, "when do i defend"), null);
});
