import type { Notification } from '@civita/shared';
import { BellOff, CheckCheck } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { NotificationItem } from '@/components/notification-bell';
import { Button } from '@/components/ui/button';
import { Card, Skeleton } from '@/components/ui/primitives';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/select';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/states';
import { useDocumentTitle } from '@/hooks/misc';
import { useMarkRead, useNotifications, useUnreadCount } from '@/hooks/queries';

const groupByDay = (items: Notification[]) => {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const groups = new Map<string, Notification[]>();
  for (const n of items) {
    const day = new Date(n.createdAt).toDateString();
    const label =
      day === today
        ? 'Today'
        : day === yesterday
          ? 'Yesterday'
          : new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
    groups.set(label, [...(groups.get(label) ?? []), n]);
  }
  return [...groups.entries()];
};

export default function NotificationsPage() {
  useDocumentTitle('Notifications');
  const navigate = useNavigate();
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const list = useNotifications(tab === 'unread');
  const { data: unread } = useUnreadCount();
  const markRead = useMarkRead();
  const items = list.data?.pages.flatMap((p) => p.items) ?? [];

  const open = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id);
    if (n.issue) void navigate(`/issues/${n.issue.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        description="Updates on issues you reported, follow or are assigned to."
        actions={
          !!unread?.count && (
            <Button
              variant="outline"
              onClick={() => markRead.mutate('all')}
              loading={markRead.isPending}
            >
              <CheckCheck /> Mark all as read
            </Button>
          )
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread {!!unread?.count && `(${unread.count})`}</TabsTrigger>
        </TabsList>
      </Tabs>

      {list.isPending ? (
        <Card className="space-y-2 p-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </Card>
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          description="Follow issues to hear when they are updated, commented on or resolved."
        />
      ) : (
        <div className="space-y-6">
          {groupByDay(items).map(([label, group]) => (
            <section key={label}>
              <h2 className="text-muted-foreground mb-2 px-1 text-xs font-semibold tracking-wide uppercase">
                {label}
              </h2>
              <Card className="divide-y p-1.5">
                {group.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onOpen={open}
                    className="rounded-none first:rounded-t-lg last:rounded-b-lg"
                  />
                ))}
              </Card>
            </section>
          ))}
          {list.hasNextPage && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => void list.fetchNextPage()}
              loading={list.isFetchingNextPage}
            >
              Load more
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
