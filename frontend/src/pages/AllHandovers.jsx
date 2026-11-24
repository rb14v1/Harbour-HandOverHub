import { useCallback, useEffect, useState } from 'react';
import { Search, Trash2, X, Sparkles } from 'lucide-react';
import { api } from '../api.js';
import { PriorityBadge, StatusBadge, formatDate, Alert } from '../components.jsx';

const STATUSES = ['Pending', 'In Progress', 'Completed'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const DETAIL_FIELDS = [
  ['recipient_name', 'Recipient'],
  ['department', 'Department'],
  ['deadline', 'Deadline'],
  ['work_description', 'Work description'],
  ['completed_tasks', 'Completed tasks'],
  ['pending_tasks', 'Pending tasks'],
  ['blockers', 'Blockers'],
  ['important_notes', 'Important notes'],
];

export default function AllHandovers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (q.trim()) params.q = q.trim();
    if (priority) params.priority = priority;
    if (status) params.status = status;
    return api
      .list(params)
      .then((data) => {
        setItems(data);
        setError('');
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [q, priority, status]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>All Handovers</h1>
          <p className="muted">Search, filter, review and update handovers</p>
        </div>
      </header>

      <section className="card">
        <div className="toolbar">
          <div className="search">
            <Search size={16} />
            <input
              placeholder="Search by employee or project"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        {error && <Alert>{error}</Alert>}

        {loading ? (
          <p className="muted">Loading...</p>
        ) : error ? null : items.length === 0 ? (
          <p className="muted">No handovers match your filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Recipient</th>
                  <th>Project</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {items.map((h) => (
                  <tr key={h.id} className="clickable" onClick={() => setSelected(h)}>
                    <td>{h.employee_name}</td>
                    <td>{h.recipient_name}</td>
                    <td>{h.project_title}</td>
                    <td>{h.department || '-'}</td>
                    <td>
                      <PriorityBadge value={h.priority} />
                    </td>
                    <td>
                      <StatusBadge value={h.status} />
                    </td>
                    <td>{formatDate(h.deadline)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <DetailModal
          key={selected.id}
          handover={selected}
          onClose={() => setSelected(null)}
          onUpdated={(h) => {
            setSelected(h);
            load();
          }}
          onDeleted={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </>
  );
}

function DetailModal({ handover, onClose, onUpdated, onDeleted }) {
  const [current, setCurrent] = useState(handover);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState(null);
  const [summary, setSummary] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function changeStatus(e) {
    setBusy(true);
    setNote(null);
    try {
      const updated = await api.updateStatus(current.id, e.target.value);
      setCurrent(updated);
      onUpdated(updated);
      setNote({ type: 'success', text: 'Status updated.' });
    } catch (err) {
      setNote({ type: 'error', text: err.message });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the handover for ${current.employee_name}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.remove(current.id);
      onDeleted();
    } catch (err) {
      setNote({ type: 'error', text: err.message });
      setBusy(false);
    }
  }

  async function generateSummary() {
    setSummaryLoading(true);
    setSummaryError('');
    setSummary('');
    try {
      const result = await api.summary(current.id);
      setSummary(result.summary);
    } catch (err) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{current.project_title}</h2>
            <p className="muted">
              {current.employee_name} to {current.recipient_name}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="badges">
          <PriorityBadge value={current.priority} />
          <StatusBadge value={current.status} />
        </div>

        {note && <Alert type={note.type}>{note.text}</Alert>}

        <div className="actions">
          <select value={current.status} onChange={changeStatus} disabled={busy}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={generateSummary} disabled={summaryLoading}>
            <Sparkles size={16} />
            {summaryLoading ? 'Generating...' : 'Generate AI Summary'}
          </button>
          <button className="btn btn-danger" onClick={remove} disabled={busy}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>

        {summaryError && <Alert>{summaryError}</Alert>}
        {summary && <div className="summary">{summary}</div>}

        <dl className="details">
          <div>
            <dt>Employee</dt>
            <dd>{current.employee_name}</dd>
          </div>
          {DETAIL_FIELDS.map(([key, label]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{key === 'deadline' ? formatDate(current[key]) : current[key] || '-'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
