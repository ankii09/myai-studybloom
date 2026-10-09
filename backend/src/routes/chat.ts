import { Router } from 'express'
import { generateChatResponse } from '../services/ai.js'
import { validateChatRequest } from '../middleware/validate.js'
import type { ChatRequest } from '../types/chat.js'
import { logError, logInfo } from '../utils/logger.js'

export const chatRouter = Router()

function getSafeProviderStatus(error: unknown): number {
  if (typeof error === 'object' && error !== null && 'statusCode' in error) {
    const statusCode = error.statusCode
    if (statusCode === 429) return 429
    if (statusCode === 408 || statusCode === 504) return 504
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    if (error.code === 'service_unavailable' || error.code === 'overloaded') return 503
    if (error.code === 'rate_limit_exceeded' || error.code === 'RESOURCE_EXHAUSTED') return 429
  }

  if (error instanceof Error && /timeout/i.test(error.name)) return 504
  return 502
}

function getSafeProviderMessage(statusCode: number): string {
  if (statusCode === 429) return 'Gemini API rate limit or quota reached. Wait a little and try again, or check your Google AI Studio quota.'
  if (statusCode === 503) return 'Gemini is temporarily busy. Please try again shortly.'
  if (statusCode === 504) return 'Gemini took too long to respond. Please try again.'
  return 'Something went wrong. Please try again.'
}

chatRouter.post('/api/chat', validateChatRequest, async (req, res) => {
  const request = req.body as ChatRequest
  const sanitizedMessages = request.messages.map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }))
  const abortController = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) abortController.abort()
  })

  try {
    const encoder = new TextEncoder()
    let streamed = false

    for await (const chunk of generateChatResponse(sanitizedMessages, abortController.signal)) {
      if (!streamed) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        streamed = true
      }

      if (!res.write(encoder.encode(chunk))) {
        await new Promise<void>((resolve) => res.once('drain', resolve))
      }
    }

    if (!streamed) {
      return res.status(502).json({ error: 'The AI service returned an empty response. Please try again.' })
    }

    res.end()
  } catch (error) {
    if (abortController.signal.aborted) return

    const errorName = error instanceof Error ? error.name : 'UnknownError'
    logError(`chat request failed: ${errorName}`)
    if (res.headersSent) {
      res.end('\n\nSomething went wrong. Please try again.')
    } else {
      const statusCode = getSafeProviderStatus(error)
      res.status(statusCode).json({ error: getSafeProviderMessage(statusCode) })
    }
  }
})

chatRouter.get('/api/chat', (_req, res) => {
  logInfo('Chat endpoint was hit with a GET request.')
  res.status(405).json({ error: 'Use POST /api/chat to send messages.' })
})
