export const ROLES = ['resident', 'authority', 'admin'] as const;
export type Role = (typeof ROLES)[number];

/** Roles that can triage issues (change status, priority and assignee). */
export const STAFF_ROLES: readonly Role[] = ['authority', 'admin'];

export const isStaff = (role: Role | undefined | null): boolean =>
  !!role && STAFF_ROLES.includes(role);

export const ISSUE_STATUSES = ['open', 'in_progress', 'resolved', 'closed', 'rejected'] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
  rejected: 'Rejected',
};

/** Statuses that count as "done" for analytics and filters. */
export const TERMINAL_STATUSES: readonly IssueStatus[] = ['resolved', 'closed', 'rejected'];

export const ISSUE_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];

export const ISSUE_PRIORITY_LABEL: Record<IssuePriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
};

export const ISSUE_SORTS = ['newest', 'oldest', 'top', 'discussed', 'nearest'] as const;
export type IssueSort = (typeof ISSUE_SORTS)[number];

export const ISSUE_SORT_LABEL: Record<IssueSort, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  top: 'Most upvoted',
  discussed: 'Most discussed',
  nearest: 'Nearest to me',
};

export const ISSUE_EVENT_TYPES = [
  'created',
  'status_changed',
  'priority_changed',
  'assigned',
  'unassigned',
  'edited',
] as const;
export type IssueEventType = (typeof ISSUE_EVENT_TYPES)[number];

export const NOTIFICATION_TYPES = [
  'issue_status_changed',
  'issue_assigned',
  'issue_commented',
  'issue_upvote_milestone',
  'welcome',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Upvote counts that trigger a milestone notification to the reporter. */
export const UPVOTE_MILESTONES = [5, 10, 25, 50, 100] as const;

export const MAX_ISSUE_IMAGES = 5;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Real-time event names shared by the API socket server and the web client. */
export const SOCKET_EVENTS = {
  joinIssue: 'issue:join',
  leaveIssue: 'issue:leave',
  issueUpdated: 'issue:updated',
  issueCreated: 'issue:created',
  commentCreated: 'comment:created',
  commentDeleted: 'comment:deleted',
  notification: 'notification:new',
} as const;
