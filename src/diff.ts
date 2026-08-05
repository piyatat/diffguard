import type { FileChange } from './types.js'
import { git } from './git.js'

function parseNumstat(line: string): { additions: number; deletions: number; path: string } | null {
  const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/)
  if (!match) return null
  const additions = match[1] === '-' ? 0 : Number(match[1])
  const deletions = match[2] === '-' ? 0 : Number(match[2])
  let path = match[3]!
  // renames: old => new
  if (path.includes('=>')) {
    const parts = path.split('=>')
    path = parts[parts.length - 1]!.trim().replace(/[{}]/g, '')
  }
  return { additions, deletions, path }
}

export function collectChanges(
  cwd: string,
  requestedBase: string,
  includeUnstaged: boolean,
): { base: string; files: FileChange[] } {
  let base = requestedBase
  let range = `${base}...HEAD`
  let nameStatus = git(['diff', '--name-status', '--find-renames', range], cwd)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  // On the default branch after merging, base...HEAD is empty — review the tip commit instead.
  if (!nameStatus.length) {
    try {
      git(['rev-parse', '--verify', 'HEAD~1'], cwd)
      const tipRange = 'HEAD~1...HEAD'
      const tipStatus = git(['diff', '--name-status', '--find-renames', tipRange], cwd)
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
      if (tipStatus.length) {
        base = 'HEAD~1'
        range = tipRange
        nameStatus = tipStatus
      }
    } catch {
      // single-commit repo
    }
  }

  const numstat = git(['diff', '--numstat', '--find-renames', range], cwd)
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const stats = new Map<string, { additions: number; deletions: number }>()
  for (const line of numstat) {
    const parsed = parseNumstat(line)
    if (parsed) stats.set(parsed.path, parsed)
  }

  const files: FileChange[] = []
  for (const line of nameStatus) {
    const status = line[0] as FileChange['status']
    const rest = line.slice(1).trim()
    let path = rest
    if (status === 'R' || status === 'C') {
      const parts = rest.split(/\s+/)
      path = parts[parts.length - 1]!
    }
    const s = stats.get(path) ?? { additions: 0, deletions: 0 }
    files.push({
      path,
      status,
      additions: s.additions,
      deletions: s.deletions,
    })
  }

  if (includeUnstaged) {
    const dirty = git(['status', '--porcelain', '-uall'], cwd)
      .split('\n')
      .map((l) => l.trimEnd())
      .filter(Boolean)
    for (const line of dirty) {
      const code = line.slice(0, 2)
      const path = line.slice(3).trim()
      if (!path || files.some((f) => f.path === path)) continue
      files.push({
        path,
        status: code.includes('?') ? '?' : 'M',
        additions: 0,
        deletions: 0,
      })
    }
  }

  // Attach patches for text files (capped)
  for (const file of files) {
    if (file.status === 'D' || file.status === '?') continue
    if (looksBinary(file.path)) continue
    try {
      const patch = git(['diff', '--unified=0', '--find-renames', range, '--', file.path], cwd)
      if (patch.length > 0 && patch.length < 200_000) {
        file.patch = patch
      }
    } catch {
      // ignore binary / missing
    }
  }

  return { base, files }
}

function looksBinary(path: string): boolean {
  return /\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|tgz|woff2?|mp4|webm|jar|exe|dll|so|dylib|bin)$/i.test(
    path,
  )
}
