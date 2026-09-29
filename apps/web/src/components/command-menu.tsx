import { Command } from 'cmdk';
import {
  BarChart3,
  Bell,
  FolderKanban,
  LayoutGrid,
  Map,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Tags,
  Users,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useDebounced } from '@/hooks/misc';
import { useIssuePage } from '@/hooks/queries';
import { useAuth } from '@/providers/auth';
import { useTheme } from '@/providers/theme';
import { StatusDot } from './domain';
import { Dialog, DialogContent, DialogTitle } from './ui/overlays';
import { Kbd } from './ui/primitives';

const Item = ({
  children,
  onSelect,
  value,
}: {
  children: ReactNode;
  onSelect: () => void;
  value: string;
}) => (
  <Command.Item
    value={value}
    onSelect={onSelect}
    className="data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:text-muted-foreground flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm [&_svg]:size-4"
  >
    {children}
  </Command.Item>
);

const groupClass =
  '[&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium';

export const CommandMenu = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const navigate = useNavigate();
  const { user, isStaff, isAdmin } = useAuth();
  const { resolved, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query.trim(), 250);
  const results = useIssuePage({ q: debounced, limit: 6 }, open && debounced.length >= 2);

  const go = (path: string) => {
    onOpenChange(false);
    setQuery('');
    void navigate(path);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideClose
        className="top-[20%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 data-[state=open]:animate-[pop-in_150ms_ease-out]"
      >
        <DialogTitle className="sr-only">Search Civita</DialogTitle>
        <Command shouldFilter={false} loop className="flex flex-col">
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="text-muted-foreground size-4 shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search issues or jump to…"
              className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
            />
            <Kbd>Esc</Kbd>
          </div>
          <Command.List className="max-h-[22rem] overflow-y-auto p-1.5">
            <Command.Empty className="text-muted-foreground py-8 text-center text-sm">
              {results.isFetching ? 'Searching…' : 'No issues match that search.'}
            </Command.Empty>

            {debounced.length >= 2 && !!results.data?.items.length && (
              <Command.Group heading="Issues" className={groupClass}>
                {results.data.items.map((issue) => (
                  <Item
                    key={issue.id}
                    value={`issue-${issue.id}`}
                    onSelect={() => go(`/issues/${issue.id}`)}
                  >
                    <StatusDot status={issue.status} />
                    <span className="truncate">{issue.title}</span>
                    <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                      {issue.category.name}
                    </span>
                  </Item>
                ))}
              </Command.Group>
            )}

            {debounced.length < 2 && (
              <>
                <Command.Group heading="Navigate" className={groupClass}>
                  <Item value="explore" onSelect={() => go('/issues')}>
                    <LayoutGrid /> Explore issues
                  </Item>
                  <Item value="map" onSelect={() => go('/map')}>
                    <Map /> Map
                  </Item>
                  {user && (
                    <>
                      <Item value="report" onSelect={() => go('/report')}>
                        <Plus /> Report an issue
                      </Item>
                      <Item value="notifications" onSelect={() => go('/notifications')}>
                        <Bell /> Notifications
                      </Item>
                      <Item value="settings" onSelect={() => go('/settings')}>
                        <Settings /> Settings
                      </Item>
                    </>
                  )}
                  {isStaff && (
                    <>
                      <Item value="triage" onSelect={() => go('/triage')}>
                        <FolderKanban /> Triage board
                      </Item>
                      <Item value="analytics" onSelect={() => go('/analytics')}>
                        <BarChart3 /> Analytics
                      </Item>
                    </>
                  )}
                  {isAdmin && (
                    <>
                      <Item value="users" onSelect={() => go('/admin/users')}>
                        <Users /> Manage users
                      </Item>
                      <Item value="categories" onSelect={() => go('/admin/categories')}>
                        <Tags /> Manage categories
                      </Item>
                    </>
                  )}
                </Command.Group>
                <Command.Group heading="Preferences" className={groupClass}>
                  <Item
                    value="theme"
                    onSelect={() => {
                      setTheme(resolved === 'dark' ? 'light' : 'dark');
                      onOpenChange(false);
                    }}
                  >
                    {resolved === 'dark' ? <Sun /> : <Moon />} Switch to{' '}
                    {resolved === 'dark' ? 'light' : 'dark'} mode
                  </Item>
                </Command.Group>
              </>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
