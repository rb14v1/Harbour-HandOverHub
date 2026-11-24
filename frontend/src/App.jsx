import { useState } from 'react';
import { LayoutDashboard, FilePlus, ListChecks } from 'lucide-react';
import Dashboard from './pages/Dashboard.jsx';
import CreateHandover from './pages/CreateHandover.jsx';
import AllHandovers from './pages/AllHandovers.jsx';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'create', label: 'Create Handover', icon: FilePlus },
  { key: 'all', label: 'All Handovers', icon: ListChecks },
];

const PAGES = { dashboard: Dashboard, create: CreateHandover, all: AllHandovers };

export default function App() {
  const [page, setPage] = useState('dashboard');
  const Page = PAGES[page];

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">H</span>
          <div>
            <strong>HandoverHub</strong>
            <small>Smart Work Handover</small>
          </div>
        </div>
        <nav>
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              className={`nav-item ${page === key ? 'active' : ''}`}
              onClick={() => setPage(key)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Page onNavigate={setPage} />
      </main>
    </div>
  );
}
