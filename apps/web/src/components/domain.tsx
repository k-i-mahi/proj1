import {
  ISSUE_PRIORITY_LABEL,
  ISSUE_STATUS_LABEL,
  type IssuePriority,
  type IssueStatus,
} from '@civita/shared';
import {
  Archive,
  Bike,
  Building2,
  Bus,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  Construction,
  Dog,
  Droplets,
  Flame,
  Hammer,
  Lamp,
  Leaf,
  type LucideIcon,
  ShieldAlert,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Siren,
  Sparkles,
  Timer,
  TrafficCone,
  Trash2,
  Trees,
  Volume2,
  Wifi,
  XCircle,
  Zap,
} from 'lucide-react';
import { useId, type CSSProperties } from 'react';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------- logo -- */

export const Logo = ({
  className,
  withText = true,
}: {
  className?: string;
  withText?: boolean;
}) => {
  // Unique per instance: a shared id breaks when the first logo on the page is hidden.
  const gradientId = useId();
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6366f1" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
        <path
          d="M16 6.5a7 7 0 0 0-7 7c0 5.2 7 12 7 12s7-6.8 7-12a7 7 0 0 0-7-7Z"
          fill="#fff"
          fillOpacity=".95"
        />
        <path
          d="m12.9 13.6 2.2 2.2 4-4"
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {withText && (
        <span className="font-display text-lg font-semibold tracking-tight">Civita</span>
      )}
    </span>
  );
};

/* ------------------------------------------------------------- category -- */

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  construction: Construction,
  lamp: Lamp,
  'trash-2': Trash2,
  droplets: Droplets,
  zap: Zap,
  'traffic-cone': TrafficCone,
  'shield-alert': ShieldAlert,
  trees: Trees,
  'circle-alert': CircleAlert,
  'volume-2': Volume2,
  bus: Bus,
  'building-2': Building2,
  bike: Bike,
  dog: Dog,
  flame: Flame,
  wifi: Wifi,
  hammer: Hammer,
  leaf: Leaf,
  sparkles: Sparkles,
  siren: Siren,
};

export const CategoryIcon = ({ icon, className }: { icon: string; className?: string }) => {
  const Icon = CATEGORY_ICONS[icon] ?? CircleAlert;
  return <Icon className={className} aria-hidden />;
};

/** Tinted square with the category icon. */
export const CategoryGlyph = ({
  icon,
  color,
  className,
  iconClassName,
}: {
  icon: string;
  color: string;
  className?: string;
  iconClassName?: string;
}) => (
  <span
    className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-lg', className)}
    style={{ backgroundColor: `${color}1f`, color } as CSSProperties}
  >
    <CategoryIcon icon={icon} className={cn('size-4', iconClassName)} />
  </span>
);

export const CategoryPill = ({
  category,
  className,
}: {
  category: { name: string; icon: string; color: string };
  className?: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
      className,
    )}
    style={{ backgroundColor: `${category.color}1a`, color: category.color }}
  >
    <CategoryIcon icon={category.icon} className="size-3" />
    <span className="text-foreground/80 dark:text-foreground/90">{category.name}</span>
  </span>
);

/* --------------------------------------------------------------- status -- */

export const STATUS_META: Record<
  IssueStatus,
  { icon: LucideIcon; className: string; dot: string; hex: string }
> = {
  open: {
    icon: CircleDot,
    className: 'text-status-open bg-status-open/10',
    dot: 'bg-status-open',
    hex: '#3b82f6',
  },
  in_progress: {
    icon: Timer,
    className: 'text-status-progress bg-status-progress/12',
    dot: 'bg-status-progress',
    hex: '#f59e0b',
  },
  resolved: {
    icon: CheckCircle2,
    className: 'text-status-resolved bg-status-resolved/10',
    dot: 'bg-status-resolved',
    hex: '#10b981',
  },
  closed: {
    icon: Archive,
    className: 'text-status-closed bg-status-closed/10',
    dot: 'bg-status-closed',
    hex: '#71717a',
  },
  rejected: {
    icon: XCircle,
    className: 'text-status-rejected bg-status-rejected/10',
    dot: 'bg-status-rejected',
    hex: '#ef4444',
  },
};

export const StatusBadge = ({ status, className }: { status: IssueStatus; className?: string }) => {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        meta.className,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {ISSUE_STATUS_LABEL[status]}
    </span>
  );
};

export const StatusDot = ({ status, className }: { status: IssueStatus; className?: string }) => (
  <span
    className={cn('inline-block size-2 rounded-full', STATUS_META[status].dot, className)}
    aria-hidden
  />
);

/* ------------------------------------------------------------- priority -- */

export const PRIORITY_META: Record<IssuePriority, { icon: LucideIcon; className: string }> = {
  low: { icon: SignalLow, className: 'text-muted-foreground' },
  medium: { icon: SignalMedium, className: 'text-sky-600 dark:text-sky-400' },
  high: { icon: SignalHigh, className: 'text-amber-600 dark:text-amber-400' },
  urgent: { icon: Siren, className: 'text-rose-600 dark:text-rose-400' },
};

export const PriorityBadge = ({
  priority,
  className,
  showLabel = true,
}: {
  priority: IssuePriority;
  className?: string;
  showLabel?: boolean;
}) => {
  const meta = PRIORITY_META[priority];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        meta.className,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {showLabel ? (
        ISSUE_PRIORITY_LABEL[priority]
      ) : (
        <span className="sr-only">{ISSUE_PRIORITY_LABEL[priority]} priority</span>
      )}
    </span>
  );
};
