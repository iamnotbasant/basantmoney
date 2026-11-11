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

export const CATEGORY_COLORS = [
  '#2563eb', '#16a34a', '#ea580c', '#9333ea', '#e11d48',
  '#0d9488', '#d97706', '#db2777', '#475569', '#65a30d',
];
