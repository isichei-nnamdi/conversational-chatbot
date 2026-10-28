import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { createInsights } from "../src/insights.js";
import { loadKb } from "../src/kb.js";

test("counts only known topics and known event types", () => {
  const i = createInsights(["a", "b"]);
  assert.equal(i.record("open", "a"), true);
  assert.equal(i.record("open", "nope"), false);
  assert.equal(i.record("<script>", "a"), false);
  i.record("open", "b"); i.record("open", "b"); i.record("no", "b"); i.record("yes", "b");
  assert.deepEqual(i.popular(), ["b", "a"]);
  assert.equal(i.snapshot().topics[0].noRate, 50);
  assert.equal(JSON.stringify(i.snapshot()).includes("ip"), false);
});

async function serve(env) {
  const app = createApp({ kb: loadKb(), llm: async () => "x", apiKey: "t", log: () => {}, env });
  const server = await new Promise((r) => { const s = app.listen(0, "127.0.0.1", () => r(s)); });
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test("stats are off without a key and need the right key with one", async () => {
  let s = await serve({});
  try { assert.equal((await fetch(s.base + "/api/stats")).status, 404); } finally { s.server.close(); }
  s = await serve({ STATS_KEY: "secret-key" });
  try {
    assert.equal((await fetch(s.base + "/api/stats")).status, 401);
    assert.equal((await fetch(s.base + "/api/stats", { headers: { Authorization: "Bearer nope" } })).status, 401);
    const kb = await (await fetch(s.base + "/api/kb")).json();
    const id = kb.segments[0].id;
    await fetch(s.base + "/api/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "open", id }) });
    const stats = await (await fetch(s.base + "/api/stats", { headers: { Authorization: "Bearer secret-key" } })).json();
    assert.equal(stats.topics.find((t) => t.id === id).open, 1);
    assert.deepEqual((await (await fetch(s.base + "/api/kb")).json()).popular, [id]);
  } finally { s.server.close(); }
});

test("lookup documents say when they were last confirmed", async () => {
  const { server, base } = await serve({});
  try {
    const out = await (await fetch(base + "/api/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Where do I get my logbook?" }) })).json();
    assert.match(out.doc.confirmed, /\d{4}$/);
  } finally { server.close(); }
});
