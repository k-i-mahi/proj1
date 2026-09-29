import {
  ISSUE_STATUS_LABEL,
  type IssuePriority,
  type IssueStatus,
  type IssueSummary,
} from '@civita/shared';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ArrowBigUp, GripVertical, MessageSquare, Search, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { CategoryGlyph, PriorityBadge, STATUS_META } from '@/components/domain';
import { MultiSelectFilter } from '@/components/filters';
import { Input, Switch } from '@/components/ui/form-controls';
import { Avatar, Skeleton } from '@/components/ui/primitives';
import { ErrorState, PageHeader } from '@/components/ui/states';
import { useDebounced, useDocumentTitle } from '@/hooks/misc';
import { useCategories, useIssuePage, useTriage } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';

const COLUMNS: IssueStatus[] = ['open', 'in_progress', 'resolved'];
const PRIORITY_WEIGHT: Record<IssuePriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

const BoardCard = ({ issue, overlay = false }: { issue: IssueSummary; overlay?: boolean }) => (
  <div
    className={cn(
      'bg-card group rounded-xl border p-3.5 shadow-xs transition-shadow',
      overlay ? 'rotate-2 cursor-grabbing shadow-2xl' : 'hover:shadow-md',
    )}
  >
    <div className="flex items-start gap-2.5">
      <CategoryGlyph
        icon={issue.category.icon}
        color={issue.category.color}
        className="size-7 rounded-md"
        iconClassName="size-3.5"
      />
      <Link
        to={`/issues/${issue.id}`}
        className="hover:text-primary line-clamp-2 flex-1 text-sm leading-snug font-medium"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {issue.title}
      </Link>
      <GripVertical className="text-muted-foreground/50 size-4 shrink-0" />
    </div>
    <div className="text-muted-foreground mt-3 flex items-center gap-3 text-xs">
      <PriorityBadge priority={issue.priority} />
      <span className="flex items-center gap-0.5">
        <ArrowBigUp className="size-3.5" /> {issue.upvoteCount}
      </span>
      <span className="flex items-center gap-1">
        <MessageSquare className="size-3" /> {issue.commentCount}
      </span>
      <span className="ml-auto">{timeAgo(issue.createdAt).replace(' ago', '')}</span>
      {issue.assignee ? (
        <Avatar
          name={issue.assignee.name}
          src={issue.assignee.avatarUrl}
          className="size-5 text-[9px]"
        />
      ) : (
        <span
          className="flex size-5 items-center justify-center rounded-full border border-dashed"
          title="Unassigned"
        >
          <UserRound className="size-3" />
        </span>
      )}
    </div>
  </div>
);

const DraggableCard = ({ issue }: { issue: IssueSummary }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: issue.id,
    data: { issue },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn('cursor-grab touch-none outline-none', isDragging && 'opacity-30')}
      aria-label={`${issue.title}. Press space to pick up and move between columns.`}
    >
      <BoardCard issue={issue} />
    </div>
  );
};

const Column = ({
  status,
  issues,
  loading,
  total,
}: {
  status: IssueStatus;
  issues: IssueSummary[];
  loading: boolean;
  total: number | undefined;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];
  return (
    <section
      ref={setNodeRef}
      className={cn(
        'bg-muted/40 flex min-h-[60vh] w-[85vw] shrink-0 snap-start flex-col rounded-2xl border p-2 transition-colors sm:w-auto sm:shrink',
        isOver && 'border-primary/50 bg-primary/5',
      )}
      aria-label={ISSUE_STATUS_LABEL[status]}
    >
      <header className="flex items-center gap-2 px-2 pt-1.5 pb-3">
        <span className={cn('size-2.5 rounded-full', meta.dot)} />
        <h2 className="text-sm font-semibold">{ISSUE_STATUS_LABEL[status]}</h2>
        <span className="bg-background text-muted-foreground rounded-full border px-2 text-xs tabular-nums">
          {total ?? '–'}
        </span>
      </header>
      <div className="flex flex-1 flex-col gap-2">
        {loading
          ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : issues.map((issue) => <DraggableCard key={issue.id} issue={issue} />)}
        {!loading && issues.length === 0 && (
          <p className="text-muted-foreground rounded-xl border border-dashed py-8 text-center text-xs">
            Drop issues here
          </p>
        )}
      </div>
    </section>
  );
};

export default function TriagePage() {
  useDocumentTitle('Triage board');
  const [mine, setMine] = useState(false);
  const [category, setCategory] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [active, setActive] = useState<IssueSummary | null>(null);
  const [overrides, setOverrides] = useState<Record<string, IssueStatus>>({});
  const { data: categories } = useCategories();
  const triage = useTriage();

  const base = {
    limit: 60,
    sort: 'top' as const,
    q: q || undefined,
    category: category.length ? category.join(',') : undefined,
    ...(mine ? { assignee: 'me' as const } : {}),
  };
  const open = useIssuePage({ ...base, status: 'open' });
  const progress = useIssuePage({ ...base, status: 'in_progress' });
  const resolved = useIssuePage({ ...base, status: 'resolved', sort: 'newest', limit: 30 });
  const queries = { open, in_progress: progress, resolved } as const;

  const columns = useMemo(() => {
    const all = [open, progress, resolved].flatMap((qr) => qr.data?.items ?? []);
    const unique = new Map(all.map((i) => [i.id, i]));
    const grouped: Record<IssueStatus, IssueSummary[]> = {
      open: [],
      in_progress: [],
      resolved: [],
      closed: [],
      rejected: [],
    };
    for (const issue of unique.values()) {
      const status = overrides[issue.id] ?? issue.status;
      grouped[status].push({ ...issue, status });
    }
    for (const list of Object.values(grouped)) {
      list.sort(
        (a, b) =>
          PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority] ||
          b.upvoteCount - a.upvoteCount,
      );
    }
    return grouped;
  }, [open, progress, resolved, overrides]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (e: DragStartEvent) =>
    setActive((e.active.data.current as { issue: IssueSummary }).issue);

  const onDragEnd = (e: DragEndEvent) => {
    setActive(null);
    const issue = (e.active.data.current as { issue: IssueSummary }).issue;
    const to = e.over?.id as IssueStatus | undefined;
    if (!to || to === (overrides[issue.id] ?? issue.status)) return;

    setOverrides((o) => ({ ...o, [issue.id]: to }));
    triage.mutate(
      { id: issue.id, status: to },
      {
        onSuccess: () =>
          toast.success(`Moved to ${ISSUE_STATUS_LABEL[to]}`, { description: issue.title }),
        onError: (err) => toast.error(errorMessage(err)),
        onSettled: () =>
          setOverrides((o) => {
            const { [issue.id]: _removed, ...rest } = o;
            return rest;
          }),
      },
    );
  };

  const error = open.error ?? progress.error ?? resolved.error;

  return (
    <div>
      <PageHeader
        title="Triage board"
        description="Drag issues between columns to update their status. Followers are notified automatically."
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter issues…"
            className="h-9 pl-9"
            aria-label="Filter issues"
          />
        </div>
        <MultiSelectFilter
          label="Category"
          selected={category}
          onChange={setCategory}
          options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <Switch checked={mine} onCheckedChange={setMine} /> Assigned to me
        </label>
      </div>

      {error ? (
        <ErrorState error={error} />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={() => setActive(null)}
        >
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
            {COLUMNS.map((status) => (
              <Column
                key={status}
                status={status}
                issues={columns[status]}
                loading={queries[status as keyof typeof queries].isPending}
                total={columns[status].length}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
            {active ? <BoardCard issue={active} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}
