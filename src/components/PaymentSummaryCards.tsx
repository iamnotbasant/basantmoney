import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowDownLeft, ArrowUpRight, Receipt, Wallet } from 'lucide-react';
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
  const pendingReceivablesList = udaarList.filter(
    u => u.type === 'gave' && (u.status === 'pending' || u.status === 'partially_paid')
  );
  const pendingReceivables = pendingReceivablesList.reduce((sum, u) => sum + u.amount, 0);

  const pendingPayablesList = udaarList.filter(
    u => u.type === 'took' && (u.status === 'pending' || u.status === 'partially_paid')
  );
  const pendingPayables = pendingPayablesList.reduce((sum, u) => sum + u.amount, 0);

  const pendingCustomList = customPayments.filter(p => p.status === 'pending');
  const pendingPayments = pendingCustomList.reduce((sum, p) => sum + p.amount, 0);

  const netUdaar = pendingReceivables - pendingPayables;

  return (
    <div className="space-y-3 mb-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* You Will Get Card */}
        <Card className="relative overflow-hidden border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.02] to-transparent dark:from-emerald-500/15 dark:via-emerald-500/[0.04] shadow-sm hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-emerald-700 dark:text-emerald-300 uppercase">
                You Will Get
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                ₹{Math.trunc(pendingReceivables).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 pt-3 border-t border-emerald-500/15 text-xs text-muted-foreground">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                {pendingReceivablesList.length} pending {pendingReceivablesList.length === 1 ? 'due' : 'dues'}
              </span>
              <span>lent to others</span>
            </div>
          </CardContent>
        </Card>

        {/* You Will Give Card */}
        <Card className="relative overflow-hidden border border-rose-500/20 bg-gradient-to-br from-rose-500/[0.08] via-rose-500/[0.02] to-transparent dark:from-rose-500/15 dark:via-rose-500/[0.04] shadow-sm hover:shadow-md transition-all duration-200">
          <div className="absolute top-0 right-0 w-28 h-28 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-rose-700 dark:text-rose-300 uppercase">
                You Will Give
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 dark:bg-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400 ring-1 ring-rose-500/20">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                ₹{Math.trunc(pendingPayables).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 pt-3 border-t border-rose-500/15 text-xs text-muted-foreground">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-rose-500/10 text-rose-700 dark:text-rose-300">
                {pendingPayablesList.length} pending {pendingPayablesList.length === 1 ? 'due' : 'dues'}
              </span>
              <span>borrowed</span>
            </div>
          </CardContent>
        </Card>

        {/* Custom Payments Card */}
        <Card className="relative overflow-hidden border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] via-indigo-500/[0.02] to-transparent dark:from-blue-500/15 dark:via-indigo-500/[0.04] shadow-sm hover:shadow-md transition-all duration-200 sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 right-0 w-28 h-28 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs sm:text-sm font-semibold tracking-wide text-blue-700 dark:text-blue-300 uppercase">
                Custom Payments
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 dark:bg-blue-500/25 flex items-center justify-center text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
                <Receipt className="h-4 w-4" />
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                ₹{Math.trunc(pendingPayments).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2 pt-3 border-t border-blue-500/15 text-xs text-muted-foreground">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300">
                {pendingCustomList.length} pending
              </span>
              <span>upcoming dues</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Net Udaar Mini Banner */}
      {(pendingReceivables > 0 || pendingPayables > 0) && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4 text-primary" />
            <span>Net Udaar Position:</span>
          </div>
          <div className="font-semibold">
            {netUdaar >= 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400">
                + ₹{Math.trunc(netUdaar).toLocaleString('en-IN')} (overall receivable)
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400">
                - ₹{Math.trunc(Math.abs(netUdaar)).toLocaleString('en-IN')} (overall payable)
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSummaryCards;
