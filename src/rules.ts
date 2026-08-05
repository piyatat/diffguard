import type { FileChange, Finding, Severity } from './types.js'

type Rule = {
  id: string
  severity: Severity
  title: string
  score: number
  test: (files: FileChange[]) => { hit: boolean; files: string[]; detail: string }
}

const HOTSPOT_PATTERNS: { re: RegExp; label: string; severity: Severity; score: number }[] = [
  { re: /(^|\/)(\.github\/workflows|Dockerfile|docker-compose)/i, label: 'CI / container config', severity: 'high', score: 18 },
  { re: /(^|\/)(auth|oauth|sso|session|jwt|passport|rbac)(\/|\.|$)/i, label: 'auth / identity', severity: 'critical', score: 28 },
  { re: /(migration|schema|prisma|drizzle|sequelize)/i, label: 'database schema', severity: 'high', score: 20 },
  { re: /(^|\/)(\.env|secrets?|credentials|kube|helm|terraform|pulumi)/i, label: 'secrets / infra', severity: 'critical', score: 30 },
  { re: /(payment|billing|stripe|checkout|wallet)/i, label: 'payments', severity: 'critical', score: 26 },
  { re: /(middleware|proxy|cors|csp|helmet)/i, label: 'security middleware', severity: 'high', score: 16 },
  { re: /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|Cargo\.lock|go\.sum)$/i, label: 'lockfile', severity: 'medium', score: 8 },
]

const TEST_RE = /(\/|^)(tests?|__tests__|spec)(\/|$)/i
const TEST_FILE_RE = /\.(test|spec)\.[jt]sx?$/i
const SOURCE_RE = /\.(ts|tsx|js|jsx|go|rs|py|java|kt|swift)$/i

const SECRET_PATTERNS: { id: string; re: RegExp; label: string }[] = [
  { id: 'aws-key', re: /AKIA[0-9A-Z]{16}/g, label: 'AWS access key id shape' },
  { id: 'github-pat', re: /gh[pousr]_[A-Za-z0-9_]{20,}/g, label: 'GitHub token shape' },
  { id: 'slack-token', re: /xox[baprs]-[A-Za-z0-9-]{10,}/g, label: 'Slack token shape' },
  { id: 'private-key', re: /-----BEGIN (RSA |OPENSSH |EC )?PRIVATE KEY-----/g, label: 'PEM private key header' },
  { id: 'jwt', re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, label: 'JWT-like string' },
  {
    id: 'generic-secret',
    re: /(?:api[_-]?key|secret|token|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    label: 'hardcoded secret assignment',
  },
]

function rules(): Rule[] {
  return [
    {
      id: 'hotspot-paths',
      severity: 'high',
      title: 'High-impact path changes',
      score: 0,
      test(files) {
        const hits: { path: string; label: string; severity: Severity; score: number }[] = []
        for (const f of files) {
          for (const p of HOTSPOT_PATTERNS) {
            if (p.re.test(f.path)) {
              hits.push({ path: f.path, label: p.label, severity: p.severity, score: p.score })
              break
            }
          }
        }
        if (!hits.length) return { hit: false, files: [], detail: '' }
        return {
          hit: true,
          files: [...new Set(hits.map((h) => h.path))],
          detail: hits.map((h) => `${h.path} (${h.label})`).join('; '),
        }
      },
    },
    {
      id: 'missing-tests',
      severity: 'medium',
      title: 'Source changed without nearby tests',
      score: 12,
      test(files) {
        const source = files.filter(
          (f) => SOURCE_RE.test(f.path) && !TEST_FILE_RE.test(f.path) && !TEST_RE.test(f.path) && f.status !== 'D',
        )
        const tests = files.filter((f) => TEST_FILE_RE.test(f.path) || TEST_RE.test(f.path))
        if (!source.length) return { hit: false, files: [], detail: '' }
        if (tests.length) return { hit: false, files: [], detail: '' }
        return {
          hit: true,
          files: source.map((f) => f.path).slice(0, 12),
          detail: `${source.length} source file(s) changed and no test files appear in this diff.`,
        }
      },
    },
    {
      id: 'deleted-tests',
      severity: 'high',
      title: 'Tests deleted',
      score: 18,
      test(files) {
        const deleted = files.filter(
          (f) => f.status === 'D' && (TEST_FILE_RE.test(f.path) || TEST_RE.test(f.path)),
        )
        if (!deleted.length) return { hit: false, files: [], detail: '' }
        return {
          hit: true,
          files: deleted.map((f) => f.path),
          detail: `Removed ${deleted.length} test path(s). Confirm coverage still exists elsewhere.`,
        }
      },
    },
    {
      id: 'large-diff',
      severity: 'medium',
      title: 'Large diff surface',
      score: 10,
      test(files) {
        const churn = files.reduce((n, f) => n + f.additions + f.deletions, 0)
        const count = files.length
        if (churn < 400 && count < 25) return { hit: false, files: [], detail: '' }
        const severity: Severity = churn > 1200 || count > 60 ? 'high' : 'medium'
        return {
          hit: true,
          files: files
            .slice()
            .sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions))
            .slice(0, 8)
            .map((f) => f.path),
          detail: `${count} files · +${files.reduce((n, f) => n + f.additions, 0)}/−${files.reduce((n, f) => n + f.deletions, 0)} lines. Consider splitting the PR.`,
        }
      },
    },
    {
      id: 'lockfile-only-skew',
      severity: 'low',
      title: 'Lockfile changed without manifest',
      score: 6,
      test(files) {
        const lock = files.filter((f) =>
          /(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/i.test(f.path),
        )
        const manifest = files.some((f) => /package\.json$/i.test(f.path))
        if (!lock.length || manifest) return { hit: false, files: [], detail: '' }
        return {
          hit: true,
          files: lock.map((f) => f.path),
          detail: 'Lockfile churn without package.json — verify intentional dependency refresh.',
        }
      },
    },
    {
      id: 'secret-patterns',
      severity: 'critical',
      title: 'Possible secret material in diff',
      score: 40,
      test(files) {
        const hits: string[] = []
        const details: string[] = []
        for (const f of files) {
          if (!f.patch) continue
          // Only scan added lines
          const added = f.patch
            .split('\n')
            .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
            .map((l) => l.slice(1))
            .join('\n')
          for (const pat of SECRET_PATTERNS) {
            if (pat.re.test(added)) {
              hits.push(f.path)
              details.push(`${f.path}: ${pat.label}`)
              pat.re.lastIndex = 0
            }
          }
        }
        if (!hits.length) return { hit: false, files: [], detail: '' }
        return {
          hit: true,
          files: [...new Set(hits)],
          detail: `Pattern match (values redacted from report): ${[...new Set(details)].join('; ')}`,
        }
      },
    },
    {
      id: 'todo-fix',
      severity: 'low',
      title: 'TODO / FIXME introduced',
      score: 4,
      test(files) {
        const hits: string[] = []
        for (const f of files) {
          if (!f.patch) continue
          const added = f.patch
            .split('\n')
            .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
            .join('\n')
          if (/\b(TODO|FIXME|HACK|XXX)\b/.test(added)) hits.push(f.path)
        }
        if (!hits.length) return { hit: false, files: [], detail: '' }
        return {
          hit: true,
          files: hits,
          detail: 'New TODO/FIXME markers landed in this diff.',
        }
      },
    },
    {
      id: 'config-bypass',
      severity: 'high',
      title: 'Security config relaxed',
      score: 20,
      test(files) {
        const hits: string[] = []
        const cues =
          /\b(dangerouslySetInnerHTML|eslint-disable|CORS:\s*\*|Access-Control-Allow-Origin:\s*\*|verify\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*0|insecure|skipVerify)\b/i
        for (const f of files) {
          if (!f.patch) continue
          const added = f.patch
            .split('\n')
            .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
            .join('\n')
          if (cues.test(added)) hits.push(f.path)
        }
        if (!hits.length) return { hit: false, files: [], detail: '' }
        return {
          hit: true,
          files: hits,
          detail: 'Diff introduces patterns often used to bypass safety checks.',
        }
      },
    },
  ]
}

export function runRules(files: FileChange[]): Finding[] {
  const findings: Finding[] = []
  for (const rule of rules()) {
    const result = rule.test(files)
    if (!result.hit) continue

    let severity = rule.severity
    let score = rule.score

    // Hotspot rule: escalate from matched patterns
    if (rule.id === 'hotspot-paths') {
      let best = 0
      let bestSev: Severity = 'medium'
      for (const f of files) {
        for (const p of HOTSPOT_PATTERNS) {
          if (p.re.test(f.path) && p.score > best) {
            best = p.score
            bestSev = p.severity
          }
        }
      }
      score = best || 12
      severity = bestSev
    }

    if (rule.id === 'large-diff') {
      const churn = files.reduce((n, f) => n + f.additions + f.deletions, 0)
      severity = churn > 1200 || files.length > 60 ? 'high' : 'medium'
      score = severity === 'high' ? 18 : 10
    }

    findings.push({
      id: rule.id,
      severity,
      title: rule.title,
      detail: result.detail,
      files: result.files,
      score,
      source: 'heuristic',
    })
  }
  return findings.sort((a, b) => b.score - a.score)
}
