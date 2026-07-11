import { Outlet, Link } from 'react-router-dom';
import { useUiStore } from '../stores/useUiStore';

export function Layout() {
  const { sidebarOpen, toggleSidebar } = useUiStore();

  return (
    <div className="flex min-h-screen bg-base">
      {sidebarOpen && (
        <nav className="w-56 shrink-0 border-r border-border-default bg-sidebar p-4">
          <div className="mb-6 text-sm font-semibold text-text-heading">geniusCampaign</div>
          <ul className="space-y-1 text-sm text-text-secondary">
            <li>
              <Link to="/" className="block rounded px-2 py-1.5 hover:bg-raised hover:text-text-primary">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/contacts" className="block rounded px-2 py-1.5 hover:bg-raised hover:text-text-primary">
                Contacts
              </Link>
            </li>
            <li>
              <Link to="/templates" className="block rounded px-2 py-1.5 hover:bg-raised hover:text-text-primary">
                Templates
              </Link>
            </li>
          </ul>
        </nav>
      )}
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <button
            onClick={toggleSidebar}
            className="rounded border border-border-default px-2 py-1 text-xs text-text-muted hover:text-text-primary"
          >
            {sidebarOpen ? 'Hide nav' : 'Show nav'}
          </button>
        </header>
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
