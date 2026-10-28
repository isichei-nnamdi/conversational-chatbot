# Development guide

> Read before you change anything. The docs are binding, not an archive. A change that contradicts an ADR needs a new ADR that supersedes it.

## What is in the repo

| Path | What |
|---|---|
| `data/source/` | Hand-curated segments and the question map (the inputs) |
| `data/segments/` | Built segments (generated, do not hand-edit) |
| `server/data/kb.json` | Built knowledge base (generated, do not hand-edit). Lives in `server/` because only that folder is deployed |
| `scripts/` | `extract_sources.py` (private raw pull), `build_kb.py` (builds the KB) |
| `server/` | Express API, retrieval, system prompt, Groq call, Dockerfile, tests |
| `web/` | React (Vite) app: topic page, floating helper button, chat modal. No landing page |
| `docs/` | Blueprint, ADRs, SRS, test strategy, security and privacy |
| `.githooks/` | Pre-commit hook that runs the tests |
| `.github/workflows/deploy-space.yml` | Pushes `server/` to the Hugging Face Space |

## Run it

```bash
npm install
cp server/.env.example server/.env   # GROQ_API_KEY, RECAPTCHA_SITE_KEY, RECAPTCHA_SECRET (all optional in dev)
npm run dev                          # API on :8787, web on :5173 (proxies /api)
npm test                             # what the pre-commit hook runs
git config core.hooksPath .githooks
```

**Skipping reCAPTCHA and rate limits locally.** Set `DISABLE_GATES=1` in `server/.env`. It only takes effect when `NODE_ENV` is not `production` and the request really arrives over loopback (127.0.0.1 or ::1; forwarded headers are ignored). The server then binds to 127.0.0.1 only, hides the reCAPTCHA site key from the page, and prints a warning at start. The Docker image sets `NODE_ENV=production`, so the Space ignores the flag. Never add it to Space secrets.

With no `GROQ_API_KEY` the server still works: it answers straight from the knowledge base and says so.

To preview the production build against the local server, build with an empty API base: `VITE_API_BASE= npm run build -w web`, then `npm start -w server` (it serves `web/dist` when present).

## Deploy

- **API:** a push to `main` that touches `server/**` runs the deploy workflow, which copies `server/` into the Space `AustinWealth/cc-space`. Needs the `HF_TOKEN` GitHub repository secret. Set `GROQ_API_KEY`, `ALLOWED_ORIGIN`, `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET` as Space secrets.
- **Web:** `npm run build -w web` and host `web/dist` anywhere static. `web/.env.production` sets `VITE_API_BASE` to the Space. Add the site's URL to `ALLOWED_ORIGIN`.

See [ADR 0006](../blueprint/adr/0006-groq-model-and-hugging-face-space-hosting.md).

## Rebuild the knowledge base

Raw sources hold student questions with personal details, so they stay **outside** the repo.

```bash
python scripts/extract_sources.py "<xlsx>" 96TH1aVnKwg "<private dir>"
python scripts/build_kb.py "<private dir>/qa_flat.json"
```
