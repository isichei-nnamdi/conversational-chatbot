# Vendors and third-party hosts

Update this before adding any host. The privacy notice must match.

| Vendor | What it receives | Role | Status |
|---|---|---|---|
| Groq (chat completions API) | Redacted student question plus selected KB segments, sent from the server | Processor | Optional: only when `GROQ_API_KEY` is set. `[[FILL: data-processing terms, region, retention]]` |
| Google reCAPTCHA v3 | The student's IP address, browser details and interaction signals, collected by Google's script; a token goes to our server, which verifies it with Google | Processor / independent controller `[[FILL: confirm]]` | Loaded only when the student asks the bot (after a "No" on a document, or when no document matches), and only after consent. Needs `RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET`. `[[FILL: Google terms, cookies set]]` |
| Web host for the built front end | Page loads (IP address, headers) | Processor | `[[FILL: not chosen yet]]` |
| Fonts, CDNs, analytics | Nothing | n/a | None used: fonts are system fonts, assets are bundled. The only third-party script is reCAPTCHA above |
| Hugging Face (Docker Space) | Hosts the API. Sees request bodies in transit and the redacted-method logs the server writes | Processor | Space secrets hold the keys. `[[FILL: region, retention]]` |
| GitHub (Actions) | Holds the code and the deploy token (`HF_TOKEN`); no student data | Processor | Token is a repository secret, never in code |
