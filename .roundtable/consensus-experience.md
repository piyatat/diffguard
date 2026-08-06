# EXPERIENCE consensus

## Cross-proposal signals

| Topic | Also in | Owner |
| --- | --- | --- |
| `-V, --version` | product #3 | **Already shipped by product** — acknowledge only |
| Clearer `--fail-on` / exit messaging | reliability defer, product exit-codes docs | **experience** |
| `NO_COLOR` / `--color`, severity tally | deferred by product/craft/reliability → experience | **experience** |

## Agreed EXPERIENCE work (this role implements)

Tiny UX / formatting / flag ergonomics with overlap or explicit deferral:

### E1. Honor `NO_COLOR` + `--color` (experience #2)
Default color = `stdout.isTTY && !process.env.NO_COLOR`. `--no-color` forces off; `--color` forces on. Document in `--help`.

### E2. Severity tally in text report (experience #3)
After grade/score line, show a dim one-line count of findings by severity (non-zero buckets only), e.g. `2 high · 1 medium`. Text output only.

### E3. stderr line when `--fail-on` gate trips (experience #4 + reliability defer)
On exit 1 from the severity gate, write one clear line to stderr:
`diffguard: failed --fail-on <sev> (max finding: <max>)`.
Stdout report / JSON unchanged.

## Already done elsewhere
- `-V, --version` — product

## Deferred (other roles)
- README grade docs, help exit codes, quick start → product (done)
- Score helpers, provider validation, name-status parsing → craft
- `--base` verify, loopback AI key, redaction, git stderr → reliability
