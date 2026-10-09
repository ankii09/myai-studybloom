import * as Dialog from '@radix-ui/react-dialog'
import { Check, ChevronDown, KeyRound, Settings2, SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'

export type Preferences = {
  baseUrl: string
  model: string
  temperature: number
  enterToSend: boolean
  conciseReplies: boolean
}

export const defaultPreferences: Preferences = {
  baseUrl: '',
  model: 'gpt-4o-mini',
  temperature: 0.7,
  enterToSend: true,
  conciseReplies: false,
}

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  preferences: Preferences
  onSave: (preferences: Preferences, apiKey: string) => void
}

export function SettingsDialog({ open, onOpenChange, preferences, onSave }: SettingsDialogProps) {
  const [draft, setDraft] = useState(preferences)
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (open) {
      setDraft(preferences)
      setApiKey('')
      setSaved(false)
    }
  }, [open, preferences])

  function saveSettings(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSave(draft, apiKey)
    setSaved(true)
    window.setTimeout(() => onOpenChange(false), 450)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="settings-dialog">
          <div className="dialog-heading">
            <div className="dialog-icon"><Settings2 size={18} /></div>
            <div>
              <Dialog.Title className="dialog-title">Settings</Dialog.Title>
              <Dialog.Description className="dialog-description">Fine-tune your AI workspace.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close settings"><X size={17} /></Button></Dialog.Close>
          </div>

          <form onSubmit={saveSettings}>
            <section className="settings-section">
              <div className="settings-section-title"><KeyRound size={15} /><span>AI connection</span></div>
              <label className="field-label" htmlFor="base-url">API base URL</label>
              <input id="base-url" className="text-field" type="url" placeholder="https://api.example.com/v1" value={draft.baseUrl} onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} />
              <p className="field-hint">OpenAI-compatible endpoint. Leave blank to use preview mode.</p>
              <div className="field-row">
                <div className="field-grow">
                  <label className="field-label" htmlFor="model-name">Model</label>
                  <input id="model-name" className="text-field" value={draft.model} onChange={(event) => setDraft({ ...draft, model: event.target.value })} placeholder="Model name" />
                </div>
                <div className="field-grow">
                  <label className="field-label" htmlFor="api-key">API key <span className="optional-label">optional</span></label>
                  <input id="api-key" className="text-field" type="password" autoComplete="new-password" placeholder="Stored in this session only" value={apiKey} onChange={(event) => setApiKey(event.target.value)} />
                </div>
              </div>
              <p className="field-hint">Your API key is never saved to browser storage.</p>
            </section>

            <section className="settings-section preferences-section">
              <div className="settings-section-title"><SlidersHorizontal size={15} /><span>Preferences</span></div>
              <div className="temperature-row">
                <div><label className="field-label" htmlFor="temperature">Response creativity</label><p className="field-hint">Lower is focused; higher is more varied.</p></div>
                <output className="temperature-value">{draft.temperature.toFixed(1)}</output>
              </div>
              <input id="temperature" className="range-field" type="range" min="0" max="1" step="0.1" value={draft.temperature} onChange={(event) => setDraft({ ...draft, temperature: Number(event.target.value) })} />
              <label className="toggle-row">
                <span><strong>Enter to send</strong><small>Use Shift + Enter for a new line.</small></span>
                <input type="checkbox" checked={draft.enterToSend} onChange={(event) => setDraft({ ...draft, enterToSend: event.target.checked })} />
              </label>
              <label className="toggle-row">
                <span><strong>Concise replies</strong><small>Prefer shorter, direct answers.</small></span>
                <input type="checkbox" checked={draft.conciseReplies} onChange={(event) => setDraft({ ...draft, conciseReplies: event.target.checked })} />
              </label>
            </section>

            <div className="dialog-footer">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="save-button">{saved ? <><Check size={15} /> Saved</> : 'Save changes'}<ChevronDown size={14} className="save-chevron" /></Button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}