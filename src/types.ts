export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export type Finding = {
  id: string
  severity: Severity
  title: string
  detail: string
  files: string[]
  score: number
}

export type FileChange = {
  path: string
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'T' | '?'
  additions: number
  deletions: number
  patch?: string
}

export type Analysis = {
  base: string
  head: string
  files: FileChange[]
  findings: Finding[]
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  summary: string
}

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  info: 0,
  low: 4,
  medium: 10,
  high: 22,
  critical: 40,
}
