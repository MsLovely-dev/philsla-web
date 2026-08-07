import { cn } from '../../lib/utils';

export type ActivationStatus = 'Active' | 'Inactive';

interface StatusToggleProps {
  value: ActivationStatus;
  onChange: (value: ActivationStatus) => void;
  disabled?: boolean;
}

/**
 * Active/Inactive switch used in place of a two-option dropdown. The label
 * reflects and is part of the control, and it exposes `role="switch"` for a11y.
 */
export function StatusToggle({ value, onChange, disabled = false }: StatusToggleProps) {
  const active = value === 'Active';
  return (
    <div className="flex items-center gap-3 py-1">
      <button
        type="button"
        role="switch"
        aria-checked={active}
        aria-label="Toggle active status"
        disabled={disabled}
        onClick={() => onChange(active ? 'Inactive' : 'Active')}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors outline-none focus:ring-2 focus:ring-philsa-navy/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
          active ? 'bg-emerald-500' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
            active ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
      <span className={cn('text-xs font-bold', active ? 'text-emerald-700' : 'text-slate-500')}>
        {value}
      </span>
    </div>
  );
}
