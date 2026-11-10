import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  X,
  Info,
  Check,
} from 'lucide-react';
import { useInterest } from '@/hooks/useInterest';
import { getKolkataDateString } from '@/utils/interestEngine';
import { toast } from 'sonner';

interface VaultInterestCardsProps {
  incomeData: any[];
}

export const VaultInterestCards: React.FC<VaultInterestCardsProps> = ({ incomeData }) => {
  const {
    lastJobRun,
    pendingCorrections,
    verifiedMonths,
    reconciliationReport,
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
  const unverifiedClosedEntries = incomeData.filter(inc => {
    if (!inc.is_auto_interest) return false;
    const m = inc.date.slice(0, 7);
    if (m >= currentMonth) return false; // Not closed yet
    if (verifiedMonths.includes(m)) return false; // Already verified
    return true;
  });

  return (
    <div className="space-y-3.5 mb-6">
      {/* 1. CRITICAL FAILURE BANNER: last run > 36 hours (Spec §4) */}
      {lastJobRun?.isOverdue && (
        <div className="rounded-2xl bg-destructive text-destructive-foreground p-4 sm:p-5 shadow-[var(--elev-2)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border border-destructive/30">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white shrink-0">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm sm:text-base text-white">Daily interest update missed</p>
              <p className="text-xs text-white/80 mt-0.5">
                Last calculated run:{' '}
                {lastJobRun.lastRunAt ? new Date(lastJobRun.lastRunAt).toLocaleString('en-IN') : 'Never'}.
                Ledger auto-interest may be out of date.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="text-destructive font-semibold bg-white hover:bg-white/90 text-xs h-9 shrink-0 shadow-sm"
            onClick={() => recalculateNow()}
          >
            Recalculate Now
          </Button>
        </div>
      )}

      {/* 2. RECONCILIATION NOTICE (Spec §6) */}
      {reconciliationReport && !dismissedReconBanner && (
        reconciliationReport.status === 'skipped' ? (
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40 shadow-[var(--elev-1)]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-amber-900 dark:text-amber-200">
                      Bank Ledger Reconciliation Notice
                    </p>
                    <p className="text-amber-800/90 dark:text-amber-300/90 text-xs leading-relaxed">
                      Bank ledger records have updated.
                      {reconciliationReport.currentBalances
                        ? ` (Current balances: ₹${reconciliationReport.currentBalances.savingMain.toFixed(2)})`
                        : ''}
                      {' '}Automated adjustment was paused to safeguard your active ledger. Review your accounts manually if numbers differ.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-amber-700 hover:text-amber-900 dark:text-amber-300 hover:bg-amber-500/20 rounded-lg shrink-0"
                  onClick={() => setDismissedReconBanner(true)}
                  aria-label="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-sky-500/30 bg-sky-500/10 dark:bg-sky-950/40 shadow-[var(--elev-1)]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-sky-500/20 text-sky-700 dark:text-sky-400 shrink-0">
                    <Info className="h-4 w-4" />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-semibold text-sky-950 dark:text-sky-200">
                      Account Balance Reconciled
                    </p>
                    <p className="text-sky-850 dark:text-sky-300/90 text-xs leading-relaxed">
                      All balances are verified against active bank accounts. Daily savings interest continues accruing on the total balance automatically.
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-sky-700 hover:text-sky-900 dark:text-sky-300 hover:bg-sky-500/20 rounded-lg shrink-0"
                  onClick={() => setDismissedReconBanner(true)}
                  aria-label="Dismiss banner"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      )}

      {/* 3. PENDING CORRECTION CARDS for LOCKED months (Spec §5) */}
      {pendingCorrections.map((corr) => (
        <Card key={corr.month} className="rounded-2xl border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/40 shadow-[var(--elev-1)]">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-400 shrink-0">
                <AlertCircle className="h-4 w-4" />
              </div>
              <div className="text-sm">
                <p className="font-semibold text-amber-950 dark:text-amber-200">
                  {corr.monthName} interest needs a ₹{Math.abs(corr.diff).toFixed(2)} correction
                </p>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                  Backdated transaction changed {corr.monthName} totals.
                  Existing locked: ₹{corr.existingAmount.toFixed(2)} • Recomputed: ₹{corr.recomputedAmount.toFixed(2)}.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
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
      {unverifiedClosedEntries.map((entry) => {
        const m = entry.date.slice(0, 7);
        const monthName = (entry.notes || '').replace(' savings interest', '') || m;
        const computedAmt = Number(entry.amount);
        const isOpen = showVerifyInput[m] || false;
        const enteredVal = verificationInput[m] ?? computedAmt.toString();

        return (
          <Card key={entry.id} className="rounded-2xl border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-950/40 shadow-[var(--elev-1)]">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 shrink-0">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-950 dark:text-emerald-100">
                      {monthName} interest: ₹{computedAmt.toFixed(2)}
                    </p>
                    <p className="text-xs text-emerald-800/90 dark:text-emerald-300/90 mt-0.5">
                      Verify against your official bank statement
                    </p>
                  </div>
                </div>

                {!isOpen ? (
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-emerald-500/30 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-500/20"
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
                      <span>Verified</span>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Input
                      type="number"
                      step="0.01"
                      value={enteredVal}
                      onChange={(e) => setVerificationInput({ ...verificationInput, [m]: e.target.value })}
                      className="w-24 h-8 text-xs bg-background"
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
