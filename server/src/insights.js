// Anonymous usage counts: which topic was opened, and whether a written answer helped.
// Holds topic ids and numbers only. No text, no IP, no identifiers. Resets when the server restarts.
const TYPES = new Set(["open", "yes", "no"]);

export function createInsights(topicIds) {
  const ids = new Set(topicIds);
  const counts = new Map([...ids].map((id) => [id, { open: 0, yes: 0, no: 0 }]));
  const since = new Date().toISOString();
  return {
    record(type, id) {
      if (!TYPES.has(type) || !ids.has(id)) return false;
      counts.get(id)[type]++;
      return true;
    },
    popular(n = 4) {
      return [...counts].filter(([, c]) => c.open > 0).sort((a, b) => b[1].open - a[1].open).slice(0, n).map(([id]) => id);
    },
    snapshot() {
      const topics = [...counts].map(([id, c]) => ({ id, ...c, noRate: c.yes + c.no ? Math.round((100 * c.no) / (c.yes + c.no)) : null }));
      topics.sort((a, b) => b.open - a.open);
      return { since, topics };
    },
  };
}
