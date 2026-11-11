/**
 * Pure Interest Engine for Basant Money
 *
 * Implements bank interest calculation rules based on Slice Small Finance Bank statements:
 * - Daily interest = ROUND(closing_balance * annual_rate_percent / 100 / 365, 2)
 * - If closing_balance <= 0, daily interest = 0
 * - 365 days count convention
 * - Rates effective on given date (latest effective_from_date <= date)
 * - Pure, deterministic, zero-dependency functions
 */

export interface InterestRate {
  id?: string;
  account?: string;
  annual_rate_percent: number;
  effective_from_date: string; // YYYY-MM-DD
  created_at?: string;
}

export interface InterestDayRecord {
  id?: string;
  user_id?: string;
  interest_date: string; // YYYY-MM-DD
  closing_balance: number;
  annual_rate_percent: number;
  interest_amount: number;
  account?: string;
}

export interface DailyBalance {
  date: string; // YYYY-MM-DD
  balance: number;
}

/**
 * Standard rounding to 2 decimal places with epsilon protection against IEEE-754 precision artifacts.
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate daily interest for a given balance and annual percentage rate.
 * Formula: daily interest = that day's closing balance * annual rate / 100 / 365, rounded to 2 decimals.
 * If balance <= 0, interest is 0 (never negative).
 */
export function calculateDailyInterest(closingBalance: number, annualRatePercent: number): number {
  if (closingBalance <= 0 || annualRatePercent <= 0) {
    return 0;
  }
  const rawInterest = (closingBalance * (annualRatePercent / 100)) / 365;
  return roundToTwoDecimals(rawInterest);
}

/**
 * Resolve the effective rate for a specific target date from a list of rate records.
 * Rate must have effective_from_date <= targetDate.
 * Chooses the one with the latest effective_from_date.
 */
export function getRateForDate(rates: InterestRate[], targetDate: string): number {
  if (!rates || rates.length === 0) {
    throw new Error(`No interest rates available to resolve rate for ${targetDate}`);
  }

  // Filter rates effective on or before targetDate and sort descending by effective_from_date
  const applicable = rates
    .filter(r => r.effective_from_date <= targetDate)
    .sort((a, b) => b.effective_from_date.localeCompare(a.effective_from_date));

  if (applicable.length === 0) {
    throw new Error(`No interest rate found effective on or before date ${targetDate}`);
  }

  return applicable[0].annual_rate_percent;
}

/**
 * Convert a Date object to YYYY-MM-DD in Asia/Kolkata timezone.
 */
export function getKolkataDateString(d: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

/**
 * Given a YYYY-MM-DD date string, returns the previous day in YYYY-MM-DD format.
 */
export function getPreviousDayString(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Returns yesterday's date in Asia/Kolkata timezone as YYYY-MM-DD.
 */
export function getKolkataYesterdayString(todayStr: string = getKolkataDateString()): string {
  return getPreviousDayString(todayStr);
}

/**
 * Returns the last calendar day of the given YYYY-MM month as YYYY-MM-DD.
 */
export function getLastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Returns the formatted interest description for a month: "<Month> savings interest".
 * Example: "2026-11" -> "November savings interest"
 */
export function getInterestDescription(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const monthName = date.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  return `${monthName} savings interest`;
}

/**
 * Returns whether a month (YYYY-MM) is locked relative to a reference Kolkata date.
 * A month is locked on the 1st of the subsequent month onward.
 * Example: if reference date is 2026-11-10, October 2026 (2026-10) is locked,
 * November 2026 is unlocked (estimated).
 */
export function isMonthLocked(yearMonth: string, referenceKolkataDate: string = getKolkataDateString()): boolean {
  const currentYearMonth = referenceKolkataDate.slice(0, 7);
  return yearMonth < currentYearMonth;
}

/**
 * Generate a continuous list of dates (YYYY-MM-DD) between startDate and endDate inclusive.
 */
export function getDateRange(startDate: string, endDate: string): string[] {
  if (startDate > endDate) return [];
  const dates: string[] = [];
  let curr = startDate;
  while (curr <= endDate) {
    dates.push(curr);
    const [y, m, d] = curr.split('-').map(Number);
    const nextDate = new Date(Date.UTC(y, m - 1, d));
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    curr = nextDate.toISOString().slice(0, 10);
  }
  return dates;
}

/**
 * Compute interest_days records for a list of daily balances and rate history.
 */
export function calculateDailyInterestRecords(
  dailyBalances: DailyBalance[],
  rates: InterestRate[],
  account: string = 'Slice'
): InterestDayRecord[] {
  return dailyBalances.map(item => {
    const rate = getRateForDate(rates, item.date);
    const interest = calculateDailyInterest(item.balance, rate);
    return {
      interest_date: item.date,
      closing_balance: item.balance,
      annual_rate_percent: rate,
      interest_amount: interest,
      account,
    };
  });
}

/**
 * Aggregate daily interest records by month (YYYY-MM).
 * Sums interest_amount for each month and rounds to 2 decimals.
 */
export function aggregateMonthlyInterest(records: InterestDayRecord[]): Record<string, number> {
  const monthlySums: Record<string, number> = {};

  for (const record of records) {
    const month = record.interest_date.slice(0, 7);
    monthlySums[month] = (monthlySums[month] || 0) + record.interest_amount;
  }

  // Ensure 2 decimal rounding on all monthly sums
  const result: Record<string, number> = {};
  for (const [month, sum] of Object.entries(monthlySums)) {
    result[month] = roundToTwoDecimals(sum);
  }

  return result;
}

/**
 * Calculate the delta between an existing monthly interest amount and a recomputed amount.
 * Returns the difference (recomputed - existing).
 */
export function calculateMonthlyDifference(recomputedAmount: number, existingAmount: number): number {
  return roundToTwoDecimals(recomputedAmount - existingAmount);
}

/**
 * Expected pre-reconciliation wallet state as of 10 Nov 2026.
 * Main: ₹10,131.88, Needs: ₹598.91, Wants: ₹399.27 (Total: ₹11,130.05 / ₹11,130.06).
 */
export const EXPECTED_PRE_RECONCILIATION = {
  savingMain: 10131.88,
  needs: 598.91,
  wants: 399.27,
  total: 11130.05,
};

/**
 * Extracts normalized wallet balances from raw subwallets and wallets arrays.
 * Handles both camelCase (localStorage) and snake_case (Supabase) property names.
 */
export function extractWalletBalances(
  subwallets: any[] = [],
  wallets: any[] = []
): {
  savingMain: number;
  needs: number;
  wants: number;
  total: number;
} {
  let main = 0;
  let needs = 0;
  let wants = 0;

  const getParentType = (sw: any) => sw.parentWalletType || sw.parent_wallet_type;

  const needsSubs = subwallets.filter(sw => getParentType(sw) === 'needs');
  const wantsSubs = subwallets.filter(sw => getParentType(sw) === 'wants');
  const savingSubs = subwallets.filter(sw => getParentType(sw) === 'saving');

  // Needs
  if (needsSubs.length > 0) {
    needs = needsSubs.reduce((sum, sw) => sum + (Number(sw.balance) || 0), 0);
  } else {
    const w = wallets.find(w => w.type === 'needs');
    needs = w ? Number(w.balance) || 0 : 0;
  }

  // Wants
  if (wantsSubs.length > 0) {
    wants = wantsSubs.reduce((sum, sw) => sum + (Number(sw.balance) || 0), 0);
  } else {
    const w = wallets.find(w => w.type === 'wants');
    wants = w ? Number(w.balance) || 0 : 0;
  }

  // Saving / Main
  const mainSub = savingSubs.find(
    sw => (sw.name || '').trim().toLowerCase() === 'main'
  );
  if (mainSub) {
    main = Number(mainSub.balance) || 0;
  } else if (savingSubs.length > 0) {
    main = savingSubs.reduce((sum, sw) => sum + (Number(sw.balance) || 0), 0);
  } else {
    const w = wallets.find(w => w.type === 'saving');
    main = w ? Number(w.balance) || 0 : 0;
  }

  return {
    savingMain: roundToTwoDecimals(main),
    needs: roundToTwoDecimals(needs),
    wants: roundToTwoDecimals(wants),
    total: roundToTwoDecimals(main + needs + wants),
  };
}

/**
 * Checks whether current wallet balances match the expected pre-reconciliation state
 * within the specified tolerance (default ₹0.05).
 * Expected: Main ≈ ₹10,131.88, Needs ≈ ₹598.91, Wants ≈ ₹399.27 (Total ≈ ₹11,130.05).
 */
export function matchesPreReconciliationState(
  balances: { savingMain?: number; main?: number; needs: number; wants: number; total?: number },
  tolerance: number = 0.05
): boolean {
  const main = balances.savingMain !== undefined ? balances.savingMain : (balances.main ?? 0);
  const needs = balances.needs ?? 0;
  const wants = balances.wants ?? 0;
  const total = balances.total !== undefined ? balances.total : roundToTwoDecimals(main + needs + wants);

  const mainMatches = Math.abs(main - EXPECTED_PRE_RECONCILIATION.savingMain) <= tolerance;
  const needsMatches = Math.abs(needs - EXPECTED_PRE_RECONCILIATION.needs) <= tolerance;
  const wantsMatches = Math.abs(wants - EXPECTED_PRE_RECONCILIATION.wants) <= tolerance;
  // Pre-state: 10131.88 + 598.91 + 399.27 = 11130.06. Statement total is 11130.05 (diff is 0.01).
  const totalMatches =
    Math.abs(total - EXPECTED_PRE_RECONCILIATION.total) <= tolerance + 0.01 ||
    Math.abs(total - 11130.06) <= tolerance;

  return mainMatches && needsMatches && wantsMatches && totalMatches;
}

/**
 * Computes unallocated funds: ledger total minus the sum of all wallet balances.
 */
export function computeUnallocated(
  ledgerTotal: number,
  walletBalances: { savingMain?: number; main?: number; needs?: number; wants?: number }
): number {
  const main = walletBalances.savingMain !== undefined ? walletBalances.savingMain : (walletBalances.main ?? 0);
  const needs = walletBalances.needs ?? 0;
  const wants = walletBalances.wants ?? 0;
  return roundToTwoDecimals(ledgerTotal - (main + needs + wants));
}

export interface ReconcileBalancesResult {
  canReconcile: boolean;
  unallocated: number;
  reason?: string;
  action: 'apply_unallocated' | 'apply_legacy_transfer' | 'already_reconciled' | 'skip';
  savingMoved: number;
  needsMoved: number;
  wantsMoved: number;
  resultingBalances: {
    savingMain: number;
    needs: number;
    wants: number;
    total: number;
  };
}

/**
 * Evaluates whether wallet reconciliation can be performed.
 * Handles:
 * 1. Already reconciled state (Main = ledgerTotal, Needs = 0, Wants = 0) -> Idempotent, moved = 0.
 * 2. ACTUAL live state (Needs = 0, Wants = 0, unallocated ≈ ₹998.17) -> Move unallocated to Main.
 * 3. Legacy planned pre-state (Main ≈ 10131.88, Needs ≈ 598.91, Wants ≈ 399.27) -> Move Needs+Wants to Main.
 * 4. Mismatch / Changed balances guard -> Safe skip without touching balances.
 */
export function evaluateReconciliation(
  currentBalances: { savingMain?: number; main?: number; needs?: number; wants?: number; total?: number },
  ledgerTotal: number | null | undefined,
  tolerance: number = 0.05
): ReconcileBalancesResult {
  const main = currentBalances.savingMain !== undefined ? currentBalances.savingMain : (currentBalances.main ?? 0);
  const needs = currentBalances.needs ?? 0;
  const wants = currentBalances.wants ?? 0;
  const walletSum = roundToTwoDecimals(main + needs + wants);

  if (ledgerTotal === null || ledgerTotal === undefined || isNaN(ledgerTotal)) {
    return {
      canReconcile: false,
      unallocated: 0,
      action: 'skip',
      savingMoved: 0,
      needsMoved: 0,
      wantsMoved: 0,
      reason: 'Ledger total unavailable (null or NaN). Reconciliation skipped safely.',
      resultingBalances: {
        savingMain: roundToTwoDecimals(main),
        needs: roundToTwoDecimals(needs),
        wants: roundToTwoDecimals(wants),
        total: walletSum,
      },
    };
  }

  const unallocated = roundToTwoDecimals(ledgerTotal - walletSum);

  // 0. Check if wallets are retired or balances are zero (wallets system dropped)
  if (
    Math.abs(main) <= tolerance &&
    Math.abs(needs) <= tolerance &&
    Math.abs(wants) <= tolerance
  ) {
    return {
      canReconcile: true,
      unallocated: 0,
      action: 'already_reconciled',
      savingMoved: 0,
      needsMoved: 0,
      wantsMoved: 0,
      reason: 'Wallets system retired or zero wallet balances. No wallet rebalance needed.',
      resultingBalances: {
        savingMain: 0,
        needs: 0,
        wants: 0,
        total: 0,
      },
    };
  }

  // 1. Check if already reconciled:
  // Main ≈ ledgerTotal, Needs ≈ 0, Wants ≈ 0, unallocated ≈ 0 (idempotent, second run moves ₹0)
  if (
    Math.abs(main - ledgerTotal) <= tolerance &&
    Math.abs(needs) <= tolerance &&
    Math.abs(wants) <= tolerance &&
    Math.abs(unallocated) <= tolerance
  ) {
    return {
      canReconcile: true,
      unallocated: 0,
      action: 'already_reconciled',
      savingMoved: 0,
      needsMoved: 0,
      wantsMoved: 0,
      resultingBalances: {
        savingMain: ledgerTotal,
        needs: 0,
        wants: 0,
        total: ledgerTotal,
      },
    };
  }

  // 2. ACTUAL live state (10 Nov 2026):
  // Needs = 0, Wants = 0, unallocated ≈ 998.17 (within 0.05)
  // (Main is ~10,131.88, Ledger is ~11,130.05 -> move unallocated 998.17 to Main)
  if (
    Math.abs(needs) <= tolerance &&
    Math.abs(wants) <= tolerance &&
    Math.abs(unallocated - 998.17) <= tolerance
  ) {
    const resultingMain = roundToTwoDecimals(main + unallocated);
    return {
      canReconcile: true,
      unallocated,
      action: 'apply_unallocated',
      savingMoved: unallocated,
      needsMoved: 0,
      wantsMoved: 0,
      resultingBalances: {
        savingMain: resultingMain,
        needs: 0,
        wants: 0,
        total: resultingMain,
      },
    };
  }

  // 3. LEGACY planned pre-reconciliation state:
  // Main ≈ 10,131.88, Needs ≈ 598.91, Wants ≈ 399.27
  if (
    Math.abs(main - EXPECTED_PRE_RECONCILIATION.savingMain) <= tolerance &&
    Math.abs(needs - EXPECTED_PRE_RECONCILIATION.needs) <= tolerance &&
    Math.abs(wants - EXPECTED_PRE_RECONCILIATION.wants) <= tolerance &&
    (Math.abs(walletSum - EXPECTED_PRE_RECONCILIATION.total) <= tolerance + 0.01 ||
      Math.abs(walletSum - 11130.06) <= tolerance)
  ) {
    return {
      canReconcile: true,
      unallocated: 0,
      action: 'apply_legacy_transfer',
      savingMoved: roundToTwoDecimals(needs + wants),
      needsMoved: needs,
      wantsMoved: wants,
      resultingBalances: {
        savingMain: 11130.05,
        needs: 0,
        wants: 0,
        total: 11130.05,
      },
    };
  }

  // 4. Mismatch / Changed balances guard:
  return {
    canReconcile: false,
    unallocated,
    action: 'skip',
    savingMoved: 0,
    needsMoved: 0,
    wantsMoved: 0,
    reason: `Balances do not reconcile within ₹${tolerance.toFixed(2)} tolerance (Main: ₹${main.toFixed(2)}, Needs: ₹${needs.toFixed(2)}, Wants: ₹${wants.toFixed(2)}, Unallocated: ₹${unallocated.toFixed(2)}, Ledger: ₹${ledgerTotal.toFixed(2)}).`,
    resultingBalances: {
      savingMain: roundToTwoDecimals(main),
      needs: roundToTwoDecimals(needs),
      wants: roundToTwoDecimals(wants),
      total: walletSum,
    },
  };
}
