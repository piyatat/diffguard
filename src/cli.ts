#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
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
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string }
  return pkg.version
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
    else if (a === '--base' || a === '-b') args.base = argv[++i]
    else if (a === '--cwd') args.cwd = argv[++i] ?? args.cwd
    else if (a === '--ai-provider') {
      const v = (argv[++i] ?? '').toLowerCase()
      if (v !== 'ollama' && v !== 'openai') {
        throw new Error(`Invalid --ai-provider value: ${v || '(empty)'}. Use ollama|openai.`)
      }
      args.aiProvider = v
    }
    else if (a === '--ai-model') args.aiModel = argv[++i]
    else if (a === '--ai-base-url') args.aiBaseUrl = argv[++i]
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
  -b, --base <ref>        Diff base (default: origin/main, then main/master)
      --cwd <path>        Repository path (default: cwd)
      --json              Machine-readable output
      --fail-on <sev>     Exit 1 if any finding >= severity (low|medium|high|critical)
      --unstaged          Also list untracked/unstaged dirty files
      --color             Force ANSI colors (overrides NO_COLOR)
      --no-color          Disable ANSI colors
      --ai                Enrich scan with a local LLM or OpenAI-compatible API
      --ai-provider <p>   ollama (default) | openai
      --ai-model <name>   Model id (default: llama3.2 / gpt-4o-mini)
      --ai-base-url <url> Override endpoint (Ollama, LM Studio, OpenAI, …)
      --ai-prompt         Print a redacted agent prompt (no API call) for Cursor/Claude/etc.
  -V, --version           Print version and exit
  -h, --help              Show help

Env (optional):
  NO_COLOR                Disable ANSI colors when set
  DIFFGUARD_AI_PROVIDER   ollama | openai
  DIFFGUARD_AI_MODEL      model name
  DIFFGUARD_AI_BASE_URL   endpoint base URL
  DIFFGUARD_AI_API_KEY    API key for openai-compatible providers
  OPENAI_API_KEY          fallback key (never commit keys)
  DIFFGUARD_AI_TIMEOUT_MS Request timeout in ms (default 120000)

Exit codes:
  0  ok
  1  failed --fail-on severity gate
  2  usage / git error

Examples:
  diffguard
  diffguard --ai                          # local Ollama
  diffguard --ai --ai-provider openai
  diffguard --ai --ai-base-url http://127.0.0.1:1234/v1 --ai-provider openai --ai-model local-model
  diffguard --ai-prompt > review.prompt.md
  diffguard --base origin/main --fail-on high
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
