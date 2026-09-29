import type { IssueSummary } from '@civita/shared';
import { ArrowBigUp, MapPin, MessageSquare } from 'lucide-react';
import { motion } from 'motion/react';
import type { MouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useVote } from '@/hooks/queries';
import { cn, compact, timeAgo } from '@/lib/utils';
import { useAuth } from '@/providers/auth';
import { CategoryIcon, CategoryPill, PriorityBadge, StatusBadge } from './domain';
import { Avatar, Skeleton } from './ui/primitives';

export const VoteButton = ({
  issue,
  className,
  orientation = 'vertical',
}: {
  issue: IssueSummary;
  className?: string;
  orientation?: 'vertical' | 'horizontal';
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const vote = useVote(issue);
  const upvoted = !!issue.viewer?.upvoted;

  const onClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      void navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
      return;
    }
    vote.mutate(!upvoted);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={upvoted}
      aria-label={upvoted ? 'Remove upvote' : 'Upvote'}
      className={cn(
        'group/vote flex shrink-0 cursor-pointer items-center justify-center rounded-xl border font-semibold tabular-nums transition-all active:scale-95',
        orientation === 'vertical' ? 'w-12 flex-col py-2 text-sm' : 'h-9 gap-1.5 px-3 text-sm',
        upvoted
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-primary',
        className,
      )}
    >
      <motion.span
        key={String(upvoted)}
        initial={{ y: upvoted ? 4 : 0, scale: upvoted ? 0.6 : 1 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
      >
        <ArrowBigUp className={cn('size-5', upvoted && 'fill-current')} />
      </motion.span>
      <span>{compact(issue.upvoteCount)}</span>
    </button>
  );
};

export const IssueCard = ({ issue, index = 0 }: { issue: IssueSummary; index?: number }) => {
  const image = issue.images[0];
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
      className="group bg-card hover:border-primary/30 relative flex gap-4 rounded-2xl border p-4 shadow-xs transition-all hover:shadow-md sm:p-5"
    >
      <VoteButton issue={issue} className="relative z-10 hidden sm:flex" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={issue.status} />
          <CategoryPill category={issue.category} />
          {(issue.priority === 'high' || issue.priority === 'urgent') && (
            <PriorityBadge priority={issue.priority} />
          )}
        </div>

        <h3 className="mt-2.5 text-base leading-snug font-semibold">
          <Link
            to={`/issues/${issue.id}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none"
          >
            <span className="group-hover:text-primary transition-colors">{issue.title}</span>
          </Link>
        </h3>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{issue.description}</p>

        <div className="text-muted-foreground mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
          <span className="flex items-center gap-1.5">
            <Avatar
              name={issue.reporter.name}
              src={issue.reporter.avatarUrl}
              className="size-5 text-[9px]"
            />
            <span className="text-foreground/80 font-medium">{issue.reporter.name}</span>
            <span>· {timeAgo(issue.createdAt)}</span>
          </span>
          {issue.address && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              <span className="max-w-56 truncate">
                {issue.address.split(',').slice(0, 2).join(',')}
              </span>
            </span>
          )}
          {issue.distanceKm !== undefined && <span>{issue.distanceKm} km away</span>}
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3.5" /> {issue.commentCount}
          </span>
          <VoteButton
            issue={issue}
            orientation="horizontal"
            className="relative z-10 ml-auto h-7 px-2 text-xs sm:hidden"
          />
        </div>
      </div>

      {image ? (
        <img
          src={image.url}
          alt=""
          loading="lazy"
          className="hidden size-24 shrink-0 rounded-xl border object-cover md:block"
        />
      ) : (
        <div
          className="hidden size-24 shrink-0 items-center justify-center rounded-xl md:flex"
          style={{
            color: issue.category.color,
            background: `linear-gradient(135deg, ${issue.category.color}26, ${issue.category.color}0d)`,
          }}
          aria-hidden
        >
          <CategoryIcon icon={issue.category.icon} className="size-8 opacity-70" />
        </div>
      )}
    </motion.article>
  );
};

export const IssueCardSkeleton = () => (
  <div className="bg-card flex gap-4 rounded-2xl border p-5">
    <Skeleton className="hidden h-16 w-12 rounded-xl sm:block" />
    <div className="flex-1 space-y-3">
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-28 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <Skeleton className="hidden size-24 rounded-xl md:block" />
  </div>
);
