import { useEffect, useState } from 'react';
import { ClipboardList, Clock, Activity, CheckCircle2, Flag } from 'lucide-react';
import { api } from '../api.js';
import { PriorityBadge, StatusBadge, formatDate, Alert } from '../components.jsx';

export default function Dashboard({ onNavigate }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!data) return <p className="muted">Loading dashboard...</p>;

  const s = data.by_status;
  const stats = [
    { label: 'Total Handovers', value: data.total, icon: ClipboardList, tone: 'violet' },
    { label: 'Pending', value: s.Pending, icon: Clock, tone: 'amber' },
    { label: 'In Progress', value: s['In Progress'], icon: Activity, tone: 'blue' },
    { label: 'Completed', value: s.Completed, icon: CheckCircle2, tone: 'green' },
    { label: 'High Priority Open', value: data.high_priority_open, icon: Flag, tone: 'red' },
  ];

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">Overview of all work handovers</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('create')}>
          New Handover
        </button>
      </header>

      <section className="stats">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`stat tone-${tone}`}>
            <div className="stat-icon">
              <Icon size={22} />
            </div>
            <div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Recent Handovers</h2>
          <button className="btn btn-ghost" onClick={() => onNavigate('all')}>
            View all
          </button>
        </div>
        {data.recent.length === 0 ? (
          <p className="muted">No handovers yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Project</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Deadline</th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((h) => (
                  <tr key={h.id}>
                    <td>{h.employee_name}</td>
                    <td>{h.project_title}</td>
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
    </>
  );
}
