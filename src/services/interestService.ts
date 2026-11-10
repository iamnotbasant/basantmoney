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

    // 1. RECONCILIATION (Spec §6)
    // Needs: -₹598.91 -> 0
    // Wants: -₹399.27 -> 0
    // Saving / Main: +₹998.18 -> ₹11,130.05
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

    // 3. BACKFILL & NOVEMBER ENTRY CREATION
    // Calculate November interest up to 10 Nov 2026
    const rates = await this.getInterestRates('Slice');
    const novDates = getDateRange('2026-11-01', '2026-11-10');
    const novBalances = novDates.map(date => ({ date, balance: 11130.05 }));
    const novRecords = novDates.map(date => {
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
    for (const record of novRecords) {
      try {
        await supabase.from('interest_days').upsert([record], {
          onConflict: 'user_id,interest_date,account',
        });
      } catch {
        // ignore
      }
    }

    // Create or update November 2026 entry
    const novemberTotal = 16.80; // 10 days * 1.68
    if (userId) {
      try {
        const { data: existingNov } = await supabase
          .from('user_income')
          .select('id, amount, is_manually_edited')
          .eq('user_id', userId)
          .eq('is_auto_interest', true)
          .like('date', '2026-11%')
          .maybeSingle();

        if (!existingNov) {
          await supabase.from('user_income').insert([{
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
          }]);
        } else if (!existingNov.is_manually_edited) {
          await supabase.from('user_income').update({
            amount: novemberTotal,
            auto_interest_status: 'estimated',
          }).eq('id', existingNov.id);
        }
      } catch (e) {
        console.warn('Could not persist November entry to Supabase:', e);
      }
    }

    localStorage.setItem(this.STORAGE_KEY_FIRST_RUN_DONE, 'true');

    return {
      reconciliationReport,
      adoptedEntries,
      novemberAmount: novemberTotal,
      warnings,
    };
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

    if (userId) {
      try {
        const [swRes, wRes] = await Promise.all([
          supabase.from('user_subwallets').select('*').eq('user_id', userId),
          supabase.from('user_wallets').select('*').eq('user_id', userId),
        ]);
        dbSubwallets = swRes.data || [];
        dbWallets = wRes.data || [];
      } catch (e) {
        console.warn('Could not read user wallets/subwallets from Supabase:', e);
      }
    }

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

    // If either DB or local matches the expected pre-reconciliation state, use the matching one
    if (matchesPreReconciliationState(dbExtracted)) {
      return dbExtracted;
    }
    if (matchesPreReconciliationState(localExtracted)) {
      return localExtracted;
    }

    // If neither matches, prefer DB if user is authenticated and DB has data, otherwise local
    if (userId && (dbSubwallets.length > 0 || dbWallets.length > 0) && dbExtracted.total > 0) {
      return dbExtracted;
    }

    return localExtracted;
  }

  /**
   * Execute ₹998.18 wallet reconciliation per user order (Spec §6):
   * Guarded: Reads current balances first. Applies move ONLY if they match
   * the expected pre-reconciliation state within ₹0.05:
   * Main ≈ ₹10,131.88, Needs ≈ ₹598.91, Wants ≈ ₹399.27 (Total ≈ ₹11,130.05).
   *
   * If balances do NOT match (e.g. user opens app after 10 Nov and has new
   * transactions), reconciliation is safely SKIPPED without modifying any balance,
   * a skipped report is persisted, and the user is warned.
   */
  static async executeReconciliation(userId?: string): Promise<ReconciliationReport> {
    const lines: string[] = [];
    const timestamp = new Date().toISOString();

    const currentBalances = await this.getCurrentWalletBalances(userId);
    const isMatch = matchesPreReconciliationState(currentBalances, 0.05);

    if (!isMatch) {
      // DATA SAFETY GUARD: DO NOT TOUCH ANY BALANCE
      lines.push('--- RECONCILIATION AUDIT LOG (SKIPPED) ---');
      lines.push('Status: skipped — balances have changed since 10 Nov');
      lines.push('Data Safety Guard: Automatic reconciliation skipped to protect user funds.');
      lines.push('Expected pre-reconciliation state (10 Nov 2026):');
      lines.push(`  Saving / Main: ₹${EXPECTED_PRE_RECONCILIATION.savingMain.toFixed(2)}`);
      lines.push(`  Needs:         ₹${EXPECTED_PRE_RECONCILIATION.needs.toFixed(2)}`);
      lines.push(`  Wants:         ₹${EXPECTED_PRE_RECONCILIATION.wants.toFixed(2)}`);
      lines.push(`  Total:         ₹${EXPECTED_PRE_RECONCILIATION.total.toFixed(2)}`);
      lines.push('Actual current balances detected:');
      lines.push(`  Saving / Main: ₹${currentBalances.savingMain.toFixed(2)}`);
      lines.push(`  Needs:         ₹${currentBalances.needs.toFixed(2)}`);
      lines.push(`  Wants:         ₹${currentBalances.wants.toFixed(2)}`);
      lines.push(`  Total:         ₹${currentBalances.total.toFixed(2)}`);
      lines.push('Action: No balances were modified.');
      lines.push('Recommendation: Please verify wallet allocations manually in Wallets settings.');

      const skippedReport: ReconciliationReport = {
        timestamp,
        status: 'skipped',
        reason: 'skipped — balances have changed since 10 Nov',
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

    // MATCH CONFIRMED: Proceed with reconciliation moves
    lines.push('--- RECONCILIATION AUDIT LOG (10 Nov 2026) ---');
    lines.push('Status: applied');
    lines.push('User Order: Synchronize virtual wallets to Slice statement balance ₹11,130.05');
    lines.push(`Prior state: Main ₹${currentBalances.savingMain.toFixed(2)}, Needs ₹${currentBalances.needs.toFixed(2)}, Wants ₹${currentBalances.wants.toFixed(2)} (Total ₹${currentBalances.total.toFixed(2)})`);
    lines.push(`Moving Needs ₹${currentBalances.needs.toFixed(2)} back to Saving / sub-wallet "Main"`);
    lines.push(`Moving Wants ₹${currentBalances.wants.toFixed(2)} back to Saving / sub-wallet "Main"`);
    lines.push('Total moved to Saving/Main: ₹998.18');
    lines.push('Resulting balances: Saving/Main = ₹11,130.05, Needs = ₹0.00, Wants = ₹0.00');
    lines.push('Total Slice balance: ₹11,130.05 (100% Saving / Main)');

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
          return { ...sw, name: 'Main', balance: 11130.05 };
        }
        return sw;
      });

      if (!foundMain) {
        subWallets.unshift({
          id: 1,
          name: 'Main',
          balance: 11130.05,
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
        { id: 1, name: 'Saving Wallet', balance: 11130.05, type: 'saving', color: 'green' },
        { id: 2, name: 'Needs Wallet', balance: 0, type: 'needs', color: 'blue' },
        { id: 3, name: 'Wants Wallet', balance: 0, type: 'wants', color: 'purple' },
      ];

      wallets = wallets.map((w: any) => {
        if (w.type === 'saving') return { ...w, balance: 11130.05 };
        if (w.type === 'needs') return { ...w, balance: 0 };
        if (w.type === 'wants') return { ...w, balance: 0 };
        return w;
      });

      localStorage.setItem(walletsKey, JSON.stringify(wallets));
      localStorage.setItem('wallets', JSON.stringify(wallets));
    } catch (e) {
      console.warn('Error updating localStorage wallets in reconciliation:', e);
    }

    // 2. Update Supabase wallets and subwallets if connected
    if (userId) {
      try {
        // Zero out needs subwallets
        await supabase
          .from('user_subwallets')
          .update({ balance: 0, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('parent_wallet_type', 'needs');

        // Zero out wants subwallets
        await supabase
          .from('user_subwallets')
          .update({ balance: 0, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('parent_wallet_type', 'wants');

        // Check if subwallet "Main" exists under saving
        const { data: savingSubs } = await supabase
          .from('user_subwallets')
          .select('id, name')
          .eq('user_id', userId)
          .eq('parent_wallet_type', 'saving');

        const mainSub = (savingSubs || []).find(s => s.name.toLowerCase() === 'main');
        if (mainSub) {
          await supabase
            .from('user_subwallets')
            .update({ balance: 11130.05, updated_at: new Date().toISOString() })
            .eq('id', mainSub.id)
            .eq('user_id', userId);
        } else if (savingSubs && savingSubs.length > 0) {
          await supabase
            .from('user_subwallets')
            .update({ name: 'Main', balance: 11130.05, updated_at: new Date().toISOString() })
            .eq('id', savingSubs[0].id)
            .eq('user_id', userId);
        } else {
          // Create Main subwallet
          await supabase.from('user_subwallets').insert([{
            user_id: userId,
            name: 'Main',
            balance: 11130.05,
            parent_wallet_type: 'saving',
            allocation_percentage: 100,
            color: 'green',
            order_position: 1,
          }]);
        }

        // Update user_wallets table
        await supabase
          .from('user_wallets')
          .update({ balance: 11130.05, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('type', 'saving');

        await supabase
          .from('user_wallets')
          .update({ balance: 0, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .in('type', ['needs', 'wants']);
      } catch (e) {
        console.warn('Could not update Supabase wallets during reconciliation:', e);
      }
    }

    const report: ReconciliationReport = {
      timestamp,
      status: 'applied',
      lines,
      savingMoved: 998.18,
      needsMoved: 598.91,
      wantsMoved: 399.27,
      currentBalances,
      resultingBalances: {
        savingMain: 11130.05,
        needs: 0,
        wants: 0,
        total: 11130.05,
      },
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

    if (userId) {
      try {
        const [incRes, expRes] = await Promise.all([
          supabase.from('user_income').select('*').eq('user_id', userId).order('date', { ascending: true }),
          supabase.from('user_expenses').select('*').eq('user_id', userId).order('date', { ascending: true }),
        ]);
        allIncomes = incRes.data || [];
        allExpenses = expRes.data || [];
      } catch (e) {
        console.warn('Failed to fetch transactions from Supabase for recalculation:', e);
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

    // Persist day records to Supabase interest_days (and local cache)
    if (userId && dayRecords.length > 0) {
      try {
        await supabase.from('interest_days').upsert(dayRecords, {
          onConflict: 'user_id,interest_date,account',
        });
      } catch (e) {
        console.warn('Could not upsert interest_days into Supabase:', e);
      }
    }
    localStorage.setItem(this.STORAGE_KEY_DAYS, JSON.stringify(dayRecords));

    // Aggregate by month
    const monthlySums: Record<string, number> = {};
    for (const r of dayRecords) {
      const m = r.interest_date.slice(0, 7);
      monthlySums[m] = roundToTwoDecimals((monthlySums[m] || 0) + r.interest_amount);
    }

    const pendingCorrections: PendingCorrection[] = [];
    const dismissedCorrections = this.getDismissedCorrections();

    // Check each month's entry
    for (const [month, recomputedSum] of Object.entries(monthlySums)) {
      const isLocked = isMonthLocked(month, todayStr);
      const monthDescription = getInterestDescription(month);
      const lastDay = getLastDayOfMonth(month);

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
            try {
              await supabase
                .from('user_income')
                .update({
                  amount: recomputedSum,
                  auto_interest_status: 'estimated',
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingEntry.id);
            } catch (e) {
              console.warn(`Could not update monthly entry for ${month}:`, e);
            }
          }
        } else if (userId) {
          // Recreate deleted or missing entry (Spec §3)
          try {
            await supabase.from('user_income').insert([{
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
            }]);
            toast.info(`Auto interest entry for ${month} was recreated with ₹${recomputedSum.toFixed(2)}`);
          } catch (e) {
            console.warn(`Could not recreate monthly entry for ${month}:`, e);
          }
        }
      }
    }

    await this.logJobRun(trigger, dayRecords.length, 'ok', undefined, userId);

    return {
      daysProcessed: dayRecords.length,
      pendingCorrections,
      currentMonthTotal: monthlySums[currentMonth] || 0,
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
        const result = await this.recalculateInterest('app-open', userId, from);
        if (result.daysProcessed > 0) {
          toast.success('Interest updated (catch-up)');
          return true;
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
          .lte('interest_date', `${yearMonth}-31`)
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
