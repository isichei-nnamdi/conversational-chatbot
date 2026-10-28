# Software requirements (SRS)

Read this before adding or dropping a feature.

## Functional
- **F1** Open directly into chat; no landing page; no login.
- **F12** Document first: a question that closely matches a coordinator answer first shows it as "Read this" with steps, then asks "Was this helpful?". Yes ends the flow; No sends the question to the bot. No close match goes straight to the bot.
- **F13** The bot is gated by reCAPTCHA v3 (server-verified) and per-IP rate limits. On a failed check the student sees a plain message and can retry.
- **F2** Answer SIWES questions from the KB in short plain language; process answers use bulleted steps.
- **F3** Show a certainty label on each answer (written answer, AMA with timestamp, policy, or "not in my notes").
- **F4** Topic sidebar grouped into five groups; a drawer under 900px.
- **F5** Quick-start tiles on the empty chat that send a prefilled question.
- **F6** "Flag a correction" on each answer, opening a mailto to the coordinator with the topic prefilled and no chat text unless the student adds it.
- **F7** When the KB has no answer, say so and give the coordinator email.
- **F8** Works without an API key (offline answers).
- **F9** One white, brand-coloured look (no dark mode). A collapsible topics sidebar remembers its state locally. A selected written answer opens in its own reader, never inside the chat.
- **F10** Consent banner (equal accept/decline) and a privacy notice dialog.
- **F11** Clear conversation button.

## Non-functional
- Usable at 360px; no horizontal scroll at 320px.
- Text contrast 4.5:1, boundaries 3:1, targets 24px or more, full keyboard use, reduced motion respected.
- First answer in under 8 seconds on a normal connection; loading state names what is happening.
- Message length limit 500 characters; rate limit per IP (see constants).
- No message content in server logs.

## Out of scope (v1)
Accounts or login, chat history, document upload, live data from the LMS, languages other than English, voice.
