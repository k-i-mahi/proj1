import {
  ArrowRight,
  BarChart3,
  Bell,
  Camera,
  CheckCircle2,
  FolderKanban,
  Lock,
  MapPin,
  Menu,
  ThumbsUp,
  Zap,
} from 'lucide-react';
import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { CategoryPill, Logo, StatusBadge } from '@/components/domain';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, DialogTitle } from '@/components/ui/overlays';
import { Avatar } from '@/components/ui/primitives';
import { useDocumentTitle } from '@/hooks/misc';
import { useIssuePage, usePublicStats } from '@/hooks/queries';
import { cn, formatHours, timeAgo } from '@/lib/utils';
import { useAuth } from '@/providers/auth';

const REPO_URL = 'https://github.com/k-i-mahi/civita-web-programming';

const GithubMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
  </svg>
);

const Reveal = ({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.6, delay, ease: [0.2, 0.8, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

const Counter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());
  useEffect(() => {
    if (inView) void animate(count, value, { duration: 1.4, ease: 'easeOut' });
  }, [inView, value, count]);
  return (
    <span ref={ref}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
};

const Nav = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { href: '#features', label: 'Features' },
    { href: '#how', label: 'How it works' },
    { href: '/map', label: 'Live map', internal: true },
  ];

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all',
        scrolled ? 'bg-background/80 border-b backdrop-blur-xl' : 'bg-transparent',
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link to="/" aria-label="Civita home">
          <Logo />
        </Link>
        <nav className="text-muted-foreground hidden items-center gap-6 text-sm font-medium md:flex">
          {links.map((l) =>
            l.internal ? (
              <Link key={l.href} to={l.href} className="hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ) : (
              <a key={l.href} href={l.href} className="hover:text-foreground transition-colors">
                {l.label}
              </a>
            ),
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Button asChild>
              <Link to="/issues">
                Open app <ArrowRight />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild className="hidden sm:inline-flex">
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu />
          </Button>
        </div>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="p-6" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <Logo />
          <nav className="mt-8 grid gap-1 text-base font-medium">
            {links.map((l) =>
              l.internal ? (
                <Link key={l.href} to={l.href} className="hover:bg-accent rounded-lg px-3 py-2">
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="hover:bg-accent rounded-lg px-3 py-2"
                >
                  {l.label}
                </a>
              ),
            )}
          </nav>
          {!user && (
            <div className="mt-8 grid gap-2">
              <Button asChild>
                <Link to="/register">Get started</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/login">Sign in</Link>
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
};

/** A live preview of the product built from real data, framed like a browser window. */
const ProductPreview = () => {
  const { data } = useIssuePage({ sort: 'top', limit: 4, status: 'open,in_progress' });
  const issues = data?.items ?? [];
  return (
    <div className="relative">
      <div className="absolute -inset-x-10 -top-10 -bottom-10 -z-10 rounded-[3rem] bg-gradient-to-tr from-indigo-500/25 via-violet-500/20 to-fuchsia-500/25 blur-3xl" />
      <div className="bg-card/80 overflow-hidden rounded-2xl border shadow-2xl shadow-indigo-500/10 backdrop-blur">
        <div className="bg-muted/50 flex items-center gap-2 border-b px-4 py-3">
          <span className="size-3 rounded-full bg-red-400/80" />
          <span className="size-3 rounded-full bg-amber-400/80" />
          <span className="size-3 rounded-full bg-emerald-400/80" />
          <span className="bg-background text-muted-foreground mx-auto rounded-md border px-3 py-1 font-mono text-[11px]">
            civita.app/issues
          </span>
        </div>
        <div className="space-y-2.5 p-4">
          {issues.length
            ? issues.map((issue, i) => (
                <motion.div
                  key={issue.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <Link
                    to={`/issues/${issue.id}`}
                    className="bg-background hover:border-primary/40 flex items-center gap-3 rounded-xl border p-3 transition-colors"
                  >
                    <span className="bg-primary/10 text-primary flex w-11 shrink-0 flex-col items-center rounded-lg py-1.5 text-xs font-semibold">
                      <ThumbsUp className="size-3.5" />
                      {issue.upvoteCount}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <StatusBadge status={issue.status} />
                        <CategoryPill category={issue.category} className="hidden sm:inline-flex" />
                      </span>
                      <span className="mt-1 block truncate text-sm font-medium">{issue.title}</span>
                    </span>
                    <Avatar
                      name={issue.reporter.name}
                      src={issue.reporter.avatarUrl}
                      className="hidden size-7 sm:flex"
                    />
                  </Link>
                </motion.div>
              ))
            : Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="bg-muted h-[68px] animate-pulse rounded-xl" />
              ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1, type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-card absolute -bottom-14 -left-6 hidden items-center gap-3 rounded-xl border p-3 pr-5 shadow-xl sm:flex"
      >
        <span className="bg-status-resolved/15 text-status-resolved flex size-9 items-center justify-center rounded-full">
          <CheckCircle2 className="size-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">Issue resolved</span>
          <span className="text-muted-foreground block text-xs">
            18 followers notified · just now
          </span>
        </span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.3, type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-card absolute -top-5 -right-3 hidden items-center gap-2.5 rounded-xl border p-2.5 pr-4 shadow-xl sm:flex"
      >
        <span className="relative flex size-2.5">
          <span className="animate-pulse-ring absolute inline-flex size-full rounded-full bg-emerald-500" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-xs font-medium">Live updates</span>
      </motion.div>
    </div>
  );
};

const FEATURES = [
  {
    icon: MapPin,
    title: 'Pin it on the map',
    body: 'Drop a pin, search an address or use your GPS. We fill in the address for you.',
    className: 'md:col-span-2',
    visual: 'map',
  },
  {
    icon: Camera,
    title: 'Photo evidence',
    body: 'Attach up to five photos, compressed on your device before upload.',
  },
  {
    icon: ThumbsUp,
    title: 'Community upvotes',
    body: 'The issues that matter most rise to the top, so the right things get fixed first.',
  },
  {
    icon: Zap,
    title: 'Real-time, everywhere',
    body: 'Comments, status changes and notifications arrive instantly over WebSockets, with no refresh needed.',
    className: 'md:col-span-2',
    visual: 'realtime',
  },
  {
    icon: FolderKanban,
    title: 'Triage board',
    body: 'Authorities drag issues across a kanban board, assign crews and post updates.',
  },
  {
    icon: BarChart3,
    title: 'Transparent analytics',
    body: 'Resolution rates, response times and hotspots, visible to decision makers.',
  },
  {
    icon: Lock,
    title: 'Secure by design',
    body: 'Rotating refresh tokens, hashed secrets, role-based access and strict validation.',
  },
] as const;

const FeatureVisual = ({ kind }: { kind: string }) => {
  if (kind === 'map') {
    return (
      <div className="bg-muted/60 relative mt-6 h-36 overflow-hidden rounded-xl border">
        <div className="bg-grid absolute inset-0 opacity-60" />
        <svg
          className="text-border absolute inset-0 size-full"
          preserveAspectRatio="none"
          viewBox="0 0 400 150"
          aria-hidden
        >
          <path
            d="M0 110 C80 90 120 130 200 95 S330 60 400 80"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
          />
          <path
            d="M140 0 C150 50 170 100 150 150"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
          />
        </svg>
        {[
          ['22%', '40%', '#f97316'],
          ['48%', '62%', '#0ea5e9'],
          ['70%', '30%', '#22c55e'],
          ['84%', '58%', '#eab308'],
        ].map(([left, top, color], i) => (
          <motion.span
            key={i}
            className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg"
            style={{ left, top, backgroundColor: color }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 + i * 0.12, type: 'spring' }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-2">
      {[
        {
          icon: Bell,
          text: 'Ayesha Siddiqua changed status to In progress',
          tone: 'text-status-progress bg-status-progress/12',
        },
        {
          icon: ThumbsUp,
          text: 'Your issue reached 25 upvotes',
          tone: 'text-primary bg-primary/10',
        },
        {
          icon: CheckCircle2,
          text: '"Streetlights out at Boyra" was resolved',
          tone: 'text-status-resolved bg-status-resolved/10',
        },
      ].map((n, i) => (
        <motion.div
          key={n.text}
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 + i * 0.15 }}
          className="bg-background flex items-center gap-3 rounded-lg border px-3 py-2"
        >
          <span
            className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', n.tone)}
          >
            <n.icon className="size-3.5" />
          </span>
          <span className="truncate text-xs font-medium">{n.text}</span>
        </motion.div>
      ))}
    </div>
  );
};

export default function LandingPage() {
  useDocumentTitle(undefined);
  const { user } = useAuth();
  const { data: stats } = usePublicStats();
  const { data: recent } = useIssuePage({ sort: 'newest', limit: 1 });
  const latest = recent?.items[0];

  return (
    <div className="overflow-x-clip">
      <Nav />

      {/* Hero */}
      <section className="relative pt-32 pb-24 sm:pt-40">
        <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]" />
        <div className="absolute top-0 left-1/2 -z-10 h-[32rem] w-[64rem] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-500/20 via-violet-500/10 to-transparent blur-3xl" />

        <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link
                to={latest ? `/issues/${latest.id}` : '/issues'}
                className="bg-card/80 hover:border-primary/40 inline-flex max-w-full items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-xs shadow-xs backdrop-blur transition-colors"
              >
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">
                  New
                </span>
                <span className="text-muted-foreground truncate">
                  {latest
                    ? `${latest.title} · ${timeAgo(latest.createdAt)}`
                    : 'Live in Khulna, Bangladesh'}
                </span>
                <ArrowRight className="text-muted-foreground size-3 shrink-0" />
              </Link>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.08 }}
              className="mt-6 text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-[4.25rem]"
            >
              Fix your city,
              <br />
              <span className="text-gradient">together.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="text-muted-foreground mt-6 max-w-xl text-lg leading-relaxed"
            >
              Civita turns potholes, dark streets and overflowing drains into tracked, prioritised
              work. Report in seconds, rally your neighbours, and watch the fix happen live.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Button size="lg" variant="gradient" asChild>
                <Link to={user ? '/report' : '/register'}>
                  Report an issue <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/map">
                  <MapPin /> Explore the map
                </Link>
              </Button>
            </motion.div>

            <motion.dl
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t pt-8"
            >
              {[
                { label: 'Issues reported', value: stats ? <Counter value={stats.issues} /> : '–' },
                { label: 'Resolved', value: stats ? <Counter value={stats.resolved} /> : '–' },
                {
                  label: 'Median fix time',
                  value: stats ? formatHours(stats.medianResolutionHours) : '–',
                },
              ].map((s) => (
                <div key={s.label}>
                  <dt className="text-muted-foreground text-xs sm:text-sm">{s.label}</dt>
                  <dd className="font-display mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">
                    {s.value}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 8 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ perspective: 1200 }}
          >
            <ProductPreview />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-primary text-sm font-semibold">Everything in one place</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              Built for residents. Trusted by authorities.
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              One shared, transparent source of truth for what&apos;s broken and what&apos;s being
              done about it.
            </p>
          </Reveal>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal
                key={f.title}
                delay={(i % 3) * 0.08}
                className={'className' in f ? f.className : undefined}
              >
                <div className="group bg-card hover:border-primary/30 relative h-full overflow-hidden rounded-2xl border p-6 transition-all hover:shadow-lg">
                  <div className="absolute inset-0 -z-0 bg-gradient-to-br from-indigo-500/0 to-fuchsia-500/0 transition-colors group-hover:from-indigo-500/[0.04] group-hover:to-fuchsia-500/[0.06]" />
                  <div className="relative">
                    <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-xl">
                      <f.icon className="size-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
                    <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{f.body}</p>
                    {'visual' in f && <FeatureVisual kind={f.visual} />}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-muted/40 scroll-mt-20 border-y py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal className="max-w-2xl">
            <p className="text-primary text-sm font-semibold">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">
              From report to resolved in three steps
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {[
              {
                n: '01',
                title: 'Report',
                body: 'Snap a photo, pick a category and drop a pin. It takes under a minute.',
              },
              {
                n: '02',
                title: 'Rally',
                body: 'Neighbours upvote and comment, so authorities see what matters most.',
              },
              {
                n: '03',
                title: 'Resolve',
                body: 'Authorities triage, assign and update. Everyone following gets notified instantly.',
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.1}>
                <div className="relative">
                  <span className="font-display text-gradient text-5xl font-semibold">{s.n}</span>
                  <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                  <p className="text-muted-foreground mt-2 leading-relaxed">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-16 text-center text-white sm:px-16">
              <div className="bg-grid absolute inset-0 opacity-20 [--foreground:white]" />
              <div className="absolute -top-24 -right-24 size-72 rounded-full bg-white/20 blur-3xl" />
              <div className="relative">
                <h2 className="text-3xl font-semibold sm:text-4xl">Your street deserves better.</h2>
                <p className="mx-auto mt-4 max-w-xl text-lg text-white/80">
                  Join {stats ? stats.residents.toLocaleString() : 'your'} neighbours already making
                  their city work.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button size="lg" className="bg-white text-indigo-700 hover:bg-white/90" asChild>
                    <Link to={user ? '/report' : '/register'}>
                      Get started for free <ArrowRight />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white dark:bg-white/10"
                    asChild
                  >
                    <Link to="/issues">Browse issues</Link>
                  </Button>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-sm sm:flex-row sm:px-6">
          <Logo />
          <p>© {new Date().getFullYear()} Civita. Built with the MERN stack and TypeScript.</p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="hover:text-foreground flex items-center gap-1.5"
          >
            <GithubMark className="size-4" /> Source code
          </a>
        </div>
      </footer>
    </div>
  );
}
