import type { Analysis, FileChange, Finding } from '../types.js'
import { redactSecrets } from './redact.js'

const MAX_PATCH_CHARS = 24_000
const MAX_FILE_PATCH = 4_000

export function buildAiPrompt(analysis: Analysis): string {
  const fileSummaries = analysis.files
    .slice()
    .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
    .slice(0, 40)
    .map((f) => formatFile(f))
    .join('\n\n')

  const heuristic = analysis.findings.length
    ? analysis.findings
        .map(
          (f) =>
            `- [${f.severity}] ${f.title}: ${f.detail} (${f.files.slice(0, 5).join(', ') || 'n/a'})`,
        )
        .join('\n')
    : '- none'

  const body = `
You are a senior code reviewer helping a software engineer triage a pull request.
Heuristic scanner results are provided. Confirm, refute, or extend them.
Focus on: correctness bugs, security, data loss, auth/authz, migrations, API breaks, missing tests.
Do NOT repeat secret values. Assume secrets in the diff are already redacted.

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "summary": "2-4 sentence review narrative",
  "risk_delta": 0,
  "findings": [
    {
      "severity": "info|low|medium|high|critical",
      "title": "short title",
      "detail": "why it matters and what to verify",
      "files": ["path"]
    }
  ],
  "questions": ["reviewer questions worth asking"]
}

risk_delta is an integer from -20 to +30 added to the heuristic risk score.

Range: ${analysis.base}...${analysis.head}
Heuristic grade: ${analysis.grade} (${analysis.score}/100)
Heuristic summary: ${analysis.summary}

Heuristic findings:
${heuristic}

Changed files and redacted patches:
${fileSummaries || '(no file patches available)'}
`.trim()

  return redactSecrets(body).slice(0, MAX_PATCH_CHARS + 4_000)
}

function formatFile(file: FileChange): string {
  const header = `${file.status} ${file.path} (+${file.additions}/-${file.deletions})`
  if (!file.patch) return header
  const patch = redactSecrets(file.patch)
  const trimmed =
    patch.length > MAX_FILE_PATCH
      ? `${patch.slice(0, MAX_FILE_PATCH)}\n… [patch truncated]`
      : patch
  return `${header}\n${trimmed}`
}

export function findingsFromAi(raw: unknown): {
  summary: string
  riskDelta: number
  findings: Finding[]
  questions: string[]
} {
  if (!raw || typeof raw !== 'object') {
    return emptyAi('Model returned non-object JSON')
  }
  const obj = raw as Record<string, unknown>
  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : 'AI review completed.'
  const riskDelta = clamp(
    typeof obj.risk_delta === 'number' ? obj.risk_delta : Number(obj.risk_delta) || 0,
    -20,
    30,
  )
  const questions = Array.isArray(obj.questions)
    ? obj.questions.filter((q): q is string => typeof q === 'string').slice(0, 8)
    : []

  const findings: Finding[] = []
  if (Array.isArray(obj.findings)) {
    for (const item of obj.findings.slice(0, 20)) {
      if (!item || typeof item !== 'object') continue
      const f = item as Record<string, unknown>
      const severity = normalizeSeverity(f.severity)
      const title =
        typeof f.title === 'string' ? redactSecrets(f.title.trim()) : ''
      const detail = typeof f.detail === 'string' ? redactSecrets(f.detail.trim()) : ''
      if (!title || !detail) continue
      const files = Array.isArray(f.files)
        ? f.files.filter((p): p is string => typeof p === 'string').slice(0, 12)
        : []
      findings.push({
        id: `ai:${slug(title)}`,
        severity,
        title: `[AI] ${title}`,
        detail,
        files,
        score: severityScore(severity),
        source: 'ai',
      })
    }
  }

  return { summary, riskDelta, findings, questions }
}

function emptyAi(summary: string) {
  return { summary, riskDelta: 0, findings: [] as Finding[], questions: [] as string[] }
}

function normalizeSeverity(value: unknown): Finding['severity'] {
  const s = String(value ?? 'medium').toLowerCase()
  if (s === 'info' || s === 'low' || s === 'medium' || s === 'high' || s === 'critical') return s
  return 'medium'
}

function severityScore(sev: Finding['severity']): number {
  switch (sev) {
    case 'critical':
      return 24
    case 'high':
      return 16
    case 'medium':
      return 10
    case 'low':
      return 5
    default:
      return 2
  }
}

function slug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return 0
  return Math.min(max, Math.max(min, Math.round(n)))
}
