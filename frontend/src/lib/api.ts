export type ApiChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function sendChatMessage(
  messages: ApiChatMessage[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  let response: Response
  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error('Unable to connect to the AI server.')
  }

  if (!response.ok) {
    let message = 'Something went wrong. Please try again.'

    try {
      const errorBody = await response.json() as { error?: string }
      if (typeof errorBody.error === 'string' && errorBody.error.trim()) {
        message = errorBody.error
      }
    } catch {
      message = response.status === 0 ? 'Unable to connect to the AI server.' : 'Something went wrong. Please try again.'
    }

    throw new Error(message)
  }

  if (!response.body) {
    throw new Error('Unable to connect to the AI server.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value, { stream: true })
    fullText += text
    onChunk(text)
  }

  const trailingText = decoder.decode()
  if (trailingText) {
    fullText += trailingText
    onChunk(trailingText)
  }

  if (!fullText.trim()) {
    throw new Error('The AI service returned an empty response.')
  }

  return fullText
}
