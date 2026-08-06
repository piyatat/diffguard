# CRAFT consensus

## Cross-proposal signals
- **Reliability** also hardens git/AI edges (`--base` verify, git stderr, loopback API keys, redaction). CRAFT stays on TypeScript structure + parsing/validation bugs; leaves those reliability items alone.
- **Experience / Product** share `--version` and help/docs — not CRAFT scope.

## Agreed CRAFT work (domain fixes; complementary to reliability)

### C1. Shared score/grade helpers
Extract `gradeFromScore` + `scoreFromFindings` from the duplicated logic in `analyze.ts` / `ai/review.ts`. Single source for risk math.

### C2. Reject unknown AI providers
Stop silently mapping typos to `ollama`. Throw from `resolveAiConfig` (and CLI `--ai-provider`) for values other than `ollama` | `openai`. Complements reliability’s AI-key/loopback work without overlapping it.

### C3. Tab-aware `--name-status` parsing
Parse status + path with tab fields / rename scores so paths with spaces and `R100` forms are correct. Complements reliability’s git-message improvements.

### C4. Use `AiReview` from `types.ts`
Remove duplicate `AiReviewResult` in `ai/review.ts`.

## Deferred (other roles)
- `--version`, `NO_COLOR`/`--color`, severity tally, fail-on stderr → experience
- README grade docs, help exit codes, quick start → product
- `--base` verify, loopback API key, title/raw redaction, git stderr → reliability
