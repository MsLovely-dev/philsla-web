import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type NotificationTone = 'success' | 'error' | 'warning' | 'info';

interface NotificationToastProps {
  title: string;
  message?: string;
  tone?: NotificationTone;
  onDismiss?: () => void;
}

const toneStyles: Record<NotificationTone, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
};

const toneIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function NotificationToast({ title, message, tone = 'info', onDismiss }: NotificationToastProps) {
  const Icon = toneIcons[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      aria-live={tone === 'error' ? 'assertive' : 'polite'}
      className={cn('flex w-full max-w-sm items-start gap-3 rounded-xl border p-4 shadow-lg', toneStyles[tone])}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black">{title}</p>
        {message && <p className="mt-1 text-xs leading-relaxed opacity-80">{message}</p>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss notification" className="rounded-md p-1 hover:bg-black/5">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export function NotificationRegion({ children }: { children: ReactNode }) {
  return (
    <div aria-label="Notifications" className="pointer-events-none fixed right-4 top-4 z-[110] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
      <div className="pointer-events-auto contents">{children}</div>
    </div>
  );
}
