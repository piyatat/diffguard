# Reliability proposal

Focus: git edge cases, AI failure modes, safety (no secrets / force-push / git config).

## 1. Verify `--base` before diffing

`resolveBase()` returns a user-supplied `--base` without `rev-parse --verify`. Missing/typo refs only fail later inside `collectChanges` with a cryptic `git … failed` message.

**Fix:** When `--base` is set, verify the ref exists; on failure exit 2 with a clear message listing what was tried.

## 2. Local OpenAI-compatible servers without API key

README says LM Studio / local OpenAI-compatible endpoints usually need no key, but `openaiChat()` hard-requires `DIFFGUARD_AI_API_KEY` / `OPENAI_API_KEY`. That breaks the documented local path and turns a working heuristic scan into a confusing AI skip.

**Fix:** Allow missing API key for openai provider when base URL is loopback (`127.0.0.1` / `localhost`) or when key is empty; omit `Authorization` header if unset. Hosted defaults still warn clearly if no key.

## 3. Redact AI titles + parse-error `raw`

`findingsFromAi` redacts `detail` but not `title`. Parse-failure path stores `raw: content.slice(0, 2000)` without `redactSecrets`, so secret-shaped model output can appear in JSON reports.

**Fix:** Run `redactSecrets` on AI titles and on stored `raw` snippets.

## 4. Surface sanitized git stderr on failure

`git()` only rethrows `err.message` from `execFileSync`, which often omits stderr (where git puts “unknown revision”, “bad object”, etc.). Operators get opaque failures on edge cases (no merge-base, bad cwd, shallow clone).

**Fix:** Prefer `stderr` (then stdout) from the exec error, pass through `sanitizeErrorMessage`, and keep the `git <args> failed:` prefix.
