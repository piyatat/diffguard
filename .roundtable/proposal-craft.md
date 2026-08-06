# CRAFT proposal — TypeScript quality, architecture, bugs

## 1. Deduplicate score/grade helpers
`gradeFromScore` is copy-pasted in `src/analyze.ts` and `src/ai/review.ts`. The findings→score reduce (`f.score + SEVERITY_WEIGHT[sev] * 0.15`) is also duplicated. Extract `gradeFromScore` + `scoreFromFindings(findings, riskDelta?)` in `analyze.ts` (or a tiny `score.ts`) and reuse from the AI enrich path.

## 2. Validate AI provider instead of silent coerce
`resolveAiConfig` maps any non-`openai` string to `ollama` (typos like `open-ai` silently become local Ollama). Throw a clear error for unknown providers; optionally mirror the same check in CLI `--ai-provider` parsing.

## 3. Fix `--name-status` path parsing (spaces / rename scores)
`collectChanges` takes `line[0]` as status and `rest.split(/\s+/)` for rename/copy targets. Git uses tab separators; paths with spaces and `R100\told\tnew` forms are fragile. Parse with a tab-aware regex (`^([AMDCRT?])(\d*)\t(.+)$`) and take the final tab field as the path.

## 4. Drop duplicate `AiReviewResult` type
`src/ai/review.ts` defines `AiReviewResult` identical to `AiReview` in `types.ts`. Use `AiReview` (or re-export) so the analysis shape stays single-sourced.
