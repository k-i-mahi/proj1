import { ROLES, type Role, type User } from '@civita/shared';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form-controls';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/overlays';
import { Avatar, Badge, Card, Skeleton } from '@/components/ui/primitives';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/select';
import { ErrorState, PageHeader } from '@/components/ui/states';
import { useDebounced, useDocumentTitle } from '@/hooks/misc';
import { useAdminUpdateUser, useUsers } from '@/hooks/queries';
import { errorMessage } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { useAuth } from '@/providers/auth';

const ROLE_LABEL: Record<Role, string> = {
  resident: 'Resident',
  authority: 'Authority',
  admin: 'Admin',
};

const RoleBadge = ({ role }: { role: Role }) => (
  <Badge variant={role === 'resident' ? 'secondary' : 'default'}>
    {role !== 'resident' && <ShieldCheck />} {ROLE_LABEL[role]}
  </Badge>
);

const UserActions = ({ user }: { user: User }) => {
  const update = useAdminUpdateUser();
  const run = (input: { role?: Role; isActive?: boolean }, message: string) =>
    update.mutate(
      { id: user.id, ...input },
      { onSuccess: () => toast.success(message), onError: (err) => toast.error(errorMessage(err)) },
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${user.name}`}
          disabled={update.isPending}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Role</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={user.role}
          onValueChange={(role) =>
            run(
              { role: role as Role },
              `${user.name} is now ${ROLE_LABEL[role as Role].toLowerCase()}`,
            )
          }
        >
          {ROLES.map((r) => (
            <DropdownMenuRadioItem key={r} value={r}>
              {ROLE_LABEL[r]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        {user.isActive ? (
          <DropdownMenuItem
            destructive
            onSelect={() => run({ isActive: false }, `${user.name} was deactivated and signed out`)}
          >
            <UserX /> Deactivate
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onSelect={() => run({ isActive: true }, `${user.name} was reactivated`)}
          >
            <UserCheck /> Reactivate
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default function UsersPage() {
  useDocumentTitle('Users');
  const { user: me } = useAuth();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<'all' | Role>('all');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim(), 300);
  const { data, isPending, error, refetch, isPlaceholderData } = useUsers({
    q: q || undefined,
    role: role === 'all' ? undefined : role,
    page,
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div>
      <PageHeader title="Users" description="Manage roles and access for everyone on Civita." />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search name or email…"
            className="h-9 pl-9"
            aria-label="Search users"
          />
        </div>
        <Tabs
          value={role}
          onValueChange={(v) => {
            setRole(v as 'all' | Role);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            {ROLES.map((r) => (
              <TabsTrigger key={r} value={r}>
                {ROLE_LABEL[r]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : (
        <Card
          className={cn('overflow-hidden transition-opacity', isPlaceholderData && 'opacity-60')}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground border-b text-left text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">User</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Status</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Joined</th>
                  <th className="w-12 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {isPending
                  ? Array.from({ length: 6 }, (_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3" colSpan={5}>
                          <Skeleton className="h-8" />
                        </td>
                      </tr>
                    ))
                  : data?.items.map((u) => (
                      <tr
                        key={u.id}
                        className={cn('hover:bg-muted/30', !u.isActive && 'opacity-60')}
                      >
                        <td className="px-4 py-3">
                          <Link to={`/u/${u.id}`} className="flex items-center gap-3">
                            <Avatar name={u.name} src={u.avatarUrl} className="size-8" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium hover:underline">
                                {u.name}{' '}
                                {u.id === me?.id && (
                                  <span className="text-muted-foreground font-normal">(you)</span>
                                )}
                              </span>
                              <span className="text-muted-foreground block truncate text-xs">
                                {u.email}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="hidden px-4 py-3 md:table-cell">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-xs font-medium',
                              u.isActive ? 'text-success' : 'text-muted-foreground',
                            )}
                          >
                            <span
                              className={cn(
                                'size-1.5 rounded-full',
                                u.isActive ? 'bg-success' : 'bg-muted-foreground',
                              )}
                            />
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="text-muted-foreground hidden px-4 py-3 md:table-cell">
                          {formatDate(u.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.id !== me?.id && <UserActions user={u} />}
                        </td>
                      </tr>
                    ))}
                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-muted-foreground px-4 py-12 text-center">
                      No users match that search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
            <p className="text-muted-foreground">{data ? `${data.total} users` : ' '}</p>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">
                Page {page} of {pages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pages}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
