import type {
  AnalyticsOverview,
  Category,
  CategoryInput,
  Comment,
  CreateCommentInput,
  CreateIssueInput,
  IssueEvent,
  IssueSummary,
  ListIssuesQuery,
  MapIssue,
  MapIssuesQuery,
  Notification,
  Paginated,
  PublicStats,
  TriageIssueInput,
  UpdateIssueInput,
  User,
  UserProfile,
  UserSummary,
} from '@civita/shared';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api';
import { keys } from '@/lib/query-client';
import { useAuth } from '@/providers/auth';

/* ----------------------------------------------------------- categories -- */

export const useCategories = (all = false) =>
  useQuery({
    queryKey: keys.categories(all),
    queryFn: () => api.get<Category[]>('/categories', all ? { all: 'true' } : undefined),
    staleTime: 5 * 60_000,
  });

/* --------------------------------------------------------------- issues -- */

export const useIssueFeed = (params: ListIssuesQuery) => {
  const { status } = useAuth();
  return useInfiniteQuery({
    queryKey: keys.issues.list(params),
    queryFn: ({ pageParam, signal }) =>
      api.get<Paginated<IssueSummary>>('/issues', { ...params, page: pageParam }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
    // Wait for the session so viewer flags (upvoted / following) are included.
    enabled: status !== 'loading',
  });
};

export const useIssuePage = (params: ListIssuesQuery, enabled = true) =>
  useQuery({
    queryKey: keys.issues.list({ ...params, mode: 'page' }),
    queryFn: ({ signal }) => api.get<Paginated<IssueSummary>>('/issues', params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });

export const useMapIssues = (params: MapIssuesQuery) =>
  useQuery({
    queryKey: keys.issues.map(params),
    queryFn: ({ signal }) => api.get<MapIssue[]>('/issues/map', params, signal),
    placeholderData: keepPreviousData,
  });

export const useIssue = (id: string | undefined) => {
  const { status } = useAuth();
  return useQuery({
    queryKey: keys.issues.detail(id ?? ''),
    queryFn: () => api.get<IssueSummary>(`/issues/${id}`),
    enabled: !!id && status !== 'loading',
  });
};

export const useTimeline = (id: string) =>
  useQuery({
    queryKey: keys.issues.timeline(id),
    queryFn: () => api.get<IssueEvent[]>(`/issues/${id}/timeline`),
  });

/** Applies a partial update to an issue everywhere it is cached (detail and every list). */
export const patchIssueInCache = (qc: QueryClient, id: string, patch: Partial<IssueSummary>) => {
  qc.setQueryData<IssueSummary>(keys.issues.detail(id), (old) =>
    old ? { ...old, ...patch } : old,
  );
  qc.setQueriesData<InfiniteData<Paginated<IssueSummary>> | Paginated<IssueSummary>>(
    { queryKey: [...keys.issues.all, 'list'] },
    (old) => {
      if (!old) return old;
      const patchPage = (page: Paginated<IssueSummary>) => ({
        ...page,
        items: page.items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      });
      return 'pages' in old ? { ...old, pages: old.pages.map(patchPage) } : patchPage(old);
    },
  );
};

export const useVote = (issue: Pick<IssueSummary, 'id' | 'upvoteCount' | 'viewer'>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (upvote: boolean) =>
      upvote
        ? api.put<{ upvoted: boolean; upvoteCount: number }>(`/issues/${issue.id}/vote`)
        : api.delete<{ upvoted: boolean; upvoteCount: number }>(`/issues/${issue.id}/vote`),
    // Optimistic: flip immediately, roll back on failure.
    onMutate: (upvote) => {
      const previous = { upvoteCount: issue.upvoteCount, viewer: issue.viewer };
      patchIssueInCache(qc, issue.id, {
        upvoteCount: Math.max(0, issue.upvoteCount + (upvote ? 1 : -1)),
        viewer: { following: issue.viewer?.following ?? false, upvoted: upvote },
      });
      return previous;
    },
    onError: (_err, _upvote, previous) => {
      if (previous) patchIssueInCache(qc, issue.id, previous);
    },
    onSuccess: (res) => {
      patchIssueInCache(qc, issue.id, {
        upvoteCount: res.upvoteCount,
        viewer: { following: issue.viewer?.following ?? false, upvoted: res.upvoted },
      });
    },
  });
};

export const useFollow = (issue: Pick<IssueSummary, 'id' | 'followerCount' | 'viewer'>) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (follow: boolean) =>
      follow
        ? api.put<{ following: boolean; followerCount: number }>(`/issues/${issue.id}/follow`)
        : api.delete<{ following: boolean; followerCount: number }>(`/issues/${issue.id}/follow`),
    onMutate: (follow) => {
      const previous = { followerCount: issue.followerCount, viewer: issue.viewer };
      patchIssueInCache(qc, issue.id, {
        followerCount: Math.max(0, issue.followerCount + (follow ? 1 : -1)),
        viewer: { upvoted: issue.viewer?.upvoted ?? false, following: follow },
      });
      return previous;
    },
    onError: (_err, _follow, previous) => {
      if (previous) patchIssueInCache(qc, issue.id, previous);
    },
    onSuccess: (res) => {
      patchIssueInCache(qc, issue.id, {
        followerCount: res.followerCount,
        viewer: { upvoted: issue.viewer?.upvoted ?? false, following: res.following },
      });
    },
  });
};

export const useCreateIssue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIssueInput) => api.post<IssueSummary>('/issues', input),
    onSuccess: (issue) => {
      qc.setQueryData(keys.issues.detail(issue.id), issue);
      void qc.invalidateQueries({ queryKey: keys.issues.all });
      void qc.invalidateQueries({ queryKey: keys.categories() });
    },
  });
};

export const useUpdateIssue = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateIssueInput) => api.patch<IssueSummary>(`/issues/${id}`, input),
    onSuccess: (issue) => {
      qc.setQueryData(keys.issues.detail(id), issue);
      void qc.invalidateQueries({ queryKey: keys.issues.all });
    },
  });
};

export const useDeleteIssue = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/issues/${id}`),
    onSuccess: (_res, id) => {
      qc.removeQueries({ queryKey: keys.issues.detail(id) });
      void qc.invalidateQueries({ queryKey: keys.issues.all });
    },
  });
};

export const useTriage = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: TriageIssueInput & { id: string }) =>
      api.patch<IssueSummary>(`/issues/${id}/triage`, input),
    onMutate: ({ id, status, priority }) => {
      // Optimistic for the board: move the card immediately.
      patchIssueInCache(qc, id, {
        ...(status ? { status } : {}),
        ...(priority ? { priority } : {}),
      });
    },
    onSuccess: (issue) => {
      patchIssueInCache(qc, issue.id, issue);
      void qc.invalidateQueries({ queryKey: keys.issues.timeline(issue.id) });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.issues.all });
    },
  });
};

/* ------------------------------------------------------------- comments -- */

export const useComments = (issueId: string) =>
  useInfiniteQuery({
    queryKey: keys.issues.comments(issueId),
    queryFn: ({ pageParam }) =>
      api.get<Paginated<Comment>>(`/issues/${issueId}/comments`, { page: pageParam, limit: 50 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

/** Adds a comment to the cached thread unless it is already there (e.g. from the socket). */
export const appendComment = (qc: QueryClient, issueId: string, comment: Comment) => {
  qc.setQueryData<InfiniteData<Paginated<Comment>>>(keys.issues.comments(issueId), (old) => {
    if (!old || old.pages.some((p) => p.items.some((c) => c.id === comment.id))) return old;
    const pages = [...old.pages];
    const last = pages[pages.length - 1]!;
    pages[pages.length - 1] = { ...last, items: [...last.items, comment], total: last.total + 1 };
    return { ...old, pages };
  });
};

export const removeComment = (qc: QueryClient, issueId: string, commentId: string) => {
  qc.setQueryData<InfiniteData<Paginated<Comment>>>(keys.issues.comments(issueId), (old) =>
    old
      ? {
          ...old,
          pages: old.pages.map((p) => ({ ...p, items: p.items.filter((c) => c.id !== commentId) })),
        }
      : old,
  );
};

export const usePostComment = (issueId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) =>
      api.post<Comment>(`/issues/${issueId}/comments`, input),
    onSuccess: (comment) => {
      appendComment(qc, issueId, comment);
      if (!comment.isInternal) {
        const issue = qc.getQueryData<IssueSummary>(keys.issues.detail(issueId));
        if (issue) {
          patchIssueInCache(qc, issueId, {
            commentCount: issue.commentCount + 1,
            viewer: { upvoted: issue.viewer?.upvoted ?? false, following: true },
          });
        }
      }
    },
  });
};

export const useDeleteComment = (issueId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (comment: Comment) => api.delete<void>(`/comments/${comment.id}`),
    onSuccess: (_res, comment) => {
      removeComment(qc, issueId, comment.id);
      void qc.invalidateQueries({ queryKey: keys.issues.detail(issueId) });
    },
  });
};

/* -------------------------------------------------------- notifications -- */

export const useUnreadCount = () => {
  const { status } = useAuth();
  return useQuery({
    queryKey: keys.notifications.unread,
    queryFn: () => api.get<{ count: number }>('/notifications/unread-count'),
    enabled: status === 'authenticated',
    refetchInterval: 120_000,
  });
};

export const useNotifications = (unread = false) =>
  useInfiniteQuery({
    queryKey: keys.notifications.list(unread),
    queryFn: ({ pageParam }) =>
      api.get<Paginated<Notification>>('/notifications', {
        page: pageParam,
        limit: 20,
        ...(unread ? { unread: 'true' } : {}),
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string | 'all') =>
      id === 'all' ? api.patch('/notifications/read-all') : api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.notifications.all });
    },
  });
};

/* ---------------------------------------------------------------- users -- */

export const useProfile = (id: string | undefined) =>
  useQuery({
    queryKey: keys.users.profile(id ?? ''),
    queryFn: () => api.get<UserProfile>(`/users/${id}`),
    enabled: !!id,
  });

export const useStaff = (enabled = true) =>
  useQuery({
    queryKey: keys.users.staff,
    queryFn: () => api.get<UserSummary[]>('/users/staff'),
    enabled,
    staleTime: 5 * 60_000,
  });

export const useUsers = (params: { q?: string; role?: string; page: number }) =>
  useQuery({
    queryKey: keys.users.list(params),
    queryFn: () => api.get<Paginated<User>>('/users', { ...params, limit: 15 }),
    placeholderData: keepPreviousData,
  });

export const useAdminUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; role?: User['role']; isActive?: boolean }) =>
      api.patch<User>(`/users/${id}`, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] });
    },
  });
};

/* ----------------------------------------------------- category admin -- */

export const useSaveCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CategoryInput> & { id?: string }) =>
      id
        ? api.patch<Category>(`/categories/${id}`, input)
        : api.post<Category>('/categories', input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/categories/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['categories'] });
    },
  });
};

/* ------------------------------------------------------------ analytics -- */

export const useAnalytics = (days: number) =>
  useQuery({
    queryKey: keys.analytics(days),
    queryFn: () => api.get<AnalyticsOverview>('/analytics/overview', { days }),
    placeholderData: keepPreviousData,
  });

export const usePublicStats = () =>
  useQuery({
    queryKey: keys.stats,
    queryFn: () => api.get<PublicStats>('/stats'),
    staleTime: 60_000,
  });
