import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit3, Trash2, History, DollarSign, CheckCircle, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { UdaarEntry, PaymentHistory } from '@/types/finance';
import { PaymentService } from '@/utils/paymentService';
import PartialPaymentDialog from './PartialPaymentDialog';
import PaymentHistoryDialog from './PaymentHistoryDialog';

interface PersonDetailsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedPerson: { name: string; entries: UdaarEntry[] } | null;
  paymentHistory: PaymentHistory[];
  handleEditUdaar: (udaar: UdaarEntry) => void;
  handleMarkAsPaid: (id: string) => void;
  handleDeleteUdaar: (id: string) => void;
  handlePartialPayment: (transactionId: string, partialAmount: number, description: string) => void;
  handleSettlePerson: (personName: string) => void;
  formatDate: (dateString: string) => string;
}

const PersonDetailsDialog: React.FC<PersonDetailsDialogProps> = ({
  isOpen,
  onOpenChange,
  selectedPerson,
  paymentHistory,
  handleEditUdaar,
  handleMarkAsPaid,
  handleDeleteUdaar,
  handlePartialPayment,
  handleSettlePerson,
  formatDate,
}) => {
  const [isPartialPaymentOpen, setIsPartialPaymentOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<UdaarEntry | null>(null);

  const handlePartialPaymentClick = (transaction: UdaarEntry) => {
    setSelectedTransaction(transaction);
    setIsPartialPaymentOpen(true);
  };

  const personHistory = selectedPerson ? PaymentService.getPersonHistory(selectedPerson.name, paymentHistory) : [];
  const balance = selectedPerson ? PaymentService.calculatePersonBalance(selectedPerson.entries) : null;

  const initials = selectedPerson
    ? selectedPerson.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
              {initials || 'U'}
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-foreground">
                {selectedPerson?.name}
              </div>
              <div className="text-xs text-muted-foreground font-normal">
                Personal ledger and settlement history
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {selectedPerson && balance && (
          <div className="space-y-5 pt-2">
            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  You'll Get
                </div>
                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  ₹{balance.pendingReceivable.toLocaleString('en-IN')}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5">
                <div className="text-xs font-medium text-rose-700 dark:text-rose-300 flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  You'll Give
                </div>
                <div className="text-xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
                  ₹{balance.pendingPayable.toLocaleString('en-IN')}
                </div>
              </div>

              <div
                className={`p-3.5 rounded-xl border ${
                  balance.netBalance > 0
                    ? 'border-emerald-500/30 bg-emerald-500/10'
                    : balance.netBalance < 0
                    ? 'border-rose-500/30 bg-rose-500/10'
                    : 'border-border/60 bg-muted/40'
                }`}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  Net Balance
                </div>
                <div
                  className={`text-xl font-extrabold mt-1 ${
                    balance.netBalance > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : balance.netBalance < 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-foreground'
                  }`}
                >
                  {balance.netBalance > 0 ? '+' : balance.netBalance < 0 ? '-' : ''}₹{Math.abs(balance.netBalance).toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    {balance.netBalance > 0 ? '(get)' : balance.netBalance < 0 ? '(give)' : '(cleared)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Lifetime Stats & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs">
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>Lifetime Given: <strong className="text-foreground">₹{balance.totalGiven.toLocaleString('en-IN')}</strong></span>
                <span>•</span>
                <span>Lifetime Received: <strong className="text-foreground">₹{balance.totalReceived.toLocaleString('en-IN')}</strong></span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsHistoryOpen(true)}
                  className="h-8 rounded-lg text-xs gap-1.5"
                >
                  <History className="h-3.5 w-3.5" />
                  History ({personHistory.length})
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleSettlePerson(selectedPerson.name)}
                  className="h-8 rounded-lg text-xs gap-1.5"
                  disabled={balance.pendingReceivable === 0 && balance.pendingPayable === 0}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Settle All Dues
                </Button>
              </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">
                  Transaction Ledger ({selectedPerson.entries.length})
                </h4>
              </div>

              <div className="border border-border/70 rounded-xl overflow-hidden shadow-xs">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="text-xs font-semibold uppercase">Description</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">Date</TableHead>
                      <TableHead className="text-xs font-semibold uppercase">Status</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-right">Amount</TableHead>
                      <TableHead className="text-xs font-semibold uppercase text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPerson.entries
                      .slice()
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(entry => (
                        <TableRow key={entry.id} className="hover:bg-muted/30">
                          <TableCell className="text-sm font-medium">
                            {entry.description || '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(entry.date)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-xs capitalize font-medium px-2 py-0.5 rounded-full ${
                                entry.status === 'paid'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : entry.status === 'partially_paid'
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {entry.status.replace('_', ' ')}
                            </Badge>
                            {entry.originalAmount && entry.originalAmount !== entry.amount && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                Orig: ₹{entry.originalAmount.toLocaleString('en-IN')}
                              </div>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-bold text-sm ${
                              entry.type === 'gave'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            {entry.type === 'gave' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                onClick={() => {
                                  handleEditUdaar(entry);
                                  onOpenChange(false);
                                }}
                                title="Edit"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                              {(entry.status === 'pending' || entry.status === 'partially_paid') && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                    onClick={() => handlePartialPaymentClick(entry)}
                                    title="Record partial payment"
                                  >
                                    <DollarSign className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-md text-emerald-600 hover:bg-emerald-500/10"
                                    onClick={() => handleMarkAsPaid(entry.id)}
                                    title="Mark as Paid"
                                  >
                                    <CheckCircle className="h-3 w-3" />
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-md text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                                onClick={() => handleDeleteUdaar(entry.id)}
                                title="Delete"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <PartialPaymentDialog
          isOpen={isPartialPaymentOpen}
          onOpenChange={setIsPartialPaymentOpen}
          transaction={selectedTransaction}
          onPartialPayment={handlePartialPayment}
        />

        <PaymentHistoryDialog
          isOpen={isHistoryOpen}
          onOpenChange={setIsHistoryOpen}
          personName={selectedPerson?.name || ''}
          history={personHistory}
        />
      </DialogContent>
    </Dialog>
  );
};

export default PersonDetailsDialog;
