import { useEffect, useMemo, useRef, useState } from 'react';
import { createTask, deleteTask, getTasks, updateTask } from './api.js';

const categories = ['Work', 'Personal', 'Urgent'];
const statusFilters = ['All', 'Open', 'Completed'];

const emptyForm = {
  title: '',
  description: '',
  dueDate: '',
  category: 'Work',
  completed: false
};

function todayInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function daysUntil(value) {
  const today = new Date(todayInputValue());
  const due = new Date(value.slice(0, 10));
  return Math.ceil((due - today) / 86400000);
}

function dueLabel(task) {
  const days = daysUntil(task.dueDate);

  if (task.completed) {
    return 'Completed';
  }

  if (days === 0) {
    return 'Due today';
  }

  if (days === 1) {
    return 'Due tomorrow';
  }

  return `Due in ${days} days`;
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const formRef = useRef(null);
  const titleInputRef = useRef(null);

  const minDate = todayInputValue();

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    try {
      setLoading(true);
      setError('');
      const data = await getTasks();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function validateTask(task) {
    if (!task.title.trim() || !task.description.trim() || !task.dueDate || !task.category) {
      return 'All fields are required.';
    }

    if (task.dueDate < minDate) {
      return 'Due date cannot be in the past.';
    }

    return '';
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const validationError = validateTask(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim()
      };

      if (editingId) {
        const updated = await updateTask(editingId, payload);
        setTasks((current) => current.map((task) => (task._id === editingId ? updated : task)));
      } else {
        const created = await createTask(payload);
        setTasks((current) => [created, ...current]);
        setCategoryFilter('All');
        setStatusFilter('All');
        setSearchTerm('');
      }

      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(task) {
    setEditingId(task._id);
    setForm({
      title: task.title,
      description: task.description,
      dueDate: task.dueDate.slice(0, 10),
      category: task.category,
      completed: task.completed
    });
    setError('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 350);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function toggleCompleted(task) {
    try {
      setError('');
      const updated = await updateTask(task._id, { completed: !task.completed });
      setTasks((current) => current.map((item) => (item._id === task._id ? updated : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeTask(id) {
    try {
      setError('');
      await deleteTask(id);
      setTasks((current) => current.filter((task) => task._id !== id));
      if (editingId === id) {
        cancelEdit();
      }
    } catch (err) {
      setError(err.message);
    }
  }

  const filteredTasks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return tasks.filter((task) => {
      const categoryMatch = categoryFilter === 'All' || task.category === categoryFilter;
      const statusMatch =
        statusFilter === 'All' ||
        (statusFilter === 'Completed' && task.completed) ||
        (statusFilter === 'Open' && !task.completed);
      const searchMatch =
        !query ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query);

      return categoryMatch && statusMatch && searchMatch;
    });
  }, [tasks, categoryFilter, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    const open = tasks.length - completed;
    const dueSoon = tasks.filter((task) => !task.completed && daysUntil(task.dueDate) <= 2).length;
    const completionRate = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

    return { completed, open, dueSoon, completionRate };
  }, [tasks]);

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">TASKIFY</p>
          <h1>Plan the work. Finish the day.</h1>
          <p className="hero-text">
            A focused MERN task board with fast capture, clear priorities, and live filters.
          </p>
        </div>

        <div className="hero-card" aria-label="Task summary">
          <span className="hero-card-label">Completion</span>
          <strong>{stats.completionRate}%</strong>
          <div className="progress-track">
            <span style={{ width: `${stats.completionRate}%` }} />
          </div>
        </div>
      </section>

      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      <section className="metrics" aria-label="Task metrics">
        <article>
          <span>Total tasks</span>
          <strong>{tasks.length}</strong>
        </article>
        <article>
          <span>Open</span>
          <strong>{stats.open}</strong>
        </article>
        <article>
          <span>Due soon</span>
          <strong>{stats.dueSoon}</strong>
        </article>
        <article>
          <span>Completed</span>
          <strong>{stats.completed}</strong>
        </article>
      </section>

      <section className="workspace">
        <form className="task-form" ref={formRef} onSubmit={handleSubmit}>
          <div className="form-title-row">
            <div>
              <p className="section-kicker">{editingId ? 'Currently editing' : 'Quick capture'}</p>
              <h2>{editingId ? 'Update task' : 'Create a task'}</h2>
            </div>
            {editingId && (
              <button className="icon-button" type="button" onClick={cancelEdit} aria-label="Cancel edit">
                X
              </button>
            )}
          </div>

          <label>
            Title
            <input
              ref={titleInputRef}
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Prepare sprint plan"
              required
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Add the outcome, notes, or next step."
              rows="4"
              required
            />
          </label>

          <div className="form-grid">
            <label>
              Due date
              <input
                type="date"
                name="dueDate"
                value={form.dueDate}
                onChange={handleChange}
                min={minDate}
                required
              />
            </label>

            <label>
              Category
              <select name="category" value={form.category} onChange={handleChange} required>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="checkbox-label">
            <input
              type="checkbox"
              name="completed"
              checked={form.completed}
              onChange={handleChange}
            />
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
            <label className="search-field">
              Search
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search title or description"
              />
            </label>
          </div>

          <div className="filter-row" aria-label="Task filters">
            <div className="chip-group">
              {['All', ...categories].map((category) => (
                <button
                  className={categoryFilter === category ? 'chip active' : 'chip'}
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="segment-control">
              {statusFilters.map((status) => (
                <button
                  className={statusFilter === status ? 'active' : ''}
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </button>
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
                const dueSoon = !task.completed && daysUntil(task.dueDate) <= 2;

                return (
                  <article
                    className={[
                      'task-card',
                      task.completed ? 'completed' : '',
                      editingId === task._id ? 'editing' : ''
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    key={task._id}
                  >
                    <div className="task-card-top">
                      <span className={`category category-${task.category.toLowerCase()}`}>
                        {task.category}
                      </span>
                      <span className={dueSoon ? 'due-badge soon' : 'due-badge'}>{dueLabel(task)}</span>
                    </div>

                    <div className="task-main">
                      <button
                        className={task.completed ? 'complete-toggle checked' : 'complete-toggle'}
                        type="button"
                        onClick={() => toggleCompleted(task)}
                        aria-label={task.completed ? 'Mark task open' : 'Mark task completed'}
                      >
                        {task.completed ? '✓' : ''}
                      </button>

                      <div>
                        <h3>{task.title}</h3>
                        <p>{task.description}</p>
                      </div>
                    </div>

                    <div className="task-footer">
                      <span>{formatDate(task.dueDate)}</span>
                      <div className="actions">
                        <button type="button" onClick={() => startEdit(task)}>
                          Edit
                        </button>
                        <button className="danger-button" type="button" onClick={() => removeTask(task._id)}>
                          Delete
                        </button>
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
