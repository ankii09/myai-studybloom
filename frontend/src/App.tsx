import { useEffect, useRef, useState } from 'react'
import { ArrowUp, BookOpen, Check, ChevronDown, CircleHelp, Copy, Menu, Paperclip, Sparkles, ThumbsDown, ThumbsUp } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from './components/ui/button'
import { Conversation, Sidebar } from './components/sidebar'
import { defaultPreferences, Preferences, SettingsDialog } from './components/settings-dialog'
import { sendChatMessage } from './lib/api'
import type { ChatMessage } from './lib/chat-api'
import { StudyDashboard } from './components/study-dashboard'

const initialConversations: Conversation[] = [
  { id: 'welcome', title: 'A fresh start', group: 'Today', messages: [] },
  { id: 'week-plan', title: 'A calmer weekly plan', group: 'Today', messages: [{ role: 'user', content: 'Help me make a calmer weekly plan.' }, { role: 'assistant', content: 'Absolutely. Start by choosing one priority for each day, then leave a little space between commitments. What does a typical week look like for you?' }] },
  { id: 'writing', title: 'A note that sounds like me', group: 'Yesterday', messages: [{ role: 'user', content: 'Can you help me write a thoughtful thank-you note?' }, { role: 'assistant', content: 'Of course. Tell me who it is for and one detail you appreciated, and we can make it feel personal without overdoing it.' }] },
  { id: 'ideas', title: 'Weekend reading list', group: 'Previous 7 Days', messages: [{ role: 'user', content: 'Suggest a few thoughtful books for the weekend.' }, { role: 'assistant', content: 'I can tailor a short list to your mood. Are you looking for fiction, ideas to think about, or something light?' }] },
]

const suggestions = [
  { title: 'Let\'s get creative', description: 'Turn your ideas into something beautiful.', emoji: '✨', prompt: 'Help me turn a rough idea into a polished concept for something I can actually use.', tone: 'rose' },
  { title: 'Learn something new', description: 'Explore a topic you\'ve always wondered about.', emoji: '🌷', prompt: 'Teach me something fascinating in a calm, beginner-friendly way.', tone: 'sage' },
  { title: 'Code with me', description: 'Build, debug, and bring ideas to life.', emoji: '💻', prompt: 'Help me work through a technical problem step by step and explain the reasoning clearly.', tone: 'peach' },
  { title: 'Plan a softer week', description: 'Organize your thoughts and find your rhythm.', emoji: '☁️', prompt: 'Help me plan a calmer, more intentional week with a realistic routine and priorities.', tone: 'lavender' },
]

const markdownComponents = {
  a: ({ node, ...props }: any) => <a {...props} target="_blank" rel="noreferrer" />,
  h1: ({ node, ...props }: any) => <h1 {...props} />,
  h2: ({ node, ...props }: any) => <h2 {...props} />,
  h3: ({ node, ...props }: any) => <h3 {...props} />,
  code: ({ inline, className, children, ...props }: any) => {
    if (inline) {
      return <code className={className} {...props}>{children}</code>
    }
    return <code className={className} {...props}>{children}</code>
  },
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function readPreferences(): Preferences {
  try {
    const stored = localStorage.getItem('my-ai-preferences')
    return stored ? { ...defaultPreferences, ...JSON.parse(stored) as Partial<Preferences> } : defaultPreferences
  } catch {
    return defaultPreferences
  }
}

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    try {
      const stored = localStorage.getItem('my-ai-conversations')
      return stored ? JSON.parse(stored) as Conversation[] : initialConversations
    } catch {
      return initialConversations
    }
  })
  const [activeId, setActiveId] = useState(() => {
    try {
      const stored = localStorage.getItem('my-ai-active-id')
      return stored ?? initialConversations[0].id
    } catch {
      return initialConversations[0].id
    }
  })
  const [preferences, setPreferences] = useState(readPreferences)
  const [apiKey, setApiKey] = useState('')
  const [draft, setDraft] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeView, setActiveView] = useState<'chat' | 'dashboard'>(() => localStorage.getItem('my-ai-active-view') === 'dashboard' ? 'dashboard' : 'chat')
  const [sending, setSending] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const activeConversation = conversations.find((item) => item.id === activeId) ?? conversations[0]
  const isFresh = activeConversation?.messages.length === 0

  useEffect(() => {
    localStorage.setItem('my-ai-conversations', JSON.stringify(conversations))
  }, [conversations])

  useEffect(() => {
    localStorage.setItem('my-ai-active-id', activeId)
  }, [activeId])

  useEffect(() => {
    localStorage.setItem('my-ai-active-view', activeView)
  }, [activeView])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeConversation?.messages.length, sending])

  function startNewChat() {
    const id = createId()
    setConversations((current) => [{ id, title: 'A fresh start', group: 'Today', messages: [] }, ...current])
    setActiveId(id)
    setDraft('')
    setMobileOpen(false)
    setActiveView('chat')
    window.setTimeout(() => textareaRef.current?.focus(), 20)
  }

  function savePreferences(next: Preferences, nextKey: string) {
    setPreferences(next)
    setApiKey(nextKey || apiKey)
    localStorage.setItem('my-ai-preferences', JSON.stringify(next))
  }

  async function sendMessage(content = draft) {
    const text = content.trim()
    if (!text || sending) return

    const userMessage: ChatMessage = { role: 'user', content: text }
    const previous = activeConversation.messages
    const nextMessages = [...previous, userMessage]
    const title = previous.length === 0 ? text.slice(0, 36) + (text.length > 36 ? '…' : '') : activeConversation.title
    const assistantPlaceholder: ChatMessage = { role: 'assistant', content: '' }

    setConversations((current) => current.map((item) => item.id === activeId ? { ...item, title, messages: [...item.messages, userMessage, assistantPlaceholder] } : item))
    setDraft('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setSending(true)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await sendChatMessage(nextMessages, (chunk) => {
        const delta = chunk.replace(/\r\n/g, '\n')
        setConversations((current) => current.map((item) => {
          if (item.id !== activeId) return item
          const lastIndex = item.messages.length - 1
          const lastMessage = item.messages[lastIndex]
          if (!lastMessage || lastMessage.role !== 'assistant') return item
          const nextContent = `${lastMessage.content}${delta}`
          const updatedMessages = [...item.messages]
          updatedMessages[lastIndex] = { ...lastMessage, content: nextContent }
          return { ...item, messages: updatedMessages }
        }))
      }, controller.signal)
    } catch (error) {
      if (controller.signal.aborted) return
      const message = error instanceof Error ? error.message : 'Something went wrong while connecting to the AI service.'
      setConversations((current) => current.map((item) => {
        if (item.id !== activeId) return item
        const lastMessage = item.messages[item.messages.length - 1]
        const partialContent = lastMessage?.role === 'assistant' ? lastMessage.content : ''
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: partialContent ? `${partialContent}\n\n${message}` : message,
        }
        return { ...item, messages: [...item.messages.slice(0, -1), errorMessage] }
      }))
    } finally {
      abortRef.current = null
      setSending(false)
    }
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && preferences.enterToSend) {
      event.preventDefault()
      void sendMessage()
    }
  }

  function stopMessage() {
    abortRef.current?.abort()
    abortRef.current = null
    setSending(false)
  }

  async function copyMessage(id: string, content: string) {
    await navigator.clipboard.writeText(content)
    setCopied(id)
    window.setTimeout(() => setCopied(null), 1400)
  }

  function deleteConversation(id: string) {
    const remaining = conversations.filter((item) => item.id !== id)
    if (remaining.length === 0) {
      const fresh = { id: createId(), title: 'A fresh start', group: 'Today' as const, messages: [] }
      setConversations([fresh])
      setActiveId(fresh.id)
    } else {
      setConversations(remaining)
      if (id === activeId) setActiveId(remaining[0].id)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar conversations={conversations} activeId={activeId} activeView={activeView} mobileOpen={mobileOpen} onViewChange={setActiveView} onSelect={(id) => { setActiveId(id); setActiveView('chat') }} onNew={startNewChat} onDelete={deleteConversation} onSettings={() => setSettingsOpen(true)} onClose={() => setMobileOpen(false)} />
      <main className="chat-main">
        <header className="topbar">
          <div className="topbar-left">
            <Button className="mobile-menu" variant="ghost" size="icon" aria-label="Open conversation menu" onClick={() => setMobileOpen(true)}><Menu size={19} /></Button>
            <div className="model-picker">
              <span className="model-sparkle">{activeView === 'chat' ? <Sparkles size={14} /> : <BookOpen size={14} />}</span>
              <span>{activeView === 'chat' ? 'myai' : 'Study nook'}</span>
              {activeView === 'chat' && <span className="model-tag">PREVIEW</span>}
              <ChevronDown size={14} className="model-chevron" />
            </div>
          </div>

          <div className="topbar-actions">
            {activeView === 'chat' && <span className="secure-label"><span className="status-dot" />Private workspace</span>}
            <Button variant="ghost" size="icon" aria-label="Open settings" title="Settings" onClick={() => setSettingsOpen(true)}><CircleHelp size={17} /></Button>
          </div>
        </header>

        {activeView === 'dashboard' ? <StudyDashboard onOpenChat={() => setActiveView('chat')} /> : <section className={`chat-scroll ${isFresh ? 'chat-scroll-welcome' : ''}`}>
          {isFresh ? (
            <div className="welcome-content">
              <div className="welcome-mark">
                <Sparkles size={20} />
              </div>
              <div className="welcome-kicker">your little corner of ideas</div>
              <h1>Little ideas, big possibilities.</h1>
              <p className="welcome-subtitle">Your personal space to think, create, and figure things out.</p>

              <div className="suggestion-grid">
                {suggestions.map(({ title, description, emoji, prompt, tone }, index) => (
                  <button
                    key={title}
                    type="button"
                    className={`suggestion-card suggestion-${tone}`}
                    onClick={() => void sendMessage(prompt)}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <div className="suggestion-header">
                      <span className="suggestion-icon">{emoji}</span>
                      <span className="suggestion-arrow">→</span>
                    </div>
                    <div className="suggestion-copy">
                      <strong>{title}</strong>
                      <small>{description}</small>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="message-thread">
              <div className="thread-date"><span />A CONVERSATION<span /></div>

              {activeConversation.messages.map((message, index) => (
                <article className={`message-row ${message.role === 'user' ? 'user-row' : 'assistant-row'}`} key={`${activeId}-${index}`}>
                  {message.role === 'assistant' && (
                    <div className="assistant-avatar"><Sparkles size={14} /></div>
                  )}

                  <div className="message-body">
                    <div className="message-author">{message.role === 'user' ? 'You' : 'myai'}</div>

                    {message.role === 'assistant' ? (
                      <div className="message-content markdown-body">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="message-content plain-text">{message.content}</div>
                    )}

                    {message.role === 'assistant' && (
                      <div className="message-tools">
                        <button aria-label="Copy response" title="Copy response" onClick={() => void copyMessage(`${index}`, message.content)}>
                          {copied === `${index}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        <button aria-label="Good response" title="Good response"><ThumbsUp size={14} /></button>
                        <button aria-label="Poor response" title="Poor response"><ThumbsDown size={14} /></button>
                      </div>
                    )}
                  </div>
                </article>
              ))}

              {sending && (
                <div className="message-row assistant-row">
                  <div className="assistant-avatar"><Sparkles size={14} /></div>
                  <div className="typing-dots" aria-label="My AI is responding"><i /><i /><i /></div>
                </div>
              )}

              {sending && (
                <div className="composer-stop-row">
                  <Button type="button" variant="ghost" onClick={stopMessage}>Stop</Button>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </section>}

        {activeView === 'chat' && <footer className="composer-area">
          {isFresh && <div className="composer-hint"><span>Private by design</span><span className="hint-separator">·</span><span>Your chats stay in this browser</span></div>}
          <div className="composer-box">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value)
                event.target.style.height = 'auto'
                event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`
              }}
              onKeyDown={handleComposerKeyDown}
              rows={1}
              placeholder="What\'s on your mind today?"
              aria-label="Message My AI"
            />
            <div className="composer-controls">
              <div className="composer-left">
                <Button variant="ghost" size="icon" aria-label="Attach file" title="Attachments coming soon" disabled><Paperclip size={16} /></Button>
                <span className="composer-model-label"><span className="composer-dot" />{preferences.model || 'My AI'}</span>
              </div>

              <div className="composer-right">
                <span className="enter-hint">{preferences.enterToSend ? '↵ to send' : 'Shift + ↵ for new line'}</span>
                <Button className="send-button" size="icon" aria-label="Send message" disabled={!draft.trim() || sending} onClick={() => void sendMessage()}>
                  <ArrowUp size={17} strokeWidth={2.4} />
                </Button>
              </div>
            </div>
          </div>
          <p className="disclaimer">My AI can make mistakes. Check important information.</p>
        </footer>}
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} preferences={preferences} onSave={savePreferences} />
    </div>
  )
}
