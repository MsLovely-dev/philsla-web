import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PaginationProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

/**
 * Page controls for a server-paginated table: "Showing X–Y of N" plus
 * prev/next and a sliding window of up to five page numbers. Renders the count
 * summary always; the page buttons only when there is more than one page.
 */
export function Pagination({ page, pageSize, totalCount, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  const windowStart = Math.max(0, Math.min(page - 3, Math.max(pageCount - 5, 0)));
  const visiblePages = Array.from({ length: pageCount }, (_, index) => index + 1).slice(
    windowStart,
    windowStart + 5,
  );

  return (
    <div className="card-philsa bg-white px-6 py-4 flex items-center justify-between border border-slate-200">
      <p className="text-xs font-bold text-philsa-gray">
        Showing <span className="text-philsa-navy">{start}–{end}</span> of{' '}
        <span className="text-philsa-navy">{totalCount}</span>
      </p>

      {pageCount > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            aria-label="Previous page"
            className="p-2 bg-white border border-philsa-border rounded-xl text-philsa-gray disabled:opacity-30 disabled:cursor-not-allowed hover:border-philsa-navy transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1">
            {visiblePages.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer',
                  p === page
                    ? 'bg-philsa-navy text-white shadow-lg'
                    : 'bg-white border border-philsa-border text-philsa-gray hover:border-philsa-navy',
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={page >= pageCount}
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            aria-label="Next page"
            className="p-2 bg-white border border-philsa-border rounded-xl text-philsa-gray disabled:opacity-30 disabled:cursor-not-allowed hover:border-philsa-navy transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
