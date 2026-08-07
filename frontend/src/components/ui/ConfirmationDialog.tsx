import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  /** Optional supporting detail (e.g. the specific record affected), shown as its own block below the message. */
  details?: React.ReactNode;
  /** Small uppercase label above the title. Defaults to a sensible value per `tone` if omitted. */
  eyebrow?: string;
  /** Overrides the default warning icon. */
  icon?: LucideIcon;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
  isConfirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const TONE_STYLES = {
  default: {
    eyebrow: 'Confirm Action',
    badgeClass: 'badge-pending',
    spineClass: 'bg-philsa-navy',
    iconClass: 'text-philsa-navy',
    confirmButtonClass: 'bg-philsa-navy shadow-philsa-navy/10 hover:bg-philsa-navy/90',
  },
  danger: {
    eyebrow: 'Confirmation Details',
    badgeClass: 'badge-rejected',
    spineClass: 'bg-philsa-red',
    iconClass: 'text-philsa-red',
    confirmButtonClass: 'bg-philsa-red shadow-philsa-red/20 hover:bg-philsa-red-hover',
  },
} as const;

export function ConfirmationDialog({
  isOpen,
  title,
  message,
  details,
  eyebrow,
  icon: Icon = AlertTriangle,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  isConfirming = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const toneStyles = TONE_STYLES[tone];

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isConfirming) onCancel();
      if (event.key === 'Tab') {
        const focusable = dialogRef.current
          ? Array.from(
              dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
            )
          : [];
        const first = focusable[0] as HTMLElement | undefined;
        const last = focusable.at(-1) as HTMLElement | undefined;
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isConfirming, isOpen, onCancel]);

  const panelMotionProps = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.96, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, y: 12 },
        transition: { duration: 0.18, ease: 'easeOut' as const },
      };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isConfirming) onCancel();
          }}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-philsa-navy/60 backdrop-blur-sm"
          />
          <motion.section
            {...panelMotionProps}
            ref={dialogRef}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-philsa-border bg-white shadow-2xl"
          >
            <div aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1.5', toneStyles.spineClass)} />

            <button
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
              aria-label="Close dialog"
              className="absolute right-4 top-4 rounded-lg p-2 text-philsa-gray hover:bg-slate-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="pl-8 pr-12 pt-7">
              <span className={cn('badge-status', toneStyles.badgeClass)}>{eyebrow ?? toneStyles.eyebrow}</span>
              <h2 id={titleId} className="mt-2.5 flex items-center gap-2 text-xl font-black text-philsa-navy">
                <Icon className={cn('h-5 w-5 flex-shrink-0', toneStyles.iconClass)} aria-hidden="true" />
                {title}
              </h2>
              <p id={messageId} className="mt-2 text-sm leading-relaxed text-philsa-gray">{message}</p>
              {details && (
                <div className="mt-4 border-t border-dashed border-philsa-border pt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">Affected Record</p>
                  <p className="mt-1 font-mono text-xs font-bold text-philsa-navy">{details}</p>
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-col-reverse gap-2 border-t border-philsa-border bg-slate-50/60 py-4 pl-8 pr-6 sm:flex-row sm:justify-end">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={onCancel}
                disabled={isConfirming}
                className="rounded-lg px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-philsa-gray transition-colors hover:bg-slate-100 hover:text-philsa-navy disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isConfirming}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60',
                  toneStyles.confirmButtonClass,
                )}
              >
                {isConfirming && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                {isConfirming ? 'Please wait...' : confirmLabel}
              </button>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
