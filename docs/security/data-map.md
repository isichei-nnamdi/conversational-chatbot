# Data map and retention

Unknowns are `[[FILL]]`. Do not replace them with guesses.

| Purpose | Data | Subjects | Source | Lawful basis | Recipients | Transfer | Retention | Security |
|---|---|---|---|---|---|---|---|---|
| Answer a SIWES question | Message text (may contain stray personal details), redacted before sending | Students | The student | Consent (banner) or legitimate interests, `[[FILL: school to confirm basis; run an LIA if relying on legitimate interests]]` | LLM provider (processor), see vendors | Provider servers may be outside Nigeria: `[[FILL: provider region and NDPA transfer ground]]` | Not stored by this app. Provider retention: `[[FILL: check provider terms]]` | TLS, key in env, redaction, rate limit |
| Block bots from the bot | IP address, browser signals and a reCAPTCHA token | Students | Google script on the student's device | Legitimate interests (security) `[[FILL: confirm, run LIA]]` | Google | Google servers may be outside Nigeria: `[[FILL: transfer ground]]` | Not stored by this app; Google's retention `[[FILL]]` | Server-side verification; script loads only on use and after consent |
| Keep the service running | Method, path, status, latency, IP for rate limiting (memory only) | Students | Request | Legitimate interests | None | None | Logs `[[FILL: days]]`; rate-limit counters cleared on restart | No content in logs |
| Remember preferences | Theme, consent choice (browser local storage) | Students | The student | Strictly necessary / consent record | None | None | Until the student clears it | Local only |
| Flag a correction | Nothing is sent by the app; the student's own email client sends a message | Students | The student | Consent (they send it) | Coordinator | `[[FILL]]` | Coordinator's mailbox policy `[[FILL]]` | n/a |

Controller: `[[FILL: Miva Open University or the operating team]]`. DPO / contact: `[[FILL]]`. Data subject requests: because no account or chat history is kept, most access and erasure requests resolve to "nothing held by this app"; confirm with the provider's terms before stating that publicly.
