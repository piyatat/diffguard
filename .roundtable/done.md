# Roundtable done

## product

- Added `-V, --version` (reads `package.json`; documented in help + README).
- Synced `--help` with README: exit codes `0|1|2` and `DIFFGUARD_AI_TIMEOUT_MS`.
- README: **Interpreting results** (score + A–F thresholds; `--fail-on` vs grade).
- README Quick start: build → `npm start` on this checkout, then `npm link`.
- `npm run build` OK; `diffguard --version` → `diffguard 1.1.0`.

## reliability

- Verify user `--base` via `rev-parse --verify`; clear exit-2 error on unknown refs.
- OpenAI-compatible provider: allow missing API key on loopback; omit `Authorization` when unset (hosted still requires key).
- Redact secret-shaped text in AI finding titles and parse-error `raw` snippets.
- `git()` failures prefer stderr and run through `sanitizeErrorMessage`.
- Deferred craft overlaps (name-status parsing, provider validation) to craft.
- `npm run build` OK.

## experience

- Honor `NO_COLOR`; add `--color` force-on (help + README).
- Text report: severity tally under grade (`2 high · 1 medium`).
- On `--fail-on` gate trip: stderr `diffguard: failed --fail-on … (max finding: …)`.
- Noted `--version` already shipped by product (overlap).
- `npm run build` OK.
