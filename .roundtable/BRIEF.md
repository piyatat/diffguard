# Diffguard roundtable brief (repo-idea-iterate)

## Product
Local-first **PR risk scanner**: heuristics on `git diff` + optional local/OpenAI-compatible AI.

## Already shipped (prior roundtables)
`--version`, grade docs, help exit codes, NO_COLOR/`--color`, severity tally, fail-on stderr, `--base` verify, loopback AI key, redaction, score helpers, provider validation, name-status parsing, glossary, CI recipes.

## Sibling boundaries (do NOT reinvent)
| Sibling | Lane |
| --- | --- |
| dangertape | Agent **session** transcript replay / destructive tool calls |
| lockplain | Lockfile **changelog** (plain English package diffs) |
| helpgate | README vs `--help` flag drift |
| mcplint | MCP tool schema lint |
| agentbrief | Context packer for agents |
| ruleradar | Which AGENTS/cursor rules load for a path |

Diffguard may keep a light **lockfile-without-manifest** skew signal (already exists) — do not expand into lockplain territory.

## Research gaps (candidates — pick ONE)
1. **`--list-rules`** — print heuristic rule id / severity / title (CLI + glossary sync). Helps CI triage; not helpgate.
2. **`debug-leftovers` rule** — `console.log` / `debugger` / `pdb.set_trace` in **added** lines.
3. **Type/safety suppressions** — `@ts-ignore` / `@ts-expect-error` / `eslint-disable` already partly in config-bypass; could split or document.
4. **`--exclude <glob>`** — skip generated paths (`dist/`, `coverage/`) from scoring.
5. **Conflict markers** — `<<<<<<<` in added lines.
6. **Docs: Compared to siblings** — one README table clarifying Diffguard vs dangertape/lockplain/helpgate.

## Constraints
- ONE idea only after consensus.
- Prefer CLI / docs / rules improvement.
- Small, shippable in one pass; `npm run build` must pass.
- No secrets, no force-push.
