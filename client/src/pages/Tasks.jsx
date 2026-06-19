import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { createTask, deleteTask, getTasks, updateTask } from '../api.js';

const categories = ['Work', 'Personal', 'Urgent'];
const statusFilters = ['All', 'Open', 'Completed'];
const TIMER_PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '10 min', seconds: 10 * 60 },
  { label: '5 min',  seconds:  5 * 60 },
];

const emptyForm = { title: '', description: '', dueDate: '', category: 'Work', completed: false };

function todayInputValue() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}
function formatDate(v) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(v));
}
function daysUntil(v) {
  return Math.ceil((new Date(v.slice(0, 10)) - new Date(todayInputValue())) / 86400000);
}
function dueLabel(task) {
  if (task.completed) return 'Completed';
  const d = daysUntil(task.dueDate);
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `Due in ${d} days`;
}
function pad(n) { return String(n).padStart(2, '0'); }
function fmtTimer(s) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

function beep(ctx, freq = 880, duration = 0.3) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function alarmBeep(ctx) {
  if (!ctx) return;
  [0, 0.35, 0.7].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + delay + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.28);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.3);
  });
}

// ─── Clock / Alarm / Timer widget ──────────────────────────────────────────
function HeroWidget({ stats, tasksTotal }) {
  const [tab, setTab]               = useState('clock');
  const [now, setNow]               = useState(new Date());
  const [alarmInput, setAlarmInput] = useState('');
  const [alarms, setAlarms]         = useState([]);
  const [firedId, setFiredId]       = useState(null);

  const [timerLeft, setTimerLeft]       = useState(25 * 60);
  const [timerTotal, setTimerTotal]     = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerDone, setTimerDone]       = useState(false);
  const [customMin, setCustomMin]       = useState('');
  const [activePreset, setActivePreset] = useState(0);

  const audioCtx = useRef(null);

  function getAudio() {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx.current;
  }

  // Live clock + alarm poll
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNow(n);
      const hhmm = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
      setAlarms((prev) =>
        prev.map((a) => {
          if (!a.fired && a.time === hhmm && n.getSeconds() === 0) {
            alarmBeep(getAudio());
            setFiredId(a.id);
            return { ...a, fired: true };
          }
          return a;
        })
      );
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!timerRunning) return;
    if (timerLeft <= 0) {
      setTimerRunning(false);
      setTimerDone(true);
      beep(getAudio(), 880, 0.2);
      setTimeout(() => beep(getAudio(), 1100, 0.2), 250);
      setTimeout(() => beep(getAudio(), 1320, 0.4), 500);
      return;
    }
    const id = setInterval(() => setTimerLeft((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timerRunning, timerLeft]);

  function addAlarm() {
    if (!alarmInput) return;
    setAlarms((prev) => [...prev, { id: Date.now(), time: alarmInput, fired: false }]);
    setAlarmInput('');
  }
  function removeAlarm(id) {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
    if (firedId === id) setFiredId(null);
  }
  function dismissFired() { setFiredId(null); }

  function applyPreset(idx) {
    const s = TIMER_PRESETS[idx].seconds;
    setTimerLeft(s); setTimerTotal(s);
    setTimerRunning(false); setTimerDone(false);
    setActivePreset(idx); setCustomMin('');
  }
  function applyCustom() {
    const s = Math.max(1, Math.min(3600, parseInt(customMin, 10) || 1)) * 60;
    setTimerLeft(s); setTimerTotal(s);
    setTimerRunning(false); setTimerDone(false);
    setActivePreset(-1);
  }
  function toggleTimer() {
    if (timerDone) { applyPreset(activePreset >= 0 ? activePreset : 0); return; }
    setTimerRunning((r) => !r);
    setTimerDone(false);
  }
  function resetTimer() {
    setTimerLeft(timerTotal); setTimerRunning(false); setTimerDone(false);
  }

  const progress = timerTotal > 0 ? ((timerTotal - timerLeft) / timerTotal) * 100 : 0;

  const h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  const dateStr = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="hero-widget">
      {/* Fired alarm banner */}
      {firedId && (
        <div className="alarm-fired-banner" role="alert">
          <span>⏰ Alarm ringing!</span>
          <button type="button" onClick={dismissFired}>Dismiss</button>
        </div>
      )}

      {/* Tab bar */}
      <div className="widget-tabs">
        {['clock', 'timer'].map((t) => (
          <button
            key={t}
            type="button"
            className={`widget-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'clock' ? '🕐 Clock & Alarm' : '⏱ Timer'}
          </button>
        ))}
      </div>

      {/* Clock + Alarm */}
      {tab === 'clock' && (
        <div className="widget-body">
          <div className="clock-display">
            <div className="clock-time">
              <span className="clock-hm">{pad(h12)}:{pad(m)}</span>
              <span className="clock-ss">{pad(s)}</span>
              <span className="clock-ampm">{ampm}</span>
            </div>
            <div className="clock-date">{dateStr}</div>
          </div>

          <div className="alarm-section">
            <p className="widget-section-label">Set alarm</p>
            <div className="alarm-input-row">
              <input
                type="time"
                value={alarmInput}
                onChange={(e) => setAlarmInput(e.target.value)}
                className="alarm-time-input"
              />
              <button type="button" className="alarm-add-btn" onClick={addAlarm} disabled={!alarmInput}>
                + Add
              </button>
            </div>
            {alarms.length > 0 && (
              <ul className="alarm-list">
                {alarms.map((a) => (
                  <li key={a.id} className={`alarm-item${a.fired ? ' fired' : ''}`}>
                    <span className="alarm-dot" />
                    <span className="alarm-time-label">{a.time}</span>
                    {a.fired && <span className="alarm-fired-tag">Rang</span>}
                    <button type="button" className="alarm-remove" onClick={() => removeAlarm(a.id)} aria-label="Remove alarm">✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Timer */}
      {tab === 'timer' && (
        <div className="widget-body">
          <div className="timer-ring-wrap">
            <svg className="timer-ring" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" className="timer-ring-bg" />
              <circle
                cx="60" cy="60" r="52"
                className={`timer-ring-fill${timerDone ? ' done' : ''}`}
                style={{
                  strokeDasharray: `${2 * Math.PI * 52}`,
                  strokeDashoffset: `${2 * Math.PI * 52 * (1 - progress / 100)}`
                }}
              />
            </svg>
            <div className="timer-center">
              <span className="timer-digits">{fmtTimer(timerLeft)}</span>
              <span className="timer-status">
                {timerDone ? '✓ Done!' : timerRunning ? 'Running' : timerLeft === timerTotal ? 'Ready' : 'Paused'}
              </span>
            </div>
          </div>

          <div className="timer-presets">
            {TIMER_PRESETS.map((p, i) => (
              <button
                key={p.label}
                type="button"
                className={`timer-preset-btn${activePreset === i ? ' active' : ''}`}
                onClick={() => applyPreset(i)}
              >
                {p.label}
              </button>
            ))}
            <div className="timer-custom-row">
              <input
                type="number"
                min="1"
                max="60"
                value={customMin}
                placeholder="min"
                className="timer-custom-input"
                onChange={(e) => setCustomMin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyCustom()}
              />
              <button type="button" className="timer-preset-btn" onClick={applyCustom} disabled={!customMin}>Set</button>
            </div>
          </div>

          <div className="timer-controls">
            <button type="button" className="timer-main-btn" onClick={toggleTimer}>
              {timerDone ? 'Restart' : timerRunning ? 'Pause' : timerLeft < timerTotal ? 'Resume' : 'Start'}
            </button>
            <button type="button" className="timer-reset-btn" onClick={resetTimer}>Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Tasks page ────────────────────────────────────────────────────────
export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks]             = useState([]);
  const [form, setForm]               = useState(emptyForm);
  const [editingId, setEditingId]     = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter]     = useState('All');
  const [searchTerm, setSearchTerm]         = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const formRef      = useRef(null);
  const titleInputRef = useRef(null);
  const minDate = todayInputValue();

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    try {
      setLoading(true); setError('');
      setTasks(await getTasks());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  function handleChange(ev) {
    const { name, value, type, checked } = ev.target;
    setForm((c) => ({ ...c, [name]: type === 'checkbox' ? checked : value }));
  }

  function validateTask(t) {
    if (!t.title.trim() || !t.description.trim() || !t.dueDate || !t.category)
      return 'All fields are required.';
    if (t.dueDate < minDate) return 'Due date cannot be in the past.';
    return '';
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const ve = validateTask(form);
    if (ve) { setError(ve); return; }
    try {
      setSaving(true); setError('');
      const payload = { ...form, title: form.title.trim(), description: form.description.trim() };
      if (editingId) {
        const updated = await updateTask(editingId, payload);
        setTasks((c) => c.map((t) => (t._id === editingId ? updated : t)));
      } else {
        const created = await createTask(payload);
        setTasks((c) => [created, ...c]);
        setCategoryFilter('All'); setStatusFilter('All'); setSearchTerm('');
      }
      setForm(emptyForm); setEditingId(null);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  function startEdit(task) {
    setEditingId(task._id);
    setForm({ title: task.title, description: task.description, dueDate: task.dueDate.slice(0, 10), category: task.category, completed: task.completed });
    setError('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => titleInputRef.current?.focus(), 350);
  }

  function cancelEdit() { setEditingId(null); setForm(emptyForm); setError(''); }

  async function toggleCompleted(task) {
    try {
      const updated = await updateTask(task._id, { completed: !task.completed });
      setTasks((c) => c.map((t) => (t._id === task._id ? updated : t)));
    } catch (err) { setError(err.message); }
  }

  async function removeTask(id) {
    try {
      await deleteTask(id);
      setTasks((c) => c.filter((t) => t._id !== id));
      if (editingId === id) cancelEdit();
    } catch (err) { setError(err.message); }
  }

  const filteredTasks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return tasks.filter((t) => {
      const cat = categoryFilter === 'All' || t.category === categoryFilter;
      const sta = statusFilter === 'All' || (statusFilter === 'Completed' && t.completed) || (statusFilter === 'Open' && !t.completed);
      const srch = !q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
      return cat && sta && srch;
    });
  }, [tasks, categoryFilter, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.completed).length;
    const open = tasks.length - completed;
    const dueSoon = tasks.filter((t) => !t.completed && daysUntil(t.dueDate) <= 2).length;
    const rate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    return { completed, open, dueSoon, rate };
  }, [tasks]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <main className="app-shell">

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">TASKIFY</p>
          <h1>{greeting},<br />{user?.name?.split(' ')[0]}.</h1>
          <p className="hero-text">
            {stats.open === 0
              ? 'All tasks complete — great work today! 🎉'
              : `You have ${stats.open} open task${stats.open !== 1 ? 's' : ''}${stats.dueSoon ? `, ${stats.dueSoon} due soon` : ''}.`}
          </p>
          <div className="hero-progress-row">
            <span className="hero-progress-label">{stats.rate}% complete</span>
            <div className="progress-track" style={{ flex: 1 }}>
              <span style={{ width: `${stats.rate}%` }} />
            </div>
          </div>
        </div>

        <HeroWidget stats={stats} tasksTotal={tasks.length} />
      </section>

      {error && <div className="alert" role="alert">{error}</div>}

      {/* ── Metrics ── */}
      <section className="metrics" aria-label="Task metrics">
        {[
          { label: 'Total tasks', value: tasks.length },
          { label: 'Open',        value: stats.open },
          { label: 'Due soon',    value: stats.dueSoon },
          { label: 'Completed',   value: stats.completed },
        ].map(({ label, value }) => (
          <article key={label}><span>{label}</span><strong>{value}</strong></article>
        ))}
      </section>

      {/* ── Workspace ── */}
      <section className="workspace">
        <form className="task-form" ref={formRef} onSubmit={handleSubmit}>
          <div className="form-title-row">
            <div>
              <p className="section-kicker">{editingId ? 'Currently editing' : 'Quick capture'}</p>
              <h2>{editingId ? 'Update task' : 'Create a task'}</h2>
            </div>
            {editingId && (
              <button className="icon-button" type="button" onClick={cancelEdit} aria-label="Cancel edit">✕</button>
            )}
          </div>

          <label>Title
            <input ref={titleInputRef} name="title" value={form.title} onChange={handleChange} placeholder="Prepare sprint plan" required />
          </label>
          <label>Description
            <textarea name="description" value={form.description} onChange={handleChange} placeholder="Add the outcome, notes, or next step." rows="4" required />
          </label>
          <div className="form-grid">
            <label>Due date
              <input type="date" name="dueDate" value={form.dueDate} onChange={handleChange} min={minDate} required />
            </label>
            <label>Category
              <select name="category" value={form.category} onChange={handleChange} required>
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" name="completed" checked={form.completed} onChange={handleChange} />
            Mark as completed
          </label>
          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add task'}
          </button>
        </form>

        <section className="task-panel">
          <div className="panel-toolbar">
            <div>
              <p className="section-kicker">Live board</p>
              <h2>{filteredTasks.length} visible tasks</h2>
            </div>
            <label className="search-field">Search
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search title or description" />
            </label>
          </div>

          <div className="filter-row" aria-label="Task filters">
            <div className="chip-group">
              {['All', ...categories].map((c) => (
                <button className={categoryFilter === c ? 'chip active' : 'chip'} key={c} type="button" onClick={() => setCategoryFilter(c)}>{c}</button>
              ))}
            </div>
            <div className="segment-control">
              {statusFilters.map((s) => (
                <button className={statusFilter === s ? 'active' : ''} key={s} type="button" onClick={() => setStatusFilter(s)}>{s}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="empty-state">Loading tasks...</p>
          ) : filteredTasks.length === 0 ? (
            <p className="empty-state">No tasks match the current filters.</p>
          ) : (
            <div className="task-list">
              {filteredTasks.map((task) => {
                const soon = !task.completed && daysUntil(task.dueDate) <= 2;
                return (
                  <article
                    className={['task-card', task.completed && 'completed', editingId === task._id && 'editing'].filter(Boolean).join(' ')}
                    key={task._id}
                  >
                    <div className="task-card-top">
                      <span className={`category category-${task.category.toLowerCase()}`}>{task.category}</span>
                      <span className={soon ? 'due-badge soon' : 'due-badge'}>{dueLabel(task)}</span>
                    </div>
                    <div className="task-main">
                      <button
                        className={task.completed ? 'complete-toggle checked' : 'complete-toggle'}
                        type="button" onClick={() => toggleCompleted(task)}
                        aria-label={task.completed ? 'Mark open' : 'Mark completed'}
                      >{task.completed ? '✓' : ''}</button>
                      <div><h3>{task.title}</h3><p>{task.description}</p></div>
                    </div>
                    <div className="task-footer">
                      <span>{formatDate(task.dueDate)}</span>
                      <div className="actions">
                        <button type="button" onClick={() => startEdit(task)}>Edit</button>
                        <button className="danger-button" type="button" onClick={() => removeTask(task._id)}>Delete</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}