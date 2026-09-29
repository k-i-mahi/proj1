import { Compass, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import { Logo } from '@/components/domain';
import { Button } from '@/components/ui/button';

export const NotFoundPage = () => (
  <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
    <div className="bg-primary/10 text-primary mb-6 flex size-14 items-center justify-center rounded-2xl">
      <Compass className="size-7" />
    </div>
    <p className="text-primary text-sm font-semibold">404</p>
    <h1 className="mt-2 text-3xl font-semibold">This page wandered off</h1>
    <p className="text-muted-foreground mt-3 max-w-md">
      The page you are looking for doesn&apos;t exist, was removed, or you don&apos;t have access to
      it.
    </p>
    <div className="mt-8 flex gap-3">
      <Button asChild>
        <Link to="/issues">Explore issues</Link>
      </Button>
      <Button variant="outline" asChild>
        <Link to="/">Go home</Link>
      </Button>
    </div>
  </div>
);

export const RouteErrorPage = ({ error }: { error: unknown }) => {
  // A new deploy can invalidate lazily-loaded chunks; a reload fixes it.
  const chunkError =
    error instanceof Error && /dynamically imported module|Loading chunk/i.test(error.message);
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo className="mb-10" />
      <h1 className="text-2xl font-semibold">
        {chunkError ? 'A new version is available' : 'Something went wrong'}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-md">
        {chunkError
          ? 'Civita was updated while you were browsing. Reload to get the latest version.'
          : 'An unexpected error occurred. Reloading the page usually fixes it.'}
      </p>
      <Button className="mt-8" onClick={() => window.location.reload()}>
        <RefreshCw /> Reload
      </Button>
    </div>
  );
};
