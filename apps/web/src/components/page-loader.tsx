import { Loader2 } from 'lucide-react';

export const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label="Loading">
    <Loader2 className="text-muted-foreground size-6 animate-spin" />
  </div>
);
