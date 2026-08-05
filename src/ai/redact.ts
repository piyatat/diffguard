/** Strip secret-shaped values before any payload leaves the process. */

const REPLACEMENTS: { re: RegExp; label: string }[] = [
  { re: /AKIA[0-9A-Z]{16}/g, label: '[REDACTED_AWS_KEY]' },
  { re: /gh[pousr]_[A-Za-z0-9_]{20,}/g, label: '[REDACTED_GITHUB_TOKEN]' },
  { re: /xox[baprs]-[A-Za-z0-9-]{10,}/g, label: '[REDACTED_SLACK_TOKEN]' },
  { re: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/g, label: '[REDACTED_PRIVATE_KEY]' },
  { re: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, label: '[REDACTED_JWT]' },
  {
    re: /((?:api[_-]?key|secret|token|password|passwd|pwd)\s*[:=]\s*['"])([^'"]{4,})(['"])/gi,
    label: '$1[REDACTED]$3',
  },
  {
    re: /(Bearer\s+)[A-Za-z0-9._\-+=/]{8,}/gi,
    label: '$1[REDACTED]',
  },
]

export function redactSecrets(text: string): string {
  let out = text
  for (const { re, label } of REPLACEMENTS) {
    out = out.replace(re, label)
    re.lastIndex = 0
  }
  return out
}

export function sanitizeErrorMessage(message: string): string {
  return redactSecrets(message)
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .replace(/api[_-]?key["']?\s*[:=]\s*["']?[\w.-]+/gi, 'api_key=[REDACTED]')
}
