# Roundtable done — repo-idea-iterate

## Consensus idea
**`--list-rules`** (P1 = C1 = E1; reliability revised for)

## Shipped
- `src/rules.ts`: export `RuleMeta` + `listRules()` from the same `rules()` definitions.
- `src/cli.ts`: `--list-rules` early exit; text table or `--json` `{ rules: [...] }`; help line.
- `README.md`: Options + FAQ pointer.
- `docs/findings-glossary.md`: rule **ids** aligned with catalog.
- `npm run build` OK; smoke-tested `--list-rules` / `--list-rules --json`.

## Deferred
conflict-markers, `--exclude`, debug-leftovers, severity SSOT, finding-line rule ids, sibling Compared-to table.

## diffguard — --list-rules catalog
- Exported listRules() + CLI --list-rules / --json
- Glossary aligned with rule ids
- Build green
