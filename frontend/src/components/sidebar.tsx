import { useMemo, useState } from 'react'
import { CalendarDays, Ellipsis, MessageSquare, Plus, Search, Settings, Sparkles, Trash2, X } from 'lucide-react'
import { Button } from './ui/button'

export type Conversation = {
  id: string
  title: string
  group: 'Today' | 'Yesterday' | 'Previous 7 Days'
  messages: { role: 'user' | 'assistant'; content: string }[]
}

type SidebarProps = {
  conversations: Conversation[]
  activeId: string
  activeView: 'chat' | 'dashboard'
  mobileOpen: boolean
  onViewChange: (view: 'chat' | 'dashboard') => void
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onSettings: () => void
  onClose: () => void
}

const groups: Conversation['group'][] = ['Today', 'Yesterday', 'Previous 7 Days']

export function Sidebar({ conversations, activeId, activeView, mobileOpen, onViewChange, onSelect, onNew, onDelete, onSettings, onClose }: SidebarProps) {
  const [search, setSearch] = useState('')
  const visible = useMemo(() => conversations.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())), [conversations, search])

  return (
    <>
      {mobileOpen && <button className="sidebar-scrim" aria-label="Close menu" onClick={onClose} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-top">
          <div className="brand" aria-label="myai brand">
            <span className="brand-mark"><Sparkles size={16} strokeWidth={2.2} /></span>
            <div className="brand-copy">
              <span className="brand-name">my<span>ai</span></span>
              <small className="brand-tagline">your little corner of ideas</small>
            </div>
          </div>
          <Button className="mobile-close" variant="ghost" size="icon" aria-label="Close sidebar" onClick={onClose}><X size={17} /></Button>
        </div>

        <Button className="new-chat-button" variant="secondary" onClick={onNew}><Plus size={16} /><span>New chat</span><span className="new-shortcut">⌘ K</span></Button>

        <nav className="workspace-nav" aria-label="Workspace">
          <button type="button" className={activeView === 'dashboard' ? 'workspace-nav-active' : ''} onClick={() => { onViewChange('dashboard'); onClose() }}><CalendarDays size={16} /><span>Study dashboard</span></button>
          <button type="button" className={activeView === 'chat' ? 'workspace-nav-active' : ''} onClick={() => { onViewChange('chat'); onClose() }}><Sparkles size={16} /><span>AI chat</span></button>
        </nav>

        <label className="search-box">
          <Search size={15} />
          <input aria-label="Search conversations" placeholder="Search conversations" value={search} onChange={(event) => setSearch(event.target.value)} />
          {search && <button type="button" className="clear-search" aria-label="Clear search" onClick={() => setSearch('')}><X size={13} /></button>}
        </label>

        <div className="history-heading"><span>Your space</span><span className="history-count">{visible.length}</span></div>
        <nav className="conversation-list" aria-label="Conversation history">
          {groups.map((group) => {
            const items = visible.filter((item) => item.group === group)
            if (items.length === 0) return null
            return <section className="history-group" key={group}>
              <h2>{group}</h2>
              {items.map((item) => <div key={item.id} className={`conversation-row ${activeId === item.id ? 'conversation-active' : ''}`}>
                <button className="conversation-select" onClick={() => { onSelect(item.id); onClose() }} title={item.title}><MessageSquare size={14} /><span>{item.title}</span></button>
                <details className="conversation-menu">
                  <summary aria-label={`Options for ${item.title}`}><Ellipsis size={16} /></summary>
                  <button className="delete-conversation" onClick={() => onDelete(item.id)}><Trash2 size={14} />Delete chat</button>
                </details>
              </div>)}
            </section>
          })}
          {visible.length === 0 && <div className="empty-search">No matching conversations</div>}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-divider" />
          <button className="settings-trigger" onClick={onSettings}><span className="settings-avatar">M</span><span className="profile-copy"><strong>My workspace</strong><small>Personal plan</small></span><Settings size={16} /></button>
          <div className="sidebar-footnote"><span className="status-dot" />All systems ready</div>
        </div>
      </aside>
    </>
  )
}