import { env } from './env.js'

const localOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
])

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true

  const normalized = normalizeOrigin(origin)
  if (localOrigins.has(normalized)) return true
  if (normalized === normalizeOrigin(env.frontendUrl)) return true

  try {
    const { hostname } = new URL(origin)
    return hostname.endsWith('.vercel.app')
  } catch {
    return false
  }
}

export function getCorsOrigin(origin: string | undefined): string | boolean {
  if (!origin) return true
  return isAllowedOrigin(origin) ? origin : false
}
