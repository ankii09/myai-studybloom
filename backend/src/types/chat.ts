export type ChatRole = 'system' | 'user' | 'assistant'

export type ChatMessage = {
  role: ChatRole
  content: string
}

export type ChatRequest = {
  messages: ChatMessage[]
}

export type ChatResponse = {
  role: 'assistant'
  content: string
}

export type AIServiceError = {
  code: 'INVALID_REQUEST' | 'AI_PROVIDER_ERROR' | 'RATE_LIMIT' | 'TIMEOUT' | 'EMPTY_RESPONSE' | 'NETWORK_ERROR'
  message: string
  statusCode: number
}
