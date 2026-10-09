import type { NextFunction, Request, Response } from 'express'
import { ZodError, z } from 'zod'

const MAX_MESSAGES = 30
const MAX_MESSAGE_LENGTH = 4000
const MAX_REQUEST_BYTES = 1024 * 1024

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
})

export const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(MAX_MESSAGES),
}).strict()

export function validateChatRequest(req: Request, res: Response, next: NextFunction) {
  const contentLength = Number(req.headers['content-length'] ?? 0)
  if (contentLength > MAX_REQUEST_BYTES) {
    return res.status(413).json({ error: 'Request body is too large.' })
  }

  try {
    const result = chatRequestSchema.parse(req.body)
    req.body = result
    next()
  } catch (error) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]
      return res.status(400).json({
        error: firstIssue?.message ?? 'Invalid request payload.',
      })
    }

    return res.status(500).json({ error: 'Something went wrong while validating the request.' })
  }
}
