import { Link } from 'react-router-dom';

const FEATURES = [
  { title: 'Contacts, lists & tags', desc: 'Import, segment, and manage your audience with CSV import and colored tags.' },
  { title: 'Template editor', desc: 'Rich-text editor with spintax variants and AI-assisted copywriting (OpenAI or DeepSeek).' },
  { title: 'Sequences', desc: 'Multi-step drip sequences with per-contact enrollment, pause/resume, and delays.' },
  { title: 'Campaigns', desc: 'One-off sends with open/click tracking and engagement analytics.' },
  { title: 'Email verification', desc: 'Bulk deliverability checks before you send, so your sender reputation stays clean.' },
  { title: 'Triggers & webhooks', desc: 'Auto-enroll contacts on events — tag added, field changed, or an inbound webhook.' },
  { title: 'Sender rotation', desc: 'AWS SES and Gmail Workspace accounts, quota-aware, rotated automatically.' },
];

export function About() {
  return (
    <div className="flex min-h-screen flex-col bg-base text-text-primary">
      <header className="border-b border-border-subtle px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-accent-hover shadow-[0_2px_10px_rgba(79,70,229,.45)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4z" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight text-text-heading">geniusCampaign</span>
            <a href="https://xgenious.com" target="_blank" rel="noreferrer" className="text-[11px] font-medium text-text-faint hover:text-text-tertiary">
              by xgenious.com
            </a>
          </div>
          <div className="flex-1" />
          <Link to="/login" className="text-xs font-medium text-accent-light hover:text-accent-lighter">
            Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-3 text-3xl font-semibold tracking-tight text-text-heading">
            Free, open-source email outreach — no per-seat pricing.
          </h1>
          <p className="mb-8 max-w-xl text-sm text-text-tertiary">
            geniusCampaign is a self-hosted email marketing and outreach platform: contacts, templates, sequences,
            campaigns, deliverability, and sender rotation in one console. Built and maintained by{' '}
            <a href="https://xgenious.com" target="_blank" rel="noreferrer" className="text-accent-light hover:text-accent-lighter">
              xgenious.com
            </a>
            , released free and open source.
          </p>

          <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-md border border-border-default bg-panel p-4">
                <div className="mb-1 text-sm font-semibold text-text-primary">{f.title}</div>
                <div className="text-xs text-text-tertiary">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-border-default bg-panel p-5">
            <div className="mb-1 text-sm font-semibold text-text-primary">Run your own instance</div>
            <p className="mb-3 text-xs text-text-tertiary">
              Bring your own AWS SES / Gmail Workspace / Cloudflare R2 credentials — nothing routes through a third-party
              server. Source and setup instructions are maintained by xgenious.com.
            </p>
            <a
              href="https://xgenious.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              Visit xgenious.com
            </a>
          </div>
        </div>
      </main>

      <footer className="border-t border-border-subtle px-6 py-4 text-center text-[11px] text-text-faint">
        © {new Date().getFullYear()} xgenious.com. All rights reserved.
      </footer>
    </div>
  );
}
