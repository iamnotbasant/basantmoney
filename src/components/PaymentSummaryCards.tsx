
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IndianRupee } from 'lucide-react';
import { UdaarEntry } from '@/types/finance';

interface CustomPayment {
  id: string;
  title: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  status: 'pending' | 'completed';
}

interface PaymentSummaryCardsProps {
  udaarList: UdaarEntry[];
  customPayments: CustomPayment[];
}

const PaymentSummaryCards: React.FC<PaymentSummaryCardsProps> = ({
  udaarList,
  customPayments,
}) => {
  const pendingReceivables = udaarList.filter(u => u.type === 'gave' && (u.status === 'pending' || u.status === 'partially_paid')).reduce((sum, u) => sum + u.amount, 0);
  const pendingPayables = udaarList.filter(u => u.type === 'took' && (u.status === 'pending' || u.status === 'partially_paid')).reduce((sum, u) => sum + u.amount, 0);
  const pendingPayments = customPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">You Will Get (Pending)</CardTitle>
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">₹{pendingReceivables.toLocaleString('en-IN')}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">You Will Give (Pending)</CardTitle>
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">₹{pendingPayables.toLocaleString('en-IN')}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Custom Payments (Pending)</CardTitle>
          <IndianRupee className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">₹{pendingPayments.toLocaleString('en-IN')}</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSummaryCards;
