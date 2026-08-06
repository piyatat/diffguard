# CI recipes

Copy-paste Diffguard gates for GitHub Actions-style runners. Build once (`npm run build`) or use a linked global binary.

## Severity gate (default)

```yaml
- name: Diffguard
  run: |
    npm install
    npm run build
    node bin/diffguard.js --base origin/main --fail-on high --no-color
```

Exit `1` fails the job when any finding is `high` or `critical`.

## JSON artifact

```yaml
- name: Diffguard JSON
  run: |
    node bin/diffguard.js --base origin/main --json --no-color > diffguard-report.json
- uses: actions/upload-artifact@v4
  with:
    name: diffguard-report
    path: diffguard-report.json
```

Combine with `--fail-on high` in a separate step if you want both an artifact and a hard gate.

## Clean / empty diff

When `HEAD` matches the base, Diffguard should exit `0` with no findings. Handy on branches that only touch ignored paths after merge-base alignment.

## Agent brief (no API)

```yaml
- run: node bin/diffguard.js --ai-prompt --no-color > diffguard-review.prompt.md
```

Paste the prompt into your agent; secret-shaped values stay redacted.

## Local Ollama on a self-hosted runner

```yaml
- run: node bin/diffguard.js --ai --fail-on high --no-color
```

Prefer self-hosted + Ollama so patches never leave your network. Hosted `--ai-provider openai` sends **redacted** excerpts only.
