import {
  BarChart3,
  Bell,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Map,
  Menu,
  Plus,
  Search,
  Settings,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { CommandMenu } from '@/components/command-menu';
import { Logo } from '@/components/domain';
import { NotificationBell } from '@/components/notification-bell';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DialogTitle,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
} from '@/components/ui/overlays';
import { Avatar, Kbd } from '@/components/ui/primitives';
import { useCommandMenu } from '@/hooks/misc';
import { useUnreadCount } from '@/hooks/queries';
import { useRealtime } from '@/hooks/realtime';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth';

interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: number;
}

const NavItem = ({ item, onNavigate }: { item: NavEntry; onNavigate?: () => void }) => (
  <NavLink
    to={item.to}
    end={item.end}
    onClick={onNavigate}
    className={({ isActive }) =>
      cn(
        'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-card text-foreground ring-border dark:bg-accent shadow-xs ring-1'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )
    }
  >
    {({ isActive }) => (
      <>
        <item.icon className={cn('size-4', isActive && 'text-primary')} />
        <span className="flex-1">{item.label}</span>
        {!!item.badge && (
          <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px] leading-4 font-semibold">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        )}
      </>
    )}
  </NavLink>
);

const NavSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-1">
    <p className="text-muted-foreground/80 px-3 pb-1 text-[11px] font-semibold tracking-wider uppercase">
      {title}
    </p>
    {children}
  </div>
);

const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => {
  const { user, isStaff, isAdmin } = useAuth();
  const { data: unread } = useUnreadCount();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Link to="/" onClick={onNavigate} aria-label="Civita home">
          <Logo />
        </Link>
      </div>
      <div className="px-3 pb-2">
        <Button variant="gradient" className="w-full" asChild>
          <Link to={user ? '/report' : '/login?next=/report'} onClick={onNavigate}>
            <Plus /> Report an issue
          </Link>
        </Button>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <NavSection title="Discover">
          <NavItem
            item={{ to: '/issues', label: 'Explore', icon: LayoutGrid }}
            onNavigate={onNavigate}
          />
          <NavItem item={{ to: '/map', label: 'Map', icon: Map }} onNavigate={onNavigate} />
        </NavSection>
        {user && (
          <NavSection title="You">
            <NavItem
              item={{
                to: '/notifications',
                label: 'Notifications',
                icon: Bell,
                badge: unread?.count,
              }}
              onNavigate={onNavigate}
            />
            <NavItem
              item={{ to: `/u/${user.id}`, label: 'Profile', icon: UserRound }}
              onNavigate={onNavigate}
            />
            <NavItem
              item={{ to: '/settings', label: 'Settings', icon: Settings }}
              onNavigate={onNavigate}
            />
          </NavSection>
        )}
        {isStaff && (
          <NavSection title="Authority">
            <NavItem
              item={{ to: '/triage', label: 'Triage board', icon: FolderKanban }}
              onNavigate={onNavigate}
            />
            <NavItem
              item={{ to: '/analytics', label: 'Analytics', icon: BarChart3 }}
              onNavigate={onNavigate}
            />
          </NavSection>
        )}
        {isAdmin && (
          <NavSection title="Admin">
            <NavItem
              item={{ to: '/admin/users', label: 'Users', icon: Users }}
              onNavigate={onNavigate}
            />
            <NavItem
              item={{ to: '/admin/categories', label: 'Categories', icon: Tags }}
              onNavigate={onNavigate}
            />
          </NavSection>
        )}
      </nav>
      {!user && (
        <div className="m-3 rounded-xl border bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 p-4">
          <p className="text-sm font-semibold">Join your neighbours</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Sign in to report issues, upvote and follow progress.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" className="flex-1" asChild>
              <Link to="/register" onClick={onNavigate}>
                Sign up
              </Link>
            </Button>
            <Button size="sm" variant="outline" className="flex-1" asChild>
              <Link to="/login" onClick={onNavigate}>
                Sign in
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

const UserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="focus-visible:ring-ring cursor-pointer rounded-full outline-none focus-visible:ring-[3px]"
          aria-label="Account menu"
        >
          <Avatar name={user.name} src={user.avatarUrl} className="size-8" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex items-center gap-3 py-2">
          <Avatar name={user.name} src={user.avatarUrl} className="size-9" />
          <span className="min-w-0">
            <span className="text-foreground block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs font-normal">{user.email}</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate(`/u/${user.id}`)}>
          <UserRound /> Your profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void navigate('/settings')}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={() => {
            void logout().then(() => navigate('/'));
          }}
        >
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export const AppLayout = () => {
  const { user, status } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const command = useCommandMenu();
  useRealtime();

  const fullBleed = location.pathname === '/map';

  return (
    <div className="bg-background flex min-h-dvh">
      <aside className="bg-sidebar hidden w-64 shrink-0 border-r lg:block">
        <div className="sticky top-0 h-dvh">
          <SidebarContent />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="bg-sidebar p-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Navigation</DialogTitle>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="bg-background/80 sticky top-0 z-40 flex h-16 items-center gap-2 border-b px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <Link to="/" className="lg:hidden" aria-label="Civita home">
            <Logo withText={false} />
          </Link>

          <button
            type="button"
            onClick={() => command.setOpen(true)}
            className="bg-muted/60 text-muted-foreground hover:bg-muted ml-1 flex h-9 w-full max-w-sm cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition-colors"
          >
            <Search className="size-4" />
            <span className="flex-1 truncate text-left">Search issues…</span>
            <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
          </button>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            {user ? (
              <>
                <NotificationBell />
                <div className="ml-1">
                  <UserMenu />
                </div>
              </>
            ) : (
              status !== 'loading' && (
                <div className="ml-1 flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                    <Link to={`/login?next=${encodeURIComponent(location.pathname)}`}>Sign in</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link to="/register">Get started</Link>
                  </Button>
                </div>
              )
            )}
          </div>
        </header>

        <main
          className={cn(
            'flex-1',
            !fullBleed && 'mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8',
          )}
        >
          <Outlet />
        </main>
      </div>

      <CommandMenu open={command.open} onOpenChange={command.setOpen} />
    </div>
  );
};
