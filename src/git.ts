import { execFileSync } from 'node:child_process'

export function git(args: string[], cwd: string): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 32 * 1024 * 1024,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`git ${args.join(' ')} failed: ${message}`)
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
  if (requested) return requested

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
