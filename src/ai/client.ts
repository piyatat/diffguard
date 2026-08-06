import { sanitizeErrorMessage } from './redact.js'

export type AiProvider = 'ollama' | 'openai'

export type AiConfig = {
  provider: AiProvider
  baseUrl: string
  model: string
  apiKey?: string
  timeoutMs: number
}

export function resolveAiConfig(
  overrides: {
    provider?: string
    model?: string
    baseUrl?: string
    apiKey?: string
    timeoutMs?: number
  } = {},
): AiConfig {
  const providerRaw = (
    overrides.provider ||
    process.env.DIFFGUARD_AI_PROVIDER ||
    'ollama'
  ).toLowerCase()

  if (providerRaw !== 'ollama' && providerRaw !== 'openai') {
    throw new Error(`Unknown AI provider: ${providerRaw}. Use ollama or openai.`)
  }
  const provider: AiProvider = providerRaw

  const defaultBase =
    provider === 'ollama' ? 'http://127.0.0.1:11434' : 'https://api.openai.com/v1'
  const defaultModel = provider === 'ollama' ? 'llama3.2' : 'gpt-4o-mini'

  const apiKey =
    overrides.apiKey ||
    process.env.DIFFGUARD_AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    undefined

  return {
    provider,
    baseUrl: trimSlash(
      overrides.baseUrl || process.env.DIFFGUARD_AI_BASE_URL || defaultBase,
    ),
    model: overrides.model || process.env.DIFFGUARD_AI_MODEL || defaultModel,
    apiKey,
    timeoutMs:
      overrides.timeoutMs ??
      (Number(process.env.DIFFGUARD_AI_TIMEOUT_MS) > 0
        ? Number(process.env.DIFFGUARD_AI_TIMEOUT_MS)
        : 120_000),
  }
}

export async function chatCompletion(config: AiConfig, prompt: string): Promise<string> {
  if (config.provider === 'ollama') {
    return ollamaChat(config, prompt)
  }
  return openaiChat(config, prompt)
}

async function ollamaChat(config: AiConfig, prompt: string): Promise<string> {
  const url = `${config.baseUrl}/api/chat`
  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        format: 'json',
        messages: [
          {
            role: 'system',
            content: 'You are Diffguard AI. Reply with JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        options: { temperature: 0.1 },
      }),
    },
    config.timeoutMs,
  )

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await safeBody(res)}`)
  }

  const data = (await res.json()) as { message?: { content?: string }; error?: string }
  if (data.error) throw new Error(`Ollama error: ${data.error}`)
  const content = data.message?.content?.trim()
  if (!content) throw new Error('Ollama returned an empty response')
  return content
}

function isLoopbackBaseUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return host === '127.0.0.1' || host === 'localhost' || host === '[::1]' || host === '::1'
  } catch {
    return false
  }
}

async function openaiChat(config: AiConfig, prompt: string): Promise<string> {
  // Local OpenAI-compatible servers (LM Studio, etc.) often need no key.
  // Hosted endpoints still require one so we never send unauthenticated remote calls by accident.
  if (!config.apiKey && !isLoopbackBaseUrl(config.baseUrl)) {
    throw new Error(
      'OpenAI-compatible provider requires DIFFGUARD_AI_API_KEY or OPENAI_API_KEY (never commit keys).',
    )
  }

  const url = `${config.baseUrl}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`
  }

  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are Diffguard AI. Reply with JSON only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    },
    config.timeoutMs,
  )

  if (!res.ok) {
    throw new Error(`OpenAI-compatible error ${res.status}: ${await safeBody(res)}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }
  if (data.error?.message) throw new Error(`OpenAI-compatible error: ${data.error.message}`)
  const content = data.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('OpenAI-compatible provider returned an empty response')
  return content
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('abort')) {
      throw new Error(`AI request timed out after ${timeoutMs}ms`)
    }
    throw new Error(sanitizeErrorMessage(msg))
  } finally {
    clearTimeout(timer)
  }
}

async function safeBody(res: Response): Promise<string> {
  try {
    const text = await res.text()
    return sanitizeErrorMessage(text).slice(0, 400)
  } catch {
    return '(unreadable body)'
  }
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '')
}
