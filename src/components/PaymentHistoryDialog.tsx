import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, IndianRupee } from 'lucide-react';
import { PaymentHistory } from '@/types/finance';

interface PaymentHistoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  personName: string;
  history: PaymentHistory[];
}

const PaymentHistoryDialog: React.FC<PaymentHistoryDialogProps> = ({
  isOpen,
  onOpenChange,
  personName,
  history,
}) => {
  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-blue-100 text-blue-800';
      case 'edited':
        return 'bg-yellow-100 text-yellow-800';
      case 'partial_payment':
        return 'bg-orange-100 text-orange-800';
      case 'marked_paid':
        return 'bg-green-100 text-green-800';
      case 'settled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Payment History - {personName}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No payment history available
              </div>
            ) : (
              history
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry) => (
                  <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className={getActionBadgeColor(entry.action)}>
                        {entry.action.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(entry.date)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{entry.description}</p>
                      {entry.amount && (
                        <div className="flex items-center gap-1 text-sm font-bold">
                          <IndianRupee className="h-3 w-3" />
                          {entry.amount.toLocaleString('en-IN')}
                        </div>
                      )}
                      {entry.details && (
                        <div className="text-xs text-muted-foreground">
                          {JSON.stringify(entry.details, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentHistoryDialog;