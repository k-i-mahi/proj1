import { ISSUE_STATUS_LABEL, type AnalyticsOverview } from '@civita/shared';
import {
  ArrowBigUp,
  CheckCircle2,
  CircleDot,
  Clock,
  type Inbox,
  MessageSquare,
  Table2,
  Users,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PriorityBadge, STATUS_META, StatusBadge } from '@/components/domain';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@/components/ui/primitives';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/select';
import { ErrorState, PageHeader } from '@/components/ui/states';
import { useDocumentTitle } from '@/hooks/misc';
import { useAnalytics } from '@/hooks/queries';
import { cn, formatHours } from '@/lib/utils';

const Kpi = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Inbox;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) => (
  <Card className="p-5">
    <div className="text-muted-foreground flex items-center gap-2 text-sm">
      <Icon className="size-4" /> {label}
    </div>
    <p className="font-display mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
    {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
  </Card>
);

const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

const ChartTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover rounded-lg border px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">
        {label && /^\d{4}-/.test(label) ? shortDate(label) : label}
      </p>
      {payload.map((p) => (
        <p key={p.name} className="text-muted-foreground flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}
          <span className="text-foreground ml-auto pl-4 font-medium tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const Legend = ({ items }: { items: { label: string; color: string; value?: number }[] }) => (
  <div className="flex flex-wrap items-center gap-4 text-xs">
    {items.map((i) => (
      <span key={i.label} className="text-muted-foreground flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm" style={{ backgroundColor: i.color }} />
        {i.label}
        {i.value !== undefined && (
          <span className="text-foreground font-semibold tabular-nums">{i.value}</span>
        )}
      </span>
    ))}
  </div>
);

const axisProps = {
  stroke: 'var(--muted-foreground)',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const TrendChart = ({ data }: { data: AnalyticsOverview }) => {
  const [asTable, setAsTable] = useState(false);
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Reported vs resolved</CardTitle>
          <CardDescription className="mt-1.5">
            Issues per day over the last {data.range.days} days
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAsTable((t) => !t)}
          aria-pressed={asTable}
        >
          <Table2 /> {asTable ? 'Chart' : 'Table'}
        </Button>
      </CardHeader>
      <CardContent>
        <Legend
          items={[
            { label: 'Reported', color: 'var(--chart-1)', value: data.totals.reportedInRange },
            { label: 'Resolved', color: 'var(--chart-2)', value: data.totals.resolvedInRange },
          ]}
        />
        {asTable ? (
          <div className="mt-4 max-h-64 overflow-y-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                  <th className="px-3 py-2 text-right font-medium">Reported</th>
                  <th className="px-3 py-2 text-right font-medium">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[...data.trend].reverse().map((d) => (
                  <tr key={d.date}>
                    <td className="px-3 py-1.5">{shortDate(d.date)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{d.reported}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums">{d.resolved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="fill-reported" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fill-resolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                <XAxis dataKey="date" {...axisProps} tickFormatter={shortDate} minTickGap={28} />
                <YAxis {...axisProps} allowDecimals={false} width={48} />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: 'var(--muted-foreground)', strokeDasharray: 3 }}
                />
                <Area
                  type="monotone"
                  dataKey="reported"
                  name="Reported"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#fill-reported)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  name="Resolved"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  fill="url(#fill-resolved)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const CategoryChart = ({ data }: { data: AnalyticsOverview }) => (
  <Card className="lg:col-span-2">
    <CardHeader>
      <CardTitle>By category</CardTitle>
      <CardDescription>All-time issues and how many were resolved</CardDescription>
    </CardHeader>
    <CardContent>
      <Legend
        items={[
          { label: 'Total', color: 'var(--chart-1)' },
          { label: 'Resolved', color: 'var(--chart-2)' },
        ]}
      />
      <div className="mt-4" style={{ height: Math.max(200, data.byCategory.length * 44) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data.byCategory}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barGap={2}
            barCategoryGap="28%"
          >
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
            <XAxis type="number" {...axisProps} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="name"
              {...axisProps}
              width={140}
              tick={{ fill: 'var(--foreground)', fontSize: 12 }}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.6 }} />
            <Bar
              dataKey="total"
              name="Total"
              fill="var(--chart-1)"
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
            />
            <Bar
              dataKey="resolved"
              name="Resolved"
              fill="var(--chart-2)"
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </CardContent>
  </Card>
);

/** Share-of-total rows: status is shown with its reserved colour plus icon and label. */
const Breakdown = ({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; label: ReactNode; count: number; color: string }[];
}) => {
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full">
          {rows
            .filter((r) => r.count)
            .map((r) => (
              <span
                key={r.key}
                style={{ width: `${(r.count / total) * 100}%`, backgroundColor: r.color }}
                title={`${r.count}`}
              />
            ))}
        </div>
        {rows.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-3 text-sm">
            {r.label}
            <span className="text-muted-foreground tabular-nums">
              <span className="text-foreground font-medium">{r.count}</span> ·{' '}
              {Math.round((r.count / total) * 100)}%
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

const PRIORITY_COLORS = {
  low: '#a1a1aa',
  medium: '#38bdf8',
  high: '#f59e0b',
  urgent: '#f43f5e',
} as const;

export default function AnalyticsPage() {
  useDocumentTitle('Analytics');
  const [days, setDays] = useState(30);
  const { data, isPending, error, refetch, isFetching } = useAnalytics(days);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="How fast the city is responding, and where problems are concentrated."
        actions={
          <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <TabsList>
              <TabsTrigger value="7">7 days</TabsTrigger>
              <TabsTrigger value="30">30 days</TabsTrigger>
              <TabsTrigger value="90">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : isPending || !data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
          <Skeleton className="h-80 rounded-xl sm:col-span-2 lg:col-span-4" />
        </div>
      ) : (
        <div className={cn('space-y-4 transition-opacity', isFetching && 'opacity-70')}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              icon={CircleDot}
              label="Open issues"
              value={data.totals.open}
              hint={`${data.totals.inProgress} in progress`}
            />
            <Kpi
              icon={CheckCircle2}
              label="Resolution rate"
              value={`${data.totals.resolutionRate}%`}
              hint={`${data.totals.resolved} of ${data.totals.issues} resolved`}
            />
            <Kpi
              icon={Clock}
              label="Median time to resolve"
              value={formatHours(data.totals.medianResolutionHours)}
              hint="From report to resolution"
            />
            <Kpi
              icon={Users}
              label="Active residents"
              value={data.totals.users}
              hint={`${data.totals.reportedInRange} reports in ${days} days`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <TrendChart data={data} />
            <Breakdown
              title="By status"
              rows={data.byStatus.map((s) => ({
                key: s.status,
                count: s.count,
                color: STATUS_META[s.status].hex,
                label: <StatusBadge status={s.status} />,
              }))}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <CategoryChart data={data} />
            <div className="space-y-4">
              <Breakdown
                title="By priority"
                rows={[...data.byPriority].reverse().map((p) => ({
                  key: p.priority,
                  count: p.count,
                  color: PRIORITY_COLORS[p.priority],
                  label: <PriorityBadge priority={p.priority} />,
                }))}
              />
              <Card>
                <CardHeader>
                  <CardTitle>Most wanted</CardTitle>
                  <CardDescription>Unresolved issues with the most support</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 pt-3">
                  {data.topIssues.map((i, n) => (
                    <Link
                      key={i.id}
                      to={`/issues/${i.id}`}
                      className="hover:bg-accent -mx-2 flex items-center gap-3 rounded-lg px-2 py-2"
                    >
                      <span className="text-muted-foreground w-4 text-xs tabular-nums">
                        {n + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm font-medium">{i.title}</span>
                        <span className="text-muted-foreground flex items-center gap-3 text-xs">
                          {ISSUE_STATUS_LABEL[i.status]}
                          <span className="flex items-center gap-0.5">
                            <ArrowBigUp className="size-3.5" />
                            {i.upvoteCount}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="size-3" />
                            {i.commentCount}
                          </span>
                        </span>
                      </span>
                    </Link>
                  ))}
                  {!data.topIssues.length && (
                    <p className="text-muted-foreground py-4 text-sm">
                      No unresolved issues right now.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
