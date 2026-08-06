import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn } from '../../lib/utils';

interface ModalShellProps {
  isOpen: boolean;
  children: ReactNode;
  /** Extra classes for the white panel (e.g. max width, padding, spacing). */
  className?: string;
  /** Called when the backdrop is clicked. Omit to disable click-outside dismissal. */
  onClose?: () => void;
  /**
   * Whether this shell paints its own dimmed/blurred backdrop. Set `false` when
   * the shell sits *underneath* another open modal, so backdrops don't stack and
   * double the blur/opacity. Defaults to `true`.
   */
  backdrop?: boolean;
  /** z-index utility for the overlay. Lower it (e.g. `z-40`) for a modal that another modal stacks on top of. Defaults to `z-[100]`. */
  zClass?: string;
}

/**
 * Animated modal container shared by the maintenance add/edit/export/details
 * modals. Gives them the same smooth fade + scale open/close transition (and
 * reduced-motion fallback) as ConfirmationDialog. Clicking the backdrop calls
 * `onClose`; a stacked (underneath) modal passes `backdrop={false}` so only the
 * topmost modal dims the screen.
 */
export function ModalShell({
  isOpen,
  children,
  className,
  onClose,
  backdrop = true,
  zClass = 'z-[100]',
}: ModalShellProps) {
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
        <div className={cn('fixed inset-0 flex items-center justify-center p-4', zClass)}>
          {backdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
          )}
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
