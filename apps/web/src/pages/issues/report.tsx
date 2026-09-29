import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { IssueForm } from '@/components/issue/issue-form';
import { PageHeader } from '@/components/ui/states';
import { useDocumentTitle } from '@/hooks/misc';
import { useCreateIssue } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';

export default function ReportPage() {
  useDocumentTitle('Report an issue');
  const navigate = useNavigate();
  const create = useCreateIssue();

  return (
    <>
      <PageHeader
        className="mx-auto max-w-3xl"
        title="Report an issue"
        description="Tell us what's wrong and where. It takes less than a minute."
      />
      <IssueForm
        submitLabel="Submit report"
        onSubmit={async (values) => {
          try {
            const issue = await create.mutateAsync(values);
            toast.success('Thanks! Your report is live.', {
              description: 'Neighbours can now upvote and follow it.',
            });
            void navigate(`/issues/${issue.id}`, { replace: true });
          } catch (err) {
            toast.error(errorMessage(err));
          }
        }}
      />
    </>
  );
}
