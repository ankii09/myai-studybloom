import type { IncomingMessage, ServerResponse } from 'node:http'
import { chatRequestSchema } from '../backend/src/middleware/validate.js'
import { getCorsOrigin } from '../backend/src/config/origins.js'
import { AiServiceError, generateChatResponse } from '../backend/src/services/ai.js'

export const config = {
  maxDuration: 60,
}

function applyCors(req: IncomingMessage, res: ServerResponse) {
  const origin = getCorsOrigin(req.headers.origin)
  if (origin === true) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const alreadyParsed = (req as IncomingMessage & { body?: unknown }).body
  if (alreadyParsed !== undefined) return Promise.resolve(alreadyParsed)

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      } catch {
        reject(new Error('Invalid JSON body.'))
      }
    })
    req.on('error', reject)
  })
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  applyCors(req, res)

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Use POST /api/chat to send messages.' }))
    return
  }

  let body: unknown
  try {
    body = await readJsonBody(req)
  } catch {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: 'Invalid JSON body.' }))
    return
  }

  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: parsed.error.issues[0]?.message ?? 'Invalid request payload.' }))
    return
  }

  const abortController = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) abortController.abort()
  })

  try {
    const sanitizedMessages = parsed.data.messages.map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    let streamed = false

    for await (const chunk of generateChatResponse(sanitizedMessages, abortController.signal)) {
      if (!streamed) {
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/plain; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        streamed = true
      }
      res.write(chunk)
    }

    if (!streamed) {
      if (abortController.signal.aborted) return
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      res.end(JSON.stringify({ error: 'The AI service returned an empty response. Please try again.' }))
      return
    }

    res.end()
  } catch (error) {
    if (abortController.signal.aborted) return

    const statusCode = error instanceof AiServiceError ? error.statusCode : 502
    const message = error instanceof AiServiceError ? error.message : 'Something went wrong. Please try again.'

    if (res.headersSent) {
      res.end(`\n\n${message}`)
      return
    }

    res.statusCode = statusCode
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify({ error: message }))
  }
}
