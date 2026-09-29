import { CheckCircle2, MessageSquare, ThumbsUp } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { Logo } from '@/components/domain';
import { ThemeToggle } from '@/components/theme-toggle';

const FloatingCard = ({
  className,
  icon: Icon,
  title,
  meta,
  tone,
}: {
  className: string;
  icon: typeof ThumbsUp;
  title: string;
  meta: string;
  tone: string;
}) => (
  <div
    className={`animate-float absolute w-64 rounded-2xl border border-white/15 bg-white/10 p-4 text-white shadow-2xl backdrop-blur-md ${className}`}
  >
    <div className="flex items-start gap-3">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm leading-snug font-medium">{title}</p>
        <p className="mt-1 text-xs text-white/70">{meta}</p>
      </div>
    </div>
  </div>
);

export const AuthLayout = () => (
  <div className="grid min-h-dvh lg:grid-cols-2">
    <div className="relative flex flex-col px-6 py-6 sm:px-10">
      <div className="flex items-center justify-between">
        <Link to="/" aria-label="Civita home">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
      <p className="text-muted-foreground text-center text-xs">
        © {new Date().getFullYear()} Civita · Built for communities
      </p>
    </div>

    <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 lg:block">
      <div className="bg-grid absolute inset-0 opacity-30 [--foreground:white]" />
      <div className="absolute -top-32 -right-32 size-96 rounded-full bg-fuchsia-400/40 blur-3xl" />
      <div className="absolute -bottom-40 -left-20 size-[28rem] rounded-full bg-indigo-400/40 blur-3xl" />

      <div className="relative flex h-full flex-col justify-between p-12 text-white">
        <div className="max-w-md">
          <p className="text-sm font-medium text-white/70">Civic issue tracking, done right</p>
          <h2 className="mt-3 text-4xl leading-tight font-semibold">
            Small reports.
            <br />
            Real change on your street.
          </h2>
          <p className="mt-4 text-white/80">
            Pin a problem on the map, rally your neighbours, and follow it live until it&apos;s
            fixed.
          </p>
        </div>

        <div className="relative h-80">
          <FloatingCard
            className="top-0 left-0"
            icon={ThumbsUp}
            tone="bg-sky-400/30"
            title="Streetlights out along KDA Avenue"
            meta="42 neighbours upvoted · 2h ago"
          />
          <FloatingCard
            className="top-24 right-4 [animation-delay:1.2s]"
            icon={MessageSquare}
            tone="bg-amber-400/30"
            title="Crew scheduled for Thursday morning"
            meta="Engr. Kamal Uddin · Authority"
          />
          <FloatingCard
            className="bottom-0 left-12 [animation-delay:2.4s]"
            icon={CheckCircle2}
            tone="bg-emerald-400/30"
            title="Pothole on Jessore Road resolved"
            meta="Fixed in 3 days · 18 followers notified"
          />
        </div>
      </div>
    </div>
  </div>
);
