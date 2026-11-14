// Single source of truth for category / payment-method colours and icons.
// Categories + payment methods live in localStorage ('categories' /
// 'paymentMethods') — NOT in Supabase. Transactions pills used to hardcode
// their own colours + icons per keyword, which drifted from what Settings
// showed; now the stored record (colour + icon key) drives the pill, and
// the keyword maps below are only the fallback for names not in the store.
//
// COLOUR POLICY (user correction, 12 Nov 12:23 — overrides the old
// image-48 mapping): Freelance MUST be green. Colours follow HIS usage — he
// is a freelancer — with only 5–6 distinct colours for his main categories,
// each one different: Freelance green, Interest blue, Food red, Transport
// amber, Bills purple, Shopping pink. Secondary categories share the nearest
// family colour. The Settings manager lets him change any of these himself.
import type { Category } from '@/types/finance';

export interface PillStyle {
  bgClass: string;
  textClass: string;
  iconColorClass: string;
  /** Set when the hex has no curated Tailwind triple — render with the
   *  .pill-dynamic color-mix fallback instead of classes. */
  dynamicColor?: string;
}

// The manager's palette: 6 main colours first, then extras. Every entry has
// a curated Tailwind triple below (readable pastel bg + coloured text in
// both themes). Any hex outside this list renders via .pill-dynamic.
export const PALETTE: { hex: string; label: string }[] = [
  { hex: '#10B981', label: 'Green' },
  { hex: '#3B82F6', label: 'Blue' },
  { hex: '#EF4444', label: 'Red' },
  { hex: '#F59E0B', label: 'Amber' },
  { hex: '#8B5CF6', label: 'Purple' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#06B6D4', label: 'Teal' },
  { hex: '#6366F1', label: 'Indigo' },
  { hex: '#F97316', label: 'Orange' },
  { hex: '#84CC16', label: 'Lime' },
  { hex: '#EAB308', label: 'Yellow' },
  { hex: '#64748B', label: 'Slate' },
];

export const COLOR_STYLES: Record<string, Omit<PillStyle, 'dynamicColor'>> = {
  '#10B981': { bgClass: 'bg-emerald-50/90 dark:bg-emerald-950/40', textClass: 'text-emerald-800 dark:text-emerald-200', iconColorClass: 'text-emerald-700 dark:text-emerald-200' },
  '#3B82F6': { bgClass: 'bg-blue-50/90 dark:bg-blue-950/40', textClass: 'text-blue-800 dark:text-blue-200', iconColorClass: 'text-blue-700 dark:text-blue-200' },
  '#EF4444': { bgClass: 'bg-red-50/90 dark:bg-red-950/40', textClass: 'text-red-800 dark:text-red-200', iconColorClass: 'text-red-700 dark:text-red-200' },
  '#F59E0B': { bgClass: 'bg-amber-50/90 dark:bg-amber-950/40', textClass: 'text-amber-900 dark:text-amber-200', iconColorClass: 'text-amber-700 dark:text-amber-200' },
  '#8B5CF6': { bgClass: 'bg-violet-50/90 dark:bg-violet-950/40', textClass: 'text-violet-800 dark:text-violet-200', iconColorClass: 'text-violet-700 dark:text-violet-200' },
  '#EC4899': { bgClass: 'bg-pink-50/90 dark:bg-pink-950/40', textClass: 'text-pink-800 dark:text-pink-200', iconColorClass: 'text-pink-700 dark:text-pink-200' },
  '#06B6D4': { bgClass: 'bg-cyan-50/90 dark:bg-cyan-950/40', textClass: 'text-cyan-800 dark:text-cyan-200', iconColorClass: 'text-cyan-700 dark:text-cyan-200' },
  '#6366F1': { bgClass: 'bg-indigo-50/90 dark:bg-indigo-950/40', textClass: 'text-indigo-900 dark:text-indigo-200', iconColorClass: 'text-indigo-800 dark:text-indigo-200' },
  '#F97316': { bgClass: 'bg-orange-50/90 dark:bg-orange-950/40', textClass: 'text-orange-900 dark:text-orange-200', iconColorClass: 'text-orange-700 dark:text-orange-200' },
  '#84CC16': { bgClass: 'bg-lime-50/90 dark:bg-lime-950/40', textClass: 'text-lime-800 dark:text-lime-200', iconColorClass: 'text-lime-700 dark:text-lime-200' },
  '#EAB308': { bgClass: 'bg-yellow-50/90 dark:bg-yellow-950/40', textClass: 'text-yellow-800 dark:text-yellow-200', iconColorClass: 'text-yellow-700 dark:text-yellow-200' },
  '#64748B': { bgClass: 'bg-slate-100 dark:bg-slate-800/70', textClass: 'text-slate-700 dark:text-slate-200', iconColorClass: 'text-slate-600 dark:text-slate-200' },
};

export const pillStyleForColor = (hex: string): PillStyle => {
  const hit = COLOR_STYLES[(hex || '').toUpperCase()];
  if (hit) return { ...hit };
  return { bgClass: 'pill-dynamic', textClass: '', iconColorClass: '', dynamicColor: hex || '#64748B' };
};

// --- Defaults (fresh installs) -------------------------------------------
export const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: 'Salary', type: 'income', color: '#10B981', icon: 'salary' },
  { id: '2', name: 'Freelance', type: 'income', color: '#10B981', icon: 'freelance' },
  { id: '3', name: 'Investment', type: 'income', color: '#8B5CF6', icon: 'investment' },
  { id: '4', name: 'Interest', type: 'income', color: '#3B82F6', icon: 'interest' },
  { id: '5', name: 'Cashback', type: 'income', color: '#10B981', icon: 'cashback' },
  { id: '6', name: 'Freelancing', type: 'income', color: '#10B981', icon: 'freelance' },
  { id: '7', name: 'Food', type: 'expense', color: '#EF4444', icon: 'food' },
  { id: '8', name: 'Transport', type: 'expense', color: '#F59E0B', icon: 'transport' },
  { id: '9', name: 'Entertainment', type: 'expense', color: '#EC4899', icon: 'film' },
  { id: '10', name: 'Bills', type: 'expense', color: '#8B5CF6', icon: 'bills' },
  { id: '11', name: 'Shopping', type: 'expense', color: '#EC4899', icon: 'shopping' },
  { id: '12', name: 'Recharge', type: 'expense', color: '#8B5CF6', icon: 'smartphone' },
];

// Categories that must always exist (the app's interest system + ones he
// actually uses). Ensured on every load of the store.
export const REQUIRED_CATEGORIES: Category[] = [
  { id: 'cat-interest', name: 'Interest', type: 'income', color: '#3B82F6', icon: 'interest' },
  { id: 'cat-cashback', name: 'Cashback', type: 'income', color: '#10B981', icon: 'cashback' },
  { id: 'cat-freelancing', name: 'Freelancing', type: 'income', color: '#10B981', icon: 'freelance' },
  { id: 'cat-shopping', name: 'Shopping', type: 'expense', color: '#EC4899', icon: 'shopping' },
  { id: 'cat-recharge', name: 'Recharge', type: 'expense', color: '#8B5CF6', icon: 'smartphone' },
];

export interface PaymentMethodRecord {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodRecord[] = [
  { id: '1', name: 'Cash', color: '#10B981', icon: 'cash' },
  { id: '2', name: 'UPI', color: '#3B82F6', icon: 'upi' },
  { id: '3', name: 'Bank Transfer', color: '#8B5CF6', icon: 'bank' },
  { id: '4', name: 'Credit Card', color: '#EF4444', icon: 'card' },
  { id: '5', name: 'Wallet', color: '#F59E0B', icon: 'wallet' },
  { id: '6', name: 'Cheque', color: '#EC4899', icon: 'cheque' },
];

// --- Keyword fallbacks (names NOT in the store) ---------------------------
export function resolveCategoryIconKey(name: string): string {
  const c = (name || '').toLowerCase();
  if (c.includes('interest')) return 'interest';
  if (c.includes('invest')) return 'investment';
  if (c.includes('cashback') || c.includes('cash back')) return 'cashback';
  if (c.includes('freelance') || c.includes('freelancing')) return 'freelance';
  if (c.includes('salary') || c.includes('job') || c.includes('work') || c.includes('business')) return 'salary';
  if (c.includes('self')) return 'user';
  if (c.includes('recharge')) return 'smartphone';
  if (c.includes('food') || c.includes('grocer') || c.includes('rest') || c.includes('dining')) return 'food';
  if (c.includes('shop') || c.includes('cloth') || c.includes('mall') || c.includes('store')) return 'shopping';
  if (c.includes('travel') || c.includes('fuel') || c.includes('cab') || c.includes('uber') || c.includes('car') || c.includes('transport')) return 'transport';
  if (c.includes('bill') || c.includes('util')) return 'bills';
  if (c.includes('rent') || c.includes('home') || c.includes('house')) return 'home';
  if (c.includes('health') || c.includes('med') || c.includes('doctor') || c.includes('gym')) return 'heart';
  if (c.includes('entertain') || c.includes('movie') || c.includes('subscript') || c.includes('game')) return 'film';
  if (c.includes('education') || c.includes('book') || c.includes('course') || c.includes('study')) return 'book';
  return 'generic';
}

export function resolveCategoryColor(name: string): string {
  const c = (name || '').toLowerCase();
  if (c.includes('interest') || c.includes('self') || c.includes('education') || c.includes('book') || c.includes('course') || c.includes('study')) return '#3B82F6';
  if (c.includes('invest') || c.includes('bill') || c.includes('util') || c.includes('rent') || c.includes('home') || c.includes('house') || c.includes('recharge')) return '#8B5CF6';
  if (c.includes('food') || c.includes('health') || c.includes('med') || c.includes('doctor') || c.includes('gym')) return '#EF4444';
  if (c.includes('travel') || c.includes('fuel') || c.includes('cab') || c.includes('uber') || c.includes('car') || c.includes('transport')) return '#F59E0B';
  if (c.includes('shop') || c.includes('cloth') || c.includes('mall') || c.includes('store') || c.includes('entertain') || c.includes('movie') || c.includes('subscript') || c.includes('game')) return '#EC4899';
  return '#10B981'; // work / money-in family (freelance, salary, cashback) + unknown
}

export function resolvePaymentIconKey(name: string): string {
  const m = (name || '').toLowerCase();
  if (m.includes('upi') || m.includes('gpay') || m.includes('phonepe') || m.includes('paytm')) return 'upi';
  if (m.includes('card') || m.includes('credit') || m.includes('debit')) return 'card';
  if (m.includes('bank') || m.includes('net') || m.includes('transfer') || m.includes('slice')) return 'bank';
  if (m.includes('cash')) return 'cash';
  if (m.includes('cheque') || m.includes('check')) return 'cheque';
  if (m.includes('wallet')) return 'wallet';
  return 'generic';
}

// --- One-time migration ----------------------------------------------------
// Stored records predate the icon field. A record WITHOUT an icon has never
// been migrated: give it an icon (keyword heuristic) and, for built-in
// names, the new palette colour. Records WITH an icon are user-managed and
// are never touched again — the user's own picks survive every load.
const BUILTIN_COLORS: Record<string, string> = {
  salary: '#10B981',
  freelance: '#10B981',
  freelancing: '#10B981',
  investment: '#8B5CF6',
  interest: '#3B82F6',
  cashback: '#10B981',
  food: '#EF4444',
  transport: '#F59E0B',
  entertainment: '#EC4899',
  bills: '#8B5CF6',
  shopping: '#EC4899',
  recharge: '#8B5CF6',
};

export function migrateCategories(list: Category[]): { list: Category[]; changed: boolean } {
  let changed = false;
  const next = (list || []).map((cat) => {
    if (cat.icon) return cat;
    changed = true;
    const key = (cat.name || '').toLowerCase();
    return { ...cat, icon: resolveCategoryIconKey(cat.name), color: BUILTIN_COLORS[key] ?? cat.color };
  });
  for (const req of REQUIRED_CATEGORIES) {
    if (!next.some((c) => c.name.toLowerCase() === req.name.toLowerCase() && c.type === req.type)) {
      next.push({ ...req });
      changed = true;
    }
  }
  return { list: next, changed };
}

export function migratePaymentMethods(list: PaymentMethodRecord[]): { list: PaymentMethodRecord[]; changed: boolean } {
  let changed = false;
  const next = (list || []).map((m) => {
    if (m.icon) return m;
    changed = true;
    return { ...m, icon: resolvePaymentIconKey(m.name) };
  });
  return { list: next, changed };
}
