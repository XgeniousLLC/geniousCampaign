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
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-base text-center text-text-primary">
          <div className="text-lg font-semibold text-text-heading">Something went wrong.</div>
          <p className="max-w-sm text-sm text-text-muted">
            The error has been logged. Try reloading the page — if it keeps happening, check Settings &gt; Debug log.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 h-9 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
