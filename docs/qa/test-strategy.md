# Test strategy

Read this before adding or changing a test.

## In scope (run by `npm test` and the pre-commit hook)
- **KB integrity**: every segment has id, group, title, steps or facts; every fact has a valid source tag; `ama` facts have a timestamp; the only email in the KB is the coordinator's; no matric-number patterns.
- **Retrieval**: a fixed list of student questions maps to the expected segment (for example "where do I get my logbook" gives `logbook`).
- **Redaction**: emails, long digit runs and matric-style numbers are removed before a model call.
- **System prompt**: contains the rules that matter (bulleted steps, KB only, coordinator fallback, no personal details).
- **Document lookup**: close questions return a "Read this" document; loose or off-topic ones return none so the bot takes over.
- **reCAPTCHA** (stubbed Google): dev skip, production fail-closed, missing token, good and low score, wrong action, unreachable.
- **API**: validation (empty, too long), 403 when the captcha fails, chat rate limit, answer shape, no message content in logs.
- **Constants guard**: the pre-commit hook flags a change to the watched values (KB version, model id, coordinator email, limits).

## Out of scope
Real Groq calls and real Google calls (need a key and cost money), visual design (checked by hand in the browser at 360px and desktop with the contrast audit), the truth of the KB (the coordinator reviews that).
