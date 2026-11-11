// Mebius-style Analytics cards — pure aggregation helpers.
//
// All aggregations run ONLY over the real Supabase rows passed in
// (IncomeEntry[] / ExpenseEntry[]). No invented values: a period with no
// rows sums to exactly 0. Dates are parsed from 'YYYY-MM-DD' without
// timezone skew (never via `new Date(str)` / toISOString, which shifts
// the day in IST). "Today" is pinned to 11 Nov 2026, matching the hero.
import type { IncomeEntry } from '@/hooks/useIncomeData';
import type { ExpenseEntry } from '@/hooks/useExpenseData';

export const TODAY = new Date(2026, 10, 11); // 11 Nov 2026
export const CURRENT_YEAR = 2026;

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface ParsedDate { year: number; month: number; day: number }

export function parseEntryDate(dateStr: string): ParsedDate | null {
  if (!dateStr) return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) - 1, day: parseInt(m[3], 10) };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDays = (d: Date, n: number) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};

/** en-IN currency, always. Never strip the locale. */
export const inr = (n: number) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Compact axis label: ₹5.4k / ₹1.2L. */
export const inrShort = (val: number) => {
  if (val === 0) return '₹0';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(1)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}k`;
  return `${sign}₹${abs}`;
};

export const sum = (rows: Array<{ amount: number | string }>) =>
  rows.reduce((s, r) => s + Number(r.amount || 0), 0);

export interface MonthPoint {
  month: string;
  fullLabel: string;
  income: number;
  expenses: number;
  net: number;
}

/** Jan–Dec sums for one year. */
export function monthlySeries(income: IncomeEntry[], expenses: ExpenseEntry[], year = CURRENT_YEAR): MonthPoint[] {
  return MONTH_SHORT.map((name, m) => {
    const inc = sum(income.filter((r) => {
      const p = parseEntryDate(r.date);
      return p && p.year === year && p.month === m;
    }));
    const exp = sum(expenses.filter((r) => {
      const p = parseEntryDate(r.date);
      return p && p.year === year && p.month === m;
    }));
    return { month: name, fullLabel: `${MONTH_FULL[m]} ${year}`, income: inc, expenses: exp, net: inc - exp };
  });
}

/** Running (cumulative) balance per month. */
export function cumulativeMonthly(income: IncomeEntry[], expenses: ExpenseEntry[], year = CURRENT_YEAR) {
  const months = monthlySeries(income, expenses, year);
  let run = 0;
  let cumInc = 0;
  let cumExp = 0;
  return months.map((pt) => {
    run += pt.net;
    cumInc += pt.income;
    cumExp += pt.expenses;
    return { ...pt, balance: run, cumIncome: cumInc, cumExpenses: cumExp };
  });
}

export interface DayPoint { label: string; fullLabel: string; income: number; expenses: number; net: number; date: Date }

/** Daily sums for the N days ending on `end` (inclusive). */
export function dailySeries(income: IncomeEntry[], expenses: ExpenseEntry[], days: number, end: Date = TODAY): DayPoint[] {
  const out: DayPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(end, -i);
    const key = ymd(d);
    const inc = sum(income.filter((r) => (r.date || '').slice(0, 10) === key));
    const exp = sum(expenses.filter((r) => (r.date || '').slice(0, 10) === key));
    out.push({
      label: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`,
      fullLabel: `${d.getDate()} ${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`,
      income: inc,
      expenses: exp,
      net: inc - exp,
      date: d,
    });
  }
  return out;
}

export interface CategoryTotal { name: string; total: number; share: number; count: number }

export function byCategory(rows: Array<{ category: string; amount: number | string }>): CategoryTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const name = (r.category || 'Other').trim() || 'Other';
    const cur = map.get(name) || { total: 0, count: 0 };
    cur.total += Number(r.amount || 0);
    cur.count += 1;
    map.set(name, cur);
  }
  const grand = [...map.values()].reduce((s, v) => s + v.total, 0);
  return [...map.entries()]
    .map(([name, v]) => ({ name, total: v.total, count: v.count, share: grand > 0 ? v.total / grand : 0 }))
    .sort((a, b) => b.total - a.total);
}

export function bySource(rows: IncomeEntry[]): CategoryTotal[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const r of rows) {
    const name = (r.source || 'Other').trim() || 'Other';
    const cur = map.get(name) || { total: 0, count: 0 };
    cur.total += Number(r.amount || 0);
    cur.count += 1;
    map.set(name, cur);
  }
  const grand = [...map.values()].reduce((s, v) => s + v.total, 0);
  return [...map.entries()]
    .map(([name, v]) => ({ name, total: v.total, count: v.count, share: grand > 0 ? v.total / grand : 0 }))
    .sort((a, b) => b.total - a.total);
}

/** Sums by weekday (0 = Sun). Rows outside the given year are ignored when year is set. */
export function byWeekday(
  rows: Array<{ date: string; amount: number | string }>,
  year: number | null = CURRENT_YEAR,
) {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const r of rows) {
    const p = parseEntryDate(r.date);
    if (!p) continue;
    if (year !== null && p.year !== year) continue;
    const wd = new Date(p.year, p.month, p.day).getDay();
    totals[wd] += Number(r.amount || 0);
    counts[wd] += 1;
  }
  return WEEKDAYS_SHORT.map((day, i) => ({ day, total: totals[i], count: counts[i] }));
}

/** Last 8 weeks (Mon–Sun? No: 7-day windows ending today, matching the hero's week math). */
export function weeklyNet(income: IncomeEntry[], expenses: ExpenseEntry[], weeks = 8, end: Date = TODAY) {
  const out: Array<{ label: string; fullLabel: string; income: number; expenses: number; net: number; isCurrent: boolean }> = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const e = addDays(end, -i * 7);
    const s = addDays(e, -6);
    const sStr = ymd(s);
    const eStr = ymd(e);
    const inc = sum(income.filter((r) => {
      const d = (r.date || '').slice(0, 10);
      return d >= sStr && d <= eStr;
    }));
    const exp = sum(expenses.filter((r) => {
      const d = (r.date || '').slice(0, 10);
      return d >= sStr && d <= eStr;
    }));
    out.push({
      label: `${s.getDate()} ${MONTH_SHORT[s.getMonth()]}`,
      fullLabel: `${sStr} to ${eStr}`,
      income: inc,
      expenses: exp,
      net: inc - exp,
      isCurrent: i === 0,
    });
  }
  return out;
}

/** Growth % vs previous value; null when the base is too small to compare (hero rule: < ₹100). */
export function growthPct(current: number, previous: number): number | null {
  if (previous < 100 || current <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Sum of rows in a date range (inclusive, YYYY-MM-DD strings). */
export function sumInRange(
  rows: Array<{ date: string; amount: number | string }>,
  startStr: string,
  endStr: string,
) {
  return sum(rows.filter((r) => {
    const d = (r.date || '').slice(0, 10);
    return d >= startStr && d <= endStr;
  }));
}

export const COLORS = {
  zinc: '#18181b',
  zincLight: '#d4d4d8',
  zincMid: '#a1a1aa',
  green: '#16a34a',
  greenLight: '#86efac',
  emerald: '#059669',
  rose: '#e11d48',
  blue: '#2563eb',
  sky: '#38bdf8',
  purple: '#9333ea',
  violet: '#7c3aed',
  orange: '#ea580c',
  amber: '#d97706',
  teal: '#0d9488',
  pink: '#db2777',
};

export const CATEGORY_COLORS = [
  '#2563eb', '#16a34a', '#ea580c', '#9333ea', '#e11d48',
  '#0d9488', '#d97706', '#db2777', '#475569', '#65a30d',
];
