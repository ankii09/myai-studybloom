import { GoogleGenAI } from '@google/genai'
import { env } from '../config/env.js'
import type { ChatMessage } from '../types/chat.js'

const google = new GoogleGenAI({ apiKey: env.aiApiKey })

export const DEFAULT_SYSTEM_PROMPT = `You are My AI, a helpful personal AI assistant.
Give clear, accurate and useful answers.
If you are uncertain, say so.
Do not invent facts.
Be concise unless the user requests more detail.`

async function* createFallbackResponse(messages: ChatMessage[], abortSignal?: AbortSignal): AsyncGenerator<string> {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user')?.content ?? 'Hello'
  const draft = `Hello! I’m ready to help. You said: “${latestUserMessage.trim()}”\n\nIn this local setup, the configured AI provider is not available yet, so I’m returning a safe demo response while you wire in a valid key.`
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

  const stream = await google.interactions.create(
    {
      model: env.aiModel,
      input: `${conversation}\n\nAssistant:`,
      system_instruction: systemPrompt,
      stream: true,
      store: false,
    },
    { timeout_ms: 25_000, maxRetries: 2, signal: abortSignal },
  )

  for await (const event of stream) {
    if (event.event_type === 'error') {
      throw new Error(event.error?.message ?? 'Gemini returned an unspecified error.')
    }
    if (event.event_type === 'step.delta' && event.delta.type === 'text') {
      yield event.delta.text
    }
  }
}
