import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Receipt, Search, Plus, CheckCircle2, Clock, Sparkles } from 'lucide-react';

interface CustomPayment {
  id: string;
  title: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  status: 'pending' | 'completed';
}

interface CustomPaymentsTabProps {
  customPayments: CustomPayment[];
  handleTogglePaymentStatus: (id: string) => void;
  formatDate: (dateString: string) => string;
  onAddNewPayment?: () => void;
}

const CustomPaymentsTab: React.FC<CustomPaymentsTabProps> = ({
  customPayments,
  handleTogglePaymentStatus,
  formatDate,
  onAddNewPayment,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const filteredPayments = useMemo(() => {
    return customPayments
      .filter(payment => {
        const matchesStatus =
          statusFilter === 'all' ? true : payment.status === statusFilter;
        const matchesSearch =
          payment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          payment.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (payment.description && payment.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customPayments, statusFilter, searchTerm]);

  const pendingCount = customPayments.filter(p => p.status === 'pending').length;
  const completedCount = customPayments.filter(p => p.status === 'completed').length;

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments by title, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-background/60 border-border/60 rounded-xl text-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            All ({customPayments.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Clock className="h-3 w-3" />
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredPayments.length > 0 ? (
        <Card className="border border-border/70 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Title</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Category</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Description</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map(payment => (
                  <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <Receipt className="h-3.5 w-3.5" />
                        </div>
                        <span>{payment.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground/80 border border-border/50">
                        {payment.category}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                      {payment.description || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(payment.date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-xs capitalize font-medium gap-1.5 px-2.5 py-1 rounded-full ${
                          payment.status === 'completed'
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            payment.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                          }`}
                        />
                        {payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-foreground text-base">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant={payment.status === 'pending' ? 'outline' : 'ghost'}
                        size="sm"
                        onClick={() => handleTogglePaymentStatus(payment.id)}
                        className={`h-8 rounded-xl text-xs font-medium ${
                          payment.status === 'pending'
                            ? 'hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {payment.status === 'pending' ? 'Mark Done' : 'Undo'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        /* Delightful Empty State */
        <Card className="border border-dashed border-border/80 bg-card/40 py-12 px-6">
          <CardContent className="flex flex-col items-center justify-center text-center p-0">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500/20 via-primary/10 to-transparent flex items-center justify-center text-primary mb-4 ring-1 ring-primary/20 shadow-inner">
              <Receipt className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              {searchTerm || statusFilter !== 'all' ? 'No matching payments found' : 'No custom payments yet'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {searchTerm || statusFilter !== 'all'
                ? 'Try adjusting your search terms or filter settings to find what you are looking for.'
                : 'Track one-time dues, scheduled payments, subscriptions, or shared bills with zero fuss.'}
            </p>
            {onAddNewPayment && !searchTerm && statusFilter === 'all' && (
              <Button
                onClick={onAddNewPayment}
                className="mt-6 rounded-xl gap-2 shadow-sm font-semibold h-10 px-5"
              >
                <Plus className="h-4 w-4" />
                Add First Custom Payment
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomPaymentsTab;
