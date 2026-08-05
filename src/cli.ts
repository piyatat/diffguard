#!/usr/bin/env node
import { analyze, maxSeverity } from './analyze.js'
import { collectChanges } from './diff.js'
import { getHead, isGitRepo, resolveBase } from './git.js'
import { formatJson, formatText } from './report.js'
import type { Severity } from './types.js'

type Args = {
  base?: string
  cwd: string
  json: boolean
  color: boolean
  unstaged: boolean
  failOn: Severity | null
  help: boolean
}

const SEV_RANK: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    cwd: process.cwd(),
    json: false,
    color: Boolean(process.stdout.isTTY),
    unstaged: false,
    failOn: null,
    help: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--help' || a === '-h') args.help = true
    else if (a === '--json') args.json = true
    else if (a === '--no-color') args.color = false
    else if (a === '--unstaged') args.unstaged = true
    else if (a === '--base' || a === '-b') args.base = argv[++i]
    else if (a === '--cwd') args.cwd = argv[++i] ?? args.cwd
    else if (a === '--fail-on') {
      const v = (argv[++i] ?? '').toLowerCase() as Severity
      if (!(v in SEV_RANK)) {
        throw new Error(`Invalid --fail-on value: ${v}. Use low|medium|high|critical.`)
      }
      args.failOn = v
    } else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}`)
    }
  }
  return args
}

function helpText(): string {
  return `
diffguard — local-first PR risk scanner

Usage:
  diffguard [options]

Options:
  -b, --base <ref>     Diff base (default: origin/main, then main/master)
      --cwd <path>     Repository path (default: cwd)
      --json           Machine-readable output
      --fail-on <sev>  Exit 1 if any finding >= severity (low|medium|high|critical)
      --unstaged       Also list untracked/unstaged dirty files
      --no-color       Disable ANSI colors
  -h, --help           Show help

Examples:
  diffguard
  diffguard --base origin/main --fail-on high
  diffguard --json > report.json
`.trim()
}

function shouldFail(failOn: Severity, findingsSeverity: Severity | null): boolean {
  if (!findingsSeverity) return false
  return SEV_RANK[findingsSeverity] >= SEV_RANK[failOn]
}

async function main(): Promise<void> {
  let args: Args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 2
    return
  }

  if (args.help) {
    console.log(helpText())
    return
  }

  if (!isGitRepo(args.cwd)) {
    console.error('Not a git repository. Run inside a repo or pass --cwd.')
    process.exitCode = 2
    return
  }

  let base: string
  try {
    base = resolveBase(args.cwd, args.base)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 2
    return
  }

  const head = getHead(args.cwd)
  const { base: effectiveBase, files } = collectChanges(args.cwd, base, args.unstaged)
  const result = analyze({ base: effectiveBase, head, files })

  if (args.json) console.log(formatJson(result))
  else console.log(formatText(result, args.color))

  if (args.failOn && shouldFail(args.failOn, maxSeverity(result.findings))) {
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
