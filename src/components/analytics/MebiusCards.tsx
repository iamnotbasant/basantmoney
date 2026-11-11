// Mebius-style Analytics cards — clean-room recreations from the Mebius
// preview images (kit source is account-gated, so no kit code is used).
// RAW Recharts direct children only. Recharts built-in animations + CSS.
// Real Supabase rows only; empty periods are honest ₹0. All money en-IN.
import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell, LineChart, Line,
  ComposedChart, PieChart, Pie, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { IncomeEntry } from '@/hooks/useIncomeData';
import type { ExpenseEntry } from '@/hooks/useExpenseData';
import type { BankAccount } from '@/types/bank';
import {
  TODAY, CURRENT_YEAR, MONTH_SHORT, MONTH_FULL, WEEKDAYS_SHORT,
  parseEntryDate, ymd, addDays, inr, inrShort, sum, monthlySeries,
  cumulativeMonthly, dailySeries, byCategory, bySource, byWeekday,
  weeklyNet, growthPct, sumInRange, COLORS, CATEGORY_COLORS,
} from './mebiusData';

export interface MebiusProps {
  incomeData: IncomeEntry[];
  expenseData: ExpenseEntry[];
  accounts?: BankAccount[];
}

// ---------- shared bits ----------

export const Card: React.FC<{ title: string; subtitle?: string; right?: React.ReactNode; children: React.ReactNode; testId?: string }> = ({
  title, subtitle, right, children, testId,
}) => (
  <section data-testid={testId || title} className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

export const PillToggle: React.FC<{ options: string[]; value: string; onChange: (v: string) => void }> = ({ options, value, onChange }) => (
  <div className="inline-flex rounded-full bg-muted p-0.5 text-xs font-medium">
    {options.map((o) => (
      <button
        key={o}
        type="button"
        onClick={() => onChange(o)}
        className={cn(
          'rounded-full px-3 py-1 transition-colors',
          value === o ? 'bg-background text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {o}
      </button>
    ))}
  </div>
);

const ChartTip: React.FC<{ active?: boolean; payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string | number }>; label?: string | number; formatter?: (v: number, name: string) => string }> = ({ active, payload, label, formatter }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-xl backdrop-blur-md text-xs space-y-1 min-w-[160px]">
      {label !== undefined && label !== '' && <div className="font-semibold text-foreground pb-1 border-b border-border/60">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill || '#888' }} />
            {p.name}:
          </span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatter ? formatter(Number(p.value || 0), String(p.name)) : inr(Number(p.value || 0))}
          </span>
        </div>
      ))}
    </div>
  );
};

const axisTick = { fontSize: 11, fill: 'currentColor' } as const;
const gridProps = {
  strokeDasharray: '3 3', stroke: 'currentColor', vertical: false,
  className: 'stroke-border/40',
} as const;

const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <div className="flex h-[220px] items-center justify-center rounded-xl bg-muted/40 text-sm text-muted-foreground text-center px-6">
    {text}
  </div>
);

// ---------- 1. Total Expenses (charts-total-expenses) ----------

export const TotalExpensesCard: React.FC<MebiusProps> = ({ expenseData }) => {
  const total = useMemo(() => sum(expenseData), [expenseData]);
  const top = useMemo(() => byCategory(expenseData).slice(0, 3), [expenseData]);
  const daily = useMemo(() => dailySeries([], expenseData, 30), [expenseData]);
  const hasRows = expenseData.length > 0;
  return (
    <Card title="Total Expenses" subtitle="All-time spending" testId="Total Expenses">
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(total)}</div>
      <div className="mt-4 space-y-2">
        {top.map((c, i) => (
          <div key={c.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
              {c.name}
            </span>
            <span className="font-semibold tabular-nums">{inr(c.total)}</span>
          </div>
        ))}
        {top.length === 0 && <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>}
      </div>
      <div className="h-[180px] mt-4">
        {hasRows ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={daily} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="mebiusAreaBlueExp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval={6} />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#2563eb" fill="url(#mebiusAreaBlueExp)" strokeWidth={2} dot={false} animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState text="No expense rows yet — daily chart will appear once expenses are logged." />
        )}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Daily expenses, last 30 days</p>
    </Card>
  );
};

// ---------- 2. Cash Flow Area (charts-cash-flow-area) ----------

export const CashFlowAreaCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const data = useMemo(() => monthlySeries(incomeData, expenseData), [incomeData, expenseData]);
  const totalNet = useMemo(() => sum(incomeData) - sum(expenseData), [incomeData, expenseData]);
  return (
    <Card title="Cash Flow" subtitle="Money moving in and out, Jan–Dec 2026" testId="Cash Flow">
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Net cash flow</p>
          <p className={cn('text-2xl font-extrabold tracking-tight tabular-nums', totalNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            {totalNet >= 0 ? '+' : ''}{inr(totalNet)}
          </p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total in</p>
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">{inr(sum(incomeData))}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total out</p>
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">{inr(sum(expenseData))}</p>
        </div>
      </div>
      <div className="h-[240px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mebiusAreaBlueCF" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="mebiusAreaRoseCF" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e11d48" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#e11d48" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} />
            <Area type="monotone" dataKey="income" name="Income" stroke="#2563eb" fill="url(#mebiusAreaBlueCF)" strokeWidth={2} dot={false} animationDuration={800} />
            <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#e11d48" fill="url(#mebiusAreaRoseCF)" strokeWidth={2} dot={false} animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ---------- 3. Cash Flow Monthly Bar (charts-cash-flow-monthly-bar) ----------

export const CashFlowMonthlyBarCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const data = useMemo(() => monthlySeries(incomeData, expenseData), [incomeData, expenseData]);
  const best = useMemo(() => data.reduce((m, p) => (p.income > m.income ? p : m), data[0]), [data]);
  return (
    <Card title="Cash Flow — Monthly" subtitle={`Biggest income month: ${best.fullLabel} (${inr(best.income)})`} testId="Cash Flow Monthly">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            <Bar dataKey="income" name="Income" radius={[4, 4, 0, 0]} maxBarSize={26} animationDuration={800}>
              {data.map((p) => (
                <Cell key={p.month} fill={p.month === best.month ? '#2563eb' : '#d4d4d8'} />
              ))}
            </Bar>
            <Bar dataKey="expenses" name="Expenses" radius={[4, 4, 0, 0]} maxBarSize={26} animationDuration={800}>
              {data.map((p) => (
                <Cell key={p.month} fill={p.month === best.month ? '#9333ea' : '#e4e4e7'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ---------- 4. Cash Flow Daily Bar (charts-cash-flow-daily-bar) ----------

export const CashFlowDailyBarCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const daily = useMemo(() => dailySeries(incomeData, expenseData, 30), [incomeData, expenseData]);
  const total = useMemo(() => daily.reduce((s, d) => s + d.net, 0), [daily]);
  const avg = daily.length ? total / daily.length : 0;
  return (
    <Card title="Cash Flow — Daily" subtitle="Last 30 days, income over expenses" testId="Cash Flow Daily">
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total cash flow</p>
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">{inr(total)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Daily average</p>
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">{inr(avg)}</p>
        </div>
      </div>
      <div className="h-[220px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={daily} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval={4} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            <Bar dataKey="expenses" name="Expenses" fill="#d4d4d8" radius={[3, 3, 0, 0]} maxBarSize={14} stackId="a" animationDuration={800} />
            <Bar dataKey="income" name="Income" fill="#16a34a" radius={[3, 3, 0, 0]} maxBarSize={14} stackId="a" animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ---------- 5. Category Breakdown (charts-category-breakdown) ----------

export const CategoryBreakdownCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const cats = useMemo(() => byCategory(expenseData), [expenseData]);
  return (
    <Card title="Category Breakdown" subtitle="Where the money went — share of all expenses" testId="Category Breakdown">
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total income</p>
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">{inr(sum(incomeData))}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total expenses</p>
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">{inr(sum(expenseData))}</p>
        </div>
      </div>
      {cats.length > 0 ? (
        <>
          <div className="flex h-10 w-full overflow-hidden rounded-lg mt-4" role="img" aria-label="Expense share by category">
            {cats.map((c, i) => (
              <div
                key={c.name}
                className="h-full"
                style={{ width: `${Math.max(c.share * 100, 1.5)}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
                title={`${c.name}: ${inr(c.total)} (${Math.round(c.share * 100)}%)`}
              />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {cats.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  {c.name} · {Math.round(c.share * 100)}%
                </span>
                <span className="font-semibold tabular-nums">{inr(c.total)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="mt-4"><EmptyState text="No expenses yet — the category strip will fill in once spending is logged." /></div>
      )}
    </Card>
  );
};

// ---------- 6. Expenses Donut (charts-expenses) ----------

export const ExpensesDonutCard: React.FC<MebiusProps> = ({ expenseData }) => {
  const [range, setRange] = useState('Month');
  const rows = useMemo(() => {
    if (range === 'Week') {
      const s = ymd(addDays(TODAY, -6));
      const e = ymd(TODAY);
      return expenseData.filter((r) => { const d = (r.date || '').slice(0, 10); return d >= s && d <= e; });
    }
    if (range === 'Year') return expenseData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === CURRENT_YEAR; });
    return expenseData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === CURRENT_YEAR && p.month === 10; });
  }, [expenseData, range]);
  const cats = useMemo(() => byCategory(rows), [rows]);
  const total = useMemo(() => sum(rows), [rows]);
  return (
    <Card
      title="Expenses"
      subtitle={range === 'Week' ? 'Last 7 days' : range === 'Month' ? 'November 2026' : '2026'}
      right={<PillToggle options={['Week', 'Month', 'Year']} value={range} onChange={setRange} />}
      testId="Expenses Donut"
    >
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(total)}</div>
      {cats.length > 0 ? (
        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
          <div className="h-[190px] w-[190px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTip />} />
                <Pie data={cats} dataKey="total" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={2} animationDuration={800}>
                  {cats.map((c, i) => (
                    <Cell key={c.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full space-y-2">
            {cats.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  {c.name}
                </span>
                <span className="font-semibold tabular-nums">{inr(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4"><EmptyState text={`No expenses in this ${range.toLowerCase()} yet.`} /></div>
      )}
    </Card>
  );
};

// ---------- 7. Monthly Income (charts-monthly-income) ----------

export const MonthlyIncomeCard: React.FC<MebiusProps> = ({ incomeData }) => {
  const months = useMemo(() => monthlySeries(incomeData, []), [incomeData]);
  const nov = months[10].income;
  const best = useMemo(() => months.reduce((m, p) => (p.income > m.income ? p : m), months[0]), [months]);
  const pct = best.income > 0 ? Math.min(100, Math.round((nov / best.income) * 100)) : 0;
  const sources = useMemo(
    () => bySource(incomeData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === CURRENT_YEAR && p.month === 10; })).slice(0, 3),
    [incomeData],
  );
  return (
    <Card title="Monthly Income" subtitle="November 2026 vs your biggest month" testId="Monthly Income">
      <div className="flex items-center gap-5">
        <div className="h-[130px] w-[190px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[{ name: 'This month', value: pct }, { name: 'Rest', value: 100 - pct }]}
                dataKey="value" startAngle={180} endAngle={0} innerRadius={62} outerRadius={82}
                paddingAngle={0} stroke="none" animationDuration={800}
              >
                <Cell fill="#16a34a" />
                <Cell fill="#e4e4e7" />
              </Pie>
              <Tooltip content={<ChartTip formatter={(v) => `${v}%`} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div>
          <p className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(nov)}</p>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mt-1">{pct}% of biggest month ({best.month} {inr(best.income)})</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Income sources · November</p>
        <div className="mt-2 space-y-2">
          {sources.map((s) => (
            <div key={s.name} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span>{s.name}</span>
              <span className="font-semibold tabular-nums">+{inr(s.total)}</span>
            </div>
          ))}
          {sources.length === 0 && <p className="text-sm text-muted-foreground">No income logged in November yet.</p>}
        </div>
      </div>
    </Card>
  );
};

// ---------- 8. Income Overview (charts-income-overview) ----------

export const IncomeOverviewCard: React.FC<MebiusProps> = ({ incomeData }) => {
  const months = useMemo(() => monthlySeries(incomeData, []), [incomeData]);
  const total = useMemo(() => sum(incomeData), [incomeData]);
  const y2025 = useMemo(
    () => sum(incomeData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === 2025; })),
    [incomeData],
  );
  const quarters = useMemo(() => {
    const q = [0, 1, 2, 3].map((qi) => months.slice(qi * 3, qi * 3 + 3).reduce((s, m) => s + m.income, 0));
    const yearTotal = q.reduce((s, v) => s + v, 0);
    return q.map((v, i) => ({ label: `Q${i + 1}`, total: v, share: yearTotal > 0 ? v / yearTotal : 0 }));
  }, [months]);
  return (
    <Card title="Income Overview" subtitle="Total income + quarterly split of 2026" testId="Income Overview">
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(total)}</div>
      <p className="text-xs text-muted-foreground mt-1">
        {y2025 > 0 ? `${inr(total - y2025)} vs 2025 (${inr(y2025)})` : 'No income recorded in 2025 — nothing to compare against yet.'}
      </p>
      <div className="mt-5 space-y-3">
        {quarters.map((q) => (
          <div key={q.label}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">{q.label}</span>
              <span className="font-semibold tabular-nums">{inr(q.total)} · {Math.round(q.share * 100)}% of 2026</span>
            </div>
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-sky-500 transition-all duration-700" style={{ width: `${Math.round(q.share * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ---------- 9. Net Worth (charts-net-worth) ----------

export const NetWorthCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const cum = useMemo(() => cumulativeMonthly(incomeData, expenseData), [incomeData, expenseData]);
  const balance = cum.length ? cum[cum.length - 1].balance : 0;
  const max = useMemo(() => cum.reduce((m, p) => (p.balance > m.balance ? p : m), cum[0]), [cum]);
  return (
    <Card title="Net Worth" subtitle="Running balance month by month, 2026" testId="Net Worth">
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(balance)}</div>
      <p className="text-xs text-muted-foreground mt-1">Total net worth (income − expenses, all rows)</p>
      <div className="h-[220px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={cum} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            <Bar dataKey="balance" name="Balance" radius={[4, 4, 0, 0]} maxBarSize={30} animationDuration={800}>
              {cum.map((p) => (
                <Cell key={p.month} fill={p.month === max.month ? '#16a34a' : '#d4d4d8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ---------- 10. Balance (charts-balance) ----------

export const BalanceCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const cum = useMemo(() => cumulativeMonthly(incomeData, expenseData), [incomeData, expenseData]);
  const balance = cum.length ? cum[cum.length - 1].balance : 0;
  const nov = useMemo(() => {
    const m = monthlySeries(incomeData, expenseData);
    return m[10];
  }, [incomeData, expenseData]);
  return (
    <Card title="Balance" subtitle="How your balance grew through 2026" testId="Balance">
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(balance)}</div>
      <p className="text-xs text-muted-foreground mt-1">
        November: +{inr(nov.income)} in, −{inr(nov.expenses)} out
      </p>
      <div className="h-[220px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={cum} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} />
            <Line type="monotone" dataKey="balance" name="Balance" stroke="#9333ea" strokeWidth={2.5} dot={{ r: 3, fill: '#9333ea' }} activeDot={{ r: 5 }} animationDuration={800} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ---------- 11. Total Value (charts-total-value) ----------

export const TotalValueCard: React.FC<MebiusProps> = ({ incomeData, expenseData, accounts }) => {
  const weeks = useMemo(() => weeklyNet(incomeData, expenseData, 8), [incomeData, expenseData]);
  const cats = useMemo(() => byCategory(expenseData).slice(0, 3), [expenseData]);
  const balance = useMemo(() => sum(incomeData) - sum(expenseData), [incomeData, expenseData]);
  return (
    <Card title="Total Value" subtitle="Weekly net flow + where it sits" testId="Total Value">
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(balance)}</div>
      <div className="h-[190px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            <Bar dataKey="net" name="Net flow" radius={[5, 5, 0, 0]} maxBarSize={34} animationDuration={800}>
              {weeks.map((w) => (
                <Cell key={w.label} fill={w.isCurrent ? '#ea580c' : '#d4d4d8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Accounts</p>
          <div className="mt-2 space-y-1.5">
            {(accounts || []).length > 0 ? (
              accounts!.map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{a.name}</span>
                  <span className="font-semibold tabular-nums">{inr(Number(a.balance || 0))}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No bank accounts linked.</p>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Top spending</p>
          <div className="mt-2 space-y-1.5">
            {cats.map((c) => (
              <div key={c.name} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{c.name}</span>
                <span className="font-semibold tabular-nums">{inr(c.total)}</span>
              </div>
            ))}
            {cats.length === 0 && <p className="text-sm text-muted-foreground">No expenses yet.</p>}
          </div>
        </div>
      </div>
    </Card>
  );
};

// ---------- 12. Finance Overview Area (charts-finance-overview-area) ----------

export const FinanceOverviewAreaCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const [range, setRange] = useState('Month');
  const data = useMemo(() => {
    if (range === 'Week') {
      const daily = dailySeries(incomeData, expenseData, 56);
      let run = 0;
      // cumulative balance needs the all-time base: start from balance before the window
      const base = sum(incomeData) - sum(expenseData) - daily.reduce((s, d) => s + d.net, 0);
      run = base;
      return daily.map((d) => { run += d.net; return { label: d.label, fullLabel: d.fullLabel, balance: run }; });
    }
    if (range === 'Year') {
      return [2024, 2025, 2026].map((y) => {
        const inc = sum(incomeData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === y; }));
        const exp = sum(expenseData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === y; }));
        return { label: String(y), fullLabel: `Year ${y}`, balance: inc - exp };
      });
    }
    return cumulativeMonthly(incomeData, expenseData).map((p) => ({ label: p.month, fullLabel: p.fullLabel, balance: p.balance }));
  }, [incomeData, expenseData, range]);
  const latest = data.length ? data[data.length - 1].balance : 0;
  return (
    <Card
      title="Finance Overview"
      subtitle="Cumulative balance over time"
      right={<PillToggle options={['Week', 'Month', 'Year']} value={range} onChange={setRange} />}
      testId="Finance Overview Area"
    >
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(latest)}</div>
      <p className="text-xs text-muted-foreground mt-1">{range === 'Year' ? 'Net per year (not cumulative across years)' : 'Cumulative balance'}</p>
      <div className="h-[220px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mebiusAreaPurple" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#9333ea" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#9333ea" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval={range === 'Week' ? 7 : 0} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} />
            <Area type="monotone" dataKey="balance" name="Balance" stroke="#9333ea" fill="url(#mebiusAreaPurple)" strokeWidth={2.5} dot={false} animationDuration={800} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ---------- 13. Finance Overview Flow (charts-finance-overview-flow) ----------

export const FinanceOverviewFlowCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const week = useMemo(() => {
    const s = ymd(addDays(TODAY, -6));
    const e = ymd(TODAY);
    return { income: sumInRange(incomeData, s, e), expenses: sumInRange(expenseData, s, e) };
  }, [incomeData, expenseData]);
  const month = useMemo(() => {
    const rows = <T extends { date: string }>(rs: T[]) => rs.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === CURRENT_YEAR && p.month === 10; });
    return { income: sum(rows(incomeData)), expenses: sum(rows(expenseData)) };
  }, [incomeData, expenseData]);
  const year = useMemo(() => {
    const rows = <T extends { date: string }>(rs: T[]) => rs.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === CURRENT_YEAR; });
    return { income: sum(rows(incomeData)), expenses: sum(rows(expenseData)) };
  }, [incomeData, expenseData]);
  const rows = [
    { label: 'Income', week: week.income, month: month.income, year: year.income },
    { label: 'Expenses', week: week.expenses, month: month.expenses, year: year.expenses },
    { label: 'Net', week: week.income - week.expenses, month: month.income - month.expenses, year: year.income - year.expenses },
  ];
  return (
    <Card title="Finance Overview — Flow" subtitle="Net cash flow by period" testId="Finance Overview Flow">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Weekly net', value: rows[2].week },
          { label: 'Monthly net', value: rows[2].month },
          { label: 'Yearly net', value: rows[2].year },
        ].map((c) => (
          <div key={c.label}>
            <p className="text-[11px] font-medium text-muted-foreground">{c.label}</p>
            <p className={cn('text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums', c.value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {c.value >= 0 ? '+' : ''}{inr(c.value)}
            </p>
          </div>
        ))}
      </div>
      <table className="w-full text-sm mt-5">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border/60">
            <th className="py-2 font-medium">Category</th>
            <th className="py-2 font-medium text-right tabular-nums">Week</th>
            <th className="py-2 font-medium text-right tabular-nums">Month</th>
            <th className="py-2 font-medium text-right tabular-nums">Year</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border/40 last:border-0">
              <td className="py-2 text-muted-foreground">{r.label}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{inr(r.week)}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{inr(r.month)}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{inr(r.year)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

// ---------- 14. Financial Breakdown (charts-financial-breakdown) ----------

export const FinancialBreakdownCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const daily = useMemo(() => dailySeries(incomeData, expenseData, 14), [incomeData, expenseData]);
  const totInc = useMemo(() => daily.reduce((s, d) => s + d.income, 0), [daily]);
  const totExp = useMemo(() => daily.reduce((s, d) => s + d.expenses, 0), [daily]);
  return (
    <Card title="Financial Breakdown" subtitle="Income vs expenses, last 14 days" testId="Financial Breakdown">
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Income · 14 days</p>
          <p className="text-2xl font-extrabold tracking-tight tabular-nums text-emerald-600 dark:text-emerald-400">{inr(totInc)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Expenses · 14 days</p>
          <p className="text-2xl font-extrabold tracking-tight tabular-nums text-rose-600 dark:text-rose-400">{inr(totExp)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Net · 14 days</p>
          <p className="text-2xl font-extrabold tracking-tight tabular-nums">{inr(totInc - totExp)}</p>
        </div>
      </div>
      <div className="h-[220px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={daily} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval={1} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            <Bar dataKey="income" name="Income" fill="#16a34a" stackId="s" maxBarSize={22} animationDuration={800} />
            <Bar dataKey="expenses" name="Expenses" fill="#e11d48" stackId="s" radius={[3, 3, 0, 0]} maxBarSize={22} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ---------- 15. Financial Trends waffle (charts-financial-trends) ----------

export const FinancialTrendsCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const months = useMemo(() => monthlySeries(incomeData, expenseData), [incomeData, expenseData]);
  const DOT = 500; // 1 dot = ₹500
  const net2026 = useMemo(() => months.reduce((s, m) => s + m.net, 0), [months]);
  return (
    <Card title="Financial Trends" subtitle={`1 dot = ${inr(DOT)} · inflow vs outflow by month, 2026`} testId="Financial Trends">
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(net2026)}</div>
      <p className="text-xs text-muted-foreground mt-1">Total net cash flow, 2026</p>
      <div className="mt-4 space-y-2">
        {months.map((m) => {
          // At least 1 dot when the side is non-zero (a ₹32 month must not read as "no rows").
          const inDots = m.income > 0 ? Math.max(1, Math.round(m.income / DOT)) : 0;
          const outDots = m.expenses > 0 ? Math.max(1, Math.round(m.expenses / DOT)) : 0;
          return (
            <div key={m.month} className="flex items-center gap-3">
              <span className="w-8 text-xs text-muted-foreground shrink-0">{m.month}</span>
              <span className="flex flex-wrap gap-[3px] flex-1" title={`${m.fullLabel}: in ${inr(m.income)}, out ${inr(m.expenses)}`}>
                {Array.from({ length: inDots }).map((_, i) => (
                  <span key={`i${i}`} className="h-2.5 w-2.5 rounded-[3px] bg-blue-500" />
                ))}
                {Array.from({ length: outDots }).map((_, i) => (
                  <span key={`o${i}`} className="h-2.5 w-2.5 rounded-[3px] bg-zinc-300 dark:bg-zinc-700" />
                ))}
                {m.income === 0 && m.expenses === 0 && <span className="text-[11px] text-muted-foreground">— no rows —</span>}
              </span>
              <span className="w-24 text-right text-xs font-semibold tabular-nums shrink-0">{inr(m.net)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-blue-500" /> Cash inflow</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-zinc-300 dark:bg-zinc-700" /> Cash outflow</span>
      </div>
    </Card>
  );
};

// ---------- 16. Cumulative Assets & Liabilities (charts-cumulative-assets-and-liabilities) ----------

export const CumulativeAssetsCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const cum = useMemo(() => cumulativeMonthly(incomeData, expenseData), [incomeData, expenseData]);
  return (
    <Card title="Cumulative Assets & Liabilities" subtitle="Cumulative income (assets in) vs cumulative expenses (liabilities out), 2026" testId="Cumulative Assets">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={cum} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} />
            <Area type="monotone" dataKey="cumExpenses" name="Cumulative expenses" stroke="#e11d48" fill="#e11d48" fillOpacity={0.1} strokeWidth={2} dot={false} animationDuration={800} />
            <Line type="monotone" dataKey="cumIncome" name="Cumulative income" stroke="#16a34a" strokeWidth={2.5} dot={false} animationDuration={800} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Cumulative income</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-500" /> Cumulative expenses</span>
      </div>
    </Card>
  );
};

// ---------- 17. Growth Trends (charts-growth-trends + charts-revenue-growth) ----------

export const GrowthTrendsCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const months = useMemo(() => monthlySeries(incomeData, expenseData), [incomeData, expenseData]);
  const nov = months[10];
  const oct = months[9];
  const rows = [
    { label: 'Income growth', current: nov.income, prev: oct.income, values: months.map((m) => m.income), color: '#16a34a' },
    { label: 'Net growth', current: nov.net, prev: oct.net, values: months.map((m) => m.net), color: '#9333ea' },
    { label: 'Expense change', current: nov.expenses, prev: oct.expenses, values: months.map((m) => m.expenses), color: '#ea580c' },
  ];
  const annual = [2024, 2025, 2026].map((y) => ({
    year: String(y),
    income: sum(incomeData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === y; })),
  }));
  const maxBar = Math.max(1, ...rows.flatMap((r) => r.values.map((v) => Math.abs(v))));
  return (
    <Card title="Growth Trends" subtitle="November vs October 2026 · annual income below" testId="Growth Trends">
      <div className="space-y-5">
        {rows.map((r) => {
          const g = growthPct(r.current, r.prev);
          return (
            <div key={r.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium">{r.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className={cn('text-2xl font-extrabold tracking-tight tabular-nums', g === null ? 'text-muted-foreground' : g >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {g === null ? '—' : `${g >= 0 ? '+' : ''}${g}%`}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">this month {inr(r.current)}</span>
                </span>
              </div>
              <div className="flex items-end gap-1 h-10 mt-2">
                {r.values.map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{ height: `${Math.max(4, (Math.abs(v) / maxBar) * 100)}%`, background: i === 10 ? r.color : `${r.color}55`, opacity: v < 0 ? 0.45 : 1 }}
                    title={`${MONTH_SHORT[i]}: ${inr(v)}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 border-t border-border/60 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Annual income (replaces revenue-growth compounding — no forecast)</p>
        <div className="h-[130px] mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={annual} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="year" tickLine={false} axisLine={false} tick={axisTick} />
              <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
              <Tooltip content={<ChartTip />} />
              <Line type="monotone" dataKey="income" name="Income" stroke="#9333ea" strokeWidth={2.5} dot={{ r: 4, fill: '#9333ea' }} animationDuration={800} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
};

// ---------- 18. Spending Range (charts-spending-overview-range) ----------

export const SpendingRangeCard: React.FC<MebiusProps> = ({ expenseData }) => {
  const daily = useMemo(() => {
    const days: Array<{ label: string; amount: number }> = [];
    for (let d = 1; d <= 30; d++) {
      const key = `2026-11-${String(d).padStart(2, '0')}`;
      days.push({ label: String(d), amount: sum(expenseData.filter((r) => (r.date || '').slice(0, 10) === key)) });
    }
    return days;
  }, [expenseData]);
  const total = useMemo(() => daily.reduce((s, d) => s + d.amount, 0), [daily]);
  const withSpend = daily.filter((d) => d.amount > 0);
  const avg = withSpend.length ? total / withSpend.length : 0;
  const lowest = withSpend.length ? withSpend.reduce((m, d) => (d.amount < m.amount ? d : m), withSpend[0]) : null;
  const max = Math.max(1, ...daily.map((d) => d.amount));
  return (
    <Card title="Spending Overview — Range" subtitle="November 2026, daily spend" testId="Spending Range">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total spending</p>
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">{inr(total)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Daily average</p>
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">{inr(avg)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Lowest day</p>
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">{lowest ? inr(lowest.amount) : '—'}</p>
          {lowest && <p className="text-[11px] text-muted-foreground">Nov {lowest.label}</p>}
        </div>
      </div>
      <div className="h-[200px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={daily} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval={2} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            <Bar dataKey="amount" name="Spent" radius={[3, 3, 0, 0]} maxBarSize={16} animationDuration={800}>
              {daily.map((d) => (
                <Cell key={d.label} fill={lowest && d.label === lowest.label ? '#ea580c' : d.amount > 0 ? '#2563eb' : '#e4e4e7'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">Daily average counts only days with spending. Grey = no spend that day.</p>
    </Card>
  );
};

// ---------- 19. Spending Scatter (charts-spending-overview-scatter) ----------

export const SpendingScatterCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const months = useMemo(() => monthlySeries(incomeData, expenseData), [incomeData, expenseData]);
  const incDots = months.map((m, i) => ({ x: i + 1, y: m.income, month: m.month }));
  const expDots = months.map((m, i) => ({ x: i + 1, y: m.expenses, month: m.month }));
  return (
    <Card title="Spending Overview — Scatter" subtitle="Monthly income vs expenses, 2026" testId="Spending Scatter">
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis type="number" dataKey="x" domain={[1, 12]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]} tickFormatter={(v: number) => MONTH_SHORT[v - 1]} tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis type="number" dataKey="y" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip
              content={({ active, payload }: any) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="rounded-xl border border-border/80 bg-popover/95 p-3 shadow-xl text-xs space-y-1">
                    <div className="font-semibold">{MONTH_FULL[p.x - 1]} 2026</div>
                    <div className="flex justify-between gap-4"><span className="text-muted-foreground">{payload[0].name}:</span><span className="font-semibold tabular-nums">{inr(p.y)}</span></div>
                  </div>
                );
              }}
            />
            <Scatter name="Income" data={incDots} fill="#2563eb" animationDuration={800} />
            <Scatter name="Expenses" data={expDots} fill="#ea580c" animationDuration={800} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-4 mt-2">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">Income · 2026</p>
          <p className="font-bold tabular-nums">{inr(sum(incomeData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === CURRENT_YEAR; })))}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">Expenses · 2026</p>
          <p className="font-bold tabular-nums">{inr(sum(expenseData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === CURRENT_YEAR; })))}</p>
        </div>
      </div>
    </Card>
  );
};

// ---------- 20. Spending Cylinder (charts-spending-overview-cylinder) ----------

export const SpendingCylinderCard: React.FC<MebiusProps> = ({ expenseData }) => {
  const wd = useMemo(() => byWeekday(expenseData), [expenseData]);
  const recent = useMemo(
    () => [...expenseData].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5),
    [expenseData],
  );
  const max = Math.max(1, ...wd.map((w) => w.total));
  const todayWd = new Date(TODAY).getDay();
  return (
    <Card title="Spending Overview" subtitle="Expenses by weekday, 2026 + recent spending" testId="Spending Cylinder">
      <div className="flex items-end gap-2 h-[180px]">
        {wd.map((w, i) => (
          <div key={w.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <span className="text-[11px] font-semibold tabular-nums">{w.total > 0 ? inrShort(w.total) : ''}</span>
            <div
              className="w-full max-w-[44px] rounded-t-full transition-all duration-700"
              style={{
                height: `${Math.max(w.total > 0 ? 6 : 2, (w.total / max) * 70)}%`,
                background: i === todayWd ? 'linear-gradient(180deg,#a855f7,#2563eb)' : '#d4d4d8',
              }}
              title={`${w.day}: ${inr(w.total)} (${w.count} txns)`}
            />
            <span className={cn('text-xs', i === todayWd ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-muted-foreground')}>{w.day}</span>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {recent.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
            <span>
              <span className="font-medium">{r.description || r.category}</span>
              <span className="text-muted-foreground"> · {(r.date || '').slice(0, 10)}</span>
            </span>
            <span className="font-semibold tabular-nums">{inr(Number(r.amount || 0))}</span>
          </div>
        ))}
        {recent.length === 0 && <p className="text-sm text-muted-foreground">No expenses yet.</p>}
      </div>
    </Card>
  );
};

// ---------- 21. Analytics pills (charts-analytics) ----------

export const AnalyticsPillsCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const cats = useMemo(() => byCategory(expenseData).slice(0, 4), [expenseData]);
  const [active, setActive] = useState('All');
  const wd = useMemo(() => {
    const rows = active === 'All' ? expenseData : expenseData.filter((r) => r.category === active);
    return byWeekday(rows);
  }, [expenseData, active]);
  return (
    <Card title="Analytics" subtitle="Expenses by weekday — filter by category" testId="Analytics Pills">
      <div className="flex flex-wrap gap-2">
        {['All', ...cats.map((c) => c.name)].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setActive(c)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-xs font-medium border transition-colors',
              active === c ? 'bg-blue-600 text-white border-blue-600' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-4 text-sm text-muted-foreground">
        Total {active === 'All' ? 'expenses' : active}: <span className="font-bold text-foreground tabular-nums">{inr(wd.reduce((s, w) => s + w.total, 0))}</span>
        <span className="ml-2">· all-time income {inr(sum(incomeData))}</span>
      </div>
      <div className="h-[210px] mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={wd} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="day" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            <Bar dataKey="total" name="Expenses" radius={[5, 5, 0, 0]} maxBarSize={36} animationDuration={800}>
              {wd.map((w, i) => (
                <Cell key={w.day} fill={i === new Date(TODAY).getDay() ? '#2563eb' : '#d4d4d8'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// ---------- 22. Finance Analytics (charts-finance-analytics) ----------

export const FinanceAnalyticsCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const data = useMemo(() => monthlySeries(incomeData, expenseData), [incomeData, expenseData]);
  return (
    <Card title="Finance Analytics" subtitle="Recurring income and expenses by month, 2026" testId="Finance Analytics">
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            <Bar dataKey="income" name="Income" fill="#ea580c" radius={[3, 3, 0, 0]} maxBarSize={16} animationDuration={800} />
            <Bar dataKey="expenses" name="Expenses" fill="#d4d4d8" radius={[3, 3, 0, 0]} maxBarSize={16} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500" /> Income</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-zinc-300" /> Expenses</span>
      </div>
    </Card>
  );
};

// ---------- 23. Budget & Saving (charts-budget + charts-budget-health + charts-saving-progress) ----------
// No stored budget/target exists, so everything here is a share of REAL income,
// labelled as such. Never a fake limit or "left to spend".

export const BudgetSavingCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const nov = useMemo(() => {
    const inc = sum(incomeData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === CURRENT_YEAR && p.month === 10; }));
    const exp = sum(expenseData.filter((r) => { const p = parseEntryDate(r.date); return p && p.year === CURRENT_YEAR && p.month === 10; }));
    return { inc, exp, net: inc - exp };
  }, [incomeData, expenseData]);
  const allInc = useMemo(() => sum(incomeData), [incomeData]);
  const allExp = useMemo(() => sum(expenseData), [expenseData]);
  const utilization = allInc > 0 ? Math.round((allExp / allInc) * 100) : 0;
  const savingRate = allInc > 0 ? Math.round(((allInc - allExp) / allInc) * 100) : 0;
  const novSpentShare = nov.inc > 0 ? Math.min(100, Math.round((nov.exp / nov.inc) * 100)) : 0;
  const novSavedShare = nov.inc > 0 ? Math.max(0, 100 - novSpentShare) : 0;
  const catCount = useMemo(() => byCategory(expenseData).length, [expenseData]);
  const dots = 100;
  const filled = nov.inc > 0 ? Math.round((novSpentShare / 100) * dots) : 0;
  return (
    <Card title="Budget & Saving" subtitle="Shares of real income — no budget is set, so no limit is shown" testId="Budget Saving">
      {nov.inc <= 0 ? (
        <EmptyState text="No income in November yet — saving and budget shares need an income month to compare against." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">November spending</p>
              <p className="text-sm mt-1">Spent <span className="font-bold tabular-nums">{inr(nov.exp)}</span> of <span className="font-bold tabular-nums">{inr(nov.inc)}</span> income ({novSpentShare}%)</p>
              <div className="flex flex-wrap gap-[3px] mt-3" role="img" aria-label={`${novSpentShare}% of November income spent`}>
                {Array.from({ length: dots }).map((_, i) => (
                  <span key={i} className={cn('h-2.5 w-2.5 rounded-[2px]', i < filled ? 'bg-orange-500' : 'bg-zinc-200 dark:bg-zinc-800')} />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Budget health (all-time)</p>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">Expenses ÷ income</p>
                  <p className="text-2xl font-extrabold tabular-nums">{utilization}%</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-muted-foreground">Saving rate</p>
                  <p className="text-2xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{savingRate}%</p>
                </div>
              </div>
              <div className="h-3 w-full rounded-full bg-muted overflow-hidden mt-3">
                <div className="h-full bg-violet-600 transition-all duration-700" style={{ width: `${Math.min(100, utilization)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{catCount} expense categor{catCount === 1 ? 'y' : 'ies'} · 0–100% scale is share of income, not a budget threshold</p>
            </div>
          </div>
          <div className="border-t border-border/60 mt-5 pt-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Saving progress · November</p>
            <div className="flex h-8 w-full overflow-hidden rounded-lg mt-2">
              <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${novSavedShare}%` }} title={`Saved ${inr(Math.max(0, nov.net))}`} />
              <div className="h-full bg-zinc-200 dark:bg-zinc-800 transition-all duration-700" style={{ width: `${novSpentShare}%` }} title={`Spent ${inr(nov.exp)}`} />
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Saved <span className="font-semibold text-foreground tabular-nums">{inr(Math.max(0, nov.net))}</span> ({novSavedShare}%)</span>
              <span className="text-muted-foreground">Spent <span className="font-semibold text-foreground tabular-nums">{inr(nov.exp)}</span> ({novSpentShare}%)</span>
            </div>
          </div>
        </>
      )}
    </Card>
  );
};

// ---------- 24. Diverging bars (charts-finance-overview-diverging-bar) ----------

export const DivergingCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const day = (offset: number) => {
    const d = addDays(TODAY, offset);
    const key = ymd(d);
    const inc = incomeData.filter((r) => (r.date || '').slice(0, 10) === key);
    const exp = expenseData.filter((r) => (r.date || '').slice(0, 10) === key);
    return { label: `${d.getDate()} ${MONTH_FULL[d.getMonth()]}`, income: sum(inc), expenses: sum(exp), txns: inc.length + exp.length, avg: inc.length + exp.length > 0 ? (sum(inc) + sum(exp)) / (inc.length + exp.length) : 0 };
  };
  const today = useMemo(() => day(0), [incomeData, expenseData]);
  const yesterday = useMemo(() => day(-1), [incomeData, expenseData]);
  const max = Math.max(1, today.income, today.expenses, yesterday.income, yesterday.expenses);
  const Row: React.FC<{ label: string; value: number; color: string; side: 'left' | 'right' }> = ({ label, value, color, side }) => (
    <div className="flex items-center gap-2">
      <span className={cn('w-20 text-xs shrink-0', side === 'left' ? 'text-right text-muted-foreground' : 'text-muted-foreground')}>{label}</span>
      <div className={cn('flex-1 h-6 flex', side === 'left' ? 'justify-end' : 'justify-start')}>
        <div className="h-full rounded-sm transition-all duration-700" style={{ width: `${Math.max(value > 0 ? 4 : 0, (value / max) * 100)}%`, background: color }} title={inr(value)} />
      </div>
      <span className="w-24 text-xs font-semibold tabular-nums shrink-0">{inr(value)}</span>
    </div>
  );
  return (
    <Card title="Today vs Yesterday" subtitle="11 Nov vs 10 Nov 2026 — income and expenses" testId="Today Yesterday">
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today · {today.label}</p>
        <Row label="Income" value={today.income} color="#16a34a" side="left" />
        <Row label="Expenses" value={today.expenses} color="#e11d48" side="left" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">Yesterday · {yesterday.label}</p>
        <Row label="Income" value={yesterday.income} color="#86efac" side="right" />
        <Row label="Expenses" value={yesterday.expenses} color="#fda4af" side="right" />
      </div>
      <div className="grid grid-cols-2 gap-4 mt-5">
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">Transactions today</p>
          <p className="font-bold tabular-nums">{today.txns} · avg {inr(today.avg)}</p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <p className="text-[11px] text-muted-foreground">Transactions yesterday</p>
          <p className="font-bold tabular-nums">{yesterday.txns} · avg {inr(yesterday.avg)}</p>
        </div>
      </div>
    </Card>
  );
};

// ---------- 25. Stacked bars (charts-finance-overview-stacked-bar) ----------

export const StackedBarCard: React.FC<MebiusProps> = ({ expenseData }) => {
  const top3 = useMemo(() => byCategory(expenseData).slice(0, 3).map((c) => c.name), [expenseData]);
  const data = useMemo(() => {
    const days = dailySeries([], expenseData, 7);
    return days.map((d) => {
      const row: Record<string, unknown> = { label: WEEKDAYS_SHORT[d.date.getDay()], fullLabel: d.fullLabel };
      top3.forEach((cat) => {
        row[cat] = sum(expenseData.filter((r) => (r.date || '').slice(0, 10) === ymd(d.date) && r.category === cat));
      });
      row.other = sum(expenseData.filter((r) => (r.date || '').slice(0, 10) === ymd(d.date) && !top3.includes(r.category || '')));
      return row;
    });
  }, [expenseData, top3]);
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    top3.forEach((c) => { t[c] = sum(expenseData.filter((r) => r.category === c)); });
    return t;
  }, [expenseData, top3]);
  return (
    <Card title="Daily Spending — Stacked" subtitle="Last 7 days, split by top expense categories" testId="Stacked Spending">
      <div className="flex flex-wrap gap-2">
        {top3.map((c, i) => (
          <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
            <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
            {c} · {inr(totals[c] || 0)}
          </span>
        ))}
        {top3.length === 0 && <span className="text-sm text-muted-foreground">No expenses yet.</span>}
      </div>
      <div className="h-[220px] mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
            <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={inrShort} width={52} />
            <Tooltip content={<ChartTip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
            {top3.map((c, i) => (
              <Bar key={c} dataKey={c} name={c} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} stackId="s" maxBarSize={30} animationDuration={800} />
            ))}
            <Bar dataKey="other" name="Other" fill="#d4d4d8" stackId="s" radius={[3, 3, 0, 0]} maxBarSize={30} animationDuration={800} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground mt-2">Total spending, last 7 days: <span className="font-semibold text-foreground tabular-nums">{inr(sum(expenseData.filter((r) => { const d = (r.date || '').slice(0, 10); return d >= ymd(addDays(TODAY, -6)) && d <= ymd(TODAY); })))}</span></p>
    </Card>
  );
};

// ---------- 26. Timeline (charts-finance-overview-timeline) ----------

export const TimelineCard: React.FC<MebiusProps> = ({ incomeData, expenseData }) => {
  const daily = useMemo(() => dailySeries(incomeData, expenseData, 7), [incomeData, expenseData]);
  const total = useMemo(() => daily.reduce((s, d) => s + d.expenses, 0), [daily]);
  const avg = total / 7;
  const inc7 = useMemo(() => daily.reduce((s, d) => s + d.income, 0), [daily]);
  const spentShare = inc7 > 0 ? Math.round((total / inc7) * 100) : 0;
  const max = Math.max(1, ...daily.map((d) => d.expenses));
  return (
    <Card title="Finance Overview — Timeline" subtitle="Daily spending, last 7 days" testId="Timeline">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Total spending</p>
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">{inr(total)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Avg daily</p>
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">{inr(avg)}</p>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Spent vs income</p>
          <p className="text-xl sm:text-2xl font-extrabold tracking-tight tabular-nums">{inc7 > 0 ? `${spentShare}%` : '—'}</p>
        </div>
      </div>
      <div className="flex items-end gap-2 h-[150px] mt-5">
        {daily.map((d) => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <div
              className="w-full max-w-[52px] rounded-t-md bg-violet-400 transition-all duration-700"
              style={{ height: `${Math.max(d.expenses > 0 ? 5 : 2, (d.expenses / max) * 100)}%`, opacity: 0.55 + (0.45 * d.expenses) / max }}
              title={`${d.fullLabel}: spent ${inr(d.expenses)}`}
            />
            <span className="text-xs text-muted-foreground">{WEEKDAYS_SHORT[d.date.getDay()]}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-2">No budget is set — "spent vs income" is the share of this week's income spent, not a budget status.</p>
    </Card>
  );
};

// ---------- 27. Portfolio Allocation (charts-portfolio-allocation, adapted) ----------

export const PortfolioAllocationCard: React.FC<MebiusProps> = ({ accounts }) => {
  const list = useMemo(
    () => (accounts || []).map((a) => ({ name: a.name, total: Number(a.balance || 0) })).sort((a, b) => b.total - a.total),
    [accounts],
  );
  const total = useMemo(() => list.reduce((s, a) => s + a.total, 0), [list]);
  return (
    <Card title="Portfolio Allocation" subtitle="Balance by bank account — cash accounts are the only holdings" testId="Portfolio Allocation">
      {list.length > 0 ? (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="h-[200px] w-[200px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<ChartTip />} />
                <Pie data={list} dataKey="total" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={2} animationDuration={800}>
                  {list.map((a, i) => (
                    <Cell key={a.name} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 w-full space-y-2">
            {list.map((a, i) => (
              <div key={a.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                  {a.name} · {total > 0 ? Math.round((a.total / total) * 100) : 0}%
                </span>
                <span className="font-semibold tabular-nums">{inr(a.total)}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">Total across accounts: <span className="font-semibold text-foreground tabular-nums">{inr(total)}</span></p>
          </div>
        </div>
      ) : (
        <EmptyState text="No bank accounts linked — allocation will appear once accounts are added." />
      )}
    </Card>
  );
};

// ---------- 28. Total Balance by account (charts-total-balance, adapted) ----------

export const TotalBalanceCard: React.FC<MebiusProps> = ({ accounts }) => {
  const list = useMemo(
    () => (accounts || []).map((a) => ({ name: a.name, total: Number(a.balance || 0) })).sort((a, b) => b.total - a.total),
    [accounts],
  );
  const total = useMemo(() => list.reduce((s, a) => s + a.total, 0), [list]);
  return (
    <Card title="Total Balance" subtitle="Each account's share of your total balance" testId="Total Balance">
      <div className="text-3xl font-extrabold tracking-tight tabular-nums">{inr(total)}</div>
      {list.length > 0 ? (
        <div className="mt-5 space-y-4">
          {list.map((a, i) => {
            const pct = total > 0 ? Math.round((a.total / total) * 100) : 0;
            return (
              <div key={a.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{a.name}</span>
                  <span className="font-semibold tabular-nums">{inr(a.total)} · {pct}%</span>
                </div>
                <div className="flex gap-[3px]" role="img" aria-label={`${a.name}: ${pct}% of total balance`}>
                  {Array.from({ length: 20 }).map((_, j) => (
                    <span
                      key={j}
                      className="h-3 flex-1 rounded-full"
                      style={{ background: j < Math.round((pct / 100) * 20) ? '#16a34a' : '#e4e4e7' }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4"><EmptyState text="No bank accounts linked yet." /></div>
      )}
      <p className="text-[11px] text-muted-foreground mt-4">No APR or maturity data exists — this card shows account shares only, not a fixed-deposit ladder.</p>
    </Card>
  );
};

// ---------- section wiring ----------

export const MEBIUS_CARDS: Array<{ key: string; Component: React.FC<MebiusProps> }> = [
  { key: 'total-expenses', Component: TotalExpensesCard },
  { key: 'cash-flow-area', Component: CashFlowAreaCard },
  { key: 'cash-flow-monthly', Component: CashFlowMonthlyBarCard },
  { key: 'cash-flow-daily', Component: CashFlowDailyBarCard },
  { key: 'category-breakdown', Component: CategoryBreakdownCard },
  { key: 'expenses-donut', Component: ExpensesDonutCard },
  { key: 'monthly-income', Component: MonthlyIncomeCard },
  { key: 'income-overview', Component: IncomeOverviewCard },
  { key: 'net-worth', Component: NetWorthCard },
  { key: 'balance', Component: BalanceCard },
  { key: 'total-value', Component: TotalValueCard },
  { key: 'finance-overview-area', Component: FinanceOverviewAreaCard },
  { key: 'finance-overview-flow', Component: FinanceOverviewFlowCard },
  { key: 'financial-breakdown', Component: FinancialBreakdownCard },
  { key: 'financial-trends', Component: FinancialTrendsCard },
  { key: 'cumulative-assets', Component: CumulativeAssetsCard },
  { key: 'growth-trends', Component: GrowthTrendsCard },
  { key: 'spending-range', Component: SpendingRangeCard },
  { key: 'spending-scatter', Component: SpendingScatterCard },
  { key: 'spending-cylinder', Component: SpendingCylinderCard },
  { key: 'analytics-pills', Component: AnalyticsPillsCard },
  { key: 'finance-analytics', Component: FinanceAnalyticsCard },
  { key: 'budget-saving', Component: BudgetSavingCard },
  { key: 'diverging', Component: DivergingCard },
  { key: 'stacked-spending', Component: StackedBarCard },
  { key: 'timeline', Component: TimelineCard },
  { key: 'portfolio-allocation', Component: PortfolioAllocationCard },
  { key: 'total-balance', Component: TotalBalanceCard },
];

export const MebiusSection: React.FC<MebiusProps> = (props) => (
  <section className="animate-fade-in">
    <div className="flex items-baseline justify-between gap-3 mb-4">
      <h2 className="text-xl font-bold tracking-tight text-foreground">More insights</h2>
      <p className="text-xs text-muted-foreground">Mebius-style charts · your real data only</p>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {MEBIUS_CARDS.map(({ key, Component }) => (
        <Component key={key} {...props} />
      ))}
    </div>
  </section>
);
