import type { Analysis, Severity } from './types.js'

const COLORS = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
}

function colorize(enabled: boolean, color: string, text: string): string {
  if (!enabled) return text
  return `${color}${text}${COLORS.reset}`
}

function severityColor(sev: Severity): string {
  switch (sev) {
    case 'critical':
      return COLORS.magenta
    case 'high':
      return COLORS.red
    case 'medium':
      return COLORS.yellow
    case 'low':
      return COLORS.cyan
    default:
      return COLORS.dim
  }
}

function gradeColor(grade: Analysis['grade']): string {
  if (grade === 'A' || grade === 'B') return COLORS.green
  if (grade === 'C') return COLORS.yellow
  return COLORS.red
}

function bar(score: number, width = 24): string {
  const filled = Math.round((score / 100) * width)
  return `[${'#'.repeat(filled)}${'.'.repeat(width - filled)}]`
}

const SEVERITY_ORDER: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

function severityTally(findings: Analysis['findings']): string | null {
  if (!findings.length) return null
  const counts: Partial<Record<Severity, number>> = {}
  for (const f of findings) {
    counts[f.severity] = (counts[f.severity] ?? 0) + 1
  }
  const parts = SEVERITY_ORDER.filter((sev) => (counts[sev] ?? 0) > 0).map(
    (sev) => `${counts[sev]} ${sev}`,
  )
  return parts.length ? parts.join(' · ') : null
}

export function formatText(analysis: Analysis, color: boolean): string {
  const lines: string[] = []
  const c = (col: string, t: string) => colorize(color, col, t)
  const mode = analysis.ai ? 'heuristic + AI review' : 'local PR risk scan'

  lines.push('')
  lines.push(c(COLORS.bold, 'diffguard') + c(COLORS.dim, ` · ${mode}`))
  lines.push(
    c(COLORS.dim, `${analysis.base}...${analysis.head}`) +
      ` · ${analysis.files.length} file(s)`,
  )
  lines.push('')
  const gradeLabel = color
    ? `${COLORS.bold}${gradeColor(analysis.grade)}Grade ${analysis.grade}${COLORS.reset}`
    : `Grade ${analysis.grade}`
  lines.push(
    `${gradeLabel}  ${c(COLORS.bold, `${analysis.score}/100`)}  ${bar(analysis.score)}`,
  )
  const tally = severityTally(analysis.findings)
  if (tally) lines.push(c(COLORS.dim, tally))
  lines.push(c(COLORS.dim, analysis.summary))
  lines.push('')

  if (analysis.ai) {
    lines.push(
      c(COLORS.cyan, 'AI') +
        c(
          COLORS.dim,
          ` · ${analysis.ai.provider}/${analysis.ai.model} · delta ${analysis.ai.riskDelta >= 0 ? '+' : ''}${analysis.ai.riskDelta}`,
        ),
    )
    lines.push(`         ${analysis.ai.summary}`)
    if (analysis.ai.questions.length) {
      lines.push(c(COLORS.dim, '         Questions:'))
      for (const q of analysis.ai.questions.slice(0, 6)) {
        lines.push(c(COLORS.dim, `         ? ${q}`))
      }
    }
    lines.push('')
  }

  if (!analysis.findings.length) {
    lines.push(c(COLORS.green, '✓ No findings'))
    if (analysis.files.length === 0) {
      lines.push(c(COLORS.dim, '  Clean tree vs base — nothing to scan.'))
      lines.push(c(COLORS.dim, '  Tip: pass --unstaged to include dirty/untracked files.'))
    } else {
      lines.push(c(COLORS.dim, `  ${analysis.files.length} file(s) scanned · no heuristic hits.`))
      lines.push(c(COLORS.dim, '  Tip: add --ai for a narrative second pass, or --fail-on high in CI.'))
    }
    lines.push('')
    return lines.join('\n')
  }

  for (const f of analysis.findings) {
    const tag = c(severityColor(f.severity), f.severity.toUpperCase().padEnd(8))
    const src = f.source === 'ai' ? c(COLORS.cyan, ' ai') : ''
    lines.push(`${tag} ${c(COLORS.bold, f.title)}${src} ${c(COLORS.dim, `(+${f.score})`)}`)
    lines.push(`         ${f.detail}`)
    if (f.files.length) {
      const shown = f.files.slice(0, 6)
      for (const path of shown) lines.push(c(COLORS.dim, `         · ${path}`))
      if (f.files.length > shown.length) {
        lines.push(c(COLORS.dim, `         · … +${f.files.length - shown.length} more`))
      }
    }
    lines.push('')
  }

  lines.push(
    c(
      COLORS.dim,
      'Tip: --ai for LLM review · --ai-prompt for Cursor/Claude · --fail-on high for CI gates.',
    ),
  )
  lines.push('')
  return lines.join('\n')
}

export function formatJson(analysis: Analysis): string {
  return JSON.stringify(
    {
      base: analysis.base,
      head: analysis.head,
      score: analysis.score,
      grade: analysis.grade,
      summary: analysis.summary,
      fileCount: analysis.files.length,
      findings: analysis.findings,
      ai: analysis.ai
        ? {
            provider: analysis.ai.provider,
            model: analysis.ai.model,
            baseUrl: analysis.ai.baseUrl,
            summary: analysis.ai.summary,
            questions: analysis.ai.questions,
            riskDelta: analysis.ai.riskDelta,
          }
        : undefined,
      files: analysis.files.map(({ path, status, additions, deletions }) => ({
        path,
        status,
        additions,
        deletions,
      })),
    },
    null,
    2,
  )
}

/** One-line grade for CI logs / scripts (`--summary`). */
export function formatSummary(analysis: Analysis): string {
  const max = analysis.findings.reduce<Severity | null>((acc, f) => {
    if (!acc) return f.severity
    return SEVERITY_ORDER.indexOf(f.severity) < SEVERITY_ORDER.indexOf(acc) ? f.severity : acc
  }, null)
  const top = max ?? 'none'
  return `diffguard ${analysis.grade} ${analysis.score}/100 · ${analysis.files.length} file(s) · ${analysis.findings.length} finding(s) · max ${top} · ${analysis.base}...${analysis.head}`
}
