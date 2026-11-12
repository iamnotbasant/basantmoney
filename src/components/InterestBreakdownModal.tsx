import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, TrendingUp } from 'lucide-react';
import { InterestDayRecord, getInterestDescription } from '@/utils/interestEngine';
import { InterestService } from '@/services/interestService';

interface InterestBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearMonth: string | null; // e.g. "2026-11"
  userId?: string;
  entryTotal?: number;
  /** Interest entry context — shown in the summary; the Transactions rows no
   *  longer show these inline, so the modal is the only place they appear. */
  source?: string;
  status?: string; // 'locked' | 'estimated' | 'manually_edited'
  isManuallyEdited?: boolean;
  onResumeAutoUpdate?: () => void;
}

export const InterestBreakdownModal: React.FC<InterestBreakdownModalProps> = ({
  isOpen,
  onClose,
  yearMonth,
  userId,
  entryTotal,
  source,
  status,
  isManuallyEdited,
  onResumeAutoUpdate,
}) => {
  const [records, setRecords] = useState<InterestDayRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && yearMonth) {
      setLoading(true);
      InterestService.getDailyBreakdown(yearMonth, userId)
        .then((data) => {
          setRecords(data);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, yearMonth, userId]);

  if (!yearMonth) return null;

  const monthDescription = getInterestDescription(yearMonth);
  const totalSum = records.reduce((sum, r) => sum + Number(r.interest_amount), 0);
  const statusLabel =
    status === 'manually_edited' ? 'Manually edited' : status === 'locked' ? 'Auto • Locked' : 'Auto • Estimated';
  const statusClasses =
    status === 'manually_edited'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
      : status === 'locked'
      ? 'bg-slate-200/70 text-slate-700 dark:bg-slate-800/70 dark:text-slate-200'
      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200';

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-emerald-400" />
              Daily Interest Breakdown
            </DialogTitle>
          </div>
          <DialogDescription>
            {monthDescription} line-by-line audit matching your Slice statement
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2 px-3 bg-muted/40 rounded-lg text-sm">
          <div>
            <span className="text-muted-foreground">Source: </span>
            <span className="font-semibold">{source ?? 'Slice'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Status: </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClasses}`}>
              {statusLabel}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Month: </span>
            <span className="font-semibold">{yearMonth}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total Accrued: </span>
            <span className="font-bold text-green-600 dark:text-emerald-400">₹{(entryTotal ?? totalSum).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Days: </span>
            <span className="font-semibold">{records.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-2 border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading daily records...
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No daily interest records found for {yearMonth}.</p>
              <p className="text-xs mt-1">Tap 'Recalculate interest now' in Settings to generate records.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Closing Balance</TableHead>
                  <TableHead className="text-right">Rate (% p.a.)</TableHead>
                  <TableHead className="text-right">Daily Interest</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.interest_date}>
                    <TableCell className="font-medium font-mono text-xs sm:text-sm">
                      {r.interest_date}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Number(r.closing_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline" className="text-xs">
                        {r.annual_rate_percent}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                      +₹{Number(r.interest_amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="flex justify-between items-center pt-2">
          <p className="text-xs text-muted-foreground">
            Formula: ROUND(Closing Balance × Rate ÷ 100 ÷ 365, 2)
          </p>
          <div className="flex gap-2">
            {isManuallyEdited && onResumeAutoUpdate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onResumeAutoUpdate}
                className="text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-500/10"
              >
                Resume auto-update
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default InterestBreakdownModal;
