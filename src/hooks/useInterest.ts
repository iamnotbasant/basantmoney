/**
 * React Hook for Auto Monthly Interest System
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  InterestService,
  ReconciliationReport,
  PendingCorrection,
  JobRunInfo,
} from '@/services/interestService';
import { InterestRate, InterestDayRecord, getKolkataDateString } from '@/utils/interestEngine';
import { toast } from 'sonner';

export const useInterest = () => {
  const { user } = useAuth();
  const [rates, setRates] = useState<InterestRate[]>([]);
  const [lastJobRun, setLastJobRun] = useState<JobRunInfo | null>(null);
  const [reconciliationReport, setReconciliationReport] = useState<ReconciliationReport | null>(null);
  const [pendingCorrections, setPendingCorrections] = useState<PendingCorrection[]>([]);
  const [verifiedMonths, setVerifiedMonths] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);

  const refreshData = useCallback(async () => {
    try {
      const [fetchedRates, runInfo] = await Promise.all([
        InterestService.getInterestRates('Slice'),
        InterestService.getLastJobRun(),
      ]);

      setRates(fetchedRates);
      setLastJobRun(runInfo);
      setReconciliationReport(InterestService.getReconciliationReport());
      setVerifiedMonths(InterestService.getVerifiedMonths());
    } catch (e) {
      console.warn('Error refreshing interest data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run on mount or user change: check first-run migration & catch-up
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      const hasRunFirstRun = localStorage.getItem('interest_first_run_completed');
      if (!hasRunFirstRun) {
        try {
          const result = await InterestService.runFirstRunMigration(user?.id);
          setReconciliationReport(result.reconciliationReport);
          console.log('Interest first run migration completed:', result);
        } catch (e) {
          console.warn('First run migration error:', e);
        }
      } else {
        // App-open catch up (Spec §4 Backup 1)
        try {
          await InterestService.checkAndRunCatchUp(user?.id);
        } catch (e) {
          console.warn('Catch-up check error:', e);
        }
      }

      await refreshData();
    };

    initialize();
  }, [user, refreshData]);

  const recalculateNow = async (fromDate?: string) => {
    setIsRecalculating(true);
    try {
      const result = await InterestService.recalculateInterest('manual', user?.id, fromDate);
      setPendingCorrections(result.pendingCorrections);
      await refreshData();
      toast.success(`Recalculated interest for ${result.daysProcessed} days`);
      return result;
    } catch (e: any) {
      console.error('Recalculation error:', e);
      toast.error('Failed to recalculate interest');
      throw e;
    } finally {
      setIsRecalculating(false);
    }
  };

  const addNewRate = async (percent: number, effectiveDate: string) => {
    try {
      await InterestService.addInterestRate(percent, effectiveDate, 'Slice');
      await refreshData();
      toast.success(`Rate ${percent}% effective from ${effectiveDate} added`);
      return true;
    } catch (e) {
      toast.error('Failed to add interest rate');
      return false;
    }
  };

  const handleApplyCorrection = async (correction: PendingCorrection) => {
    await InterestService.applyCorrection(correction, user?.id);
    setPendingCorrections(prev => prev.filter(c => c.month !== correction.month));
    await refreshData();
  };

  const handleDismissCorrection = async (month: string) => {
    await InterestService.dismissCorrection(month, user?.id);
    setPendingCorrections(prev => prev.filter(c => c.month !== month));
    toast.info('Correction dismissed');
  };

  const handleVerifyMonth = async (month: string, computed: number, verified: number) => {
    const res = await InterestService.verifyMonth(month, computed, verified, user?.id);
    setVerifiedMonths(prev => [...prev, month]);
    if (res.needsAdjustment) {
      toast.warning(
        `Interest adjustment entry created for ₹${res.adjustmentAmount.toFixed(2)}. Rate may have changed — check Interest rate settings.`
      );
    } else {
      toast.success(`${month} interest verified successfully`);
    }
    await refreshData();
    return res;
  };

  const getDailyBreakdown = async (yearMonth: string): Promise<InterestDayRecord[]> => {
    return InterestService.getDailyBreakdown(yearMonth, user?.id);
  };

  return {
    rates,
    lastJobRun,
    reconciliationReport,
    pendingCorrections,
    verifiedMonths,
    loading,
    isRecalculating,
    recalculateNow,
    addNewRate,
    applyCorrection: handleApplyCorrection,
    dismissCorrection: handleDismissCorrection,
    verifyMonth: handleVerifyMonth,
    getDailyBreakdown,
    refreshData,
  };
};
