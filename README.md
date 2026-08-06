# Diffguard

Local-first **PR risk scanner** for software engineers. Point it at a git repo, get a risk grade before you open (or merge) a pull request. Optional AI enrichment talks to a **local LLM** (Ollama / LM Studio) or any **OpenAI-compatible** endpoint.

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
- Optional LLM / agent second pass for narrative review and extra findings

## Quick start

```bash
npm install
npm run build
npm start                 # scan this checkout (HEAD vs default base)
# or: node bin/diffguard.js
```

Link globally from this checkout to scan other repos:

```bash
npm link
cd your-project
diffguard
diffguard --base origin/main --fail-on high
diffguard --json > report.json
```

## AI review (optional)

Heuristics always run. Add `--ai` when you want a model to confirm, refute, or extend findings.

### Local LLM (Ollama — default)

```bash
# Install + pull a model first: https://ollama.com
ollama pull llama3.2
diffguard --ai
diffguard --ai --ai-model llama3.1:8b
```

### LM Studio / any OpenAI-compatible local server

```bash
diffguard --ai \
  --ai-provider openai \
  --ai-base-url http://127.0.0.1:1234/v1 \
  --ai-model local-model
```

Local OpenAI-compatible servers usually do not need a key. If yours does:

```bash
export DIFFGUARD_AI_API_KEY="your-local-key"   # do not commit this
diffguard --ai --ai-provider openai --ai-base-url http://127.0.0.1:1234/v1
```

### Hosted OpenAI-compatible API

```bash
export OPENAI_API_KEY="…"   # or DIFFGUARD_AI_API_KEY — never commit keys
diffguard --ai --ai-provider openai --ai-model gpt-4o-mini
```

### Cursor / Claude / any agent (no API call)

Export a **redacted** review brief and paste it into your agent:

```bash
diffguard --ai-prompt > /tmp/diffguard-review.prompt.md
```

Secret-shaped values are redacted before prompt export or remote calls.

## Example output

```text
diffguard · heuristic + AI review
origin/main...feature/payments · 14 file(s)

Grade C  44/100  [###########.............]
Auth session change looks correct but migration lacks a down path…

AI · ollama/llama3.2 · delta +6
         Auth session change looks correct but migration lacks a down path…
         Questions:
         ? Is the users.email unique constraint backfilled safely?

CRITICAL Possible secret material in diff (+40)
         Pattern match (values redacted from report): src/config.ts: hardcoded secret assignment

HIGH     [AI] Missing down migration (+16) ai
         Forward SQL only — rollbacks in prod will be painful.
```

## Interpreting results

The **score** is cumulative risk points from findings (and optional AI `risk_delta`): **0** is clean, **100** is maximum risk. Letter grades map as:

| Grade | Score |
| --- | --- |
| A | &lt; 10 |
| B | &lt; 25 |
| C | &lt; 45 |
| D | &lt; 70 |
| F | ≥ 70 |

`--fail-on` gates on **finding severity** (`low` … `critical`), not the letter grade. A diff can be grade B with a single `high` finding and still fail `--fail-on high`.

## CI gate

Fail the job when high-or-worse findings appear:

```yaml
- name: Diffguard
  run: |
    npm install
    npm run build
    node bin/diffguard.js --base origin/main --fail-on high --no-color
```

Optional AI in CI (self-hosted runner + Ollama recommended so diffs stay private):

```yaml
- run: node bin/diffguard.js --ai --fail-on high --no-color
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
| `--color` | Force ANSI colors (overrides `NO_COLOR`) |
| `--no-color` | Plain text |
| `--ai` | Call configured LLM after heuristics |
| `--ai-provider` | `ollama` (default) \| `openai` |
| `--ai-model` | Model id |
| `--ai-base-url` | Endpoint base URL |
| `--ai-prompt` | Print redacted agent prompt only |
| `-V, --version` | Print version and exit |
| `-h, --help` | Help |

### Env

| Variable | Purpose |
| --- | --- |
| `NO_COLOR` | Disable ANSI colors when set |
| `DIFFGUARD_AI_PROVIDER` | `ollama` \| `openai` |
| `DIFFGUARD_AI_MODEL` | Model name |
| `DIFFGUARD_AI_BASE_URL` | Endpoint |
| `DIFFGUARD_AI_API_KEY` | Key for openai-compatible providers |
| `OPENAI_API_KEY` | Fallback key |
| `DIFFGUARD_AI_TIMEOUT_MS` | Request timeout (default `120000`) |

Copy `.env.example` for a local template — never commit real keys.

## Privacy

- Heuristic mode: local git only, no network
- `--ai` with Ollama / local OpenAI-compatible: diffs stay on your machine
- `--ai` with a hosted API: **redacted** patch excerpts are sent to that endpoint
- Secret findings and prompts report labels / redactions values, not raw secrets
- API keys are read from the environment only and are scrubbed from error text

## Stack

Node 18+ · TypeScript · `git` CLI · optional Ollama / OpenAI-compatible HTTP

## License

MIT
