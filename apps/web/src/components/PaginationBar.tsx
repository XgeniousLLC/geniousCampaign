export function PaginationBar({ page, limit, total, onPageChange }: { page: number; limit: number; total: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between border-t border-border-subtle px-3.5 py-2.5 text-xs text-text-meta">
      <span>
        Showing {from}–{to} of {total}
      </span>
      <div className="flex gap-1.5">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-7 rounded-md border border-border-strong bg-field px-2.5 text-xs text-text-tertiary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-7 rounded-md border border-border-strong bg-field px-2.5 text-xs text-text-tertiary hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
