# Checklist

## Phase 1
- [x] Transcript and all xlsx sheets read
- [x] 14 segments, 117 Q&As, no student PII
- [x] Server, system prompt, tests (lookup, reCAPTCHA gate, rate limits)
- [x] ADR 0005 and docs updated for document-first, reCAPTCHA, no login
- [ ] React chat, themes, drawer, source labels
- [ ] Contrast and target audit
- [ ] Pre-commit hook active

## Before launch (Phase 2 to 3)
- [ ] Coordinator confirms every `ama` fact (policy can change since the recording)
- [ ] Controller, DPO, retention and transfer basis filled in
- [ ] Privacy notice reviewed by a lawyer
- [ ] Provider data-processing terms checked (Groq, Hugging Face and Google reCAPTCHA)
- [ ] reCAPTCHA keys created for the production domain; `RECAPTCHA_SECRET` set (production fails closed without it)
- [ ] Runbook and incident contact
