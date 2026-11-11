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
}

export const InterestBreakdownModal: React.FC<InterestBreakdownModalProps> = ({
  isOpen,
  onClose,
  yearMonth,
  userId,
  entryTotal,
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

        <div className="flex items-center justify-between py-2 px-3 bg-muted/40 rounded-lg text-sm">
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
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default InterestBreakdownModal;
