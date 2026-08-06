# Product proposal (CLI UX, docs, value)

Focus: README / help clarity, grade interpretation, and first-run discoverability. No new scan rules.

## 1. Document the risk grade scale in the README

**Problem:** Output shows `Grade C  44/100` but the README never explains what A–F mean or how score maps to grade. Users cannot decide whether to merge or gate CI without guessing.

**Proposal:** Add a short **Interpreting results** section after Example output:
- Score = cumulative risk points (0 safe → 100 high)
- Grades: A (&lt;10), B (&lt;25), C (&lt;45), D (&lt;70), F (≥70)
- Note that `--fail-on` gates on finding severity, not letter grade

## 2. Sync `--help` with README (exit codes + timeout env)

**Problem:** README documents exit codes (`0` / `1` / `2`) and `DIFFGUARD_AI_TIMEOUT_MS`; `--help` omits both. CLI-first users never see them.

**Proposal:** Extend `helpText()` with an Exit codes block and the timeout env var so help and README stay aligned.

## 3. Add `-V, --version` to the CLI

**Problem:** No version flag. Support and CI debugging require reading `package.json` or guessing.

**Proposal:** Parse `-V` / `--version`, print `diffguard <version>` from `package.json`, exit 0. Document in README Options table and `--help`.

## 4. Add a one-command “try on this repo” path in Quick start

**Problem:** Quick start jumps to `npm install` + `npm run build` + absolute `--cwd`. First-value moment is delayed.

**Proposal:** Lead Quick start with scanning the current checkout after build (`diffguard` / `npm start`), then show `npm link` and CI. Keep clone-and-build as the install path (package may not be on the public registry yet).
