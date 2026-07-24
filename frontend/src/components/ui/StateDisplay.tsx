import { ReactNode } from 'react';
import { AlertTriangle, Inbox, LoaderCircle, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StateDisplayProps {
  title: string;
  message?: string;
  icon: LucideIcon;
  action?: ReactNode;
  className?: string;
  role?: 'status' | 'alert';
  busy?: boolean;
}

export function StateDisplay({
  title,
  message,
  icon: Icon,
  action,
  className,
  role = 'status',
  busy = false,
}: StateDisplayProps) {
  return (
    <section
      className={cn('card-philsa w-full max-w-lg text-center space-y-6', className)}
      role={role}
      aria-busy={busy || undefined}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
    >
      <div className="w-16 h-16 rounded-3xl bg-slate-100 text-philsa-navy flex items-center justify-center mx-auto">
        <Icon className={cn('w-8 h-8', busy && 'animate-spin')} aria-hidden="true" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-philsa-navy">{title}</h1>
        {message && <p className="text-sm text-philsa-gray leading-relaxed">{message}</p>}
      </div>
      {action && <div className="flex flex-col sm:flex-row gap-3 justify-center">{action}</div>}
    </section>
  );
}

interface PageStateProps extends StateDisplayProps {
  pageClassName?: string;
}

export function PageState({ pageClassName, ...props }: PageStateProps) {
  return (
    <main className={cn('min-h-screen bg-philsa-bg flex items-center justify-center p-6', pageClassName)}>
      <StateDisplay {...props} />
    </main>
  );
}

export function LoadingState({
  title = 'Loading',
  message = 'Please wait while the requested information is prepared.',
  fullPage = false,
}: {
  title?: string;
  message?: string;
  fullPage?: boolean;
}) {
  const content = (
    <StateDisplay title={title} message={message} icon={LoaderCircle} busy className="shadow-none" />
  );
  return fullPage ? <main className="min-h-screen bg-philsa-bg flex items-center justify-center p-6">{content}</main> : content;
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return <StateDisplay title={title} message={message} icon={Inbox} action={action} />;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
  fullPage = false,
}: {
  title?: string;
  message?: string;
  action?: ReactNode;
  fullPage?: boolean;
}) {
  const content = <StateDisplay title={title} message={message} icon={AlertTriangle} action={action} role="alert" />;
  return fullPage ? <main className="min-h-screen bg-philsa-bg flex items-center justify-center p-6">{content}</main> : content;
}
