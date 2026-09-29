import { AlertTriangle, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from './button';

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center',
      className,
    )}
  >
    <div className="bg-primary/10 text-primary relative mb-4 flex size-12 items-center justify-center rounded-2xl">
      <Icon className="size-6" />
    </div>
    <h3 className="text-base font-semibold">{title}</h3>
    {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState = ({
  error,
  onRetry,
  className,
}: {
  error: unknown;
  onRetry?: () => void;
  className?: string;
}) => (
  <div
    role="alert"
    className={cn(
      'border-destructive/30 bg-destructive/5 flex flex-col items-center rounded-2xl border px-6 py-10 text-center',
      className,
    )}
  >
    <AlertTriangle className="text-destructive mb-3 size-6" />
    <p className="font-medium">We couldn&apos;t load this</p>
    <p className="text-muted-foreground mt-1 text-sm">{errorMessage(error)}</p>
    {onRetry && (
      <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

export const PageHeader = ({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
      className,
    )}
  >
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold sm:text-[1.75rem]">{title}</h1>
      {description && (
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{description}</p>
      )}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
