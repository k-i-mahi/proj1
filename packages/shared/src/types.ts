import type {
  IssueEventType,
  IssuePriority,
  IssueStatus,
  NotificationType,
  Role,
} from './constants.js';

/** Shape of every error response from the API. */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
    requestId?: string;
  };
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface UserSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
}

export interface User extends UserSummary {
  email: string;
  bio: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserProfile extends UserSummary {
  bio: string;
  createdAt: string;
  stats: { reported: number; resolved: number; comments: number; upvotesReceived: number };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  order: number;
  issueCount: number;
}

export interface IssueImage {
  url: string;
  publicId?: string;
}

export interface IssueSummary {
  id: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  category: Pick<Category, 'id' | 'name' | 'slug' | 'icon' | 'color'>;
  location: { lat: number; lng: number };
  address: string;
  images: IssueImage[];
  reporter: UserSummary;
  assignee: UserSummary | null;
  upvoteCount: number;
  commentCount: number;
  followerCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  /** Present when sorted by distance or filtered around a point. */
  distanceKm?: number;
  /** Present when the request is authenticated. */
  viewer?: { upvoted: boolean; following: boolean };
}

export type IssueDetail = IssueSummary;

export interface MapIssue {
  id: string;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  categoryId: string;
  lat: number;
  lng: number;
  upvoteCount: number;
}

export interface Comment {
  id: string;
  issueId: string;
  author: UserSummary;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

export interface IssueEvent {
  id: string;
  type: IssueEventType;
  actor: UserSummary | null;
  from: string | null;
  to: string | null;
  note: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  actor: UserSummary | null;
  issue: { id: string; title: string } | null;
  readAt: string | null;
  createdAt: string;
}

export interface AnalyticsOverview {
  range: { days: number; from: string; to: string };
  totals: {
    issues: number;
    open: number;
    inProgress: number;
    resolved: number;
    users: number;
    resolutionRate: number;
    medianResolutionHours: number | null;
    reportedInRange: number;
    resolvedInRange: number;
  };
  trend: { date: string; reported: number; resolved: number }[];
  byCategory: {
    categoryId: string;
    name: string;
    color: string;
    total: number;
    resolved: number;
  }[];
  byStatus: { status: IssueStatus; count: number }[];
  byPriority: { priority: IssuePriority; count: number }[];
  topIssues: Pick<IssueSummary, 'id' | 'title' | 'status' | 'upvoteCount' | 'commentCount'>[];
}

export interface PublicStats {
  issues: number;
  resolved: number;
  residents: number;
  medianResolutionHours: number | null;
}

export interface ReverseGeocodeResult {
  address: string;
}
