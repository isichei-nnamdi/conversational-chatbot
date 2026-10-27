import {
  COORDINATOR_EMAIL,
  KB_VERSION,
  LLM_URL,
  MAX_HISTORY_MESSAGES,
  MAX_OUTPUT_TOKENS,
  MODEL_ID,
  NOT_IN_NOTES,
} from "./constants.js";
import { redact } from "./redact.js";
import { retrieve } from "./retrieve.js";
import { buildSystem } from "./systemPrompt.js";

const KIND = { sheet: "coordinator's written answers", ama: "AMA recording", policy: "SIWES policy" };

function sourcesFor(segments) {
  return segments.map(({ seg }) => ({
    id: seg.id,
    title: seg.title,
    kinds: [...new Set([...seg.facts.map((f) => f.src), ...(seg.faqs.length ? ["sheet"] : [])])].map(
      (k) => KIND[k] || k,
    ),
  }));
}

export function noNotes() {
  return {
    mode: "none",
    answer: `${NOT_IN_NOTES}.\n\n- Email the SIWES coordinator: **${COORDINATOR_EMAIL}**\n- Or ask your success advisor\n- Put your own details in that email, not in this chat`,
    sources: [],
    kbVersion: KB_VERSION,
  };
}

export function offlineAnswer(found) {
  const { segments, bestFaq } = found;
  if (!segments.length) return noNotes();
  const top = segments[0].seg;
  const parts = [];
  if (bestFaq) {
    parts.push(bestFaq.faq.a);
  } else {
    parts.push(top.blurb);
    if (top.steps.length) parts.push(top.steps.map((s) => `- ${s}`).join("\n"));
  }
  parts.push(`_Confirm dates and exceptions with the coordinator: ${COORDINATOR_EMAIL}_`);
  const used = bestFaq ? [{ seg: bestFaq.seg }] : [{ seg: top }];
  return { mode: "offline", answer: parts.join("\n\n"), sources: sourcesFor(used), kbVersion: KB_VERSION };
}

async function callModel(system, messages, apiKey) {
  const res = await fetch(LLM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL_ID,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.3,
      messages: [{ role: "system", content: system }, ...messages],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`model ${res.status}`);
  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

export function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY_MESSAGES)
    .map((m) => ({ role: m.role, content: redact(m.content).slice(0, 1500) }));
}

export async function answer({ index, message, history = [], llm = callModel, apiKey = process.env.GROQ_API_KEY }) {
  const clean = redact(message);
  const prior = cleanHistory(history);
  // Retrieve on the new message plus the last student turn so follow-ups ("and for SIWES II?") still match.
  const lastUser = [...prior].reverse().find((m) => m.role === "user");
  const found = retrieve(index, lastUser ? `${lastUser.content} ${clean}` : clean);
  const own = retrieve(index, clean);
  const useFound = own.segments.length ? own : found;

  if (!apiKey) return offlineAnswer(useFound);
  if (!useFound.segments.length) return noNotes();

  try {
    const system = buildSystem(useFound.segments, index.kb.glossary);
    const text = await llm(system, [...prior, { role: "user", content: clean }], apiKey);
    if (!text) return offlineAnswer(useFound);
    const missing = text.toLowerCase().includes(NOT_IN_NOTES.toLowerCase());
    return {
      mode: "ai",
      answer: text,
      sources: missing ? [] : sourcesFor(useFound.segments),
      kbVersion: KB_VERSION,
    };
  } catch {
    return { ...offlineAnswer(useFound), degraded: true };
  }
}
