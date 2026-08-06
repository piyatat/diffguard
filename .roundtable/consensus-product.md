# Product consensus

Items below appear in ≥2 proposals **or** are uncontroversial PRODUCT-domain fixes (README / help / value). Implement only these.

## Agreed (ship)

### A. `-V, --version` (product #3 + experience #1)
Print `diffguard <version>` from `package.json` and exit 0. Document in `--help` and README Options.

### B. Document risk grade scale (product #1 — uncontroversial docs)
Add **Interpreting results** after Example output: score meaning, A–F thresholds, and that `--fail-on` uses finding severity not letter grade.

### C. Sync `--help` with README (product #2 — uncontroversial CLI docs)
Add Exit codes (`0` / `1` / `2`) and `DIFFGUARD_AI_TIMEOUT_MS` to `helpText()`.

### D. Clarify Quick start first-value path (product #4 — uncontroversial docs)
Lead Quick start with build-then-scan-current-checkout (`npm start` / `node bin/diffguard.js`), then `npm link` and CI examples.

## Deferred (other roles own)
- `NO_COLOR` / `--color`, severity tally, fail-on stderr → experience
- Score helper dedupe, provider validation, path parsing → craft
- Base verify, loopback AI key, redaction, git stderr → reliability
