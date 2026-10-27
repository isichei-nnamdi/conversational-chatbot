# ADR 0005: Document first, then the bot; reCAPTCHA and rate limits instead of login

Status: accepted · Date: 2026-10-27

## Context
Students should get an answer without creating an account. The bot costs money per call and can be abused. Most questions already have a written answer from the coordinator.

## Decision
- **No login.** There are no accounts, sessions or profiles.
- **Document first.** `POST /api/lookup` is free (no model call). If a question closely matches a coordinator Q&A (score of at least `MIN_DOC_SCORE`), the UI shows it as **Read this**, with the topic's steps, then asks **Was this helpful?**
  - Yes: the flow ends.
  - No: the UI calls the bot (`POST /api/chat`).
  - No close document: the UI goes straight to the bot.
- **Gate the bot, not the documents.** `/api/chat` needs a Google reCAPTCHA v3 token (action `chat`, minimum score `RECAPTCHA_MIN_SCORE`), verified on the server. It passes in development when no secret is set and fails closed in production.
- **Rate limits per IP**, in memory: chat `RATE_LIMIT`, lookup `LOOKUP_RATE_LIMIT`.

## Why
- Reading a vetted answer is cheaper, faster and more trustworthy than generating one.
- Invisible reCAPTCHA keeps the student's path free of puzzles; rate limits cap the cost of anything that gets through.
- No account means no credentials, no history and far less personal data.

## Consequences
- Google becomes a third party: `vendors.md`, the data map, the privacy notice and the consent banner must name it. The script loads only after the student chooses to use the bot, and only if consent allows.
- Per-IP limits are shared by students behind one campus or mobile NAT. Tune after launch.
- Retrieval thresholds decide what counts as a close document; they are tested in `server/test/retrieve.test.js`.
