import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => {
        // Don't retry client errors; they won't fix themselves.
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
        return count < 2;
      },
    },
  },
});

/** Central query-key factory so invalidation stays consistent. */
export const keys = {
  me: ['me'] as const,
  categories: (all = false) => ['categories', { all }] as const,
  issues: {
    all: ['issues'] as const,
    list: (params: Record<string, unknown>) => ['issues', 'list', params] as const,
    map: (params: Record<string, unknown>) => ['issues', 'map', params] as const,
    detail: (id: string) => ['issues', 'detail', id] as const,
    timeline: (id: string) => ['issues', 'timeline', id] as const,
    comments: (id: string) => ['issues', 'comments', id] as const,
  },
  notifications: {
    all: ['notifications'] as const,
    list: (unread: boolean) => ['notifications', 'list', { unread }] as const,
    unread: ['notifications', 'unread'] as const,
  },
  users: {
    list: (params: Record<string, unknown>) => ['users', 'list', params] as const,
    profile: (id: string) => ['users', 'profile', id] as const,
    staff: ['users', 'staff'] as const,
  },
  analytics: (days: number) => ['analytics', days] as const,
  stats: ['stats'] as const,
};
