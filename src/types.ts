export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type Finding = {
  id: string
  severity: Severity
  title: string
  detail: string
  files: string[]
  score: number
  source?: 'heuristic' | 'ai'
}

export type FileChange = {
  path: string
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'T' | '?'
  additions: number
  deletions: number
  patch?: string
}

export type AiReview = {
  provider: 'ollama' | 'openai'
  model: string
  baseUrl: string
  summary: string
  questions: string[]
  riskDelta: number
  raw?: string
}

export type Analysis = {
  base: string
  head: string
  files: FileChange[]
  findings: Finding[]
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  summary: string
  ai?: AiReview
}

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  info: 0,
  low: 4,
  medium: 10,
  high: 22,
  critical: 40,
}

/** Highest → lowest severity (for gates and summaries). */
export const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

export const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

/** Parse a severity string; returns null when invalid. */
export function parseSeverity(raw: string | undefined | null): Severity | null {
  if (raw == null) return null
  const v = raw.trim().toLowerCase()
  if (v in SEVERITY_RANK) return v as Severity
  return null
}

/** True when `finding` is at least as severe as `threshold`. */
export function severityAtLeast(finding: Severity, threshold: Severity): boolean {
  return SEVERITY_RANK[finding] >= SEVERITY_RANK[threshold]
}
