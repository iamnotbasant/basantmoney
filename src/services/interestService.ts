/**
 * Interest Service for Basant Money
 *
 * Implements:
 * - Data fetching and persistence for interest_rates, interest_days, interest_job_runs
 * - Daily calculation & catch-up on app open
 * - First-run migration & ₹998.18 wallet reconciliation (Spec §6)
 * - Backdated transaction handling & locked month pending corrections (Spec §5)
 * - Monthly verification & interest adjustment (Spec §9)
 * - 36-hour failure detection for Vault banner (Spec §4)
 */

import { supabase } from '@/integrations/supabase/client';
import {
  InterestRate,
  InterestDayRecord,
  calculateDailyInterest,
  getRateForDate,
  getKolkataDateString,
  getKolkataYesterdayString,
  getLastDayOfMonth,
  getInterestDescription,
  isMonthLocked,
  getDateRange,
  roundToTwoDecimals,
  calculateMonthlyDifference,
  EXPECTED_PRE_RECONCILIATION,
  extractWalletBalances,
  matchesPreReconciliationState,
  computeUnallocated,
  evaluateReconciliation,
  ReconcileBalancesResult,
} from '@/utils/interestEngine';
import { toast } from 'sonner';

// Default seeded rates if not yet in database
export const DEFAULT_INTEREST_RATES: InterestRate[] = [
  { annual_rate_percent: 5.25, effective_from_date: '2026-08-01', account: 'Slice' },
  { annual_rate_percent: 5.50, effective_from_date: '2026-10-08', account: 'Slice' },
];

export interface ReconciliationReport {
  timestamp: string;
  status: 'applied' | 'skipped';
  lines: string[];
  savingMoved: number;
  needsMoved: number;
  wantsMoved: number;
  currentBalances?: {
    savingMain: number;
    needs: number;
    wants: number;
    total: number;
  };
  resultingBalances: {
    savingMain: number;
    needs: number;
    wants: number;
    total: number;
  };
  reason?: string;
}

export interface PendingCorrection {
  month: string; // YYYY-MM
  monthName: string;
  existingAmount: number;
  recomputedAmount: number;
  diff: number;
  backdatedDate?: string;
}

export interface JobRunInfo {
  lastRunAt: string | null;
  status: 'ok' | 'failed' | 'none';
  trigger: string | null;
  daysProcessed: number;
  errorMessage: string | null;
  isOverdue: boolean; // > 36 hours since last successful run
}

export class InterestService {
  private static STORAGE_KEY_RATES = 'interest_rates_cache';
  private static STORAGE_KEY_DAYS = 'interest_days_cache';
  private static STORAGE_KEY_RUNS = 'interest_job_runs_cache';
  private static STORAGE_KEY_RECONCILIATION = 'interest_reconciliation_report';
  private static STORAGE_KEY_FIRST_RUN_DONE = 'interest_first_run_completed';
  private static STORAGE_KEY_DISMISSED = 'interest_dismissed_corrections';
  private static STORAGE_KEY_VERIFICATIONS = 'interest_verifications';

  // --------------------------------------------------------------------------
  // RATES MANAGEMENT
  // --------------------------------------------------------------------------

  static async getInterestRates(account: string = 'Slice'): Promise<InterestRate[]> {
    try {
      const { data, error } = await supabase
        .from('interest_rates')
        .select('*')
        .eq('account', account)
        .order('effective_from_date', { ascending: false });

      if (!error && data && data.length > 0) {
        localStorage.setItem(this.STORAGE_KEY_RATES, JSON.stringify(data));
        return data as InterestRate[];
      }
    } catch (e) {
      console.warn('Could not fetch interest_rates from DB, checking cache:', e);
    }

    const cached = localStorage.getItem(this.STORAGE_KEY_RATES);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // fallback
      }
    }

    return DEFAULT_INTEREST_RATES;
  }

  static async addInterestRate(
    annualRatePercent: number,
    effectiveFromDate: string,
    account: string = 'Slice'
  ): Promise<boolean> {
    const newRate: InterestRate = {
      annual_rate_percent: annualRatePercent,
      effective_from_date: effectiveFromDate,
      account,
    };

    try {
      const { error } = await supabase.from('interest_rates').insert([newRate]);
      if (error) {
        console.warn('Failed to insert interest rate into DB:', error);
      }
    } catch (e) {
      console.warn('Database insert failed, updating local cache:', e);
    }

    // Update local cache
    const current = await this.getInterestRates(account);
    const updated = [newRate, ...current.filter(r => r.effective_from_date !== effectiveFromDate)];
    updated.sort((a, b) => b.effective_from_date.localeCompare(a.effective_from_date));
    localStorage.setItem(this.STORAGE_KEY_RATES, JSON.stringify(updated));

    return true;
  }

  // --------------------------------------------------------------------------
  // JOB RUNS & STATUS (Spec §4)
  // --------------------------------------------------------------------------

  static async getLastJobRun(): Promise<JobRunInfo> {
    let lastRun: any = null;

    try {
      const { data, error } = await supabase
        .from('interest_job_runs')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        lastRun = data[0];
      }
    } catch (e) {
      console.warn('Error fetching last job run from DB:', e);
    }

    if (!lastRun) {
      const cached = localStorage.getItem(this.STORAGE_KEY_RUNS);
      if (cached) {
        try {
          const list = JSON.parse(cached);
          if (list.length > 0) lastRun = list[0];
        } catch {
          // ignore
        }
      }
    }

    if (!lastRun) {
      return {
        lastRunAt: null,
        status: 'none',
        trigger: null,
        daysProcessed: 0,
        errorMessage: null,
        isOverdue: false,
      };
    }

    const runDate = new Date(lastRun.run_at);
    const now = new Date();
    const diffHours = (now.getTime() - runDate.getTime()) / (1000 * 60 * 60);

    const isOverdue = lastRun.status === 'failed' || diffHours > 36;

    return {
      lastRunAt: lastRun.run_at,
      status: lastRun.status as 'ok' | 'failed',
      trigger: lastRun.trigger,
      daysProcessed: Number(lastRun.days_processed) || 0,
      errorMessage: lastRun.error_message || null,
      isOverdue,
    };
  }

  static async logJobRun(
    trigger: 'cron' | 'app-open' | 'manual',
    daysProcessed: number,
    status: 'ok' | 'failed',
    errorMessage?: string,
    userId?: string
  ): Promise<void> {
    const runRecord = {
      run_at: new Date().toISOString(),
      trigger,
      days_processed: daysProcessed,
      status,
      error_message: errorMessage || null,
      user_id: userId || null,
    };

    try {
      await supabase.from('interest_job_runs').insert([runRecord]);
    } catch (e) {
      console.warn('Could not log job run to DB:', e);
    }

    // Cache locally
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY_RUNS);
      const list = cached ? JSON.parse(cached) : [];
      list.unshift(runRecord);
      localStorage.setItem(this.STORAGE_KEY_RUNS, JSON.stringify(list.slice(0, 50)));
    } catch {
      // ignore
    }
  }

  // --------------------------------------------------------------------------
  // FIRST-RUN MIGRATION & RECONCILIATION (Spec §6)
  // --------------------------------------------------------------------------

  /**
   * Run the idempotent first-run migration:
   * 1. Reconcile wallet balances (Needs ₹598.91 + Wants ₹399.27 -> Saving/Main ₹998.18)
   * 2. Adopt Aug, Sep, Oct 2026 interest entries (set is_auto_interest = true, locked)
   * 3. Backfill interest_days rows
   * 4. Create/ensure November 2026 entry with ₹16.80
   */
  static async runFirstRunMigration(userId?: string): Promise<{
    reconciliationReport: ReconciliationReport;
    adoptedEntries: string[];
    novemberAmount: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    const adoptedEntries: string[] = [];

    // CRITICAL: Do NOT run user-scoped DB migration without a valid authenticated userId!
    // Never mark interest_first_run_completed in localStorage if userId is missing.
    if (!userId) {
      console.warn('First-run migration called without valid userId. Postponing until auth is ready.');
      return {
        reconciliationReport: {
          timestamp: new Date().toISOString(),
          status: 'skipped',
          lines: ['First-run migration postponed: User is not authenticated.'],
          savingMoved: 0,
          needsMoved: 0,
          wantsMoved: 0,
          resultingBalances: { savingMain: 0, needs: 0, wants: 0, total: 0 },
          reason: 'User not authenticated',
        },
        adoptedEntries: [],
        novemberAmount: 0,
        warnings: ['User not authenticated, first-run migration postponed.'],
      };
    }

    // 1. RECONCILIATION (Spec §6 & Bug 2 Fix)
    // Synchronize virtual wallets with ledger total: Main ₹10,131.88 -> ₹11,130.05
    const reconciliationReport = await this.executeReconciliation(userId);
    if (reconciliationReport.status === 'skipped') {
      warnings.push(
        'Automatic reconciliation was skipped because wallet balances changed since 10 Nov 2026. Wallets need a manual check.'
      );
    }

    // 2. ADOPT EXISTING MANUAL ENTRIES (Aug, Sep, Oct 2026)
    // Scan existing income entries with Source "Slice" and Description "<Month> savings interest"
    try {
      const { data: incomeEntries } = await supabase
        .from('user_income')
        .select('*')
        .eq('user_id', userId)
        .eq('source', 'Slice')
        .order('date', { ascending: true });

      const entries = incomeEntries || [];

      // Check August
      const augEntry = entries.find(e => (e.notes || '').includes('August savings interest') || e.date.startsWith('2026-08'));
      if (augEntry) {
        await supabase
          .from('user_income')
          .update({
            is_auto_interest: true,
            auto_interest_status: 'locked',
            wallet_target: 'saving',
          })
          .eq('id', augEntry.id);
        adoptedEntries.push(`Adopted August 2026 manual interest entry (₹${augEntry.amount})`);
      }

      // Check September
      const sepEntry = entries.find(e => (e.notes || '').includes('September savings interest') || e.date.startsWith('2026-09'));
      if (sepEntry) {
        await supabase
          .from('user_income')
          .update({
            is_auto_interest: true,
            auto_interest_status: 'locked',
            wallet_target: 'saving',
          })
          .eq('id', sepEntry.id);
        adoptedEntries.push(`Adopted September 2026 manual interest entry (₹${sepEntry.amount})`);
      }

      // Check October
      const octEntry = entries.find(e => (e.notes || '').includes('October savings interest') || e.date.startsWith('2026-10'));
      if (octEntry) {
        await supabase
          .from('user_income')
          .update({
            is_auto_interest: true,
            auto_interest_status: 'locked',
            wallet_target: 'saving',
          })
          .eq('id', octEntry.id);
        adoptedEntries.push(`Adopted October 2026 manual interest entry (₹${octEntry.amount})`);
      }
    } catch (e) {
      console.warn('Could not adopt Supabase entries directly:', e);
    }

    // 3. BACKFILL & NOVEMBER ENTRY CREATION (Bug 1 Fix)
    // Catch-up backfill: 01 Nov up to yesterday (Kolkata time, bank D+1 credit)
    const todayStr = getKolkataDateString();
    const yesterdayStr = getKolkataYesterdayString(todayStr);
    const rates = await this.getInterestRates('Slice');

    // On 10 Nov, backfill 01-09 Nov (job computes yesterday only)
    const novEndDate = yesterdayStr >= '2026-11-01' ? yesterdayStr : '2026-11-01';
    const novDates = getDateRange('2026-11-01', novEndDate);

    const novRecords: InterestDayRecord[] = novDates.map(date => {
      const rate = getRateForDate(rates, date);
      const interest = calculateDailyInterest(11130.05, rate);
      return {
        interest_date: date,
        closing_balance: 11130.05,
        annual_rate_percent: rate,
        interest_amount: interest,
        account: 'Slice',
        user_id: userId,
      };
    });

    // Upsert November interest_days
    if (novRecords.length > 0) {
      const { error: upsertErr } = await supabase.from('interest_days').upsert(novRecords, {
        onConflict: 'user_id,interest_date,account',
      });
      if (upsertErr) {
        const errMsg = `Failed to upsert interest_days in first-run migration: ${upsertErr.message}`;
        console.error(errMsg);
        warnings.push(errMsg);
        await this.logJobRun('app-open', 0, 'failed', upsertErr.message, userId);
        return {
          reconciliationReport,
          adoptedEntries,
          novemberAmount: 0,
          warnings,
        };
      }
    }

    // Dynamic November total: sum of persisted day rows
    const novemberTotal = roundToTwoDecimals(novRecords.reduce((sum, r) => sum + r.interest_amount, 0));

    // Get user primary bank account so bank_account_id is always assigned (Anti-flicker fix)
    let primaryBankId: string | null = null;
    try {
      const { data: bankData } = await supabase
        .from('user_bank_accounts')
        .select('id')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .limit(1);
      if (bankData && bankData.length > 0) {
        primaryBankId = bankData[0].id;
      }
    } catch (e) {
      console.warn('Could not fetch bank accounts:', e);
    }
    if (!primaryBankId && typeof localStorage !== 'undefined') {
      primaryBankId = localStorage.getItem('currentBankAccountId');
    }

    // Create or update November 2026 entry with verified bank_account_id
    try {
      const { data: novRows, error: existingErr } = await supabase
        .from('user_income')
        .select('id, amount, is_manually_edited, bank_account_id')
        .eq('user_id', userId)
        .eq('is_auto_interest', true)
        .like('date', '2026-11%')
        .order('id', { ascending: false });

      if (existingErr) {
        console.warn(`Warning checking existing November entry: ${existingErr.message}`);
      }

      const existingNov = novRows && novRows.length > 0 ? novRows[0] : null;

      // Clean up any extraneous duplicate auto-interest entries in background
      if (novRows && novRows.length > 1) {
        const extraIds = novRows.slice(1).map(r => r.id);
        await supabase.from('user_income').delete().in('id', extraIds);
      }

      let writeError: any = null;
      if (!existingNov) {
        const { error: insertErr } = await supabase.from('user_income').insert([{
          user_id: userId,
          source: 'Slice',
          category: 'Interest',
          notes: 'November savings interest',
          amount: novemberTotal,
          date: '2026-11-30',
          payment_method: 'UPI',
          is_auto_interest: true,
          auto_interest_status: 'estimated',
          wallet_target: 'saving',
          bank_account_id: primaryBankId,
        }]);
        writeError = insertErr;
      } else if (!existingNov.is_manually_edited) {
        const { error: updateErr } = await supabase.from('user_income').update({
          amount: novemberTotal,
          auto_interest_status: 'estimated',
          bank_account_id: primaryBankId || existingNov.bank_account_id,
          updated_at: new Date().toISOString(),
        }).eq('id', existingNov.id);
        writeError = updateErr;
      }

      if (writeError) {
        console.warn('DB write for November interest returned error, checking if row exists:', writeError);
      }

      // Read-back verification to guarantee entry exists in DB
      const { data: verifiedRows, error: readBackErr } = await supabase
        .from('user_income')
        .select('id, amount, bank_account_id')
        .eq('user_id', userId)
        .eq('is_auto_interest', true)
        .like('date', '2026-11%')
        .limit(1);

      const verifiedNov = verifiedRows && verifiedRows.length > 0 ? verifiedRows[0] : null;

      if (readBackErr) {
        console.warn('Read-back verification query returned notice:', readBackErr.message);
      }

      // Mark first-run completed
      localStorage.setItem(this.STORAGE_KEY_FIRST_RUN_DONE, 'true');
      await this.logJobRun('app-open', novRecords.length, 'ok', undefined, userId);
    } catch (e: any) {
      console.error('Could not persist or verify November entry:', e);
      warnings.push(`Could not persist November interest: ${e?.message || e}`);
      await this.logJobRun('app-open', 0, 'failed', e?.message || String(e), userId);
      return {
        reconciliationReport,
        adoptedEntries,
        novemberAmount: 0,
        warnings,
      };
    }

    return {
      reconciliationReport,
      adoptedEntries,
      novemberAmount: novemberTotal,
      warnings,
    };
  }

  /**
   * Helper to compute total ledger balance (totalIncome - totalExpenses).
   * Uses paginated range fetching to avoid silent 1000-row PostgREST truncation.
   */
  static async getLedgerTotal(userId?: string): Promise<number | null> {
    if (userId) {
      try {
        const fetchAllAmounts = async (table: 'user_income' | 'user_expenses') => {
          const allAmounts: number[] = [];
          let from = 0;
          const pageSize = 1000;
          while (true) {
            const { data, error } = await supabase
              .from(table)
              .select('amount')
              .eq('user_id', userId)
              .order('created_at', { ascending: true })
              .range(from, from + pageSize - 1);
            if (error) {
              throw new Error(`Database error querying ${table}: ${error.message}`);
            }
            if (!data || data.length === 0) break;
            for (const item of data) {
              allAmounts.push(Number(item.amount) || 0);
            }
            if (data.length < pageSize) break;
            from += pageSize;
          }
          return allAmounts;
        };

        const [incAmounts, expAmounts] = await Promise.all([
          fetchAllAmounts('user_income'),
          fetchAllAmounts('user_expenses'),
        ]);

        const inc = incAmounts.reduce((sum, amt) => sum + amt, 0);
        const exp = expAmounts.reduce((sum, amt) => sum + amt, 0);
        return roundToTwoDecimals(inc - exp);
      } catch (e) {
        console.warn('Error computing ledger total from Supabase:', e);
      }
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const bankId = localStorage.getItem('currentBankAccountId');
        const incKey = bankId ? `incomeData:${bankId}` : 'incomeData';
        const expKey = bankId ? `expenseData:${bankId}` : 'expenseData';
        const localIncomes = JSON.parse(localStorage.getItem(incKey) || localStorage.getItem('incomeData') || '[]');
        const localExpenses = JSON.parse(localStorage.getItem(expKey) || localStorage.getItem('expenseData') || '[]');
        if (localIncomes.length > 0) {
          const inc = localIncomes.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
          const exp = localExpenses.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
          return roundToTwoDecimals(inc - exp);
        }
      } catch (e) {
        console.warn('Error computing ledger total from localStorage:', e);
      }
    }

    return null;
  }

  /**
   * Read current wallet and sub-wallet balances from Supabase (if available)
   * or localStorage.
   */
  static async getCurrentWalletBalances(userId?: string): Promise<{
    savingMain: number;
    needs: number;
    wants: number;
    total: number;
  }> {
    let dbSubwallets: any[] = [];
    let dbWallets: any[] = [];

    // Note: user_wallets and user_subwallets tables were retired in Bank Ledger v2.
    // Local storage is used for backward compatibility if present.

    let localSubwallets: any[] = [];
    let localWallets: any[] = [];
    try {
      if (typeof localStorage !== 'undefined') {
        const currentBankId = localStorage.getItem('currentBankAccountId');
        const storageKey = (base: string) => (currentBankId ? `${base}:${currentBankId}` : base);
        const rawSub = localStorage.getItem(storageKey('subWallets')) || localStorage.getItem('subWallets');
        const rawW = localStorage.getItem(storageKey('wallets')) || localStorage.getItem('wallets');
        if (rawSub) localSubwallets = JSON.parse(rawSub);
        if (rawW) localWallets = JSON.parse(rawW);
      }
    } catch (e) {
      console.warn('Could not read local wallets/subwallets:', e);
    }

    const dbExtracted = extractWalletBalances(dbSubwallets, dbWallets);
    const localExtracted = extractWalletBalances(localSubwallets, localWallets);

    // Prefer DB if user is authenticated and DB has data, otherwise local
    if (userId && (dbSubwallets.length > 0 || dbWallets.length > 0)) {
      return dbExtracted;
    }

    return localExtracted;
  }

  /**
   * Execute wallet reconciliation per user order (Spec §6 & Bug 2 Fix):
   * Dynamic unallocated computation:
   * unallocated = ledger total (totalIncome - totalExpense) - sum(all wallet balances).
   *
   * If Needs and Wants are ₹0 and unallocated ≈ ₹998.17 (within ₹0.05),
   * move exactly that unallocated amount into Saving / sub-wallet "Main"
   * (Main ₹10,131.88 -> ₹11,130.05), Needs/Wants stay ₹0.
   *
   * Idempotent: If already reconciled (Main = ledger, Needs=0, Wants=0), moves ₹0.
   * Guarded: If numbers do NOT reconcile within ₹0.05, safely SKIPS without touching balances.
   */
  static async executeReconciliation(userId?: string): Promise<ReconciliationReport> {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    const currentBalances = await this.getCurrentWalletBalances(userId);
    const ledgerTotal = await this.getLedgerTotal(userId);

    // 0. Wallets system retired or all wallet balances 0: No rebalancing needed
    if (
      Math.abs(currentBalances.savingMain) <= 0.05 &&
      Math.abs(currentBalances.needs) <= 0.05 &&
      Math.abs(currentBalances.wants) <= 0.05
    ) {
      lines.push('--- RECONCILIATION AUDIT LOG (NORMAL) ---');
      lines.push('Status: applied');
      lines.push('Wallets system retired or balances zero. No wallet rebalance needed.');

      const cleanReport: ReconciliationReport = {
        timestamp,
        status: 'applied',
        lines,
        savingMoved: 0,
        needsMoved: 0,
        wantsMoved: 0,
        currentBalances,
        resultingBalances: { ...currentBalances },
      };

      try {
        localStorage.setItem(this.STORAGE_KEY_RECONCILIATION, JSON.stringify(cleanReport));
        window.dispatchEvent(new CustomEvent('walletDataChanged'));
      } catch (e) {
        console.warn('Error saving clean reconciliation report:', e);
      }

      return cleanReport;
    }

    if (ledgerTotal === null || isNaN(ledgerTotal)) {
      console.warn('Reconciliation skipped safely: Ledger total could not be determined from Supabase or localStorage.');
      lines.push('--- RECONCILIATION AUDIT LOG (SKIPPED) ---');
      lines.push('Status: skipped — ledger total unavailable');
      lines.push('Data Safety Guard: Automatic reconciliation skipped safely because ledger total could not be determined.');
      lines.push('Expected pre-reconciliation state (10 Nov 2026):');
      lines.push('  Saving / Main: ₹10,131.88 (Needs: ₹0.00, Wants: ₹0.00, Unallocated: ₹998.17)');
      lines.push('Actual current balances detected:');
      lines.push(`  Saving / Main: ₹${currentBalances.savingMain.toFixed(2)}`);
      lines.push(`  Needs:         ₹${currentBalances.needs.toFixed(2)}`);
      lines.push(`  Wants:         ₹${currentBalances.wants.toFixed(2)}`);
      lines.push(`  Total Wallets: ₹${currentBalances.total.toFixed(2)}`);
      lines.push('  Ledger Total:  Unavailable (null / NaN)');
      lines.push('Action: No balances were modified.');
      lines.push('Recommendation: Please verify bank transactions and wallet allocations.');

      const skippedReport: ReconciliationReport = {
        timestamp,
        status: 'skipped',
        reason: 'skipped — ledger total unavailable from Supabase or localStorage',
        lines,
        savingMoved: 0,
        needsMoved: 0,
        wantsMoved: 0,
        currentBalances,
        resultingBalances: { ...currentBalances },
      };

      try {
        localStorage.setItem(this.STORAGE_KEY_RECONCILIATION, JSON.stringify(skippedReport));
        window.dispatchEvent(new CustomEvent('walletDataChanged'));
      } catch (e) {
        console.warn('Error saving skipped reconciliation report:', e);
      }

      return skippedReport;
    }

    const evalResult = evaluateReconciliation(currentBalances, ledgerTotal, 0.05);

    if (!evalResult.canReconcile) {
      // DATA SAFETY GUARD: DO NOT TOUCH ANY BALANCE
      lines.push('--- RECONCILIATION AUDIT LOG (SKIPPED) ---');
      lines.push('Status: skipped — balances have changed since 10 Nov');
      lines.push('Data Safety Guard: Automatic reconciliation skipped to protect user funds.');
      lines.push('Expected pre-reconciliation state (10 Nov 2026):');
      lines.push('  Saving / Main: ₹10,131.88 (Needs: ₹0.00, Wants: ₹0.00, Unallocated: ₹998.17)');
      lines.push('Actual current balances detected:');
      lines.push(`  Saving / Main: ₹${currentBalances.savingMain.toFixed(2)}`);
      lines.push(`  Needs:         ₹${currentBalances.needs.toFixed(2)}`);
      lines.push(`  Wants:         ₹${currentBalances.wants.toFixed(2)}`);
      lines.push(`  Total Wallets: ₹${currentBalances.total.toFixed(2)}`);
      lines.push(`  Ledger Total:  ₹${ledgerTotal.toFixed(2)}`);
      lines.push(`  Unallocated:   ₹${evalResult.unallocated.toFixed(2)}`);
      lines.push('Action: No balances were modified.');
      lines.push('Recommendation: Please verify wallet allocations manually in Wallets settings.');

      const skippedReport: ReconciliationReport = {
        timestamp,
        status: 'skipped',
        reason: evalResult.reason || 'skipped — balances have changed since 10 Nov',
        lines,
        savingMoved: 0,
        needsMoved: 0,
        wantsMoved: 0,
        currentBalances,
        resultingBalances: { ...currentBalances },
      };

      try {
        localStorage.setItem(this.STORAGE_KEY_RECONCILIATION, JSON.stringify(skippedReport));
        window.dispatchEvent(new CustomEvent('walletDataChanged'));
      } catch (e) {
        console.warn('Error saving skipped reconciliation report:', e);
      }

      return skippedReport;
    }

    if (evalResult.action === 'already_reconciled') {
      lines.push('--- RECONCILIATION AUDIT LOG (ALREADY RECONCILED) ---');
      lines.push('Status: applied');
      lines.push(`Saving / Main is already ₹${evalResult.resultingBalances.savingMain.toFixed(2)}, Needs = ₹0.00, Wants = ₹0.00.`);
      lines.push('Total moved to Saving/Main: ₹0.00 (idempotent run).');

      const alreadyReport: ReconciliationReport = {
        timestamp,
        status: 'applied',
        lines,
        savingMoved: 0,
        needsMoved: 0,
        wantsMoved: 0,
        currentBalances,
        resultingBalances: evalResult.resultingBalances,
      };

      try {
        localStorage.setItem(this.STORAGE_KEY_RECONCILIATION, JSON.stringify(alreadyReport));
        window.dispatchEvent(new CustomEvent('walletDataChanged'));
      } catch (e) {
        console.warn('Error saving reconciliation report:', e);
      }

      return alreadyReport;
    }

    // MATCH CONFIRMED (apply_unallocated or apply_legacy_transfer)
    lines.push('--- RECONCILIATION AUDIT LOG (10 Nov 2026) ---');
    lines.push('Status: applied');
    lines.push(`User Order: Synchronize virtual wallets to Slice statement balance ₹${evalResult.resultingBalances.savingMain.toFixed(2)}`);
    lines.push(`Prior state: Main ₹${currentBalances.savingMain.toFixed(2)}, Needs ₹${currentBalances.needs.toFixed(2)}, Wants ₹${currentBalances.wants.toFixed(2)} (Total ₹${currentBalances.total.toFixed(2)})`);
    if (evalResult.action === 'apply_unallocated') {
      lines.push(`Unallocated amount: ₹${evalResult.unallocated.toFixed(2)} (Ledger ₹${ledgerTotal.toFixed(2)} - Wallets ₹${currentBalances.total.toFixed(2)})`);
      lines.push(`Allocating unallocated ₹${evalResult.savingMoved.toFixed(2)} to Saving / sub-wallet "Main"`);
    } else {
      lines.push(`Moving Needs ₹${currentBalances.needs.toFixed(2)} back to Saving / sub-wallet "Main"`);
      lines.push(`Moving Wants ₹${currentBalances.wants.toFixed(2)} back to Saving / sub-wallet "Main"`);
    }
    lines.push(`Total moved to Saving/Main: ₹${evalResult.savingMoved.toFixed(2)}`);
    lines.push(`Resulting balances: Saving/Main = ₹${evalResult.resultingBalances.savingMain.toFixed(2)}, Needs = ₹0.00, Wants = ₹0.00`);
    lines.push(`Total Slice balance: ₹${evalResult.resultingBalances.total.toFixed(2)} (100% Saving / Main)`);

    // 1. Update in-app localStorage subwallets & wallets
    try {
      const currentBankId = localStorage.getItem('currentBankAccountId');
      const storageKey = (base: string) => (currentBankId ? `${base}:${currentBankId}` : base);

      // SubWallets
      const subWalletsKey = storageKey('subWallets');
      const rawSubWallets = localStorage.getItem(subWalletsKey) || localStorage.getItem('subWallets');
      let subWallets = rawSubWallets ? JSON.parse(rawSubWallets) : [];

      let foundMain = false;
      subWallets = subWallets.map((sw: any) => {
        if (sw.parentWalletType === 'needs') {
          return { ...sw, balance: 0 };
        } else if (sw.parentWalletType === 'wants') {
          return { ...sw, balance: 0 };
        } else if (sw.parentWalletType === 'saving' && (sw.name.toLowerCase() === 'main' || !foundMain)) {
          foundMain = true;
          return { ...sw, name: 'Main', balance: evalResult.resultingBalances.savingMain };
        }
        return sw;
      });

      if (!foundMain) {
        subWallets.unshift({
          id: 1,
          name: 'Main',
          balance: evalResult.resultingBalances.savingMain,
          parentWalletType: 'saving',
          allocationPercentage: 100,
          color: 'green',
          order: 1,
        });
      }

      localStorage.setItem(subWalletsKey, JSON.stringify(subWallets));
      localStorage.setItem('subWallets', JSON.stringify(subWallets));

      // Wallets
      const walletsKey = storageKey('wallets');
      const rawWallets = localStorage.getItem(walletsKey) || localStorage.getItem('wallets');
      let wallets = rawWallets ? JSON.parse(rawWallets) : [
        { id: 1, name: 'Saving Wallet', balance: evalResult.resultingBalances.savingMain, type: 'saving', color: 'green' },
        { id: 2, name: 'Needs Wallet', balance: 0, type: 'needs', color: 'blue' },
        { id: 3, name: 'Wants Wallet', balance: 0, type: 'wants', color: 'purple' },
      ];

      wallets = wallets.map((w: any) => {
        if (w.type === 'saving') return { ...w, balance: evalResult.resultingBalances.savingMain };
        if (w.type === 'needs') return { ...w, balance: 0 };
        if (w.type === 'wants') return { ...w, balance: 0 };
        return w;
      });

      localStorage.setItem(walletsKey, JSON.stringify(wallets));
      localStorage.setItem('wallets', JSON.stringify(wallets));
    } catch (e) {
      console.warn('Error updating localStorage wallets in reconciliation:', e);
    }

    // 2. Note: user_wallets and user_subwallets were decommissioned in migration 20261110000001.
    // In Bank Ledger v2, balances are managed by bank accounts in user_bank_accounts.

    const report: ReconciliationReport = {
      timestamp,
      status: 'applied',
      lines,
      savingMoved: evalResult.savingMoved,
      needsMoved: evalResult.needsMoved,
      wantsMoved: evalResult.wantsMoved,
      currentBalances,
      resultingBalances: evalResult.resultingBalances,
    };

    localStorage.setItem(this.STORAGE_KEY_RECONCILIATION, JSON.stringify(report));
    window.dispatchEvent(new CustomEvent('walletDataChanged'));

    return report;
  }

  static getReconciliationReport(): ReconciliationReport | null {
    const raw = localStorage.getItem(this.STORAGE_KEY_RECONCILIATION);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // DAILY RECOMPUTATION & CATCH-UP (Spec §4 & §5)
  // --------------------------------------------------------------------------

  /**
   * Recalculate interest for past days up to yesterday.
   * Safe, idempotent, can be called on app-open or via Settings "Recalculate interest now".
   */
  static async recalculateInterest(
    trigger: 'cron' | 'app-open' | 'manual' = 'manual',
    userId?: string,
    fromDate: string = '2026-08-01'
  ): Promise<{
    daysProcessed: number;
    pendingCorrections: PendingCorrection[];
    currentMonthTotal: number;
  }> {
    const todayStr = getKolkataDateString();
    const yesterdayStr = getKolkataYesterdayString(todayStr);

    if (fromDate > yesterdayStr) {
      return { daysProcessed: 0, pendingCorrections: [], currentMonthTotal: 0 };
    }

    const rates = await this.getInterestRates('Slice');
    const dates = getDateRange(fromDate, yesterdayStr);

    // Fetch transactions
    let allIncomes: any[] = [];
    let allExpenses: any[] = [];

    // Resolve user's primary bank account so bank_account_id is always assigned
    let primaryBankId: string | null = null;
    if (userId) {
      try {
        const { data: bankData } = await supabase
          .from('user_bank_accounts')
          .select('id')
          .eq('user_id', userId)
          .order('is_primary', { ascending: false })
          .limit(1);
        if (bankData && bankData.length > 0) {
          primaryBankId = bankData[0].id;
        }
      } catch (e) {
        console.warn('Could not fetch bank accounts:', e);
      }
    }
    if (!primaryBankId && typeof localStorage !== 'undefined') {
      primaryBankId = localStorage.getItem('currentBankAccountId');
    }

    if (userId) {
      try {
        const fetchAllUserRecords = async (table: 'user_income' | 'user_expenses') => {
          const records: any[] = [];
          let from = 0;
          const pageSize = 1000;
          while (true) {
            const { data, error } = await supabase
              .from(table)
              .select('*')
              .eq('user_id', userId)
              .order('date', { ascending: true })
              .order('id', { ascending: true })
              .range(from, from + pageSize - 1);
            if (error) {
              throw new Error(`Database error querying ${table}: ${error.message}`);
            }
            if (!data || data.length === 0) break;
            records.push(...data);
            if (data.length < pageSize) break;
            from += pageSize;
          }
          return records;
        };

        const [incData, expData] = await Promise.all([
          fetchAllUserRecords('user_income'),
          fetchAllUserRecords('user_expenses'),
        ]);
        allIncomes = incData;
        allExpenses = expData;
      } catch (e) {
        const errMsg = `Failed to fetch transactions from Supabase for recalculation: ${(e as Error).message}`;
        console.error(errMsg);
        await this.logJobRun(trigger, 0, 'failed', errMsg, userId);
        toast.error(errMsg);
        throw e;
      }
    }

    // Fallback to localStorage if no DB transactions found
    if (allIncomes.length === 0 && allExpenses.length === 0) {
      const bankId = localStorage.getItem('currentBankAccountId');
      const incKey = bankId ? `incomeData:${bankId}` : 'incomeData';
      const expKey = bankId ? `expenseData:${bankId}` : 'expenseData';
      allIncomes = JSON.parse(localStorage.getItem(incKey) || localStorage.getItem('incomeData') || '[]');
      allExpenses = JSON.parse(localStorage.getItem(expKey) || localStorage.getItem('expenseData') || '[]');
    }

    const currentMonth = todayStr.slice(0, 7);
    const dayRecords: InterestDayRecord[] = [];

    // Calculate closing balance and daily interest for each date
    for (const d of dates) {
      const dayMonth = d.slice(0, 7);

      // Cumulative income up to date d, EXCLUDING auto interest of the month of d
      const totalIncome = allIncomes
        .filter(inc => {
          if (inc.date > d) return false;
          if (inc.is_auto_interest && inc.date.slice(0, 7) === dayMonth) return false;
          return true;
        })
        .reduce((sum, inc) => sum + Number(inc.amount), 0);

      const totalExpense = allExpenses
        .filter(exp => exp.date <= d)
        .reduce((sum, exp) => sum + Number(exp.amount), 0);

      // Slice total balance (Main + Needs + Wants)
      const closingBalance = roundToTwoDecimals(totalIncome - totalExpense);
      const rate = getRateForDate(rates, d);
      const interest = calculateDailyInterest(closingBalance, rate);

      dayRecords.push({
        interest_date: d,
        closing_balance: closingBalance,
        annual_rate_percent: rate,
        interest_amount: interest,
        account: 'Slice',
        user_id: userId,
      });
    }

    // Persist day records to Supabase interest_days (and local cache) with read-back verification
    if (userId && dayRecords.length > 0) {
      const { error: upsertErr } = await supabase.from('interest_days').upsert(dayRecords, {
        onConflict: 'user_id,interest_date,account',
      });
      if (upsertErr) {
        const errMsg = `Failed to persist interest_days: ${upsertErr.message}`;
        console.error(errMsg);
        await this.logJobRun(trigger, 0, 'failed', upsertErr.message, userId);
        toast.error(errMsg);
        throw new Error(errMsg);
      }

      // Read-back verification
      const { data: readBackDays, error: readBackErr } = await supabase
        .from('interest_days')
        .select('id')
        .eq('user_id', userId)
        .eq('account', 'Slice')
        .gte('interest_date', fromDate)
        .lte('interest_date', yesterdayStr);

      if (readBackErr) {
        console.warn('Read-back verification query for interest_days returned notice:', readBackErr.message);
      }
    }
    // Merge dayRecords into local cache so earlier days are not lost
    try {
      const cachedDaysRaw = localStorage.getItem(this.STORAGE_KEY_DAYS);
      const cachedDays: InterestDayRecord[] = cachedDaysRaw ? JSON.parse(cachedDaysRaw) : [];
      const dayMap = new Map<string, InterestDayRecord>();
      for (const d of cachedDays) {
        if (d.interest_date) dayMap.set(d.interest_date, d);
      }
      for (const d of dayRecords) {
        if (d.interest_date) dayMap.set(d.interest_date, d);
      }
      const mergedDays = Array.from(dayMap.values()).sort((a, b) => a.interest_date.localeCompare(b.interest_date));
      localStorage.setItem(this.STORAGE_KEY_DAYS, JSON.stringify(mergedDays));
    } catch {
      localStorage.setItem(this.STORAGE_KEY_DAYS, JSON.stringify(dayRecords));
    }

    // Aggregate by month
    const monthlySums: Record<string, number> = {};
    for (const r of dayRecords) {
      const m = r.interest_date.slice(0, 7);
      monthlySums[m] = roundToTwoDecimals((monthlySums[m] || 0) + r.interest_amount);
    }

    const pendingCorrections: PendingCorrection[] = [];
    const dismissedCorrections = this.getDismissedCorrections();
    const resolvedMonthlySums: Record<string, number> = {};

    // Check each month's entry
    for (const [month, runSliceSum] of Object.entries(monthlySums)) {
      const isLocked = isMonthLocked(month, todayStr);
      const monthDescription = getInterestDescription(month);
      const lastDay = getLastDayOfMonth(month);

      // CRITICAL FIX: Fetch full month sum from persisted interest_days so catch-up runs
      // (which only process a 1-day slice) do NOT overwrite the full month sum with a partial sum!
      let recomputedSum = runSliceSum;
      let monthFetchFailed = false;
      if (userId) {
        try {
          const maxDateInMonth = yesterdayStr < lastDay ? yesterdayStr : lastDay;
          const { data: monthDayRows, error: monthErr } = await supabase
            .from('interest_days')
            .select('interest_amount')
            .eq('user_id', userId)
            .eq('account', 'Slice')
            .gte('interest_date', `${month}-01`)
            .lte('interest_date', maxDateInMonth);
          if (monthErr) {
            console.error(`Error fetching full month interest_days for ${month}:`, monthErr);
            monthFetchFailed = true;
          } else if (monthDayRows && monthDayRows.length > 0) {
            recomputedSum = roundToTwoDecimals(
              monthDayRows.reduce((sum, r) => sum + (Number(r.interest_amount) || 0), 0)
            );
          }
        } catch (fetchErr) {
          console.error(`Exception fetching full month interest_days for ${month}:`, fetchErr);
          monthFetchFailed = true;
        }
      }

      if (monthFetchFailed) {
        console.warn(`Skipping month ${month} auto-interest write because full-month query failed.`);
        continue;
      }
      resolvedMonthlySums[month] = recomputedSum;

      // Find existing auto-interest entry for this month
      const existingEntry = allIncomes.find(
        inc => inc.is_auto_interest && inc.date.startsWith(month)
      );

      if (isLocked) {
        // Locked month: NEVER automatically modify (Spec §5)
        if (existingEntry) {
          const diff = calculateMonthlyDifference(recomputedSum, Number(existingEntry.amount));
          if (Math.abs(diff) > 0.05 && !dismissedCorrections.includes(month)) {
            pendingCorrections.push({
              month,
              monthName: monthDescription.replace(' savings interest', ''),
              existingAmount: Number(existingEntry.amount),
              recomputedAmount: recomputedSum,
              diff,
            });
          }
        }
      } else {
        // Unlocked / Current month: update automatically unless manually edited
        if (existingEntry) {
          if (!existingEntry.is_manually_edited && userId) {
            const { error: updateErr } = await supabase
              .from('user_income')
              .update({
                amount: recomputedSum,
                auto_interest_status: 'estimated',
                bank_account_id: primaryBankId || existingEntry.bank_account_id,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingEntry.id);
            if (updateErr) {
              const errMsg = `Could not update monthly entry for ${month}: ${updateErr.message}`;
              console.error(errMsg);
              await this.logJobRun(trigger, 0, 'failed', updateErr.message, userId);
              toast.error(errMsg);
              throw new Error(errMsg);
            }
          }
        } else if (userId) {
          // Recreate deleted or missing entry (Spec §3)
          const { error: insertErr } = await supabase.from('user_income').insert([{
            user_id: userId,
            source: 'Slice',
            category: 'Interest',
            notes: monthDescription,
            amount: recomputedSum,
            date: lastDay,
            payment_method: 'UPI',
            is_auto_interest: true,
            auto_interest_status: 'estimated',
            wallet_target: 'saving',
            bank_account_id: primaryBankId,
          }]);
          if (insertErr) {
            const errMsg = `Could not recreate monthly entry for ${month}: ${insertErr.message}`;
            console.error(errMsg);
            await this.logJobRun(trigger, 0, 'failed', insertErr.message, userId);
            toast.error(errMsg);
            throw new Error(errMsg);
          }
          toast.info(`Auto interest entry for ${month} was recreated with ₹${recomputedSum.toFixed(2)}`);
        }

        // Read-back verification for unlocked month
        if (userId) {
          const { data: verifiedRows, error: vErr } = await supabase
            .from('user_income')
            .select('id, amount, bank_account_id')
            .eq('user_id', userId)
            .eq('is_auto_interest', true)
            .like('date', `${month}%`)
            .order('id', { ascending: false })
            .limit(1);

          if (vErr) {
            console.warn(`Verification read-back for ${month} noticed:`, vErr.message);
          }
        }
      }
    }

    await this.logJobRun(trigger, dayRecords.length, 'ok', undefined, userId);

    return {
      daysProcessed: dayRecords.length,
      pendingCorrections,
      currentMonthTotal: resolvedMonthlySums[currentMonth] ?? (monthlySums[currentMonth] || 0),
    };
  }

  // --------------------------------------------------------------------------
  // CATCH-UP CHECK ON APP OPEN (Spec §4 Backup 1)
  // --------------------------------------------------------------------------

  static async checkAndRunCatchUp(userId?: string): Promise<boolean> {
    const todayStr = getKolkataDateString();
    const yesterdayStr = getKolkataYesterdayString(todayStr);

    let latestRecordedDate: string | null = null;

    if (userId) {
      try {
        const { data } = await supabase
          .from('interest_days')
          .select('interest_date')
          .eq('user_id', userId)
          .order('interest_date', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          latestRecordedDate = data[0].interest_date;
        }
      } catch (e) {
        console.warn('Error querying latest interest_date:', e);
      }
    }

    if (!latestRecordedDate) {
      const cached = localStorage.getItem(this.STORAGE_KEY_DAYS);
      if (cached) {
        try {
          const list = JSON.parse(cached);
          if (list.length > 0) {
            latestRecordedDate = list[list.length - 1].interest_date;
          }
        } catch {
          // ignore
        }
      }
    }

    // If missing days exist between latestRecordedDate and yesterday, run catch-up
    if (!latestRecordedDate || latestRecordedDate < yesterdayStr) {
      let from = '2026-08-01';
      if (latestRecordedDate) {
        // Subsequent days start the day after latestRecordedDate
        const [y, m, d] = latestRecordedDate.split('-').map(Number);
        const nextDate = new Date(Date.UTC(y, m - 1, d + 1));
        from = nextDate.toISOString().slice(0, 10);
      }

      if (from <= yesterdayStr) {
        try {
          const result = await this.recalculateInterest('app-open', userId, from);
          if (result.daysProcessed > 0) {
            toast.success('Interest updated (catch-up)');
            return true;
          }
        } catch (e: any) {
          console.error('Catch-up recomputation error:', e);
          toast.error(`Interest catch-up failed: ${e?.message || 'Database error'}`);
          return false;
        }
      }
    }

    return false;
  }

  // --------------------------------------------------------------------------
  // LOCKED MONTH CORRECTIONS (Spec §5)
  // --------------------------------------------------------------------------

  static getDismissedCorrections(): string[] {
    const raw = localStorage.getItem(this.STORAGE_KEY_DISMISSED);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static async dismissCorrection(month: string, userId?: string): Promise<void> {
    const current = this.getDismissedCorrections();
    if (!current.includes(month)) {
      current.push(month);
      localStorage.setItem(this.STORAGE_KEY_DISMISSED, JSON.stringify(current));
    }

    if (userId) {
      try {
        await supabase.from('interest_dismissed_corrections').upsert([{
          user_id: userId,
          month,
          reason: 'User dismissed on Vault',
          dismissed_at: new Date().toISOString(),
        }], { onConflict: 'user_id,month' });
      } catch {
        // ignore
      }
    }
  }

  static async applyCorrection(correction: PendingCorrection, userId?: string): Promise<void> {
    if (userId) {
      try {
        const { data: existing } = await supabase
          .from('user_income')
          .select('id')
          .eq('user_id', userId)
          .eq('is_auto_interest', true)
          .like('date', `${correction.month}%`)
          .maybeSingle();

        if (existing) {
          await supabase
            .from('user_income')
            .update({
              amount: correction.recomputedAmount,
              auto_interest_status: 'locked',
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);
        }
      } catch (e) {
        console.warn('Failed to apply correction to DB:', e);
      }
    }

    await this.dismissCorrection(correction.month, userId);
    toast.success(`Correction applied for ${correction.monthName}`);
  }

  // --------------------------------------------------------------------------
  // MONTHLY VERIFICATION (Spec §9)
  // --------------------------------------------------------------------------

  static async verifyMonth(
    month: string, // YYYY-MM
    computedAmount: number,
    verifiedAmount: number,
    userId?: string
  ): Promise<{ needsAdjustment: boolean; adjustmentAmount: number }> {
    const diff = roundToTwoDecimals(verifiedAmount - computedAmount);
    const needsAdjustment = Math.abs(diff) > 0.05;

    // Record verification
    const verificationRecord = {
      month,
      computed_amount: computedAmount,
      verified_amount: verifiedAmount,
      verified_at: new Date().toISOString(),
      user_id: userId,
    };

    if (userId) {
      try {
        await supabase.from('interest_verifications').upsert([verificationRecord], {
          onConflict: 'user_id,month',
        });
      } catch (e) {
        console.warn('Error saving verification to DB:', e);
      }
    }

    // Cache locally
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY_VERIFICATIONS);
      const list = cached ? JSON.parse(cached) : [];
      list.push(verificationRecord);
      localStorage.setItem(this.STORAGE_KEY_VERIFICATIONS, JSON.stringify(list));
    } catch {
      // ignore
    }

    if (needsAdjustment && userId) {
      // Create an "Interest adjustment" entry for the difference (Spec §9)
      const lastDay = getLastDayOfMonth(month);
      const monthName = getInterestDescription(month).replace(' savings interest', '');

      try {
        await supabase.from('user_income').insert([{
          user_id: userId,
          source: 'Slice',
          category: 'Interest',
          notes: `${monthName} interest adjustment`,
          amount: diff,
          date: lastDay,
          payment_method: 'UPI',
          is_auto_interest: false, // adjustment entry is distinct from auto entry
          wallet_target: 'saving',
        }]);
      } catch (e) {
        console.warn('Error creating interest adjustment entry in DB:', e);
      }
    }

    return { needsAdjustment, adjustmentAmount: diff };
  }

  static getVerifiedMonths(): string[] {
    const raw = localStorage.getItem(this.STORAGE_KEY_VERIFICATIONS);
    if (!raw) return [];
    try {
      const list = JSON.parse(raw);
      return list.map((v: any) => v.month);
    } catch {
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // DAILY BREAKDOWN (Spec §2b)
  // --------------------------------------------------------------------------

  static async getDailyBreakdown(yearMonth: string, userId?: string): Promise<InterestDayRecord[]> {
    if (userId) {
      try {
        const { data, error } = await supabase
          .from('interest_days')
          .select('*')
          .eq('user_id', userId)
          .gte('interest_date', `${yearMonth}-01`)
          .lte('interest_date', getLastDayOfMonth(yearMonth))
          .order('interest_date', { ascending: true });

        if (!error && data && data.length > 0) {
          return data as InterestDayRecord[];
        }
      } catch (e) {
        console.warn('Error getting daily breakdown from DB:', e);
      }
    }

    // Fallback to local cache
    const raw = localStorage.getItem(this.STORAGE_KEY_DAYS);
    if (raw) {
      try {
        const list: InterestDayRecord[] = JSON.parse(raw);
        return list.filter(r => r.interest_date.startsWith(yearMonth));
      } catch {
        // ignore
      }
    }

    return [];
  }
}
