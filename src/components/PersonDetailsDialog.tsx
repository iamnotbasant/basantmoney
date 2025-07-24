
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Edit3, Trash2, History, DollarSign, CheckCircle } from 'lucide-react';
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
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Transaction History - {selectedPerson?.name}
          </DialogTitle>
        </DialogHeader>
        {selectedPerson && (
          <div className="space-y-4">
            {/* Enhanced Summary */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Pending Receivable</div>
                  <div className="text-lg font-bold text-green-600">
                    ₹{balance?.pendingReceivable.toLocaleString('en-IN') || '0'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Pending Payable</div>
                  <div className="text-lg font-bold text-red-600">
                    ₹{balance?.pendingPayable.toLocaleString('en-IN') || '0'}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 p-4 bg-secondary rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Total Given</div>
                  <div className="text-md font-semibold">₹{balance?.totalGiven.toLocaleString('en-IN') || '0'}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Total Received</div>
                  <div className="text-md font-semibold">₹{balance?.totalReceived.toLocaleString('en-IN') || '0'}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">Net Balance</div>
                  <div className={`text-md font-bold ${balance && balance.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Math.abs(balance?.netBalance || 0).toLocaleString('en-IN')}
                    {balance && (balance.netBalance >= 0 ? ' (you get)' : ' (you give)')}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsHistoryOpen(true)}
                  className="flex items-center gap-1"
                >
                  <History className="h-3 w-3" />
                  History
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleSettlePerson(selectedPerson.name)}
                  className="flex items-center gap-1"
                  disabled={!balance || (balance.pendingReceivable === 0 && balance.pendingPayable === 0)}
                >
                  <CheckCircle className="h-3 w-3" />
                  Settle All
                </Button>
              </div>
            </div>

            {/* Transaction List */}
            <div className="space-y-2">
              <h4 className="font-medium">All Transactions</h4>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPerson.entries
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.description || '-'}</TableCell>
                        <TableCell>{formatDate(entry.date)}</TableCell>
                        <TableCell>
                          <Badge variant={entry.status === 'paid' ? 'default' : 'secondary'} 
                                 className={
                                   entry.status === 'paid' ? 'bg-green-100 text-green-800' : 
                                   entry.status === 'partially_paid' ? 'bg-orange-100 text-orange-800' :
                                   'bg-yellow-100 text-yellow-800'
                                 }>
                            {entry.status.replace('_', ' ')}
                          </Badge>
                          {entry.originalAmount && entry.originalAmount !== entry.amount && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Original: ₹{entry.originalAmount.toLocaleString('en-IN')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${entry.type === 'gave' ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.type === 'gave' ? '+' : '-'}₹{entry.amount.toLocaleString('en-IN')}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1 flex-wrap">
                            <Button variant="outline" size="sm" onClick={() => {
                              handleEditUdaar(entry);
                              onOpenChange(false);
                            }}>
                              <Edit3 className="h-3 w-3" />
                            </Button>
                            {(entry.status === 'pending' || entry.status === 'partially_paid') && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handlePartialPaymentClick(entry)}
                                  title="Record partial payment"
                                >
                                  <DollarSign className="h-3 w-3" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => handleMarkAsPaid(entry.id)}>
                                  ✓
                                </Button>
                              </>
                            )}
                            <Button variant="outline" size="sm" onClick={() => handleDeleteUdaar(entry.id)}>
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
