# 0002 Keyword retrieval, then the model, with an offline fallback

Status: superseded by 0006 (model provider and hosting changed; retrieval and fallback unchanged)

**Context.** The answer must come from the KB, not from the model's general knowledge. SIWES rules are institution-specific.

**Decision.** The server scores segments by keyword, sends the top 3 plus the system prompt to the model. If no the model API key is set or the call fails, the server returns the best-matching Q&A and steps directly, labelled as such.

**Why.** Small KB, no embedding infrastructure, and the app stays useful when the API is down or unfunded.

**Consequences.** Retrieval misses on unusual wording are possible; the fallback and the "ask the coordinator" line cover that. Revisit with embeddings only if retrieval tests show real misses. The model id lives in `server/src/constants.js`.
