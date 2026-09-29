import type { Notification } from '@civita/shared';
import {
  Bell,
  CheckCheck,
  CircleCheckBig,
  MessageSquare,
  PartyPopper,
  TrendingUp,
  UserCheck,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useMarkRead, useNotifications, useUnreadCount } from '@/hooks/queries';
import { cn, timeAgo } from '@/lib/utils';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/overlays';
import { Skeleton } from './ui/primitives';

const ICONS: Record<Notification['type'], typeof Bell> = {
  issue_status_changed: CircleCheckBig,
  issue_assigned: UserCheck,
  issue_commented: MessageSquare,
  issue_upvote_milestone: TrendingUp,
  welcome: PartyPopper,
};

export const NotificationItem = ({
  notification: n,
  onOpen,
  className,
}: {
  notification: Notification;
  onOpen?: (n: Notification) => void;
  className?: string;
}) => {
  const Icon = ICONS[n.type];
  return (
    <button
      type="button"
      onClick={() => onOpen?.(n)}
      className={cn(
        'hover:bg-accent/60 flex w-full cursor-pointer gap-3 rounded-lg p-2.5 text-left transition-colors',
        className,
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
          n.readAt ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('line-clamp-2 text-sm', !n.readAt && 'font-medium')}>{n.message}</span>
        <span className="text-muted-foreground mt-0.5 block text-xs">{timeAgo(n.createdAt)}</span>
      </span>
      {!n.readAt && (
        <span className="bg-primary mt-2 size-2 shrink-0 rounded-full" aria-label="Unread" />
      )}
    </button>
  );
};

export const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unread } = useUnreadCount();
  const list = useNotifications(false);
  const markRead = useMarkRead();
  const count = unread?.count ?? 0;
  const items = list.data?.pages.flatMap((p) => p.items).slice(0, 6) ?? [];

  const openNotification = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    setOpen(false);
    if (n.issue) void navigate(`/issues/${n.issue.id}`);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
        >
          <Bell />
          {count > 0 && (
            <span className="bg-primary text-primary-foreground ring-background absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ring-2">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {count > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markRead.mutate('all')}>
              <CheckCheck /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto p-1.5">
          {list.isPending ? (
            <div className="space-y-2 p-2">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : items.length ? (
            items.map((n) => (
              <NotificationItem key={n.id} notification={n} onOpen={openNotification} />
            ))
          ) : (
            <p className="text-muted-foreground px-4 py-10 text-center text-sm">
              You&apos;re all caught up.
            </p>
          )}
        </div>
        <div className="border-t p-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            asChild
            onClick={() => setOpen(false)}
          >
            <Link to="/notifications">View all notifications</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
