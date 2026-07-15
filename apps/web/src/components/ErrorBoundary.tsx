import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '../lib/debugLogApi';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// Catches render-time errors anywhere below it in the tree — window.onerror
// (see main.tsx) does not catch these, React requires a class-based boundary.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportError({
      message: error.message,
      stack: `${error.stack ?? ''}\n${info.componentStack ?? ''}`,
      path: window.location.pathname,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-base px-6 text-center text-text-primary">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[9px] bg-danger/15">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            </svg>
          </div>
          <div className="text-6xl font-semibold tracking-tight text-text-heading">500</div>
          <div className="text-lg font-semibold text-text-heading">Something went wrong</div>
          <p className="max-w-sm text-sm text-text-muted">
            The error has been logged. Try reloading the page — if it keeps happening, check Settings &gt; Debug log.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
