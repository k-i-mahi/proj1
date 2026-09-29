import { SOCKET_EVENTS, type Comment, type IssueSummary, type Notification } from '@civita/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { keys } from '@/lib/query-client';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/providers/auth';
import { appendComment, patchIssueInCache, removeComment } from './queries';

/** Global listeners: pushes notifications and keeps cached issues fresh. Mounted once in the app shell. */
export const useRealtime = () => {
  const qc = useQueryClient();
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'loading') return;
    const socket = getSocket();

    const onNotification = (n: Notification) => {
      qc.setQueryData<{ count: number }>(keys.notifications.unread, (old) => ({
        count: (old?.count ?? 0) + 1,
      }));
      void qc.invalidateQueries({ queryKey: [...keys.notifications.all, 'list'] });
      toast(n.message, { description: n.actor ? `From ${n.actor.name}` : undefined });
    };

    // Issue updates: full DTOs from triage, or partial counters from votes/comments.
    const onIssueUpdated = (issue: Partial<IssueSummary> & { id: string }) => {
      // Never overwrite the viewer's own flags with a broadcast payload.
      const { viewer: _viewer, ...patch } = issue;
      patchIssueInCache(qc, issue.id, patch);
    };

    const onIssueCreated = () => {
      void qc.invalidateQueries({ queryKey: [...keys.issues.all, 'map'] });
    };

    socket.on(SOCKET_EVENTS.notification, onNotification);
    socket.on(SOCKET_EVENTS.issueUpdated, onIssueUpdated);
    socket.on(SOCKET_EVENTS.issueCreated, onIssueCreated);
    return () => {
      socket.off(SOCKET_EVENTS.notification, onNotification);
      socket.off(SOCKET_EVENTS.issueUpdated, onIssueUpdated);
      socket.off(SOCKET_EVENTS.issueCreated, onIssueCreated);
    };
  }, [qc, status]);
};

/** Subscribes to live activity on a single issue while its page is open. */
export const useIssueRoom = (issueId: string | undefined) => {
  const qc = useQueryClient();
  const { status } = useAuth();

  useEffect(() => {
    if (!issueId || status === 'loading') return;
    const socket = getSocket();
    const join = () => socket.emit(SOCKET_EVENTS.joinIssue, issueId);
    join();
    socket.on('connect', join); // Rejoin after reconnects.

    const onComment = (comment: Comment) => {
      if (comment.issueId === issueId) appendComment(qc, issueId, comment);
    };
    const onCommentDeleted = ({ id, issueId: from }: { id: string; issueId: string }) => {
      if (from === issueId) removeComment(qc, issueId, id);
    };
    const onUpdated = (issue: { id: string }) => {
      if (issue.id === issueId)
        void qc.invalidateQueries({ queryKey: keys.issues.timeline(issueId) });
    };

    socket.on(SOCKET_EVENTS.commentCreated, onComment);
    socket.on(SOCKET_EVENTS.commentDeleted, onCommentDeleted);
    socket.on(SOCKET_EVENTS.issueUpdated, onUpdated);
    return () => {
      socket.emit(SOCKET_EVENTS.leaveIssue, issueId);
      socket.off('connect', join);
      socket.off(SOCKET_EVENTS.commentCreated, onComment);
      socket.off(SOCKET_EVENTS.commentDeleted, onCommentDeleted);
      socket.off(SOCKET_EVENTS.issueUpdated, onUpdated);
    };
  }, [issueId, qc, status]);
};
