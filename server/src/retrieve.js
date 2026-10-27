import { MIN_FAQ_SCORE, MIN_SEGMENT_SCORE, TOP_SEGMENTS } from "./constants.js";

const STOP = new Set(
  "the a an is are am to of and or i my me do does did how what when where can should will for in on it be at with about if you your we our this that have has get got please need want know there from by as so not no yes would could any some".split(
    " ",
  ),
);

const stem = (w) => (w.length > 4 ? w.replace(/ied$/, "y").replace(/(ing|ed|es|s)$/, "") : w);

export const tokens = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem);

export function buildIndex(kb) {
  const df = new Map();
  const bump = (set) => set.forEach((t) => df.set(t, (df.get(t) || 0) + 1));
  let docs = 0;
  const segs = kb.segments.map((seg) => {
    const faqs = seg.faqs.map((f) => ({ f, q: new Set(tokens(f.q)), a: new Set(tokens(f.a)) }));
    const facts = seg.facts.map((f) => ({ f, t: new Set(tokens(f.t)) }));
    [...faqs.map((x) => new Set([...x.q, ...x.a])), ...facts.map((x) => x.t)].forEach((s) => {
      docs += 1;
      bump(s);
    });
    return {
      seg,
      title: new Set(tokens(seg.title + " " + seg.blurb)),
      kwPhrases: seg.keywords.map((k) => k.toLowerCase()),
      kwTokens: new Set(seg.keywords.flatMap(tokens)),
      faqs,
      facts,
    };
  });
  const idf = (t) => Math.log(1 + docs / (df.get(t) || 1));
  return { kb, segs, idf };
}

const sum = (set, qset, idf) => {
  let s = 0;
  for (const t of qset) if (set.has(t)) s += idf(t);
  return s;
}

// 0-10: how well the question and a written Q&A cover each other (idf weighted).
function faqScore(x, qset, idf) {
  const total = (set) => [...set].reduce((n, t) => n + idf(t), 0);
  const shared = sum(x.q, qset, idf);
  const inAnswer = sum(x.a, qset, idf) * 0.25;
  const num = Math.min(shared + inAnswer, total(qset));
  const dq = total(qset) || 1;
  const df = total(x.q) || 1;
  return 10 * Math.sqrt((Math.min(shared, df) / df) * (num / dq));
}

export function retrieve(index, query) {
  const text = String(query).toLowerCase();
  const qset = new Set(tokens(query));
  const { idf } = index;
  const ranked = index.segs.map((s) => {
    let score = 0;
    for (const p of s.kwPhrases) if (p.length > 2 && text.includes(p)) score += 3;
    score += sum(s.title, qset, idf) * 0.8;
    score += sum(s.kwTokens, qset, idf) * 0.6;
    const bestFaq = Math.max(0, ...s.faqs.map((x) => faqScore(x, qset, idf)));
    const bestFact = Math.max(0, ...s.facts.map((x) => sum(x.t, qset, idf)));
    score += bestFaq * 0.7 + bestFact * 0.4;
    return { seg: s.seg, score, _s: s };
  });
  ranked.sort((a, b) => b.score - a.score);
  const top = ranked.filter((r) => r.score >= MIN_SEGMENT_SCORE).slice(0, TOP_SEGMENTS);

  let bestFaq = null;
  for (const r of top) {
    for (const x of r._s.faqs) {
      const score = faqScore(x, qset, idf);
      if (!bestFaq || score > bestFaq.score) bestFaq = { score, faq: x.f, seg: r.seg };
    }
  }
  if (bestFaq && bestFaq.score < MIN_FAQ_SCORE) bestFaq = null;
  return { segments: top.map(({ seg, score }) => ({ seg, score })), bestFaq };
}
