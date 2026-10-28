import { COORDINATOR_EMAIL, KB_VERSION, MIN_DOC_SCORE } from "./constants.js";
import { redact } from "./redact.js";
import { retrieve } from "./retrieve.js";

// Find a written document (a coordinator Q&A) that answers the question.
// Returns null when nothing is close enough: the app then goes straight to the chatbot.
const confirmedOn = () => {
  const [y, m] = KB_VERSION.split(".");
  return new Date(Number(y), Number(m) - 1).toLocaleString("en-GB", { month: "long", year: "numeric" });
};

export function lookup(index, message) {
  const found = retrieve(index, redact(message));
  const hit = found.bestFaq;
  if (!hit || hit.score < MIN_DOC_SCORE) return null;
  const { seg, faq } = hit;
  return {
    kind: "doc",
    segment: { id: seg.id, title: seg.title },
    title: faq.q,
    body: faq.a,
    steps: seg.steps,
    source: faq.src === "sheet" ? "Coordinator's written answer" : "SIWES notes",
    confirm: `Confirm dates and exceptions with the coordinator: ${COORDINATOR_EMAIL}`,
    confirmed: confirmedOn(),
    kbVersion: KB_VERSION,
  };
}
