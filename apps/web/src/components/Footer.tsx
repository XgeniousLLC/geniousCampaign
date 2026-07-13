import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="shrink-0 border-t border-border-subtle px-6 py-2.5 text-center text-[11px] text-text-faint">
      © {new Date().getFullYear()}{' '}
      <Link to="/about" className="hover:text-text-tertiary">
        xgenious.com
      </Link>
      . All rights reserved.
    </footer>
  );
}
