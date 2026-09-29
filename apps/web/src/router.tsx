import type { Role } from '@civita/shared';
import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation, useRouteError } from 'react-router';
import { PageLoader } from './components/page-loader';
import { AppLayout } from './layouts/app-layout';
import { AuthLayout } from './layouts/auth-layout';
import { NotFoundPage, RouteErrorPage } from './pages/errors';
import { safeNext } from './lib/utils';
import { useAuth } from './providers/auth';

// Route-level code splitting: each page ships as its own chunk.
const LandingPage = lazy(() => import('./pages/landing'));
const LoginPage = lazy(() => import('./pages/auth/login'));
const RegisterPage = lazy(() => import('./pages/auth/register'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/forgot-password'));
const ResetPasswordPage = lazy(() => import('./pages/auth/reset-password'));
const ExplorePage = lazy(() => import('./pages/issues/explore'));
const IssuePage = lazy(() => import('./pages/issues/issue'));
const ReportPage = lazy(() => import('./pages/issues/report'));
const EditIssuePage = lazy(() => import('./pages/issues/edit'));
const MapPage = lazy(() => import('./pages/map'));
const NotificationsPage = lazy(() => import('./pages/notifications'));
const ProfilePage = lazy(() => import('./pages/profile'));
const SettingsPage = lazy(() => import('./pages/settings'));
const TriagePage = lazy(() => import('./pages/staff/triage'));
const AnalyticsPage = lazy(() => import('./pages/staff/analytics'));
const UsersPage = lazy(() => import('./pages/admin/users'));
const CategoriesPage = lazy(() => import('./pages/admin/categories'));

const page = (node: ReactNode) => <Suspense fallback={<PageLoader />}>{node}</Suspense>;

/** Redirects anonymous visitors to sign in, then back here afterwards. */
const RequireAuth = ({ children, roles }: { children: ReactNode; roles?: Role[] }) => {
  const { status, user } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (!user) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }
  if (roles && !roles.includes(user.role)) return <NotFoundPage />;
  return page(children);
};

/** Keeps signed-in users away from the sign-in screens. */
const GuestOnly = ({ children }: { children: ReactNode }) => {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <PageLoader />;
  if (status === 'authenticated') {
    return <Navigate to={safeNext(new URLSearchParams(location.search).get('next'))} replace />;
  }
  return page(children);
};

const RootError = () => <RouteErrorPage error={useRouteError()} />;

export const router = createBrowserRouter([
  {
    errorElement: <RootError />,
    children: [
      { path: '/', element: page(<LandingPage />) },
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            element: (
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            ),
          },
          {
            path: '/register',
            element: (
              <GuestOnly>
                <RegisterPage />
              </GuestOnly>
            ),
          },
          { path: '/forgot-password', element: page(<ForgotPasswordPage />) },
          { path: '/reset-password', element: page(<ResetPasswordPage />) },
        ],
      },
      {
        element: <AppLayout />,
        children: [
          { path: '/issues', element: page(<ExplorePage />) },
          { path: '/issues/:id', element: page(<IssuePage />) },
          {
            path: '/issues/:id/edit',
            element: (
              <RequireAuth>
                <EditIssuePage />
              </RequireAuth>
            ),
          },
          { path: '/map', element: page(<MapPage />) },
          { path: '/u/:id', element: page(<ProfilePage />) },
          {
            path: '/report',
            element: (
              <RequireAuth>
                <ReportPage />
              </RequireAuth>
            ),
          },
          {
            path: '/notifications',
            element: (
              <RequireAuth>
                <NotificationsPage />
              </RequireAuth>
            ),
          },
          {
            path: '/settings',
            element: (
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            ),
          },
          {
            path: '/triage',
            element: (
              <RequireAuth roles={['authority', 'admin']}>
                <TriagePage />
              </RequireAuth>
            ),
          },
          {
            path: '/analytics',
            element: (
              <RequireAuth roles={['authority', 'admin']}>
                <AnalyticsPage />
              </RequireAuth>
            ),
          },
          {
            path: '/admin/users',
            element: (
              <RequireAuth roles={['admin']}>
                <UsersPage />
              </RequireAuth>
            ),
          },
          {
            path: '/admin/categories',
            element: (
              <RequireAuth roles={['admin']}>
                <CategoriesPage />
              </RequireAuth>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
