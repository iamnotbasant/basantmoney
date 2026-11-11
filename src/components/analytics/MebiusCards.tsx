// Mebius-style Analytics cards — clean-room recreations from the Mebius
// preview images (kit source is account-gated, so no kit code is used).
// RAW Recharts direct children only. Recharts built-in animations + CSS.
// Real Supabase rows only; empty periods are honest ₹0. All money en-IN.
import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, Cell, LineChart, Line,
  PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { IncomeEntry } from '@/hooks/useIncomeData';
import type { ExpenseEntry } from '@/hooks/useExpenseData';
import type { BankAccount } from '@/types/bank';
import {
  TODAY, CURRENT_YEAR, parseEntryDate, ymd, addDays, inr, inrShort,
  sum, monthlySeries, cumulativeMonthly, byCategory, bySource,
  CATEGORY_COLORS,
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

// ---------- 1. Cash Flow Area (charts-cash-flow-area) ----------

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

// ---------- 2. Category Breakdown (charts-category-breakdown) ----------

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

// ---------- 3. Expenses Donut (charts-expenses) ----------

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

// ---------- 4. Monthly Income (charts-monthly-income) ----------

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

// ---------- 5. Balance (charts-balance) ----------

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

// ---------- section wiring ----------

export const MEBIUS_CARDS: Array<{ key: string; Component: React.FC<MebiusProps> }> = [
  { key: 'cash-flow-area', Component: CashFlowAreaCard },
  { key: 'category-breakdown', Component: CategoryBreakdownCard },
  { key: 'monthly-income', Component: MonthlyIncomeCard },
  { key: 'balance', Component: BalanceCard },
  { key: 'expenses-donut', Component: ExpensesDonutCard },
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
