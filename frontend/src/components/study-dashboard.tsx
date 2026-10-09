import { useEffect, useState } from 'react'
import { BookOpen, Check, CheckCircle2, Clock3, Plus, Sparkles, Trash2 } from 'lucide-react'

type StudyTask = { id: string; title: string; done: boolean }
type StudySession = { id: string; subject: string; day: string; time: string; duration: number }
type DashboardData = {
  tasks: StudyTask[]
  sessions: StudySession[]
  habitChecks: Record<string, string[]>
}

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const habits = [
  { id: 'focus', title: 'Focused study', detail: 'One session with no distractions' },
  { id: 'review', title: 'Review your notes', detail: 'A little recall goes a long way' },
  { id: 'water', title: 'Take care of you', detail: 'Water, a stretch, a real break' },
]
const storageKey = 'my-ai-study-dashboard'

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function readDashboard(): DashboardData {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<DashboardData>
      return {
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        habitChecks: parsed.habitChecks && typeof parsed.habitChecks === 'object' ? parsed.habitChecks : {},
      }
    }
  } catch {
    // Start with an empty planner if saved data is unavailable.
  }
  return {
    tasks: [
      { id: 'task-notes', title: 'Review today\'s lecture notes', done: false },
      { id: 'task-break', title: 'Plan a proper study break', done: false },
    ],
    sessions: [],
    habitChecks: {},
  }
}

export function StudyDashboard({ onOpenChat }: { onOpenChat: () => void }) {
  const [data, setData] = useState(readDashboard)
  const [taskDraft, setTaskDraft] = useState('')
  const [subject, setSubject] = useState('')
  const [sessionDay, setSessionDay] = useState(days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1])
  const [sessionTime, setSessionTime] = useState('16:00')
  const [duration, setDuration] = useState('45')
  const date = todayKey()
  const checkedHabits = data.habitChecks[date] ?? []
  const completedTasks = data.tasks.filter((task) => task.done).length
  const todayName = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  const todaySessions = data.sessions.filter((session) => session.day === todayName).length
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())
  const progress = data.tasks.length ? Math.round((completedTasks / data.tasks.length) * 100) : 0

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(data))
  }, [data])

  function addTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = taskDraft.trim()
    if (!title) return
    setData((current) => ({ ...current, tasks: [...current.tasks, { id: `${Date.now()}-${Math.random()}`, title, done: false }] }))
    setTaskDraft('')
  }

  function toggleTask(id: string) {
    setData((current) => ({ ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, done: !task.done } : task) }))
  }

  function toggleHabit(id: string) {
    setData((current) => {
      const checked = current.habitChecks[date] ?? []
      const next = checked.includes(id) ? checked.filter((item) => item !== id) : [...checked, id]
      return { ...current, habitChecks: { ...current.habitChecks, [date]: next } }
    })
  }

  function addSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = subject.trim()
    if (!title) return
    setData((current) => ({ ...current, sessions: [...current.sessions, { id: `${Date.now()}-${Math.random()}`, subject: title, day: sessionDay, time: sessionTime, duration: Number(duration) || 45 }] }))
    setSubject('')
  }

  return (
    <section className="study-dashboard">
      <header className="dashboard-heading">
        <div>
          <div className="dashboard-kicker"><Sparkles size={13} /> YOUR STUDY NOOK <span>{dateLabel}</span></div>
          <h1>Make room to learn.</h1>
          <p>A little structure, a little breathing room. You’ve got this.</p>
        </div>
        <button className="dashboard-chat-link" type="button" onClick={onOpenChat}><Sparkles size={15} /> Ask myai</button>
      </header>

      <div className="dashboard-stats" aria-label="Today's overview">
        <article className="dashboard-stat dashboard-stat-progress">
          <div className="stat-label">TODAY'S TASKS</div>
          <div className="stat-value">{completedTasks}<span> / {data.tasks.length}</span></div>
          <div className="stat-progress-track"><span style={{ width: `${progress}%` }} /></div>
          <small>{data.tasks.length ? `${progress}% of your list is done` : 'Add one small thing to begin'}</small>
        </article>
        <article className="dashboard-stat dashboard-stat-habits">
          <div className="stat-label">DAILY CHECK-IN</div>
          <div className="stat-value">{checkedHabits.length}<span> / {habits.length}</span></div>
          <small>Showing up counts, even gently.</small>
        </article>
        <article className="dashboard-stat dashboard-stat-sessions">
          <div className="stat-label">ON YOUR TIMETABLE</div>
          <div className="stat-value">{todaySessions}<span> {todaySessions === 1 ? 'session' : 'sessions'}</span></div>
          <small>{todayName} study plans</small>
        </article>
      </div>

      <div className="dashboard-columns">
        <section className="dashboard-panel task-panel">
          <div className="panel-heading">
            <div><span className="panel-icon task-icon"><CheckCircle2 size={17} /></span><div><h2>Little to-dos</h2><p>Small steps still move you forward.</p></div></div>
            <span className="panel-count">{data.tasks.length}</span>
          </div>
          <form className="dashboard-add-form" onSubmit={addTask}>
            <input aria-label="New task" placeholder="Add something to do..." value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} maxLength={100} />
            <button type="submit" aria-label="Add task" disabled={!taskDraft.trim()}><Plus size={17} /></button>
          </form>
          <ul className="task-list">
            {data.tasks.map((task) => <li className={task.done ? 'task-done' : ''} key={task.id}>
              <button className="task-check" type="button" aria-label={task.done ? `Mark ${task.title} incomplete` : `Complete ${task.title}`} onClick={() => toggleTask(task.id)}>{task.done && <Check size={13} />}</button>
              <span>{task.title}</span>
              <button className="task-delete" type="button" aria-label={`Delete ${task.title}`} onClick={() => setData((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))}><Trash2 size={14} /></button>
            </li>)}
            {data.tasks.length === 0 && <li className="dashboard-empty">Your list is clear. Add a task when you’re ready.</li>}
          </ul>
        </section>

        <section className="dashboard-panel habit-panel">
          <div className="panel-heading">
            <div><span className="panel-icon habit-icon"><Sparkles size={17} /></span><div><h2>Daily little wins</h2><p>Check in with yourself today.</p></div></div>
            <span className="panel-count">{checkedHabits.length}/{habits.length}</span>
          </div>
          <div className="habit-list">
            {habits.map((habit) => {
              const checked = checkedHabits.includes(habit.id)
              return <button className={`habit-row ${checked ? 'habit-checked' : ''}`} type="button" key={habit.id} onClick={() => toggleHabit(habit.id)} aria-pressed={checked}>
                <span className="habit-check">{checked && <Check size={13} />}</span>
                <span className="habit-copy"><strong>{habit.title}</strong><small>{habit.detail}</small></span>
              </button>
            })}
          </div>
          <div className="habit-note"><span>✿</span> Progress, not perfection.</div>
        </section>
      </div>

      <section className="dashboard-panel timetable-panel">
        <div className="panel-heading timetable-heading">
          <div><span className="panel-icon timetable-icon"><BookOpen size={17} /></span><div><h2>Study timetable</h2><p>Give your goals a little space on the calendar.</p></div></div>
          <span className="timetable-total"><Clock3 size={14} /> {data.sessions.length} planned</span>
        </div>
        <form className="session-form" onSubmit={addSession}>
          <label className="session-subject"><span>Subject or task</span><input aria-label="Subject or study task" placeholder="e.g. Biology: cell structure" value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={80} /></label>
          <label><span>Day</span><select aria-label="Study day" value={sessionDay} onChange={(event) => setSessionDay(event.target.value)}>{days.map((day) => <option key={day}>{day}</option>)}</select></label>
          <label><span>Start</span><input aria-label="Start time" type="time" value={sessionTime} onChange={(event) => setSessionTime(event.target.value)} /></label>
          <label><span>Minutes</span><input aria-label="Session length in minutes" type="number" min="10" max="300" step="5" value={duration} onChange={(event) => setDuration(event.target.value)} /></label>
          <button className="session-add" type="submit" aria-label="Add study session" disabled={!subject.trim()}><Plus size={17} /><span>Add</span></button>
        </form>
        <div className="week-schedule">
          {days.map((day) => {
            const sessions = data.sessions.filter((session) => session.day === day).sort((a, b) => a.time.localeCompare(b.time))
            return <div className={`schedule-day ${day === todayName ? 'schedule-today' : ''}`} key={day}>
              <div className="schedule-day-name">{day}<span>{day === todayName ? 'TODAY' : ''}</span></div>
              <div className="schedule-day-sessions">
                {sessions.length ? sessions.map((session) => <div className="session-chip" key={session.id}>
                  <span className="session-time">{session.time}</span><strong>{session.subject}</strong><small>{session.duration} min</small>
                  <button type="button" aria-label={`Remove ${session.subject} from ${day}`} onClick={() => setData((current) => ({ ...current, sessions: current.sessions.filter((item) => item.id !== session.id) }))}><Trash2 size={13} /></button>
                </div>) : <span className="schedule-empty">A little room to breathe</span>}
              </div>
            </div>
          })}
        </div>
      </section>
      <footer className="dashboard-footer">Your plans stay right here in this browser <span>·</span> Go at your own pace</footer>
    </section>
  )
}