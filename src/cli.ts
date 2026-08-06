#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { enrichWithAi, exportAgentPrompt } from './ai/review.js'
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
  version: boolean
  ai: boolean
  aiProvider?: string
  aiModel?: string
  aiBaseUrl?: string
  aiPrompt: boolean
}

function packageVersion(): string {
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version?: string }
    if (typeof pkg.version === 'string' && pkg.version.trim()) return pkg.version.trim()
  } catch {
    // missing/unreadable package.json — fall through
  }
  return '0.0.0'
}

function assertCwd(cwd: string): string {
  const resolved = resolve(cwd)
  if (!existsSync(resolved)) {
    throw new Error(`Path not found: ${resolved}`)
  }
  try {
    if (!statSync(resolved).isDirectory()) {
      throw new Error(`Not a directory: ${resolved}`)
    }
  } catch (err) {
    if (err instanceof Error && (err.message.startsWith('Not a directory') || err.message.startsWith('Path not found'))) {
      throw err
    }
    throw new Error(`Cannot access path: ${resolved}`)
  }
  return resolved
}

const SEV_RANK: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

function defaultColor(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.NO_COLOR
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    cwd: process.cwd(),
    json: false,
    color: defaultColor(),
    unstaged: false,
    failOn: null,
    help: false,
    version: false,
    ai: false,
    aiPrompt: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--help' || a === '-h') args.help = true
    else if (a === '--version' || a === '-V') args.version = true
    else if (a === '--json') args.json = true
    else if (a === '--color') args.color = true
    else if (a === '--no-color') args.color = false
    else if (a === '--unstaged') args.unstaged = true
    else if (a === '--ai') args.ai = true
    else if (a === '--ai-prompt') args.aiPrompt = true
    else if (a === '--base' || a === '-b') {
      const v = argv[++i]
      if (v === undefined || !String(v).trim()) {
        throw new Error('Missing --base value. Pass a git ref (e.g. origin/main).\nTry: diffguard --help')
      }
      args.base = String(v).trim()
    }
    else if (a === '--cwd') {
      const v = argv[++i]
      if (v === undefined || !String(v).trim()) {
        throw new Error('Missing --cwd value.\nTry: diffguard --help')
      }
      args.cwd = String(v).trim()
    }
    else if (a === '--ai-provider') {
      const v = (argv[++i] ?? '').toLowerCase()
      if (v !== 'ollama' && v !== 'openai') {
        throw new Error(`Invalid --ai-provider value: ${v || '(empty)'}. Use ollama|openai.\nTry: diffguard --help`)
      }
      args.aiProvider = v
    }
    else if (a === '--ai-model') args.aiModel = argv[++i]
    else if (a === '--ai-base-url') args.aiBaseUrl = argv[++i]
    else if (a === '--fail-on') {
      const v = (argv[++i] ?? '').toLowerCase() as Severity
      if (!(v in SEV_RANK)) {
        throw new Error(`Invalid --fail-on value: ${v}. Use low|medium|high|critical.\nTry: diffguard --help`)
      }
      args.failOn = v
    } else if (a.startsWith('-')) {
      throw new Error(`Unknown flag: ${a}\nTry: diffguard --help`)
    }
  }
  return args
}

function helpText(): string {
  return `
diffguard ${packageVersion()} — local-first PR risk scanner

Usage:
  diffguard [options]

Options:
  -b, --base <ref>        Diff base (default: origin/main, then main/master)
                          Empty values are rejected (exit 2)
      --cwd <path>        Repository path (default: cwd; empty rejected)
      --json              Machine-readable output (CI / scripts)
      --fail-on <sev>     Exit 1 if any finding >= severity
                          Values: low | medium | high | critical
                          Order: info < low < medium < high < critical
      --unstaged          Also list untracked/unstaged dirty files
      --color             Force ANSI colors (overrides NO_COLOR)
      --no-color          Disable ANSI colors
      --ai                Enrich scan with a local LLM or OpenAI-compatible API
      --ai-provider <p>   ollama (default) | openai
      --ai-model <name>   Model id (default: llama3.2 / gpt-4o-mini)
      --ai-base-url <url> Override endpoint (Ollama, LM Studio, OpenAI, …)
      --ai-prompt         Print a redacted agent prompt (no API call)
  -V, --version           Print version and exit
  -h, --help              Show this help

Env (optional):
  NO_COLOR                Disable ANSI colors when set
  DIFFGUARD_AI_PROVIDER   ollama | openai
  DIFFGUARD_AI_MODEL      model name
  DIFFGUARD_AI_BASE_URL   endpoint base URL
  DIFFGUARD_AI_API_KEY    API key for openai-compatible providers
  OPENAI_API_KEY          fallback key (never commit keys)
  DIFFGUARD_AI_TIMEOUT_MS Request timeout in ms (default 120000)

Exit codes:
  0  ok (including clean diffs with no findings)
  1  failed --fail-on severity gate
  2  usage / git error (missing flags, not a repo, bad refs)

Examples:
  # Quick scan of this checkout
  diffguard

  # CI gate against origin/main
  diffguard --base origin/main --fail-on high --no-color

  # JSON for pipelines
  diffguard --json > report.json

  # Local Ollama second pass
  diffguard --ai

  # LM Studio / OpenAI-compatible local server
  diffguard --ai --ai-provider openai \\
    --ai-base-url http://127.0.0.1:1234/v1 --ai-model local-model

  # Redacted brief for Cursor / Claude (no API call)
  diffguard --ai-prompt > review.prompt.md

  # Scan another checkout
  diffguard --cwd ~/code/other-repo --fail-on medium
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

  if (args.version) {
    console.log(`diffguard ${packageVersion()}`)
    return
  }

  try {
    args.cwd = assertCwd(args.cwd)
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 2
    return
  }

  if (!isGitRepo(args.cwd)) {
    console.error(
      'Not a git repository.\n' +
        'Run inside a checkout, or pass --cwd /path/to/repo.\n' +
        'Try: diffguard --help',
    )
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
  let result = analyze({ base: effectiveBase, head, files })

  if (args.aiPrompt) {
    process.stdout.write(`${exportAgentPrompt(result)}\n`)
    return
  }

  if (args.ai) {
    if (!args.json && args.color) {
      process.stderr.write('diffguard · asking AI reviewer…\n')
    }
    result = await enrichWithAi(result, {
      provider: args.aiProvider,
      model: args.aiModel,
      baseUrl: args.aiBaseUrl,
    })
  }

  if (args.json) console.log(formatJson(result))
  else console.log(formatText(result, args.color))

  const max = maxSeverity(result.findings)
  if (args.failOn && shouldFail(args.failOn, max)) {
    console.error(
      `diffguard: failed --fail-on ${args.failOn} (max finding: ${max ?? 'none'})`,
    )
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
