import { execFileSync } from 'node:child_process'
import { sanitizeErrorMessage } from './ai/redact.js'

function execErrorDetail(err: unknown): string {
  const e = err as { stderr?: string | Buffer; stdout?: string | Buffer; message?: string }
  const stderr = typeof e.stderr === 'string' ? e.stderr : e.stderr?.toString('utf8') ?? ''
  const stdout = typeof e.stdout === 'string' ? e.stdout : e.stdout?.toString('utf8') ?? ''
  const detail = (stderr || stdout || e.message || String(err)).trim()
  return sanitizeErrorMessage(detail)
}

export function git(args: string[], cwd: string): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    })
  } catch (err) {
    throw new Error(`git ${args.join(' ')} failed: ${execErrorDetail(err)}`)
  }
}

export function isGitRepo(cwd: string): boolean {
  try {
    git(['rev-parse', '--is-inside-work-tree'], cwd)
    return true
  } catch {
    return false
  }
}

export function resolveBase(cwd: string, requested?: string): string {
  if (requested) {
    try {
      git(['rev-parse', '--verify', requested], cwd)
      return requested
    } catch {
      throw new Error(
        `Unknown base ref: ${requested}. Pass a valid --base <ref> (e.g. origin/main, main, HEAD~1).`,
      )
    }
  }

  for (const candidate of ['origin/main', 'origin/master', 'main', 'master']) {
    try {
      git(['rev-parse', '--verify', candidate], cwd)
      return candidate
    } catch {
      // try next
    }
  }

  // Fall back to previous commit if this is a tiny repo
  try {
    git(['rev-parse', '--verify', 'HEAD~1'], cwd)
    return 'HEAD~1'
  } catch {
    throw new Error(
      'Could not find a base branch (tried origin/main, main, master). Pass --base <ref>.',
    )
  }
}

export function getHead(cwd: string): string {
  try {
    return git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd).trim()
  } catch {
    return 'HEAD'
  }
}
