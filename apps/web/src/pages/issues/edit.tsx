import { Lock } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { IssueForm } from '@/components/issue/issue-form';
import { Button } from '@/components/ui/button';
import { EmptyState, ErrorState, PageHeader } from '@/components/ui/states';
import { useDocumentTitle } from '@/hooks/misc';
import { useIssue, useUpdateIssue } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/providers/auth';
import { PageLoader } from '@/components/page-loader';

export default function EditIssuePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { data: issue, isPending, error } = useIssue(id);
  const update = useUpdateIssue(id);
  useDocumentTitle('Edit report');

  if (isPending) return <PageLoader />;
  if (error || !issue) return <ErrorState error={error} />;

  const allowed = isAdmin || (issue.reporter.id === user?.id && issue.status === 'open');
  if (!allowed) {
    return (
      <EmptyState
        icon={Lock}
        title="This report can no longer be edited"
        description="Reports can only be edited by their author while they are still open."
        action={
          <Button asChild variant="outline">
            <Link to={`/issues/${id}`}>Back to issue</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <PageHeader className="mx-auto max-w-3xl" title="Edit report" description={issue.title} />
      <IssueForm
        submitLabel="Save changes"
        initial={{
          title: issue.title,
          description: issue.description,
          category: issue.category.id,
          location: issue.location,
          address: issue.address,
          images: issue.images,
        }}
        onSubmit={async (values) => {
          try {
            await update.mutateAsync(values);
            toast.success('Report updated');
            void navigate(`/issues/${id}`, { replace: true });
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </>
  );
}
