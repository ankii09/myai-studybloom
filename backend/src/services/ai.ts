import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env.js'
import type { ChatMessage } from '../types/chat.js'

const google = new GoogleGenAI({ apiKey: env.aiApiKey })

export const DEFAULT_SYSTEM_PROMPT = `You are My AI, a helpful personal AI assistant.
Give clear, accurate and useful answers.
If you are uncertain, say so.
Do not invent facts.
Be concise unless the user requests more detail.`

function getTemporaryProviderStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null) {
    if ('statusCode' in error) {
      const statusCode = error.statusCode
      if (statusCode === 429 || statusCode === 503 || statusCode === 504) return statusCode
    }
    if ('status' in error) {
      const status = error.status
      if (status === 429 || status === 503 || status === 504) return status
    }
    if ('lastError' in error) return getTemporaryProviderStatus(error.lastError)
  }

  if (typeof error === 'object' && error !== null && 'code' in error) {
    if (error.code === 'service_unavailable' || error.code === 'overloaded') return 503
    if (error.code === 'rate_limit_exceeded' || error.code === 'RESOURCE_EXHAUSTED') return 429
  }

  return 0
}

async function* createFallbackResponse(
  messages: ChatMessage[],
  abortSignal?: AbortSignal,
  reason?: string,
): AsyncGenerator<string> {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? 'Hello'
  const messageReason = reason ?? 'In this local setup, the configured AI provider is not available yet, so I’m returning a safe demo response while you wire in a valid key.'
  const draft = `Hello! I’m ready to help. You said: “${latestUserMessage.trim()}”\n\n${messageReason}`
  const chunks = draft.split(/(?=\s|$)/u).filter(Boolean)

  for (const chunk of chunks) {
    if (abortSignal?.aborted) return
    yield chunk
    await new Promise<void>((resolve) => setTimeout(resolve, 25))
  }
}

export async function* generateChatResponse(messages: ChatMessage[], abortSignal?: AbortSignal): AsyncGenerator<string> {
  if (!env.aiApiKey.trim()) {
    yield* createFallbackResponse(messages, abortSignal)
    return
  }

  const systemPrompt = [
    DEFAULT_SYSTEM_PROMPT,
    ...messages.filter((message) => message.role === 'system').map((message) => message.content),
  ].join('\n\n')
  const conversation = messages
    .filter((message) => message.role !== 'system')
    .map((message) => `${message.role === 'assistant' ? 'Assistant' : 'User'}: ${message.content}`)
    .join('\n\n')

  try {
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), 20_000)
    const combinedSignal = abortSignal ? AbortSignal.any([abortSignal, timeoutController.signal]) : timeoutController.signal

    try {
      const stream = await google.interactions.create(
        {
          model: env.aiModel,
          input: `${conversation}\n\nAssistant:`,
          system_instruction: systemPrompt,
          stream: true,
          store: false,
        },
        { timeout_ms: 20_000, maxRetries: 1, signal: combinedSignal },
      )

      for await (const event of stream) {
        if (abortSignal?.aborted || combinedSignal.aborted) return
        if (event.event_type === 'error') {
          throw new Error(event.error?.message ?? 'Gemini returned an unspecified error.')
        }
        if (event.event_type === 'step.delta' && event.delta.type === 'text') {
          yield event.delta.text
        }
      }
    } finally {
      clearTimeout(timeoutId)
    }
  } catch (error) {
    const providerStatus = getTemporaryProviderStatus(error)
    if (providerStatus === 429 || providerStatus === 503 || providerStatus === 504) {
      const reason = `The Gemini API is temporarily unavailable (status ${providerStatus}). I’m returning a safe local reply while the service recovers.`
      yield* createFallbackResponse(messages, abortSignal, reason)
      return
    }

    if (error instanceof Error && /timeout|aborted|abort/i.test(error.message)) {
      yield* createFallbackResponse(messages, abortSignal, 'The AI request timed out, so I’m returning a safe local reply while the service recovers.')
      return
    }

    throw error
  }
}
