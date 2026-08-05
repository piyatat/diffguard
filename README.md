# Diffguard

Local-first **PR risk scanner** for software engineers. Point it at a git repo, get a risk grade before you open (or merge) a pull request — no cloud, no API keys, nothing leaves your machine.

![license](https://img.shields.io/badge/license-MIT-2f6f6a?style=flat-square)
![node](https://img.shields.io/badge/node-%3E%3D18-b86a3c?style=flat-square)

## Why

Code review time is expensive. Diffguard runs cheap heuristics on `git diff` so you catch the obvious foot-guns first:

- Auth, payments, migrations, CI, and secrets paths
- Source changes without tests (and deleted tests)
- Oversized diffs that should be split
- Secret-shaped strings in **added** lines (values never printed)
- Common safety bypasses (`CORS *`, `eslint-disable`, TLS verify off, …)
- Lockfile churn without a manifest change

## Quick start

```bash
npm install
npm run build
node bin/diffguard.js --cwd /path/to/repo
```

Or link it globally from this checkout:

```bash
npm link
cd your-project
diffguard
diffguard --base origin/main --fail-on high
diffguard --json > report.json
```

## Example output

```text
diffguard · local PR risk scan
origin/main...feature/payments · 14 file(s)

Grade C  38/100  [#########...............]
Risk 38/100 · top issue: high-impact path changes

CRITICAL Possible secret material in diff (+40)
         Pattern match (values redacted from report): src/config.ts: hardcoded secret assignment
         · src/config.ts

HIGH     High-impact path changes (+28)
         src/auth/session.ts (auth / identity); prisma/migrations/20260305/migration.sql (database schema)
         · src/auth/session.ts
         · prisma/migrations/20260305/migration.sql

MEDIUM   Source changed without nearby tests (+12)
         8 source file(s) changed and no test files appear in this diff.
```

## CI gate

Fail the job when high-or-worse findings appear:

```yaml
- name: Diffguard
  run: |
    npm install -g ./diffguard   # or npx from a published package
    diffguard --base origin/main --fail-on high --no-color
```

Exit codes: `0` ok · `1` failed severity gate · `2` usage / git error.

## Options

| Flag | Meaning |
| --- | --- |
| `-b, --base <ref>` | Diff base (default: `origin/main`, then `main` / `master`) |
| `--cwd <path>` | Repo path |
| `--json` | JSON report for tooling |
| `--fail-on <sev>` | `low` \| `medium` \| `high` \| `critical` |
| `--unstaged` | Also surface dirty/untracked paths |
| `--no-color` | Plain text |
| `-h, --help` | Help |

## Privacy

- Reads local git only
- Never uploads diffs
- Secret findings report **pattern labels + file paths**, not matched secret values

## Stack

Node 18+ · TypeScript · `git` CLI

## License

MIT
