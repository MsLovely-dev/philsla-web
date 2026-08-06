import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ModalShellProps {
  isOpen: boolean;
  children: ReactNode;
  /** Extra classes for the white panel (e.g. max width, padding, spacing). */
  className?: string;
}

/**
 * Animated modal container shared by the maintenance add/edit/export modals.
 * Gives them the same smooth fade + scale open/close transition (and
 * reduced-motion fallback) as ConfirmationDialog, instead of appearing and
 * vanishing instantly. Dismissal stays with the Cancel/X controls inside
 * `children` so a partially-filled form is never lost to a stray backdrop click.
 */
export function ModalShell({ isOpen, children, className }: ModalShellProps) {
  const prefersReducedMotion = useReducedMotion();
  const panelMotion = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.96, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, y: 12 },
        transition: { duration: 0.18, ease: 'easeOut' as const },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            {...panelMotion}
            className={cn('relative w-full bg-white rounded-3xl shadow-2xl border border-slate-100', className)}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
