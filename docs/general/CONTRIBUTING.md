# Contributing

1. Read [`docs/README.md`](../README.md) and the doc for the area you touch.
2. Knowledge changes go in `data/source/` (never edit `server/data/kb.json` by hand), then run `scripts/build_kb.py` and commit the regenerated files.
3. Every fact needs a source tag. If a statement is not in the sheet, the recording or a stated policy, it does not go in.
4. Never commit student questions, names, matric numbers, emails (other than the coordinator's) or raw exports. Raw sources stay outside the repo.
5. Cross-cutting values (KB version, model id, limits, coordinator email) live in `server/src/constants.js` only.
6. Run `npm test` before committing. The pre-commit hook does this (`git config core.hooksPath .githooks`).
7. UI changes keep the accessibility floor: 4.5:1 text contrast, targets of 24px or more, keyboard use, reduced motion, 360px first. No landing page.
8. A decision that changes an ADR needs a new ADR.
