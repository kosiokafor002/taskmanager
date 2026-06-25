import { useEffect, useState } from 'react';
import { emptyTrash, getTrashedTasks, permanentlyDeleteTask, restoreTask } from '../api.js';

function formatDate(v) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(v));
}

function timeAgo(v) {
  const diff = Date.now() - new Date(v).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export default function Trash() {
  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [confirming, setConfirming] = useState(null); // 'empty' | task._id
  const [busy, setBusy]           = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError('');
      setTasks(await getTrashedTasks());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRestore(id) {
    try {
      setBusy(true);
      await restoreTask(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handlePermanentDelete(id) {
    if (confirming !== id) { setConfirming(id); return; }
    try {
      setBusy(true);
      await permanentlyDeleteTask(id);
      setTasks((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  async function handleEmptyTrash() {
    if (confirming !== 'empty') { setConfirming('empty'); return; }
    try {
      setBusy(true);
      await emptyTrash();
      setTasks([]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  return (
    <main className="app-shell">

      {/* ── Page header ── */}
      <section className="trash-hero">
        <div className="trash-hero-copy">
          <p className="eyebrow" style={{ color: '#f4a89a' }}>TASKIFY</p>
          <h1 className="trash-heading">
            <span className="trash-icon-large">🗑</span>
            Trash
          </h1>
          <p className="trash-subhead">
            {tasks.length === 0 && !loading
              ? 'Your trash is empty.'
              : `${tasks.length} deleted task${tasks.length !== 1 ? 's' : ''} — restore or remove them permanently.`}
          </p>
        </div>

        {tasks.length > 0 && (
          <div className="trash-hero-actions">
            {confirming === 'empty' ? (
              <div className="confirm-inline">
                <span>Empty all {tasks.length} tasks?</span>
                <button
                  className="danger-confirm-btn"
                  type="button"
                  disabled={busy}
                  onClick={handleEmptyTrash}
                >
                  Yes, empty trash
                </button>
                <button
                  className="cancel-confirm-btn"
                  type="button"
                  onClick={() => setConfirming(null)}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                className="empty-trash-btn"
                type="button"
                disabled={busy}
                onClick={handleEmptyTrash}
              >
                Empty trash
              </button>
            )}
          </div>
        )}
      </section>

      {error && (
        <div className="alert" role="alert" style={{ marginBottom: '18px' }}>{error}</div>
      )}

      {/* ── Task list ── */}
      {loading ? (
        <p className="empty-state">Loading trash...</p>
      ) : tasks.length === 0 ? (
        <div className="trash-empty">
          <span className="trash-empty-icon">🗑</span>
          <p className="trash-empty-title">Nothing here</p>
          <p className="trash-empty-sub">Deleted tasks will appear here. You can restore or permanently remove them.</p>
        </div>
      ) : (
        <div className="trash-list">
          {tasks.map((task) => (
            <article key={task._id} className="trash-card">
              <div className="trash-card-meta">
                <span className={`category category-${task.category.toLowerCase()}`}>
                  {task.category}
                </span>
                <span className="trash-deleted-at">
                  Deleted {timeAgo(task.deletedAt)}
                </span>
              </div>

              <div className="trash-card-body">
                <h3 className="trash-card-title">{task.title}</h3>
                <p className="trash-card-desc">{task.description}</p>
              </div>

              <div className="trash-card-footer">
                <span className="trash-due">Due {formatDate(task.dueDate)}</span>

                <div className="trash-card-actions">
                  <button
                    type="button"
                    className="restore-btn"
                    disabled={busy}
                    onClick={() => handleRestore(task._id)}
                  >
                    ↩ Restore
                  </button>

                  {confirming === task._id ? (
                    <>
                      <button
                        type="button"
                        className="danger-confirm-btn"
                        disabled={busy}
                        onClick={() => handlePermanentDelete(task._id)}
                      >
                        Delete forever
                      </button>
                      <button
                        type="button"
                        className="cancel-confirm-btn"
                        onClick={() => setConfirming(null)}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="danger-button"
                      disabled={busy}
                      onClick={() => handlePermanentDelete(task._id)}
                    >
                      Delete forever
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}