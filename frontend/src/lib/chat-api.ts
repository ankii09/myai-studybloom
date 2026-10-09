export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type ChatConnection = {
  baseUrl: string
  model: string
  apiKey: string
}

export async function requestChatReply(messages: ChatMessage[], connection: ChatConnection): Promise<string> {
  if (!connection.baseUrl.trim()) {
    return 'Your chat is ready. Add an API base URL in Settings to connect an AI model, or keep exploring the interface in preview mode.'
  }

  const endpoint = `${connection.baseUrl.replace(/\/+$/, '')}/chat/completions`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(connection.apiKey ? { Authorization: `Bearer ${connection.apiKey}` } : {}),
    },
    body: JSON.stringify({ model: connection.model, messages }),
  })

  if (!response.ok) throw new Error(`The AI service returned ${response.status}. Check your connection settings and try again.`)

  const data: unknown = await response.json()
  if (typeof data === 'object' && data !== null && 'choices' in data) {
    const choices = (data as { choices?: Array<{ message?: { content?: unknown } }> }).choices
    const content = choices?.[0]?.message?.content
    if (typeof content === 'string') return content
  }
  if (typeof data === 'object' && data !== null && 'reply' in data && typeof data.reply === 'string') return data.reply
  throw new Error('The AI service response did not contain a readable reply.')
}