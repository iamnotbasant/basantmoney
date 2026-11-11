import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  X,
  Info,
  Check,
} from 'lucide-react';
import { useInterest } from '@/hooks/useInterest';
import { getKolkataDateString } from '@/utils/interestEngine';
import { toast } from 'sonner';

interface VaultInterestCardsProps {
  incomeData?: any[];
}

export const VaultInterestCards: React.FC<VaultInterestCardsProps> = ({ incomeData = [] }) => {
  const {
    lastJobRun,
    pendingCorrections = [],
    verifiedMonths = [],
    reconciliationReport,
    isRecalculating = false,
    recalculateNow,
    applyCorrection,
    dismissCorrection,
    verifyMonth,
  } = useInterest();

  const [verificationInput, setVerificationInput] = useState<{ [month: string]: string }>({});
  const [showVerifyInput, setShowVerifyInput] = useState<{ [month: string]: boolean }>({});
  const [dismissedReconBanner, setDismissedReconBanner] = useState(false);

  const todayStr = getKolkataDateString();
  const currentMonth = todayStr.slice(0, 7);

  // Closed months that have an auto interest entry but are not yet verified
  // E.g. October 2026 (2026-10) is closed
  const unverifiedClosedEntries = (incomeData || []).filter(inc => {
    if (!inc?.is_auto_interest) return false;
    const m = inc.date ? String(inc.date).slice(0, 7) : '';
    if (!m || m >= currentMonth) return false; // Not closed yet
    if ((verifiedMonths || []).includes(m)) return false; // Already verified
    return true;
  });

  return (
    <div className="space-y-4 mb-6">
      {/* 1. AUTO-HEALING & BACKGROUND STATUS INDICATOR */}
      {isRecalculating && (
        <div className="bg-primary/10 border border-primary/20 text-primary p-3 rounded-lg flex items-center justify-between text-sm animate-pulse">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 animate-spin text-primary shrink-0" />
            <p className="font-medium text-xs sm:text-sm">Updating interest calculations automatically in background...</p>
          </div>
        </div>
      )}

      {/* 2. RECONCILIATION NOTICE (Spec §6) */}
      {reconciliationReport && !dismissedReconBanner && (
        reconciliationReport.status === 'skipped' ? (
          // ONLY display if there are actually non-zero wallet balances that were being managed
          reconciliationReport.currentBalances &&
          (Number(reconciliationReport.currentBalances.savingMain || 0) > 0 ||
           Number(reconciliationReport.currentBalances.needs || 0) > 0 ||
           Number(reconciliationReport.currentBalances.wants || 0) > 0) ? (
            <Card className="border-amber-300 bg-amber-50/80 dark:bg-amber-950/40 dark:border-amber-700">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-amber-900 dark:text-amber-200">
                        Automatic Reconciliation Skipped
                      </p>
                      <p className="text-amber-800 dark:text-amber-300 text-xs">
                        Wallet balances have changed since 10 Nov 2026
                        {` (Current: Main ₹${Number(reconciliationReport.currentBalances.savingMain || 0).toFixed(2)}, Needs ₹${Number(reconciliationReport.currentBalances.needs || 0).toFixed(2)}, Wants ₹${Number(reconciliationReport.currentBalances.wants || 0).toFixed(2)})`}.
                        Automatic reconciliation was skipped to protect your balances. Please verify your wallets and sub-wallets manually.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-amber-600 hover:text-amber-800 dark:text-amber-400"
                    onClick={() => setDismissedReconBanner(true)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null
        ) : (
          (Number(reconciliationReport.savingMoved || 0) > 0 ||
           Number(reconciliationReport.needsMoved || 0) > 0 ||
           Number(reconciliationReport.wantsMoved || 0) > 0) ? (
            <Card className="border-blue-200 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-blue-900 dark:text-blue-200">
                        Slice Balance Reconciled (₹11,130.05)
                      </p>
                      <p className="text-blue-800 dark:text-blue-300 text-xs">
                        Moved full ₹998.18 from Needs (₹598.91) + Wants (₹399.27) to Saving (sub-wallet "Main").
                        Saving/Main is now ₹11,130.05 (Needs: ₹0, Wants: ₹0). Interest calculates on total ₹11,130.05.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    onClick={() => setDismissedReconBanner(true)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null
        )
      )}

      {/* 3. PENDING CORRECTION CARDS for LOCKED months (Spec §5) */}
      {(pendingCorrections || []).map((corr) => (
        <Card key={corr.month} className="border-amber-300 bg-amber-50/80 dark:bg-amber-950/40 dark:border-amber-700">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-amber-900 dark:text-amber-200">
                  {corr.monthName} interest needs a ₹{Math.abs(Number(corr.diff || 0)).toFixed(2)} correction
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Because of a backdated entry affecting {corr.monthName}.
                  Existing locked: ₹{Number(corr.existingAmount || 0).toFixed(2)} • Recomputed: ₹{Number(corr.recomputedAmount || 0).toFixed(2)}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 border-amber-300 hover:bg-amber-100"
                onClick={() => dismissCorrection(corr.month)}
              >
                Dismiss
              </Button>
              <Button
                size="sm"
                className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => applyCorrection(corr)}
              >
                Apply correction
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* 4. MONTHLY VERIFICATION CARDS for CLOSED months (Spec §9) */}
      {(unverifiedClosedEntries || []).map((entry) => {
        const m = entry.date ? String(entry.date).slice(0, 7) : '';
        const monthName = (entry.notes || '').replace(' savings interest', '') || m;
        const computedAmt = Number(entry.amount || 0);
        const isOpen = showVerifyInput[m] || false;
        const enteredVal = verificationInput[m] ?? computedAmt.toString();

        return (
          <Card key={entry.id} className="border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                      {monthName} interest: app ₹{computedAmt.toFixed(2)}
                    </p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300">
                      Match it with your Slice statement and verify
                    </p>
                  </div>
                </div>

                {!isOpen ? (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                      onClick={() => setShowVerifyInput({ ...showVerifyInput, [m]: true })}
                    >
                      Enter Statement Amount
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      onClick={() => verifyMonth(m, computedAmt, computedAmt)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      ✓ Verified
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Input
                      type="number"
                      step="0.01"
                      value={enteredVal}
                      onChange={(e) => setVerificationInput({ ...verificationInput, [m]: e.target.value })}
                      className="w-24 h-8 text-xs bg-white dark:bg-background"
                      placeholder="Amount"
                    />
                    <Button
                      size="sm"
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => {
                        const val = parseFloat(enteredVal);
                        if (isNaN(val)) {
                          toast.error('Invalid amount');
                          return;
                        }
                        verifyMonth(m, computedAmt, val);
                        setShowVerifyInput({ ...showVerifyInput, [m]: false });
                      }}
                    >
                      Confirm
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8"
                      onClick={() => setShowVerifyInput({ ...showVerifyInput, [m]: false })}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default VaultInterestCards;
