import {
  ArrowBigUp,
  CalendarDays,
  CheckCircle2,
  FileText,
  Inbox,
  MessageSquare,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { Link, useParams } from 'react-router';
import { IssueCard, IssueCardSkeleton } from '@/components/issue-card';
import { Button } from '@/components/ui/button';
import { Avatar, Card, Skeleton } from '@/components/ui/primitives';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useDocumentTitle } from '@/hooks/misc';
import { useIssueFeed, useProfile } from '@/hooks/queries';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/providers/auth';

const Stat = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: number;
}) => (
  <Card className="p-4">
    <Icon className="text-primary size-4" />
    <p className="mt-3 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p>
    <p className="text-muted-foreground text-xs">{label}</p>
  </Card>
);

export default function ProfilePage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const profile = useProfile(id);
  const issues = useIssueFeed({ reporter: id, limit: 10 });
  useDocumentTitle(profile.data?.name);
  const items = issues.data?.pages.flatMap((p) => p.items) ?? [];
  const isMe = user?.id === id;

  if (profile.isError) return <ErrorState error={profile.error} />;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative overflow-hidden rounded-3xl border">
        <div className="h-32 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 sm:h-40">
          <div className="bg-grid h-full opacity-25 [--foreground:white]" />
        </div>
        <div className="bg-card px-6 pb-6">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end">
            {profile.data ? (
              <Avatar
                name={profile.data.name}
                src={profile.data.avatarUrl}
                className="ring-card size-24 text-2xl ring-4"
              />
            ) : (
              <Skeleton className="ring-card size-24 rounded-full ring-4" />
            )}
            <div className="min-w-0 flex-1">
              {profile.data ? (
                <>
                  <h1 className="flex items-center gap-2 text-2xl font-semibold">
                    {profile.data.name}
                    {profile.data.role !== 'resident' && (
                      <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
                        <ShieldCheck className="size-3" />{' '}
                        {profile.data.role === 'admin' ? 'Admin' : 'Authority'}
                      </span>
                    )}
                  </h1>
                  <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-sm">
                    <CalendarDays className="size-3.5" /> Joined{' '}
                    {formatDate(profile.data.createdAt, { day: undefined })}
                  </p>
                </>
              ) : (
                <Skeleton className="h-8 w-48" />
              )}
            </div>
            {isMe && (
              <Button variant="outline" asChild>
                <Link to="/settings">
                  <Settings /> Edit profile
                </Link>
              </Button>
            )}
          </div>
          {profile.data?.bio && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed">{profile.data.bio}</p>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {profile.data ? (
          <>
            <Stat icon={FileText} label="Issues reported" value={profile.data.stats.reported} />
            <Stat icon={CheckCircle2} label="Got resolved" value={profile.data.stats.resolved} />
            <Stat
              icon={ArrowBigUp}
              label="Upvotes received"
              value={profile.data.stats.upvotesReceived}
            />
            <Stat icon={MessageSquare} label="Comments" value={profile.data.stats.comments} />
          </>
        ) : (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        )}
      </div>

      <h2 className="mt-10 mb-4 text-lg font-semibold">Reported issues</h2>
      <div className="space-y-3">
        {issues.isPending ? (
          <IssueCardSkeleton />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No reports yet"
            description={isMe ? 'Issues you report will appear here.' : undefined}
          />
        ) : (
          items.map((issue, i) => <IssueCard key={issue.id} issue={issue} index={i} />)
        )}
        {issues.hasNextPage && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => void issues.fetchNextPage()}
            loading={issues.isFetchingNextPage}
          >
            Show more
          </Button>
        )}
      </div>
    </div>
  );
}
