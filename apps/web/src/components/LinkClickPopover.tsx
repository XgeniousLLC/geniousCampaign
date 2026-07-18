import { useEffect, useRef } from 'react';
import { ExternalLinkIcon, PencilIcon } from './icons';

// Shown when a plain <a> link inside the template body is clicked — clicking
// a link in the editor should never navigate away from the app, so this
// intercepts the click and offers "open" (in a new tab) or "edit" instead.
export function LinkClickPopover({
  href,
  x,
  y,
  onOpen,
  onEdit,
  onClose,
}: {
  href: string;
  x: number;
  y: number;
  onOpen: () => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('mousedown', handleDocMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ left: x, top: y }}
      className="fixed z-[75] flex max-w-xs items-center gap-1 rounded-md border border-border-modal bg-panel2 p-1 shadow-lg"
    >
      <span className="max-w-[200px] truncate px-2 text-xs text-text-muted">{href}</span>
      <button
        type="button"
        title="Open link in new tab"
        onClick={onOpen}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-text-quaternary hover:bg-raised hover:text-text-primary"
      >
        <ExternalLinkIcon />
      </button>
      <button
        type="button"
        title="Edit link"
        onClick={onEdit}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-text-quaternary hover:bg-raised hover:text-text-primary"
      >
        <PencilIcon />
      </button>
    </div>
  );
}
