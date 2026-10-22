import type { IncomingMessage, ServerResponse } from 'node:http'
import { getCorsOrigin } from '../backend/src/config/origins.js'

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const origin = getCorsOrigin(req.headers.origin)
  if (origin === true) {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }

  if (req.method === 'OPTIONS') {
    res.statusCode = 204
    res.end()
    return
  }

  res.statusCode = 200
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify({ status: 'ok', service: 'ai-backend' }))
}
