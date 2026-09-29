import type { Comment } from '@civita/shared';
import { Lock, MessageSquare, MoreHorizontal, Send, ShieldCheck, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { useComments, useDeleteComment, usePostComment } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { useAuth } from '@/providers/auth';
import { Button } from '../ui/button';
import { Switch, Textarea } from '../ui/form-controls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/overlays';
import { Avatar, Skeleton } from '../ui/primitives';

const CommentItem = ({ comment, onDelete }: { comment: Comment; onDelete?: () => void }) => {
  const staffAuthor = comment.author.role !== 'resident';
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      className="flex gap-3"
    >
      <Link to={`/u/${comment.author.id}`} className="shrink-0">
        <Avatar name={comment.author.name} src={comment.author.avatarUrl} className="size-9" />
      </Link>
      <div
        className={cn(
          'min-w-0 flex-1 rounded-2xl rounded-tl-sm border px-4 py-3',
          comment.isInternal ? 'border-amber-500/30 bg-amber-500/5' : 'bg-card',
        )}
      >
        <div className="flex items-center gap-2">
          <Link
            to={`/u/${comment.author.id}`}
            className="truncate text-sm font-semibold hover:underline"
          >
            {comment.author.name}
          </Link>
          {staffAuthor && (
            <span className="text-primary inline-flex items-center gap-0.5 text-[11px] font-medium">
              <ShieldCheck className="size-3" />{' '}
              {comment.author.role === 'admin' ? 'Admin' : 'Authority'}
            </span>
          )}
          {comment.isInternal && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
              <Lock className="size-2.5" /> Internal
            </span>
          )}
          <span className="text-muted-foreground text-xs">· {timeAgo(comment.createdAt)}</span>
          {onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="-mr-2 ml-auto size-7"
                  aria-label="Comment actions"
                >
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem destructive onSelect={onDelete}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {comment.body}
        </p>
      </div>
    </motion.li>
  );
};

export const CommentThread = ({ issueId }: { issueId: string }) => {
  const { user, isStaff, isAdmin } = useAuth();
  const comments = useComments(issueId);
  const post = usePostComment(issueId);
  const remove = useDeleteComment(issueId);
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const items = comments.data?.pages.flatMap((p) => p.items) ?? [];

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const text = body.trim();
    if (!text) return;
    post.mutate(
      { body: text, isInternal: internal },
      {
        onSuccess: () => {
          setBody('');
          setInternal(false);
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
  };

  return (
    <section aria-labelledby="discussion">
      <h2 id="discussion" className="flex items-center gap-2 text-lg font-semibold">
        Discussion
        <span className="text-muted-foreground text-sm font-normal">({items.length})</span>
      </h2>

      <div className="mt-5">
        {comments.isPending ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-16 flex-1 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground flex flex-col items-center rounded-2xl border border-dashed py-10 text-center text-sm">
            <MessageSquare className="mb-2 size-5" />
            No comments yet. Share what you&apos;ve seen or ask for an update.
          </div>
        ) : (
          <ul className="space-y-4">
            <AnimatePresence initial={false}>
              {items.map((c) => (
                <CommentItem
                  key={c.id}
                  comment={c}
                  onDelete={
                    user && (c.author.id === user.id || isAdmin)
                      ? () =>
                          remove.mutate(c, {
                            onSuccess: () => toast.success('Comment deleted'),
                            onError: (err) => toast.error(errorMessage(err)),
                          })
                      : undefined
                  }
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
        {comments.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-3"
            onClick={() => void comments.fetchNextPage()}
          >
            Load more comments
          </Button>
        )}
      </div>

      {user ? (
        <form onSubmit={submit} className="mt-6 flex gap-3">
          <Avatar name={user.name} src={user.avatarUrl} className="hidden size-9 sm:flex" />
          <div
            className={cn(
              'bg-card focus-within:border-primary/50 focus-within:ring-ring flex-1 rounded-2xl border shadow-xs transition-shadow focus-within:ring-[3px]',
              internal && 'border-amber-500/40 bg-amber-500/5',
            )}
          >
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={onKeyDown}
              maxLength={2000}
              placeholder={
                internal
                  ? 'Write an internal note (only staff can see this)…'
                  : 'Add to the discussion…'
              }
              className="min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
              aria-label="Comment"
            />
            <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
              {isStaff ? (
                <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-xs">
                  <Switch checked={internal} onCheckedChange={setInternal} />
                  <Lock className="size-3" /> Internal note
                </label>
              ) : (
                <span className="text-muted-foreground hidden text-xs sm:block">
                  Ctrl + Enter to post
                </span>
              )}
              <Button type="submit" size="sm" loading={post.isPending} disabled={!body.trim()}>
                {!post.isPending && <Send />} {internal ? 'Add note' : 'Comment'}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-muted/50 mt-6 rounded-2xl border p-5 text-center text-sm">
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>{' '}
          to join the discussion.
        </div>
      )}
    </section>
  );
};
