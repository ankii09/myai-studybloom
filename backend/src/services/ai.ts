import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env.js'
import type { ChatMessage } from '../types/chat.js'

export const DEFAULT_SYSTEM_PROMPT = `You are My AI, a helpful personal AI assistant.
Give clear, accurate and useful answers in complete sentences.
If you are uncertain, say so.
Do not invent facts.
Do not reply with a single word unless the user clearly asked for that.
Be concise unless the user requests more detail.`

export class AiServiceError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 502) {
    super(message)
    this.name = 'AiServiceError'
    this.statusCode = statusCode
  }
}

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

type GeminiContent = {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}

function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = []

  for (const message of messages) {
    if (message.role === 'system') continue
    const role = message.role === 'assistant' ? 'model' : 'user'
    const last = contents[contents.length - 1]
    if (last?.role === role) {
      last.parts[0].text += `\n\n${message.content}`
    } else {
      contents.push({ role, parts: [{ text: message.content }] })
    }
  }

  if (contents[0]?.role === 'model') {
    contents.unshift({ role: 'user', parts: [{ text: 'Hello' }] })
  }

  return contents
}

function extractChunkText(chunk: unknown): string {
  if (typeof chunk !== 'object' || chunk === null) return ''

  const candidate = (chunk as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>
  }).candidates?.[0]?.content?.parts

  if (Array.isArray(candidate)) {
    return candidate
      .filter((part) => !part.thought && typeof part.text === 'string')
      .map((part) => part.text ?? '')
      .join('')
  }

  const text = (chunk as { text?: unknown }).text
  return typeof text === 'string' ? text : ''
}

function buildGenerateConfig(systemPrompt: string, abortSignal?: AbortSignal) {
  return {
    systemInstruction: systemPrompt,
    maxOutputTokens: 2048,
    temperature: 0.7,
    ...(abortSignal ? { abortSignal } : {}),
  }
}

let googleClient: GoogleGenAI | null = null

function getGoogleClient(): GoogleGenAI {
  if (!googleClient) {
    googleClient = new GoogleGenAI({ apiKey: env.aiApiKey })
  }
  return googleClient
}

async function* streamModelReply(
  contents: GeminiContent[],
  systemPrompt: string,
  abortSignal?: AbortSignal,
): AsyncGenerator<string> {
  const stream = await getGoogleClient().models.generateContentStream({
    model: env.aiModel,
    contents,
    config: buildGenerateConfig(systemPrompt, abortSignal),
  })

  for await (const chunk of stream) {
    if (abortSignal?.aborted) return
    const text = extractChunkText(chunk)
    if (text) yield text
  }
}

export async function* generateChatResponse(messages: ChatMessage[], abortSignal?: AbortSignal): AsyncGenerator<string> {
  if (!env.aiApiKey) {
    throw new AiServiceError('AI_API_KEY is missing. Add it in Vercel Environment Variables (or backend/.env locally).', 500)
  }

  const systemPrompt = [
    DEFAULT_SYSTEM_PROMPT,
    ...messages.filter((message) => message.role === 'system').map((message) => message.content),
  ].join('\n\n')
  const contents = toGeminiContents(messages)

  if (contents.length === 0) {
    throw new AiServiceError('Send at least one user message.', 400)
  }

  try {
    let streamed = false
    for await (const text of streamModelReply(contents, systemPrompt, abortSignal)) {
      streamed = true
      yield text
    }

    if (!streamed) {
      throw new AiServiceError('The AI service returned an empty response. Please try again.', 502)
    }
  } catch (error) {
    if (error instanceof AiServiceError) throw error
    if (abortSignal?.aborted) return

    const providerStatus = getTemporaryProviderStatus(error)
    if (providerStatus === 429) {
      throw new AiServiceError('Gemini API rate limit or quota reached. Wait a little and try again, or check your Google AI Studio quota.', 429)
    }
    if (providerStatus === 503 || providerStatus === 504) {
      throw new AiServiceError('Gemini is temporarily busy. Please try again shortly.', providerStatus)
    }
    if (error instanceof Error && /timeout|aborted|abort/i.test(error.message)) {
      throw new AiServiceError('Gemini took too long to respond. Please try again.', 504)
    }

    const detail = error instanceof Error ? error.message : 'Unknown AI provider error'
    throw new AiServiceError(`Gemini rejected the request. Check AI_API_KEY and AI_MODEL (${env.aiModel}). ${detail}`, 400)
  }
}
