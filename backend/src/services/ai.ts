import { streamText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { env } from '../config/env.js'
import type { ChatMessage } from '../types/chat.js'

const google = createGoogleGenerativeAI({ apiKey: env.aiApiKey })

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
    .map((message) => ({ role: message.role, content: message.content }))

  const result = streamText({
    model: google(env.aiModel),
    system: systemPrompt,
    messages: conversation,
    temperature: 0.7,
    abortSignal,
    onError: () => undefined,
  })

  for await (const part of result.stream) {
    if (part.type === 'error') throw part.error
    if (part.type === 'text-delta') yield part.text
  }
}
