// Central registry of cross-cutting values. Import from here; never copy a value.
// The pre-commit hook flags changes to the lines marked WATCHED.

export const KB_VERSION = "2026.10.1"; // WATCHED: must equal server/data/kb.json version
export const MODEL_ID = "llama-3.3-70b-versatile"; // WATCHED
export const LLM_URL = "https://api.groq.com/openai/v1/chat/completions";
export const COORDINATOR_EMAIL = "augustus@miva.university"; // WATCHED
export const MAX_MESSAGE_CHARS = 500; // WATCHED
export const RATE_LIMIT = { windowMs: 60_000, max: 20 }; // WATCHED

export const MAX_OUTPUT_TOKENS = 600;
export const MAX_HISTORY_MESSAGES = 6;
export const TOP_SEGMENTS = 3;
export const MIN_SEGMENT_SCORE = 4;
export const MIN_FAQ_SCORE = 4.5;
export const NOT_IN_NOTES = "I don't have that in my notes";

// Document-first flow: a strong match is shown as "Read this" before the bot.
export const MIN_DOC_SCORE = 7.5; // tuned by test/retrieve.test.js
export const LOOKUP_RATE_LIMIT = { windowMs: 60_000, max: 60 };

// reCAPTCHA v3 gate on the chatbot call only (lookup is free of cost and stays friction-free).
export const RECAPTCHA_ACTION = "chat";
export const RECAPTCHA_MIN_SCORE = 0.5; // WATCHED
export const RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";
