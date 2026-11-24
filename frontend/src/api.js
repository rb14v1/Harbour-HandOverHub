const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001/api';

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(API_URL + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch {
    throw new Error('Cannot reach the backend. Check that the Django server is running on port 8000.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status}). Check that MongoDB is running.`);
  }
  return data;
}

export const api = {
  dashboard: () => request('/dashboard/'),
  list: (params) => request('/handovers/?' + new URLSearchParams(params)),
  create: (body) => request('/handovers/', { method: 'POST', body: JSON.stringify(body) }),
  updateStatus: (id, status) =>
    request(`/handovers/${id}/`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  remove: (id) => request(`/handovers/${id}/`, { method: 'DELETE' }),
  summary: (id) => request(`/handovers/${id}/summary/`, { method: 'POST' }),
};
