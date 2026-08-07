# Consensus — Diffguard repo-idea-iterate

## Winner (4/4 for)

**`--list-rules`** — export heuristic catalog (id / severity / title [/ score]) from `src/rules.ts` and print via CLI early exit (like `--version`).

Aligned idea ids: **P1 = C1 = E1** (reliability revised from R1 toward P1).

### Ship scope
1. `src/rules.ts` — export `listRules()` (or equivalent) returning stable metadata from the same definitions `runRules` uses.
2. `src/cli.ts` — `--list-rules` flag; early exit 0; document in `helpText()`.
3. `README.md` Options — document the flag.
4. `docs/findings-glossary.md` — add rule **ids** so glossary stays aligned with the catalog.

### Explicitly deferred
- conflict-markers rule (P3/R1/C3)
- `--exclude` (R2/E3)
- debug-leftovers (R3)
- severity SSOT cleanup (C2)
- print rule id in text report (E2)
- sibling Compared-to table (P2)

### Boundaries
Not dangertape (session runtime). Not lockplain (lockfile changelog). Not helpgate (README↔help drift) — this is a **runtime rule catalog**.
