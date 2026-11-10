import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Percent, RefreshCw, Plus, Clock, CheckCircle2, AlertCircle, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { useInterest } from '@/hooks/useInterest';
import { getKolkataDateString } from '@/utils/interestEngine';
import { toast } from 'sonner';

export const InterestSettingsSection: React.FC = () => {
  const {
    rates,
    lastJobRun,
    reconciliationReport,
    isRecalculating,
    recalculateNow,
    addNewRate,
  } = useInterest();

  const [isAddRateOpen, setIsAddRateOpen] = useState(false);
  const [newRatePercent, setNewRatePercent] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(getKolkataDateString());
  const [isSubmittingRate, setIsSubmittingRate] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const currentRate = rates.length > 0 ? rates[0] : null;

  const handleAddRateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateVal = parseFloat(newRatePercent);
    if (isNaN(rateVal) || rateVal <= 0) {
      toast.error('Please enter a valid rate percentage');
      return;
    }
    if (!effectiveDate) {
      toast.error('Please choose an effective-from date');
      return;
    }

    setIsSubmittingRate(true);
    try {
      const success = await addNewRate(rateVal, effectiveDate);
      if (success) {
        setIsAddRateOpen(false);
        setNewRatePercent('');
      }
    } finally {
      setIsSubmittingRate(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Percent className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Savings Interest System</h2>
            <p className="text-sm text-muted-foreground">
              Automated daily interest engine for Slice Small Finance Bank
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => recalculateNow()}
          disabled={isRecalculating}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
          {isRecalculating ? 'Recalculating...' : 'Recalculate interest now'}
        </Button>
      </div>

      {/* Job Status Banner (Spec §2c & §4) */}
      <div className="p-4 rounded-lg border bg-muted/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>
            <strong>Interest job:</strong>{' '}
            {lastJobRun?.lastRunAt ? (
              <>
                last run {new Date(lastJobRun.lastRunAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} (IST) —{' '}
                {lastJobRun.status === 'ok' ? (
                  <span className="text-green-600 font-semibold inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 inline" /> OK
                  </span>
                ) : (
                  <span className="text-red-600 font-semibold inline-flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 inline" /> Failed
                  </span>
                )}
              </>
            ) : (
              'Not run yet'
            )}
            , next run tonight 00:30 IST
          </span>
        </div>

        {reconciliationReport && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsReportOpen(true)}
            className={`text-xs h-7 gap-1 ${
              reconciliationReport.status === 'skipped'
                ? 'text-amber-700 dark:text-amber-400 font-medium'
                : 'text-primary'
            }`}
          >
            {reconciliationReport.status === 'skipped' ? (
              <AlertTriangle className="h-3.5 w-3.5" />
            ) : (
              <FileText className="h-3.5 w-3.5" />
            )}
            {reconciliationReport.status === 'skipped'
              ? 'View Reconciliation Audit (Skipped)'
              : 'View Wallet Reconciliation Audit'}
          </Button>
        )}
      </div>

      {/* Warning card if automatic reconciliation was skipped */}
      {reconciliationReport?.status === 'skipped' && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-lg flex items-start justify-between gap-3 text-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Automatic Reconciliation Skipped
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Wallet balances have changed since 10 Nov 2026. Automatic rebalance was skipped to protect your current funds. Wallets need a manual check.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsReportOpen(true)}
            className="text-xs h-7 border-amber-300 dark:border-amber-700 shrink-0 text-amber-900 dark:text-amber-200"
          >
            View Details
          </Button>
        </div>
      )}

      {/* Current Rate & History */}
      <div className="border rounded-lg p-4 space-y-4 bg-card">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Current Effective Rate
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-foreground">
                {currentRate?.annual_rate_percent ?? 5.5}%
              </span>
              <span className="text-xs text-muted-foreground">
                per annum (effective from {currentRate?.effective_from_date ?? '2026-10-08'})
              </span>
            </div>
          </div>

          <Dialog open={isAddRateOpen} onOpenChange={setIsAddRateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                Add New Rate
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Interest Rate</DialogTitle>
                <DialogDescription>
                  Adding a rate NEVER changes past days — only days on or after its effective date will use it.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddRateSubmit} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="rateInput">Annual Rate Percent (%)</Label>
                  <Input
                    id="rateInput"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 5.50"
                    value={newRatePercent}
                    onChange={(e) => setNewRatePercent(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="effectiveDateInput">Effective From Date</Label>
                  <Input
                    id="effectiveDateInput"
                    type="date"
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Historical interest up to {effectiveDate} remains unchanged.
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddRateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmittingRate}>
                    {isSubmittingRate ? 'Saving...' : 'Add Rate'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Rate History Table */}
        <div className="border rounded-md mt-4 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Annual Rate</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map((r, idx) => (
                <TableRow key={`${r.effective_from_date}-${r.annual_rate_percent}`}>
                  <TableCell className="font-medium">{r.account || 'Slice'}</TableCell>
                  <TableCell className="font-semibold text-foreground">
                    {r.annual_rate_percent}% p.a.
                  </TableCell>
                  <TableCell>{r.effective_from_date}</TableCell>
                  <TableCell className="text-right">
                    {idx === 0 ? (
                      <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Historical</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Reconciliation Dialog */}
      <Dialog open={isReportOpen} onOpenChange={setIsReportOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reconciliationReport?.status === 'skipped' ? (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  Wallet Reconciliation Audit (Skipped)
                </>
              ) : (
                <>
                  <FileText className="h-5 w-5 text-primary" />
                  Wallet Reconciliation Report
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {reconciliationReport?.status === 'skipped'
                ? 'Automatic rebalance was skipped because current balances differ from the 10 Nov 2026 pre-state.'
                : 'Audit log of ₹998.18 wallet rebalance per user order (Spec §6)'}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-md font-mono text-xs overflow-y-auto space-y-1.5 flex-1">
            {reconciliationReport?.lines.map((line, idx) => (
              <div key={idx} className={line.startsWith('---') ? 'font-bold text-foreground' : 'text-muted-foreground'}>
                {line}
              </div>
            ))}
          </div>
          <div className="pt-2 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsReportOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default InterestSettingsSection;
