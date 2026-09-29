import {
  ISSUE_PRIORITY_LABEL,
  ISSUE_STATUS_LABEL,
  type IssueEvent,
  type IssuePriority,
  type IssueStatus,
} from '@civita/shared';
import { Flag, PencilLine, Sparkles, UserMinus, UserPlus } from 'lucide-react';
import { useTimeline } from '@/hooks/queries';
import { cn, timeAgo } from '@/lib/utils';
import { STATUS_META } from '../domain';
import { Skeleton } from '../ui/primitives';

const describe = (e: IssueEvent) => {
  const who = e.actor?.name ?? 'Someone';
  switch (e.type) {
    case 'created':
      return (
        <>
          <b>{who}</b> reported this issue
        </>
      );
    case 'status_changed':
      return (
        <>
          <b>{who}</b> changed status to <b>{ISSUE_STATUS_LABEL[e.to as IssueStatus] ?? e.to}</b>
        </>
      );
    case 'priority_changed':
      return (
        <>
          <b>{who}</b> set priority to <b>{ISSUE_PRIORITY_LABEL[e.to as IssuePriority] ?? e.to}</b>
        </>
      );
    case 'assigned':
      return (
        <>
          <b>{who}</b> assigned this to <b>{e.to}</b>
        </>
      );
    case 'unassigned':
      return (
        <>
          <b>{who}</b> removed the assignee
        </>
      );
    case 'edited':
      return (
        <>
          <b>{who}</b> edited the report
        </>
      );
  }
};

const EventIcon = ({ event }: { event: IssueEvent }) => {
  if (event.type === 'status_changed' && event.to && event.to in STATUS_META) {
    const meta = STATUS_META[event.to as IssueStatus];
    const Icon = meta.icon;
    return (
      <span className={cn('flex size-7 items-center justify-center rounded-full', meta.className)}>
        <Icon className="size-3.5" />
      </span>
    );
  }
  const Icon =
    event.type === 'created'
      ? Sparkles
      : event.type === 'assigned'
        ? UserPlus
        : event.type === 'unassigned'
          ? UserMinus
          : event.type === 'priority_changed'
            ? Flag
            : PencilLine;
  return (
    <span
      className={cn(
        'flex size-7 items-center justify-center rounded-full',
        event.type === 'created' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
      )}
    >
      <Icon className="size-3.5" />
    </span>
  );
};

export const Timeline = ({ issueId }: { issueId: string }) => {
  const { data, isPending } = useTimeline(issueId);
  if (isPending) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-8" />
        ))}
      </div>
    );
  }
  const events = [...(data ?? [])].reverse();
  return (
    <ol className="relative">
      {events.map((e, i) => (
        <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
          {i < events.length - 1 && (
            <span className="bg-border absolute top-8 bottom-1 left-3.5 w-px" aria-hidden />
          )}
          <EventIcon event={e} />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm leading-snug [&_b]:font-medium">{describe(e)}</p>
            {e.note && (
              <p className="bg-muted/60 text-muted-foreground mt-1.5 rounded-lg px-2.5 py-1.5 text-xs leading-relaxed">
                {e.note}
              </p>
            )}
            <p className="text-muted-foreground mt-1 text-xs">{timeAgo(e.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
};
