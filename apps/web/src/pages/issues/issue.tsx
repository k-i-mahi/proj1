import { TERMINAL_STATUSES } from '@civita/shared';
import {
  ArrowLeft,
  Bell,
  BellOff,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  MapPin,
  MoreHorizontal,
  PencilLine,
  SearchX,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { CategoryPill, PriorityBadge, StatusBadge } from '@/components/domain';
import { CommentThread } from '@/components/issue/comments';
import { Timeline } from '@/components/issue/timeline';
import { TriagePanel } from '@/components/issue/triage-panel';
import { VoteButton } from '@/components/issue-card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/overlays';
import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui/primitives';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useDocumentTitle } from '@/hooks/misc';
import { useDeleteIssue, useFollow, useIssue } from '@/hooks/queries';
import { useIssueRoom } from '@/hooks/realtime';
import { ApiError, errorMessage } from '@/lib/api';
import { cn, formatDate, timeAgo } from '@/lib/utils';
import { useAuth } from '@/providers/auth';

const StaticMap = lazy(() =>
  import('@/components/map/static-map').then((m) => ({ default: m.StaticMap })),
);

const Gallery = ({ images, title }: { images: { url: string }[]; title: string }) => {
  const [index, setIndex] = useState<number | null>(null);
  if (!images.length) return null;
  const [first, ...rest] = images;
  const step = (d: number) =>
    setIndex((i) => (i === null ? i : (i + d + images.length) % images.length));

  return (
    <>
      <div className={cn('grid gap-2', rest.length ? 'grid-cols-4 grid-rows-2' : 'grid-cols-1')}>
        <button
          type="button"
          onClick={() => setIndex(0)}
          className={cn(
            'group overflow-hidden rounded-2xl border',
            rest.length ? 'col-span-3 row-span-2 aspect-[4/3]' : 'aspect-video',
          )}
        >
          <img
            src={first!.url}
            alt={`${title}, photo 1`}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </button>
        {rest.slice(0, 2).map((img, i) => (
          <button
            key={img.url}
            type="button"
            onClick={() => setIndex(i + 1)}
            className="group relative overflow-hidden rounded-xl border"
          >
            <img
              src={img.url}
              alt={`${title}, photo ${i + 2}`}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {i === 1 && rest.length > 2 && (
              <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-lg font-semibold text-white">
                +{rest.length - 2}
              </span>
            )}
          </button>
        ))}
      </div>
      <Dialog open={index !== null} onOpenChange={(o) => !o && setIndex(null)}>
        <DialogContent className="max-w-4xl border-0 bg-black p-0 sm:rounded-2xl">
          <DialogTitle className="sr-only">
            Photo {index !== null ? index + 1 : ''} of {images.length}
          </DialogTitle>
          {index !== null && (
            <div className="relative">
              <img
                src={images[index]!.url}
                alt=""
                className="max-h-[80dvh] w-full rounded-2xl object-contain"
              />
              {images.length > 1 && (
                <>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-1/2 left-3 -translate-y-1/2 rounded-full"
                    onClick={() => step(-1)}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full"
                    onClick={() => step(1)}
                    aria-label="Next photo"
                  >
                    <ChevronRight />
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

const DetailRow = ({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-3 py-2.5">
    <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
    <div className="min-w-0 flex-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  </div>
);

const IssueSkeleton = () => (
  <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="space-y-4">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-9 w-3/4" />
      <Skeleton className="h-5 w-64" />
      <Skeleton className="aspect-video w-full rounded-2xl" />
      <Skeleton className="h-24 w-full" />
    </div>
    <div className="space-y-4">
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-48 rounded-xl" />
    </div>
  </div>
);

export default function IssuePage() {
  const { id = '' } = useParams();
  const { user, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: issue, isPending, error, refetch } = useIssue(id);
  const follow = useFollow(issue ?? { id, followerCount: 0, viewer: undefined });
  const remove = useDeleteIssue();
  const [confirmDelete, setConfirmDelete] = useState(false);
  useIssueRoom(id);
  useDocumentTitle(issue?.title);

  if (isPending) return <IssueSkeleton />;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <EmptyState
        icon={SearchX}
        title="Issue not found"
        description="It may have been removed by the reporter or an admin."
        action={
          <Button asChild>
            <Link to="/issues">Back to issues</Link>
          </Button>
        }
      />
    );
  }
  if (error || !issue) return <ErrorState error={error} onRetry={() => void refetch()} />;

  const isReporter = user?.id === issue.reporter.id;
  const canModify = isAdmin || (isReporter && issue.status === 'open');
  const following = !!issue.viewer?.following;
  const done = TERMINAL_STATUSES.includes(issue.status);

  const toggleFollow = () => {
    if (!user) {
      void navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    follow.mutate(!following, {
      onSuccess: (res) =>
        toast.success(res.following ? "Following. We'll notify you of updates." : 'Unfollowed'),
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: issue.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard');
      }
    } catch {
      // User cancelled the share sheet.
    }
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground mb-4 -ml-2"
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/issues'))}
      >
        <ArrowLeft /> Back
      </Button>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={issue.status} />
            <CategoryPill category={issue.category} />
            <PriorityBadge priority={issue.priority} className="ml-1" />
          </div>
          <h1 className="mt-3 text-2xl leading-tight font-semibold sm:text-3xl">{issue.title}</h1>
          <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Link
              to={`/u/${issue.reporter.id}`}
              className="text-foreground flex items-center gap-2 font-medium hover:underline"
            >
              <Avatar
                name={issue.reporter.name}
                src={issue.reporter.avatarUrl}
                className="size-6 text-[10px]"
              />
              {issue.reporter.name}
            </Link>
            <span>reported {timeAgo(issue.createdAt)}</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <VoteButton issue={issue} orientation="horizontal" />
            <Button
              variant={following ? 'secondary' : 'outline'}
              onClick={toggleFollow}
              disabled={follow.isPending}
            >
              {following ? <BellOff /> : <Bell />}
              {following ? 'Following' : 'Follow'}
            </Button>
            <Button variant="outline" onClick={() => void share()}>
              <Link2 /> Share
            </Button>
            {canModify && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="More actions">
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => void navigate(`/issues/${issue.id}/edit`)}>
                    <PencilLine /> Edit report
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive onSelect={() => setConfirmDelete(true)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {done && issue.resolvedAt && issue.status === 'resolved' && (
            <div className="border-status-resolved/30 bg-status-resolved/5 mt-6 rounded-xl border px-4 py-3 text-sm">
              <span className="text-status-resolved font-semibold">Resolved</span> on{' '}
              {formatDate(issue.resolvedAt)}. Thanks to everyone who reported and upvoted.
            </div>
          )}

          <div className="mt-6">
            <Gallery images={issue.images} title={issue.title} />
          </div>

          <div className="mt-6 text-[15px] leading-7 break-words whitespace-pre-wrap">
            {issue.description}
          </div>

          <div className="mt-10 border-t pt-8">
            <CommentThread issueId={issue.id} />
          </div>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {isStaff && (
            // Re-key on the triaged fields so the form resets when they change elsewhere (e.g. realtime).
            <TriagePanel
              key={`${issue.status}:${issue.priority}:${issue.assignee?.id ?? ''}`}
              issue={issue}
            />
          )}

          <Card>
            <div className="h-44 p-1.5">
              <Suspense fallback={<Skeleton className="size-full rounded-lg" />}>
                <StaticMap
                  lat={issue.location.lat}
                  lng={issue.location.lng}
                  color={issue.category.color}
                  className="size-full"
                />
              </Suspense>
            </div>
            <CardContent className="divide-y py-1">
              <DetailRow icon={MapPin} label="Location">
                {issue.address ||
                  `${issue.location.lat.toFixed(5)}, ${issue.location.lng.toFixed(5)}`}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${issue.location.lat},${issue.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary mt-1 block text-xs font-medium hover:underline"
                >
                  Get directions ↗
                </a>
              </DetailRow>
              <DetailRow icon={UserRound} label="Assigned to">
                {issue.assignee ? (
                  <span className="flex items-center gap-2">
                    <Avatar
                      name={issue.assignee.name}
                      src={issue.assignee.avatarUrl}
                      className="size-5 text-[9px]"
                    />
                    {issue.assignee.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not assigned yet</span>
                )}
              </DetailRow>
              <DetailRow icon={Users} label="Followers">
                {issue.followerCount} {issue.followerCount === 1 ? 'person' : 'people'} following
              </DetailRow>
              <DetailRow icon={CalendarDays} label="Reported">
                {formatDate(issue.createdAt, { hour: 'numeric', minute: '2-digit' })}
              </DetailRow>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline issueId={issue.id} />
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this issue?</DialogTitle>
            <DialogDescription>
              This permanently removes the report, its comments, upvotes and history. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={remove.isPending}
              onClick={() =>
                remove.mutate(issue.id, {
                  onSuccess: () => {
                    toast.success('Issue deleted');
                    void navigate('/issues', { replace: true });
                  },
                  onError: (err) => toast.error(errorMessage(err)),
                })
              }
            >
              Delete issue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
