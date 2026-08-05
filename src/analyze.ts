import type { Analysis, Finding, FileChange, Severity } from './types.js'
import { SEVERITY_WEIGHT } from './types.js'
import { runRules } from './rules.js'

function gradeFromScore(score: number): Analysis['grade'] {
  if (score < 10) return 'A'
  if (score < 25) return 'B'
  if (score < 45) return 'C'
  if (score < 70) return 'D'
  return 'F'
}

function summarize(score: number, findings: Finding[], files: FileChange[]): string {
  if (!files.length) return 'No changes vs base — nothing to review.'
  if (!findings.length) return 'Clean signal: no heuristic risks fired. Still skim the diff.'
  const top = findings[0]!
  return `Risk ${score}/100 · top issue: ${top.title.toLowerCase()}`
}

export function analyze(input: {
  base: string
  head: string
  files: FileChange[]
}): Analysis {
  const findings = runRules(input.files)
  const raw = findings.reduce((n, f) => n + f.score + SEVERITY_WEIGHT[f.severity] * 0.15, 0)
  const score = Math.min(100, Math.round(raw))
  return {
    base: input.base,
    head: input.head,
    files: input.files,
    findings,
    score,
    grade: gradeFromScore(score),
    summary: summarize(score, findings, input.files),
  }
}

export function maxSeverity(findings: Finding[]): Severity | null {
  const order: Severity[] = ['critical', 'high', 'medium', 'low', 'info']
  for (const s of order) {
    if (findings.some((f) => f.severity === s)) return s
  }
  return null
}
