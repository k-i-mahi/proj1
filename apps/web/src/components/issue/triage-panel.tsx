import {
  ISSUE_PRIORITIES,
  ISSUE_PRIORITY_LABEL,
  ISSUE_STATUS_LABEL,
  ISSUE_STATUSES,
  type IssuePriority,
  type IssueStatus,
  type IssueSummary,
} from '@civita/shared';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useStaff, useTriage } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { PriorityBadge, StatusDot } from '../domain';
import { Button } from '../ui/button';
import { Label, Textarea } from '../ui/form-controls';
import { Avatar, Card } from '../ui/primitives';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const UNASSIGNED = 'unassigned';

export const TriagePanel = ({ issue }: { issue: IssueSummary }) => {
  const staff = useStaff();
  const triage = useTriage();
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [priority, setPriority] = useState<IssuePriority>(issue.priority);
  const [assignee, setAssignee] = useState(issue.assignee?.id ?? UNASSIGNED);
  const [note, setNote] = useState('');

  const dirty =
    status !== issue.status ||
    priority !== issue.priority ||
    assignee !== (issue.assignee?.id ?? UNASSIGNED);

  // Awaited rather than using per-call callbacks: the optimistic update re-keys this
  // panel, and TanStack skips per-call callbacks once the calling component unmounts.
  const save = async () => {
    try {
      await triage.mutateAsync({
        id: issue.id,
        ...(status !== issue.status ? { status } : {}),
        ...(priority !== issue.priority ? { priority } : {}),
        ...(assignee !== (issue.assignee?.id ?? UNASSIGNED)
          ? { assignee: assignee === UNASSIGNED ? null : assignee }
          : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setNote('');
      toast.success('Issue updated. Followers have been notified.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <Card className="border-primary/25 bg-primary/[0.03] overflow-hidden">
      <div className="border-primary/15 flex items-center gap-2 border-b px-5 py-3">
        <ShieldCheck className="text-primary size-4" />
        <p className="text-sm font-semibold">Triage</p>
        <span className="text-muted-foreground ml-auto text-xs">Staff only</span>
      </div>
      <div className="grid gap-4 p-5">
        <div className="grid gap-2">
          <Label htmlFor="triage-status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as IssueStatus)}>
            <SelectTrigger id="triage-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ISSUE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  <StatusDot status={s} /> {ISSUE_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="triage-priority">Priority</Label>
            <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
              <SelectTrigger id="triage-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    <PriorityBadge priority={p} showLabel={false} /> {ISSUE_PRIORITY_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid min-w-0 gap-2">
            <Label htmlFor="triage-assignee">Assignee</Label>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger id="triage-assignee">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {staff.data?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <Avatar name={s.name} src={s.avatarUrl} className="size-5 text-[9px]" />
                    <span className="truncate">{s.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="triage-note">
            Public note <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="triage-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="e.g. Crew scheduled for Thursday morning"
            className="min-h-16"
          />
        </div>
        <Button onClick={() => void save()} disabled={!dirty} loading={triage.isPending}>
          Save changes
        </Button>
      </div>
    </Card>
  );
};
