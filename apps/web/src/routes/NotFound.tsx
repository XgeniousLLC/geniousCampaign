import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base px-6 text-center text-text-primary">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-accent-hover shadow-[0_2px_10px_rgba(79,70,229,.45)]">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2 11 13" />
          <path d="M22 2 15 22l-4-9-9-4z" />
        </svg>
      </div>
      <div className="text-6xl font-semibold tracking-tight text-text-heading">404</div>
      <div className="text-lg font-semibold text-text-heading">Page not found</div>
      <p className="max-w-sm text-sm text-text-muted">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link
        to="/"
        className="mt-2 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
