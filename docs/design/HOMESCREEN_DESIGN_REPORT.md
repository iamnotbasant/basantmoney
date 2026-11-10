# UI/UX & Design Systems Council Review
## BasantMoney Home Screen Dashboard (Bank Ledger v2)

**Scope:** `src/pages/Index.tsx`, `NetBalanceDisplay.tsx`, `SummarySection.tsx`, `RecentTransactions.tsx`, `VaultInterestCards.tsx`, `Header.tsx`
**Stack:** React 18, Tailwind, Lucide React, Shadcn/Radix, Supabase real-time hooks
**System context:** Virtual wallets decommissioned → direct **Bank Ledger** with daily **Vault interest** accrual.

---

## 1. Executive Summary

The dashboard is functionally complete but visually inconsistent and structurally top-heavy. Three issues dominate:

1. **Redundancy:** `NetBalanceDisplay` (a 16rem-tall elephant card) fights with the "Net Balance" summary card *and* the future hero card for the same attention. Three components communicate one number.
2. **Buried control:** Month selection — the single most-used control on a monthly-summary dashboard — sits at the *bottom* of the page, behind a "Show/Hide Month Filter" toggle. Users scroll past the summary they want to change to find the control that changes it.
3. **Dark-mode breakage:** `SummarySection` hardcodes light-only palette (`bg-green-50`, `border-green-200`, `text-green-700`). In dark theme these stay pale and washed out — the tokens exist in `index.css` but are bypassed everywhere.

**Verdict restructure:** Delete `NetBalanceDisplay`, promote month pills to a header-level tab bar, merge balance + bank account + quick actions into one **Hero Card**, and re-skin the summary/transactions with token-first styling.

---

## 2. Current State Audit

### `Index.tsx`
| # | Issue | Severity |
|---|-------|----------|
| A1 | Month filter at page bottom behind an show/hide `Button` + dashed-border card — heavy friction for the primary control | **High** |
| A2 | VaultInterestCards renders **before** any balance card — the page opens with warning banners instead of the user's primary question ("how much do I have?") | Medium |
| A3 | `RecentTransactions` self-fetches from Supabase via its own hook instances → three components = duplicate subscriptions/fetches of the same two tables | Medium |
| A4 | Skeleton missing — full-screen `Loader2` spinner instead of the available `ui/skeleton.tsx` | Low |
| A5 | Staggered `animationDelay: '0.6s'–'0.8s'` — arrived data renders invisibly for up to 0.8s; delays make the page feel slow even when it isn't | Low |
| A6 | FAB hides Quick Actions in a bottom sheet that navigates anyway — the Sheet is a useless intermediary (tap → sheet → tap → navigate) | Medium |

### `NetBalanceDisplay.tsx`
| # | Issue | Severity |
|---|-------|----------|
| B1 | Entire component redundant with SummarySection card #1 and with planned hero balance | **High** — delete |
| B2 | `py-16` (128px vertical) for one number — massive whitespace sink | — |
| B3 | `text-8xl` overflows on 320px screens with amounts > ₹99,99,999 | Medium |
| B4 | Green/red only from sign — a ₹0 balance shows green; no neutral state | Low |

### `SummarySection.tsx`
| # | Issue | Severity |
|---|-------|----------|
| C1 | Hardcoded `green-50/red-50/green-100/red-200` gradients — **light theme baked in**, unreadable on dark bg (cards stay white-pink/pale-green against `hsl(222 84% 4.9%)`) | **High** |
| C2 | "Net Balance" card duplicates hero + former NetBalanceDisplay | **High** |
| C3 | `cursor-pointer hover:scale-[1.02]` on non-clickable cards — affordance lie; tapping does nothing | Medium |
| C4 | Amounts truncate paise silently (`Math.trunc`) — inconsistent with `NetBalanceDisplay` which shows paise; rounding ambiguity in a ledger app is dangerous | Medium |
| C5 | No labels indicating this is the **selected month's** figure — the month lives in the buried filter 700px below | Medium |
| C6 | Lucide `DollarSign` icon on an INR product | Low |

### `RecentTransactions.tsx`
| # | Issue | Severity |
|---|-------|----------|
| D1 | Duplicate Supabase fetches (see A3) — props from Index are already available | Medium |
| D2 | Category `Badge variant="outline"` — monochrome outline chip; the app already maintains **color-coded categories in localStorage** (`Category[] { id, name, type, color }`) and other pages use them. Dashboard ignores the palette. | **High** |
| D3 | Generic `TrendingUp/Down` icons for every row — no category-specific icons; rows are undifferentiated gray | Medium |
| D4 | Amount typography default font — no `tabular-nums`; right-aligned columns jitter as digits differ; `+` signed prefix not visually distinct in weight | Medium |
| D5 | Empty state: bare "No recent transactions" text + buttons — below the polish bar; feels like a broken list, not a designed empty state | Medium |
| D6 | Income description `item.notes || item.source` — when notes are absent, a sentence like "Monthly salary credit" renders in the title slot (fine), but auto-interest rows will show the raw notes boilerplate ("…savings interest") | Low |
| D7 | Self-contained `Transaction` interface shadows the canonical types — third copy of the shape in the codebase | Low |

### `VaultInterestCards.tsx`
| # | Issue | Severity |
|---|-------|----------|
| E1 | **Hardcoded recon copy:** "Slice Balance Reconciled (₹11,130.05)", "Moved full ₹998.18…", "balances since 10 Nov 2026" — static example strings shipped as if live data | **High (content bug)** |
| E2 | Copy still references "wallets/sub-wallets" ("verify your wallets and sub-wallets") — vocabulary contradicts the decommissioned wallet system | **High (content)** |
| E3 | Banner styles (`rounded-lg`, flat red block, one `animate-pulse`) predate the new visual language — visually disconnected from the rest of the page | Medium |
| E4 | Global `svg { animation: none !important }` in `index.css` kills the `animate-pulse` on the AlertTriangle anyway — inconsistent with intent | Low |
| E5 | Amber/emerald informational cards use `bg-amber-50/80 dark:bg-amber-950/40` — the only component doing dark-mode correctly; use it as the reference pattern for the rest | Info |

### `Header.tsx`
| # | Issue | Severity |
|---|-------|----------|
| F1 | No brand mark — users can't tell which app they're in beyond nav labels; no bank-account context either | Medium |
| F2 | Nav container is `bg-background/80 backdrop-blur` but the header itself isn't sticky — scrolling loses navigation entirely | Medium |
| F3 | Active tab `bg-foreground text-background` (near-black pill) is heavy-handed in light mode and near-invisible differentiation in dark mode (foreground ≈ 98% luminance pill on a 4.9% background reads as a white block) | Low |
| F4 | Mobile menu button is `sm:hidden`, but the nav's icon-only breakpoint is `hidden sm:inline` for labels — between `sm` and `lg` there is a fully labeled 5-item bar + Settings + Logout; tight but OK. Gap: mobile menu lacks the Settings/logout parity (present, good) | Info |

---

## 3. Design System Foundations

### 3.1 New tokens — add to `index.css`

```css
:root {
  --success: 152 69% 38%;          /* emerald-ish  */
  --success-foreground: 0 0% 100%;
  --glass-bg: 0 0% 100%;
  --glass-border: 0 0% 0%;
  --elev-1: 0 1px 2px 0 hsl(220 40% 20% / 0.05), 0 1px 3px 0 hsl(220 40% 20% / 0.06);
  --elev-2: 0 4px 12px -2px hsl(220 40% 20% / 0.08), 0 2px 4px 0 hsl(220 40% 20% / 0.04);
  --elev-3: 0 12px 32px -8px hsl(220 40% 20% / 0.14), 0 4px 8px 0 hsl(220 40% 20% / 0.06);
}
.dark {
  --glass-bg: 222 84% 6%;
  --glass-border: 210 40% 98%;   /* used at /10 opacity */
  /* elevations: lighten, don't darken shadows on dark bg */
  --elev-1: 0 1px 2px 0 hsl(0 0% 0% / .3);
  --elev-2: 0 4px 12px -2px hsl(0 0% 0% / .4);
  --elev-3: 0 12px 32px -8px hsl(0 0% 0% / .5);
}
```

### 3.2 Canonical recipes (use these, nothing ad-hoc)

| Surface | Recipe |
|---|---|
| **Glass card** | `rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md shadow-[var(--elev-2)]` |
| **Hero gradient card** | `rounded-3xl text-primary-foreground bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-black shadow-[var(--elev-3)]` |
| **Elevation ladder** | resting = `--elev-1`; hover = `--elev-2` + `hover:-translate-y-0.5`; active/FAB = `--elev-3` |
| **Semantic stat tint** (dark-mode-safe) | income: `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20` · expense: `bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20` |
| **Border contrast rule** | Never `border-<color>-200` hard-coded. Always `border-border` (token) or `<color> 500/20` tint-over-token. |
| **Money typography** | `font-semibold tabular-nums tracking-tight` for all amounts; paise as `<span className="text-[0.6em] opacity-70">.xx</span>` |
| **Glass header** | `sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60` |
| **Motion** | `transition-all duration-300` max for surfaces; icon micro-motion ≤ 200ms; entrance fade ≤ 400ms & ≤ 150ms total stagger. Replace global keyframe staggering with `view-transition`-style intent or drop it. |

### 3.3 Motion fix in `index.css`
Remove `svg { animation: none !important }` (it silently disables `animate-pulse` in VaultInterestCards and will fight any future icon animation). If icon blink was an FAB bug, scope it:

```css
.fab svg { animation: none !important; }
```

---

## 4. Information Architecture — New Page Anatomy

```
┌─────────────────────────────────────────────────────────┐
│ STICKY GLASS HEADER                                      │
│  [logo ▮BasantMoney] · [primary nav pills] · [account ▾] │
├─────────────────────────────────────────────────────────┤
│ 1. HERO CARD (rounded-3xl gradient, replaces NetBalance) │
│    Bank · Savings · [is_primary chip]      [👁 privacy]  │
│    ₹ ────────── ALL-TIME NET BALANCE (tabular, big)      │
│    [↑ Add Income] [↓ Add Expense] [→ View Ledger]        │
├─────────────────────────────────────────────────────────┤
│ 2. MONTH PILL BAR  ◀ Nov 2026 ▾›   (sticky optional)     │
├─────────────────────────────────────────────────────────┤
│ 3. SUMMARY CARDS ×2: Month Income | Month Expense        │
│    (+ delta chip: "+₹2,340 net this month" strip)        │
├─────────────────────────────────────────────────────────┤
│ 4. VAULT INTEREST BANNERS (critical → informational)     │
├─────────────────────────────────────────────────────────┤
│ 5. RECENT TRANSACTIONS                                   │
│    [cat-colored icon] title · category dot chip · date   │
│                                             +₹1,200.00   │
│    empty state: illustration + CTA                       │
└─────────────────────────────────────────────────────────┘
FAB retained, mobile-only (lg:hidden) — quick actions live in the hero on desktop.
```

**Rationale**

- Hero answers Q1 ("what do I have") at scroll position 0; summary answers Q2 ("what happened this month") right below it; interest banners slide *below* the ledger answer because they're second-order alerts, not the headline.
- Month pill bar breaks the known scroll-back pattern — summary + control are co-located (same screen), and the pill bar is horizontal-scrollable so it costs zero vertical space.
- Dagobah rule applied to redundancy: one number, one tagline, one place. The hero owns **all-time net**; summary cards own **month flows**; no third card repeats either.

---

## 5. Concrete Refactoring Plan

### 5.1 New component: `src/components/HeroBalanceCard.tsx`

```tsx
import { Blur, Eye, EyeOff, ArrowDownRight, ArrowUpRight, BookOpen } from 'lucide-react';
import { BankAccount } from '@/types/bank';

interface HeroBalanceCardProps {
  netBalance: number;                       // all-time income − expense
  currentAccount: BankAccount | null;
  hidden: boolean;                          // privacy state, lifted
  onToggleHidden: () => void;
  onNavigate: (path: string) => void;
  isLoading?: boolean;
}
```

```tsx
// privacy persisted by parent: localStorage 'balanceHidden'
const [hidden, setHidden] = useState(() => localStorage.getItem('balanceHidden') === '1');
```

Key styling decisions:

- `isPositive ? 'text-emerald-300' : 'text-rose-300'` — tinted digits on the dark gradient card (green-600 on slate-950 fails contrast).
- Privacy: animate a single number layer.

```tsx
<div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950
                text-primary-foreground p-6 sm:p-8 shadow-[var(--elev-3)] dark:from-slate-950 dark:via-slate-900 dark:to-black">
  {/* decorative orbs */}
  <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full
       bg-emerald-500/10 blur-3xl" />
  <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 h-64 w-64 rounded-full
       bg-sky-500/10 blur-3xl" />

  {/* meta row: bank indicator + privacy */}
  <div className="relative flex items-center justify-between gap-3 mb-6">
    <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5
                    px-3 py-1.5 text-xs text-slate-300 backdrop-blur">
      <Landmark className="h-3.5 w-3.5" />
      <span className="font-medium">{currentAccount?.bank_name ?? 'No bank linked'}</span>
      <span className="text-slate-500">/</span>
      <span>{currentAccount?.account_type ?? '—'}</span>
      {currentAccount?.is_primary && (
        <span className="rounded-full bg-emerald-400/15 px-1.5 text-[10px] font-semibold text-emerald-300">
          PRIMARY
        </span>
      )}
    </div>
    <button onClick={onToggleHidden} aria-pressed={hidden}
      aria-label={hidden ? 'Show balance' : 'Hide balance'}
      className="p-2 rounded-full hover:bg-white/10 transition-colors text-slate-300">
      {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </button>
  </div>

  {/* amount — blur, don't mask with */} 
  <p className={`relative text-4xl sm:text-5xl font-semibold tabular-nums tracking-tight transition-all
                 ${hidden ? 'blur-md select-none pointer-events-none' : ''}`}
     aria-live="polite">
    …₹1,23,456<span className="text-[0.55em] opacity-70">.78</span>
  </p>
  <p className="text-xs text-slate-400 mt-1">All-time net · across {nAccounts} account(s)</p>

  {/* quick actions */}
  <div className="relative mt-8 grid grid-cols-3 gap-2 sm:gap-3">
    <QuickAction icon={ArrowUpRight}  label="Add Income"  onClick={() => onNavigate('/income')} />
    <QuickAction icon={ArrowDownRight} label="Add Expense" onClick={() => onNavigate('/expense')} />
    <QuickAction icon={BookOpen} label="View Ledger" onClick={() => onNavigate('/transactions')} outline />
  </div>
</div>
```

`QuickAction` (internal): `flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs font-medium hover:bg-white/10 hover:-translate-y-0.5 active:scale-[0.98] transition-all` — income variant tints icon `text-emerald-300`, expense `text-rose-300`.

Mobile behavior: rendered `grid-cols-3` also on mobile (labels drop to `text-[10px]` under `sm`).

### 5.2 New component: `src/components/MonthPillBar.tsx`

```tsx
interface MonthPillBarProps {
  selectedMonth: number;      // 0–11
  selectedYear: number;
  monthsWithData: number[];   // months (0-11) that have any tx in selectedYear → pill badge
  onChange: (month: number) => void;
  onYearChange?: (year: number) => void; // phase 2
  sticky?: boolean;
}
```

Markup: horizontal scroll-snap strip of 12 pills + active pill styled `bg-primary text-primary-foreground`; a leading **"This month"** pseudo-pill that maps to the current month with a pulsing dot if it has activity; chevron `Select` for year hopping at the right edge (reuses the existing radix `Select`). The bar replaces both the bottom toggle button and the dashed Card in `Index.tsx`:

```tsx
<section className="sticky top-[64px] z-30 -mx-4 px-4 py-2 bg-background/70 backdrop-blur-md">
  <div role="tablist" aria-label="Select month" className="flex gap-1.5 overflow-x-auto
       no-scrollbar snap-x snap-mandatory">
    {months.map((m, i) => {
      const active = i === selectedMonth;
      return (
        <button role="tab" aria-selected={active} key={m}
          onClick={() => onChange(i)}
          className={`snap-start shrink-0 rounded-full px-4 py-1.5 text-sm font-medium
            transition-all duration-200 border
            ${active
              ? 'bg-primary text-primary-foreground border-transparent shadow-[var(--elev-1)]'
              : 'text-muted-foreground border-border/60 bg-card hover:bg-accent hover:text-foreground'}`}>
          {m.slice(0, 3)} <span className="opacity-60">{selectedYear.toString().slice(2)}</span>
          {withData?.has(i) && !active && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full
            bg-emerald-500 align-middle" aria-hidden />}
        </button>
      );
    })}
  </div>
</section>
```

Add `.no-scrollbar::-webkit-scrollbar{display:none}` to `index.css`. Sticky is only engaged ≥ `sm`; on small screens it scrolls naturally to avoid stealing viewport.

### 5.3 `Index.tsx` rewrite (structure)

```tsx
// data layer stays; loading → skeleton
// add: const balancesHidden state lifted here (or via tiny useBalancePrivacy hook)
// delete: showMonthFilter state, months Card block, NetBalanceDisplay import
// delete: '0.6s'/'0.7s' delays → single 0–0.15s stagger or none

<Header />                                    // now sticky glass (5.6)
<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8
                 pb-24 lg:pb-8               // FAB clearance on mobile
                 space-y-6 sm:space-y-8">
  <HeroBalanceCard ... />                    // 5.1
  <MonthPillBar ... />                       // 5.2
  <SummarySection incomeData={filteredIncomeData} expenseData={filteredExpenseData}
                  selectedMonthLabel={`${months[selectedMonth]} ${selectedYear}`} />
  <VaultInterestCards incomeData={incomeData} />
  <RecentTransactions transactions={recentTransactions} />  // props, no self-fetch
</main>
{/* FAB: hidden md:hidden lg:hidden — kept for mobile only, since hero now carries quick actions */}
```

Also compute `monthsWithData` near the existing filters (one pass over `incomeData + expenseData` by `new Date(date).getMonth()`).

### 5.4 `SummarySection.tsx` re-skin

- **Drop the "Net Balance" card.** Grid becomes `md:grid-cols-2` with `max-w-3xl` so two cards don't stretch unnaturally; add a full-width delta strip below:

```
┌ Month Income (emerald tint) ┐ ┌ Month Expenses (rose tint) ┐
        Δ strip: [ ↑ Net +₹4,500 this month ]  (or ↓ −₹1,200 in rose)
```

- Color recipe per 3.2 (`bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400` icon chip).
- Replace `DollarSign` with `Wallet`/`Landmark` or remove the net-card icon entirely.
- Card chrome: `rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md shadow-[var(--elev-1)] hover:shadow-[var(--elev-2)] hover:-translate-y-0.5 transition-all — no hover:scale, no cursor-pointer, no group icon pop (A6 style rule: motion implies interactivity).`
- Paise: render `₹{whole}.{pad(paise)}` consistently (reuse `NetBalanceDisplay`'s split logic — extract to `src/utils/format.ts` as `formatINR(x, {paise:'auto'})`; use in hero, summary, and transactions).
- Accept the new prop `selectedMonthLabel` and render it as a silent eyebrow: `<p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{selectedMonthLabel}</p>` under the existing "Financial Summary" heading, tying cards to the pill bar.

### 5.5 `RecentTransactions.tsx` re-skin

- Props contract change (also fixes D1/D7):

```tsx
interface Transaction {                     // move to types/finance.ts, delete local copy
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category: string;
  isAutoInterest?: boolean;
}
interface RecentTransactionsProps {
  transactions: Transaction[];              // parent supplies top-5
  limit?: number;
}
```

- **Category color chips (D2):** read `localStorage.getItem('categories')` once, memoized, matching by `name` (case-insensitive) against `transaction.category`; render hex directly so user-defined categories work:

```tsx
const chipColor = categoriesByName.get(t.category.toLowerCase())?.color ?? '#94A3B8';
```

- **Icon per category (D3):** local map, fallback by type:

```tsx
const CATEGORY_ICON: Record<string, LucideIcon> = {
  salary: Briefcase, freelance: Laptop, investment: LineChart, interest: Percent,
  cashback: Gift, groceries: ShoppingCart, food: Utensils, rent: House,
  travel: Plane, entertainment: Clapperboard, utilities: Plug, health: HeartPulse,
  // default: type === 'income' ? TrendingUp : TrendingDown
};
```

- Row anatomy:

```tsx
<div className="group flex items-center gap-3 p-3 rounded-xl hover:bg-accent/60 transition-colors">
  <div className="relative flex items-center justify-center h-10 w-10 rounded-full
                  ring-1 ring-inset shrink-0"
       style={{ backgroundColor: `${chipColor}1A`, borderColor: chipColor, color: chipColor }}>
    <Icon className="h-4 w-4" />
    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full
                     ring-2 ring-card" style={{ backgroundColor: chipColor }} aria-hidden />
  </div>
  <div className="min-w-0 flex-1">
    <p className="text-sm font-medium truncate">{title}</p>
    <div className="flex items-center gap-2 mt-0.5">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: chipColor }} />
        {categoryName}
      </span>
      <span className="text-xs text-muted-foreground/70">{formatDate}</span>
    </div>
  </div>
  <p className="text-sm font-semibold tabular-nums whitespace-nowrap
                ${income ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'}">
    <span className="opacity-60">{income ? '+' : '−'}</span>₹{fmt}
  </p>
</div>
```

  Notes: expenses in neutral `foreground` (reserving red for net-negative states prevents an all-red list); paise via `formatINR`; auto-interest rows get a `Sparkles` suffix chip ("Interest • daily accrual").

- **Empty state (D5):**

```tsx
<div className="flex flex-col items-center py-10 text-center">
  <div className="relative mb-4">
    <div className="absolute inset-0 blur-2xl bg-primary/10 rounded-full" aria-hidden />
    <div className="relative h-20 w-20 rounded-2xl bg-accent grid place-items-center
                    rotate-3 shadow-[var(--elev-1)]">
      <Receipt className="h-9 w-9 text-muted-foreground/50 -rotate-3" />
    </div>
  </div>
  <p className="font-medium">No transactions yet</p>
  <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-[24ch]">
    Your ledger is empty. Record your first income or expense to see it here.
  </p>
  <div className="flex gap-2">…Add Income / Add Expense (unchanged handlers)…</div>
</div>
```

- Loading: 3 `Skeleton className="h-14 rounded-xl"` rows instead of the text spinner.

### 5.6 `Header.tsx` polish

- Wrap the right-cluster in the et al. above: apply the glass-header recipe (3.2) to the outermost `<div>` and add `sticky top-0 z-50`.
- Brand block on the left (desktop ≥ `md`): `PiggyBank` in a `rounded-xl bg-primary text-primary-foreground p-2` tile + `font-semibold` wordmark; balances the currently nav-only center.
- Active pill: replace `bg-foreground text-background` with `bg-primary text-primary-foreground` for both themes (token-correct, one visual).
- Keep user chip and sign-out colors; add `aria-label` to icon-only buttons (Settings/Logout already have `title` — promote to `aria-label` too).
- Mobile menu: swap `bg-background` for the glass recipe and `rounded-2xl mx-2 my-2` sheet-like panel; keep structure.

### 5.7 `VaultInterestCards.tsx` (copy + chrome)

- **Fix E1:** the reconciliation "dark" branch strings are live-looking but reference sample figures and a fixed date. Drive all text from `reconciliationReport` data (amounts from `report`, date from the transfer record) or add an explicit `example` data flag and label the card "Example reconciliation" until real data exists.
- **Fix E2:** replace "wallets and sub-wallets" with "accounts and buckets" per the new Bank Ledger lexicon (or the product's chosen terms) — vocabulary must not resurrect the decommissioned feature.
- Chrome: banners to `rounded-2xl`, consistent `shadow-[var(--elev-1)]`; keep the existing `dark:bg-amber-950/40` pattern — it's the model.
- Critical banner: swap `animate-pulse` (blocked globally by CSS, and distractingly long) for a static red-only treatment + icon badge; urgency belongs in copy, not blinking.
- Icon buttons: `h-6 w-6` ghost closes → bump to `h-8 w-8` for hit-area parity with buttons (44px is ideal but 32px min).

### 5.8 Delete list

| File | Action |
|---|---|
| `NetBalanceDisplay.tsx` | **Delete**, remove import/usages; carry its paise logic into `formatINR` util |
| `showMonthFilter` toggle + dashed Card block in `Index.tsx` | Delete; superseded by `MonthPillBar` |
| Third `Transaction` interface in `RecentTransactions.tsx` | Move to `types/finance.ts` |
| Duplicate `useIncomeData/useExpenseData` subscriptions in `RecentTransactions` | Replace with props |
| `svg { animation:none !important }` in `index.css` | Scope to `.fab` |

---

## 6. Accessibility & Ergonomics Checklist

- [ ] Hero sum: `aria-live="polite"` (privacy toggle re-announces), blur only — content stays in DOM for screen readers; ensure `aria-label` on the reveal button communicates both states.
- [ ] Month pills: `role="tablist/tab"`, `aria-selected`, visible `focus-visible:ring-2 focus-visible:ring-ring` on every pill.
- [ ] Privacy toggle state survives reload (`localStorage`), and blurs *only* numeric amounts — never screens titles (amounts in transactions also get the blur treatment when hidden, via a shared `Amount` component).
- [ ] FAB remains ≥ 56px with safe-area offset `bottom-[calc(1.5rem+env(safe-area-inset-bottom))]`.
- [ ] Category chip colors: pair every hex chip with the readable category *name* (color never the sole signal — meets WCAG 1.4.1).
- [ ] Reduced motion: wrap entrance animations in `@media (prefers-reduced-motion: reduce) { .animate-fade-in { animation: none; opacity: 1 } }` and gate hover translate utilities.

---

## 7. Suggested Implementation Order

1. **Week 1 (foundation):** tokens + elevation/glass recipes in `index.css`; `formatINR` util; fix SummarySection dark-mode & drop net card; fix VaultInterestCards copy bugs (E1/E2) — smallest diff, biggest trust win.
2. **Week 2 (IA):** build `HeroBalanceCard` + privacy toggle; delete `NetBalanceDisplay`; rebalance Index loading → skeletons; pass `RecentTransactions` via props.
3. **Week 3 (control + interactions):** `MonthPillBar` with sticky strip + data-dot months; empty state; icons/typography pass; Header brand + sticky.
4. **QA sweep:** dark-mode screenshot audit of all six surfaces; tab-order pass; motion-reduced pass.
