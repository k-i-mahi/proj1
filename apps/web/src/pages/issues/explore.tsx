import {
  ISSUE_SORT_LABEL,
  ISSUE_SORTS,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUSES,
  type IssueSort,
  type IssueStatus,
  type ListIssuesQuery,
} from '@civita/shared';
import { Inbox, LocateFixed, Loader2, Plus, Radio, Search, SlidersHorizontal } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CategoryGlyph, StatusDot } from '@/components/domain';
import { FilterChip, MultiSelectFilter } from '@/components/filters';
import { IssueCard, IssueCardSkeleton } from '@/components/issue-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form-controls';
import { Card } from '@/components/ui/primitives';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/select';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/states';
import { useDebounced, useDocumentTitle, useGeolocation, useInView } from '@/hooks/misc';
import { useCategories, useIssueFeed } from '@/hooks/queries';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth';

type View = 'all' | 'following' | 'mine' | 'assigned';

const csv = (value: string | null) => (value ? value.split(',').filter(Boolean) : []);

export default function ExplorePage() {
  useDocumentTitle('Explore issues');
  const { user, isStaff } = useAuth();
  const [params, setParams] = useSearchParams();
  const geo = useGeolocation();
  const { data: categories } = useCategories();

  const view = (params.get('view') as View | null) ?? 'all';
  const status = csv(params.get('status')) as IssueStatus[];
  const category = csv(params.get('category'));
  const sort = (params.get('sort') as IssueSort | null) ?? 'newest';
  const [search, setSearch] = useState(params.get('q') ?? '');
  const q = useDebounced(search.trim(), 350);

  const update = (patch: Record<string, string | string[] | null>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          const str = Array.isArray(value) ? value.join(',') : value;
          if (str) next.set(key, str);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    if ((params.get('q') ?? '') !== q) update({ q });
    // Only react to the debounced search text.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const coords = geo.status === 'ready' ? { lat: geo.lat, lng: geo.lng } : null;
  const effectiveSort: IssueSort = sort === 'nearest' && !coords ? 'newest' : sort;

  // TanStack Query hashes keys structurally, so a fresh object each render is fine.
  const query: ListIssuesQuery = {
    q: q || undefined,
    status: status.length ? status.join(',') : undefined,
    category: category.length ? category.join(',') : undefined,
    sort: effectiveSort,
    ...(coords && effectiveSort === 'nearest' ? { lat: coords.lat, lng: coords.lng } : {}),
    ...(view === 'following' ? { following: 'true' as const } : {}),
    ...(view === 'mine' && user ? { reporter: user.id } : {}),
    ...(view === 'assigned' ? { assignee: 'me' as const } : {}),
    limit: 12,
  };

  const feed = useIssueFeed(query);
  const items = feed.data?.pages.flatMap((p) => p.items) ?? [];
  const total = feed.data?.pages[0]?.total;
  const sentinel = useInView<HTMLDivElement>(() => {
    if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
  }, !!feed.hasNextPage);

  const setSort = async (value: IssueSort) => {
    if (value === 'nearest' && !coords) {
      const found = await geo.locate();
      if (!found) {
        toast.error('We need your location to sort by distance');
        return;
      }
    }
    update({ sort: value === 'newest' ? null : value });
  };

  const categoryById = new Map(categories?.map((c) => [c.id, c]));
  const hasFilters = status.length > 0 || category.length > 0 || !!q;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0">
        <PageHeader
          title="Explore issues"
          description="See what your neighbours are reporting and help prioritise what gets fixed."
          actions={
            <Button asChild>
              <Link to={user ? '/report' : '/login?next=/report'}>
                <Plus /> Report issue
              </Link>
            </Button>
          }
        />

        {user && (
          <Tabs
            value={view}
            onValueChange={(v) => update({ view: v === 'all' ? null : v })}
            className="mb-4"
          >
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="all">All issues</TabsTrigger>
              <TabsTrigger value="following">Following</TabsTrigger>
              <TabsTrigger value="mine">My reports</TabsTrigger>
              {isStaff && <TabsTrigger value="assigned">Assigned to me</TabsTrigger>}
            </TabsList>
          </Tabs>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, description or area…"
              className="h-9 pl-9"
              aria-label="Search issues"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <MultiSelectFilter
              label="Status"
              selected={status}
              onChange={(v) => update({ status: v })}
              options={ISSUE_STATUSES.map((s) => ({
                value: s,
                label: ISSUE_STATUS_LABEL[s],
                icon: <StatusDot status={s} />,
              }))}
            />
            <MultiSelectFilter
              label="Category"
              selected={category}
              onChange={(v) => update({ category: v })}
              options={(categories ?? []).map((c) => ({
                value: c.id,
                label: c.name,
                icon: (
                  <CategoryGlyph
                    icon={c.icon}
                    color={c.color}
                    className="size-5 rounded-md"
                    iconClassName="size-3"
                  />
                ),
              }))}
            />
            <Select value={effectiveSort} onValueChange={(v) => void setSort(v as IssueSort)}>
              <SelectTrigger size="sm" className="h-9 w-auto min-w-40" aria-label="Sort issues">
                <SlidersHorizontal className="size-3.5 opacity-60" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {ISSUE_SORTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'nearest' && <LocateFixed />}
                    {ISSUE_SORT_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex min-h-7 flex-wrap items-center gap-2">
          <p className="text-muted-foreground mr-1 text-sm" aria-live="polite">
            {total === undefined
              ? 'Loading…'
              : `${total.toLocaleString()} ${total === 1 ? 'issue' : 'issues'}`}
            {feed.isFetching && !feed.isFetchingNextPage && total !== undefined && (
              <Loader2 className="ml-2 inline size-3.5 animate-spin" />
            )}
          </p>
          {status.map((s) => (
            <FilterChip key={s} onRemove={() => update({ status: status.filter((x) => x !== s) })}>
              {ISSUE_STATUS_LABEL[s]}
            </FilterChip>
          ))}
          {category.map((c) => (
            <FilterChip
              key={c}
              onRemove={() => update({ category: category.filter((x) => x !== c) })}
            >
              {categoryById.get(c)?.name ?? 'Category'}
            </FilterChip>
          ))}
          {hasFilters && (
            <Button
              variant="link"
              size="sm"
              className="h-auto px-1"
              onClick={() => {
                setSearch('');
                update({ status: null, category: null, q: null });
              }}
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {feed.isPending ? (
            Array.from({ length: 4 }, (_, i) => <IssueCardSkeleton key={i} />)
          ) : feed.isError ? (
            <ErrorState error={feed.error} onRetry={() => void feed.refetch()} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={
                hasFilters
                  ? 'No issues match your filters'
                  : view === 'all'
                    ? 'No issues yet'
                    : 'Nothing here yet'
              }
              description={
                hasFilters
                  ? 'Try removing a filter or searching for something else.'
                  : view === 'following'
                    ? 'Follow issues to get updates when their status changes.'
                    : 'When issues are reported they will show up here.'
              }
              action={
                user && (
                  <Button asChild>
                    <Link to="/report">
                      <Plus /> Report an issue
                    </Link>
                  </Button>
                )
              }
            />
          ) : (
            <>
              {items.map((issue, i) => (
                <IssueCard key={issue.id} issue={issue} index={i % 12} />
              ))}
              <div ref={sentinel} />
              {feed.isFetchingNextPage && <IssueCardSkeleton />}
              {!feed.hasNextPage && items.length > 6 && (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  You&apos;ve reached the end.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <aside className="hidden space-y-4 xl:block">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="animate-pulse-ring absolute inline-flex size-full rounded-full bg-emerald-500" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <p className="text-sm font-semibold">Live updates</p>
            <Radio className="text-muted-foreground ml-auto size-4" />
          </div>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Upvotes, comments and status changes appear here in real time as they happen.
          </p>
        </Card>
        <Card className="p-2">
          <p className="px-3 pt-3 pb-2 text-sm font-semibold">Categories</p>
          {categories?.map((c) => {
            const active = category.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  update({
                    category: active ? category.filter((x) => x !== c.id) : [...category, c.id],
                  })
                }
                className={cn(
                  'hover:bg-accent flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  active && 'bg-accent',
                )}
              >
                <CategoryGlyph
                  icon={c.icon}
                  color={c.color}
                  className="size-7"
                  iconClassName="size-3.5"
                />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">{c.issueCount}</span>
              </button>
            );
          })}
        </Card>
      </aside>
    </div>
  );
}
