import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Standard combobox for the app. Wraps a native <select> with a consistent
 * style and a custom chevron (via `appearance-none`) so every dropdown looks
 * identical across browsers/OSes. Pass `value`/`onChange`/`disabled`/etc.
 * through as usual; `className` is merged onto the select for one-off tweaks.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none px-3 py-2 pr-9 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-philsa-navy',
            'focus:bg-white focus:outline-none focus:ring-2 focus:ring-philsa-navy/20',
            'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer transition-all',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          aria-hidden="true"
        />
      </div>
    );
  },
);
