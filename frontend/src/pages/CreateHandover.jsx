import { useState } from 'react';
import { api } from '../api.js';
import { Alert } from '../components.jsx';

const EMPTY = {
  employee_name: '',
  recipient_name: '',
  department: '',
  project_title: '',
  work_description: '',
  completed_tasks: '',
  pending_tasks: '',
  blockers: '',
  important_notes: '',
  priority: 'Medium',
  deadline: '',
};

export default function CreateHandover({ onNavigate }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await api.create(form);
      setForm(EMPTY);
      setMessage('Handover saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const input = (key, label, required = false, type = 'text') => (
    <label>
      {label}
      <input type={type} value={form[key]} onChange={update(key)} required={required} />
    </label>
  );

  const area = (key, label, required = false) => (
    <label className="full">
      {label}
      <textarea value={form[key]} onChange={update(key)} required={required} />
    </label>
  );

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Create Handover</h1>
          <p className="muted">Document work transfer details for the receiving employee</p>
        </div>
      </header>

      {message && (
        <Alert type="success">
          {message}{' '}
          <button className="btn btn-ghost" onClick={() => onNavigate('all')}>
            View all handovers
          </button>
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}

      <form className="card" onSubmit={handleSubmit}>
        <div className="form-grid">
          {input('employee_name', 'Employee name', true)}
          {input('recipient_name', 'Recipient name', true)}
          {input('department', 'Department')}
          {input('project_title', 'Project title', true)}
          <label>
            Priority
            <select value={form.priority} onChange={update('priority')}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>
          {input('deadline', 'Deadline', false, 'date')}
          {area('work_description', 'Work description', true)}
          {area('completed_tasks', 'Completed tasks')}
          {area('pending_tasks', 'Pending tasks')}
          {area('blockers', 'Blockers')}
          {area('important_notes', 'Important notes')}
        </div>

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Handover'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => setForm(EMPTY)}>
            Clear Form
          </button>
        </div>
      </form>
    </>
  );
}
