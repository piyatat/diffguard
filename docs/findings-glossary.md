# Findings glossary

Human labels for Diffguard **heuristic** categories. Live ids come from `diffguard --list-rules` (same source as the scanner). Treat this table as product language for reports and CI triage.

| Rule id | Category | What it usually means | Typical severity |
| --- | --- | --- | --- |
| `hotspot-paths` | Auth / payments / CI / infra paths | Touches auth, session, OAuth, payments, migrations, secrets, workflows, etc. (severity escalates by path) | critical / high / medium |
| `missing-tests` | Missing tests | Source changed without nearby test updates | medium |
| `deleted-tests` | Deleted tests | Test paths removed in the diff | high |
| `large-diff` | Oversized diff | Very large file or hunk count — consider splitting the PR (may escalate to high) | medium / high |
| `mega-file-churn` | Single-file mega churn | One file with huge +/− line churn | medium |
| `lockfile-only-skew` | Lockfile churn | Lockfile changed without `package.json` (light signal — not a lockfile changelog) | low |
| `secret-patterns` | Secret-shaped strings | Assignment/literals in **added** lines that look like keys/tokens (values redacted in output) | critical |
| `todo-fix` | TODO / FIXME | New TODO/FIXME/HACK/XXX markers in added lines | low |
| `conflict-markers` | Unresolved conflict markers | `<<<<<<<` / `>>>>>>>` in added lines | high |
| `debug-leftovers` | Debug leftovers | `debugger`, `console.log`/`console.debug`, `pdb.set_trace`/`breakpoint()`, `binding.pry` in added lines | medium |
| `focused-tests` | Focused tests | `describe.only` / `it.only` / `test.only` / `fit` / `fdescribe` in test file added lines | high |
| `ts-suppressions` | TypeScript suppressions | `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck` in added TypeScript lines | medium |
| `config-bypass` | Safety bypasses | `CORS *`, `eslint-disable`, TLS verify off, dangerous flags in added lines | high |

AI findings (with `--ai`) are tagged separately and may confirm, refute, or extend heuristics. `--fail-on` still keys off **severity**, not letter grade.
