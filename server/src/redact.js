// Remove obvious personal identifiers before text leaves the server.
// Best effort only: the UI also tells students not to type personal details.

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONEISH = /\+?\d[\d\s().-]{5,}\d/g;
const MATRIC = /\b[A-Za-z]{2,6}[/-]\d{2,}(?:[/-]\d+)+\b/g;

export function redact(text) {
  return String(text)
    .replace(EMAIL, "[email]")
    .replace(MATRIC, "[id]")
    .replace(PHONEISH, (m) => (m.replace(/\D/g, "").length >= 7 ? "[number]" : m));
}
