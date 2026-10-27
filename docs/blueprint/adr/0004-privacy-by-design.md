# 0004 Privacy by design

Status: accepted

**Context.** Students may type personal details into a chat box, and the text goes to an LLM provider. Nigeria's NDPA 2023 and GAID 2025 apply to people in Nigeria.

**Decision.**
- No accounts, no analytics, no third-party cookies. The only browser storage is theme and consent choice.
- The server does not log message content by default. Logs hold timestamp, status and latency only.
- The UI tells students not to type matric numbers, phone numbers or other personal details.
- The server redacts obvious identifiers (emails, long digit runs, matric-style numbers) before sending text to the model.
- The LLM provider is named as a processor in the privacy notice.
- Rate limiting is per IP in memory only.

**Consequences.** No chat history across devices. Controller identity, DPO, retention and transfer basis are `[[FILL]]` in the draft notice until the school confirms. See `docs/security/`.
