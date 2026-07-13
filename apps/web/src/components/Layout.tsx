import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '../stores/useUiStore';
import { useAuthStore } from '../stores/useAuthStore';
import { getPublicSummary } from '../lib/analyticsApi';
import { listSenderAccounts } from '../lib/senderAccountsApi';
import { Footer } from './Footer';
import { ChevronDownIcon, UserIcon, LockIcon } from './icons';

const SITE_TITLE = 'geniusCampaign';

const PAGE_TITLES: Array<[string, string]> = [
  ['/contacts', 'Contacts'],
  ['/lists', 'Lists & Tags'],
  ['/verification', 'Verification'],
  ['/templates', 'Templates'],
  ['/campaigns', 'Campaigns'],
  ['/sequences', 'Sequences'],
  ['/triggers', 'Triggers'],
  ['/webhooks', 'Webhooks'],
  ['/email-log', 'Email Log'],
  ['/settings/sender-accounts', 'Sender Accounts'],
  ['/settings/change-password', 'Change Password'],
  ['/settings', 'Settings'],
  ['/profile', 'Profile'],
];

function pageTitleFor(pathname: string): string {
  if (pathname === '/') return 'Dashboard';
  const match = PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix));
  return match ? match[1] : SITE_TITLE;
}

const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </>
  ),
  contacts: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  lists: (
    <>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  verification: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </>
  ),
  templates: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z" />
      <path d="M14 2v5h5" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </>
  ),
  campaigns: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4z" />
    </>
  ),
  sequences: (
    <>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </>
  ),
  triggers: (
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  ),
  senders: (
    <>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  webhooks: (
    <>
      <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
      <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
      <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
    </>
  ),
  emailLog: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M9 13l2 2 4-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
};

function NavIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      {children}
    </svg>
  );
}

function NavGroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2.5 pb-1 pt-3.5 text-[10px] font-semibold uppercase tracking-wide text-text-label">{children}</div>;
}

function NavItem({ to, icon, children, badge }: { to: string; icon: React.ReactNode; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] font-medium ${
          isActive ? 'bg-raised text-text-primary' : 'text-text-tertiary hover:bg-raised2 hover:text-text-primary'
        }`
      }
    >
      <NavIcon>{icon}</NavIcon>
      <span className="flex-1 truncate">{children}</span>
      {badge}
    </NavLink>
  );
}

function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

const NEW_ACTIONS = [
  { label: 'New campaign', to: '/campaigns/new' },
  { label: 'New template', to: '/templates/new' },
  { label: 'New sequence', to: '/sequences' },
];

export function Layout() {
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [contactCount, setContactCount] = useState<number | null>(null);
  const [senderWarn, setSenderWarn] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    getPublicSummary()
      .then((s) => setContactCount(s.contactCount))
      .catch(() => setContactCount(null));
    listSenderAccounts()
      .then((accounts) => setSenderWarn(accounts.some((a) => a.isActive && a.sentToday / a.dailySendLimit >= 0.9)))
      .catch(() => setSenderWarn(false));
  }, []);

  useEffect(() => {
    document.title = `${pageTitleFor(location.pathname)} · ${SITE_TITLE}`;
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const displayName = user ? user.name || user.email : '';
  const initials = user ? displayName.slice(0, 2).toUpperCase() : '??';

  return (
    <div className="flex h-screen overflow-hidden bg-base text-text-primary">
      {sidebarOpen && (
        <aside className="flex w-[238px] shrink-0 flex-col border-r border-border-subtle bg-sidebar">
          <div className="flex items-center gap-2.5 border-b border-border-subtle px-4 py-3.5">
            <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent to-accent-gradient-end shadow-[0_2px_8px_rgba(79,70,229,.4)]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4z" />
              </svg>
            </div>
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-[13.5px] font-semibold tracking-tight text-text-heading">geniusCampaign</span>
              <a
                href="https://xgenious.com"
                target="_blank"
                rel="noreferrer"
                className="truncate text-[10.5px] font-medium text-text-meta hover:text-text-tertiary"
              >
                by xgenious.com
              </a>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-2.5 pb-1 pt-2.5">
            <NavItem to="/" icon={ICONS.dashboard}>
              Dashboard
            </NavItem>

            <NavGroupLabel>Audience</NavGroupLabel>
            <NavItem
              to="/contacts"
              icon={ICONS.contacts}
              badge={contactCount !== null ? <span className="font-mono text-[11px] text-text-meta">{formatCount(contactCount)}</span> : null}
            >
              Contacts
            </NavItem>
            <NavItem to="/lists" icon={ICONS.lists}>
              Lists &amp; Tags
            </NavItem>
            <NavItem to="/verification" icon={ICONS.verification}>
              Verification
            </NavItem>

            <NavGroupLabel>Content</NavGroupLabel>
            <NavItem to="/templates" icon={ICONS.templates}>
              Templates
            </NavItem>

            <NavGroupLabel>Delivery</NavGroupLabel>
            <NavItem to="/campaigns" icon={ICONS.campaigns}>
              Campaigns
            </NavItem>
            <NavItem to="/sequences" icon={ICONS.sequences}>
              Sequences
            </NavItem>
            <NavItem to="/triggers" icon={ICONS.triggers}>
              Triggers
            </NavItem>

            <NavGroupLabel>Infrastructure</NavGroupLabel>
            <NavItem
              to="/settings/sender-accounts"
              icon={ICONS.senders}
              badge={senderWarn ? <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-warning" title="A sender account is near its daily quota" /> : null}
            >
              Sender Accounts
            </NavItem>
            <NavItem to="/webhooks" icon={ICONS.webhooks}>
              Webhooks
            </NavItem>
            <NavItem to="/email-log" icon={ICONS.emailLog}>
              Email Log
            </NavItem>
          </nav>

          <div className="border-t border-border-subtle px-2.5 py-2">
            <NavItem to="/settings" icon={ICONS.settings}>
              Settings
            </NavItem>
          </div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[52px] shrink-0 items-center gap-3.5 border-b border-border-subtle bg-base/70 px-5 backdrop-blur">
          <button
            onClick={toggleSidebar}
            title={sidebarOpen ? 'Hide nav' : 'Show nav'}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-strong text-text-quaternary hover:bg-field"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="flex-1" />

          <div className="relative">
            <button
              onClick={() => setNewMenuOpen((o) => !o)}
              className="flex h-8 items-center gap-1.5 rounded-md bg-accent px-3 text-[12.5px] font-semibold text-white shadow-sm hover:bg-accent-hover"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              New
            </button>
            {newMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNewMenuOpen(false)} />
                <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-border-modal bg-panel2 py-1 shadow-[0_20px_50px_rgba(0,0,0,.55)]">
                  {NEW_ACTIONS.map((a) => (
                    <NavLink
                      key={a.to}
                      to={a.to}
                      onClick={() => setNewMenuOpen(false)}
                      className="block px-3 py-2 text-xs text-text-secondary hover:bg-raised hover:text-text-primary"
                    >
                      {a.label}
                    </NavLink>
                  ))}
                </div>
              </>
            )}
          </div>

          {user && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex h-8 items-center gap-2 rounded-md border border-border-strong pl-1 pr-2 hover:bg-field"
              >
                <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-info-alt to-accent text-[10.5px] font-semibold text-white">
                  {initials}
                </div>
                <span className="max-w-[140px] truncate text-[12px] font-medium text-text-secondary">{displayName}</span>
                <ChevronDownIcon className="shrink-0 text-text-quaternary" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-9 z-20 w-52 overflow-hidden rounded-lg border border-border-modal bg-panel2 py-1 shadow-[0_20px_50px_rgba(0,0,0,.55)]">
                    <div className="border-b border-border-subtle px-3 py-2">
                      <div className="truncate text-xs font-medium text-text-secondary">{displayName}</div>
                      {user.name && <div className="truncate text-[10.5px] text-text-faint">{user.email}</div>}
                      <div className="text-[10.5px] capitalize text-text-meta">{user.role}</div>
                    </div>
                    <NavLink
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-raised hover:text-text-primary"
                    >
                      <UserIcon className="shrink-0" />
                      Profile
                    </NavLink>
                    <NavLink
                      to="/settings/change-password"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-raised hover:text-text-primary"
                    >
                      <LockIcon className="shrink-0" />
                      Change password
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 border-t border-border-subtle px-3 py-2 text-left text-xs text-text-secondary hover:bg-raised hover:text-text-primary"
                    >
                      <NavIcon>{ICONS.logout}</NavIcon>
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto bg-base">
          <div className="mx-auto max-w-[1360px] px-6 py-5">
            <Outlet />
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
