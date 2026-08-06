import type { Analysis, Finding, FileChange, Severity } from './types.js'
import { SEVERITY_ORDER, SEVERITY_RANK, SEVERITY_WEIGHT } from './types.js'
import { runRules } from './rules.js'

export function gradeFromScore(score: number): Analysis['grade'] {
  if (score < 10) return 'A'
  if (score < 25) return 'B'
  if (score < 45) return 'C'
  if (score < 70) return 'D'
  return 'F'
}

/** Cumulative risk points from findings, optionally plus an AI risk_delta. */
export function scoreFromFindings(findings: Finding[], riskDelta = 0): number {
  const raw =
    findings.reduce((n, f) => n + f.score + SEVERITY_WEIGHT[f.severity] * 0.15, 0) + riskDelta
  return Math.min(100, Math.max(0, Math.round(raw)))
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
  const score = scoreFromFindings(findings)
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
  for (const s of SEVERITY_ORDER) {
    if (findings.some((f) => f.severity === s)) return s
  }
  return null
}

/** Count findings per severity bucket (includes zeros). */
export function countFindingsBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  }
  for (const f of findings) {
    counts[f.severity] += 1
  }
  return counts
}

/** Highest severity first, then score descending. */
export function sortFindingsBySeverity(findings: Finding[]): Finding[] {
  return findings.slice().sort((a, b) => {
    const bySev = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]
    if (bySev !== 0) return bySev
    return b.score - a.score
  })
}
