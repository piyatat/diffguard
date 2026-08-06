# EXPERIENCE proposal — CLI UX / output / flags

Role focus: ergonomics of the `diffguard` CLI, human-readable report formatting, and flag/env consistency.

## Improvements

### 1. `--version` / `-V` flag
**Why:** Every serious CLI exposes version; users and CI scripts need it for support and pin checks. Help text already exists; version does not.
**Change:** Print `package.json` version (or embedded build constant) and exit 0. Document in `--help`.

### 2. Honor `NO_COLOR` + add `--color`
**Why:** Today color is TTY-only with `--no-color` override. Standard CLIs also respect `NO_COLOR` and allow forcing color with `--color` (e.g. for CI logs that preserve ANSI).
**Change:** Default color = `stdout.isTTY && !process.env.NO_COLOR`. `--no-color` forces off; `--color` forces on. Mention in help.

### 3. Severity tally in text report header
**Why:** After grade/score, users scan findings one-by-one. A one-line count (`2 high · 1 medium · 3 low`) makes risk distribution glanceable—especially on large diffs.
**Change:** In `formatText`, after the grade line (or before findings), emit a dim tally of findings by severity (skip zero buckets). No change to JSON schema beyond optional future field—text only for this round.

### 4. Clear stderr line when `--fail-on` gate trips
**Why:** Exit code `1` alone is opaque in CI logs; agents/humans wonder whether the scan failed or the gate fired.
**Change:** On gate failure, write one line to stderr, e.g. `diffguard: failed --fail-on high (max finding: critical)`. Keep stdout report intact. Skip when `--json` if we want machines to parse stdout only—still emit stderr (CI-friendly).

## Out of scope (this role alone)
- New rules / scoring changes
- AI prompt quality
- Package publish / install path
