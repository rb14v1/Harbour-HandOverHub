export function PriorityBadge({ value }) {
  return <span className={`badge priority-${value.toLowerCase()}`}>{value}</span>;
}

export function StatusBadge({ value }) {
  return <span className={`badge status-${value.toLowerCase().replace(' ', '-')}`}>{value}</span>;
}

export function formatDate(value) {
  if (!value) return '-';
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly ? `${value}T00:00` : value);
  if (isNaN(date)) return value;
  return date.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function Alert({ type = 'error', children }) {
  return <div className={`alert alert-${type}`}>{children}</div>;
}
