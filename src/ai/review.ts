import { gradeFromScore, scoreFromFindings } from '../analyze.js'
import type { Analysis } from '../types.js'
import { chatCompletion, resolveAiConfig } from './client.js'
import { buildAiPrompt, findingsFromAi } from './prompt.js'
import { redactSecrets, sanitizeErrorMessage } from './redact.js'

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1))
    }
    throw new Error('Model response was not valid JSON')
  }
}

export async function enrichWithAi(
  analysis: Analysis,
  overrides: {
    provider?: string
    model?: string
    baseUrl?: string
    apiKey?: string
    timeoutMs?: number
  } = {},
): Promise<Analysis> {
  const config = resolveAiConfig(overrides)
  const prompt = buildAiPrompt(analysis)

  let content: string
  try {
    content = await chatCompletion(config, prompt)
  } catch (err) {
    const message = sanitizeErrorMessage(err instanceof Error ? err.message : String(err))
    return {
      ...analysis,
      ai: {
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
        summary: `AI review skipped: ${message}`,
        questions: [],
        riskDelta: 0,
      },
    }
  }

  let parsed: ReturnType<typeof findingsFromAi>
  try {
    parsed = findingsFromAi(extractJson(content))
  } catch (err) {
    const message = sanitizeErrorMessage(err instanceof Error ? err.message : String(err))
    return {
      ...analysis,
      ai: {
        provider: config.provider,
        model: config.model,
        baseUrl: config.baseUrl,
        summary: `AI review parse error: ${message}`,
        questions: [],
        riskDelta: 0,
        raw: redactSecrets(content).slice(0, 2000),
      },
    }
  }

  const findings = [...analysis.findings, ...parsed.findings].sort((a, b) => b.score - a.score)
  const score = scoreFromFindings(findings, parsed.riskDelta)

  return {
    ...analysis,
    findings,
    score,
    grade: gradeFromScore(score),
    summary: parsed.summary || analysis.summary,
    ai: {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      summary: parsed.summary,
      questions: parsed.questions,
      riskDelta: parsed.riskDelta,
    },
  }
}

/** Write a portable prompt for Cursor / Claude / any agent without calling an API. */
export function exportAgentPrompt(analysis: Analysis): string {
  return buildAiPrompt(analysis)
}
