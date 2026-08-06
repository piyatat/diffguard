# Reliability consensus

## Overlap with other proposals

| Topic | Also in | Owner |
| --- | --- | --- |
| Tab-aware `name-status` path parsing (spaces / `R100`) | craft #3 | **Defer to craft** (same fix) |
| Reject unknown `--ai-provider` instead of silent ollama coerce | craft #2 | **Defer to craft** (same fix) |
| Clearer `--fail-on` / exit messaging | experience #4, product #2 | Defer (UX/docs) |

## Agreed reliability work (this role implements)

Tiny reliability / safety fixes from `proposal-reliability.md` with no ownership conflict:

1. **Verify `--base`** — `rev-parse --verify` user-supplied refs; exit 2 with a clear message.
2. **Local OpenAI-compatible without API key** — omit `Authorization` when key unset; only require a key for non-loopback openai endpoints (matches README).
3. **Redact AI titles + parse-error `raw`** — `redactSecrets` on titles and stored raw snippets.
4. **Sanitized git stderr** — prefer exec `stderr` in `git()` failures; run through `sanitizeErrorMessage`.

## Out of scope for reliability this round

- Score/grade dedupe, `AiReviewResult` cleanup (craft)
- `--version`, `NO_COLOR`, severity tally, help/README copy (experience / product)
