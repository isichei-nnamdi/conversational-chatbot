# 0006 Groq for answers, Hugging Face Space for the API

Status: accepted. Supersedes the provider and hosting parts of 0002.

**Context.** The owner chose Groq for the model and a Hugging Face Docker Space for the backend. A GitHub Action pushes only the `server/` folder to the Space.

**Decision.**
- The server calls Groq's OpenAI-compatible chat completions endpoint with plain `fetch` (model `llama-3.3-70b-versatile`, key `GROQ_API_KEY`). No vendor SDK. Response mode label is `"ai"`.
- The API runs in a Docker Space on port 7860 (`server/Dockerfile`; `server/README.md` carries the Space front matter).
- Because only `server/` is deployed, the built knowledge base lives at `server/data/kb.json`.
- The front end is built separately and calls the Space through `VITE_API_BASE`. `ALLOWED_ORIGIN` is a comma-separated allowlist.
- `.github/workflows/deploy-space.yml` pushes `server/**` on changes to `main`, using the `HF_TOKEN` repository secret.

**Why.** Cheap, fast inference; a free always-on host; a deploy path that needs no manual steps.

**Consequences.** The front end needs its own static host. Secrets are set in the Space settings, never committed. Model id and URL are WATCHED constants. A Space may sleep when idle, so the first request can be slow.
