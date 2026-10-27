# Engineering standards and config

Read this before writing code or adding a setting.

## Standards
- Node 20+, ES modules, no TypeScript in v1 (small surface; revisit if the server grows).
- Cross-cutting values only in `server/src/constants.js`. Import, never copy.
- Colours only through CSS variables in `web/src/tokens.css`. No raw hex in components.
- No `console.log` of request bodies. Log method, path, status, ms.
- Definition of done: tests pass, docs touched if behaviour changed, keyboard and 360px checked, no new third-party host without updating `docs/security/vendors.md`.

## Config (server/.env)
| Variable | Default | Meaning |
|---|---|---|
| `GROQ_API_KEY` | unset | Enables model answers. Unset means offline answers |
| `RECAPTCHA_SITE_KEY` | unset | Public site key, sent to the web app via `/api/kb`. Unset means the web app skips the script |
| `RECAPTCHA_SECRET` | unset | Server-side secret. Unset passes in development and **fails closed in production** |
| `PORT` | 8787 | API port |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | CORS origin |

Model id, limits and the coordinator email are in `constants.js`, not env.
