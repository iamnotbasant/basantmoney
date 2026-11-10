import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Laptop,
  LineChart,
  Percent,
  Gift,
  ShoppingCart,
  Utensils,
  Home,
  Plane,
  Clapperboard,
  Plug,
  HeartPulse,
  Receipt,
  Sparkles,
  LucideIcon,
} from 'lucide-react';
import { formatINRParts } from '@/utils/format';

export interface DashboardTransaction {
  id: number | string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category: string;
  isAutoInterest?: boolean;
}

interface RecentTransactionsProps {
  transactions: DashboardTransaction[];
  isLoading?: boolean;
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  salary: Briefcase,
  freelance: Laptop,
  investment: LineChart,
  interest: Percent,
  cashback: Gift,
  groceries: ShoppingCart,
  food: Utensils,
  rent: Home,
  travel: Plane,
  entertainment: Clapperboard,
  utilities: Plug,
  health: HeartPulse,
};

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({
  transactions,
  isLoading = false,
}) => {
  const navigate = useNavigate();

  // Read saved category colors from localStorage
  const categoryColorMap = useMemo(() => {
    try {
      const stored = localStorage.getItem('categories');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const map = new Map<string, string>();
          parsed.forEach((cat: { name?: string; color?: string }) => {
            if (cat?.name && cat?.color) {
              map.set(cat.name.toLowerCase(), cat.color);
            }
          });
          return map;
        }
      }
    } catch {
      // ignore
    }
    return new Map<string, string>();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <Card className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md shadow-[var(--elev-1)]">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-5 px-5 sm:px-6">
        <div>
          <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
            Recent Ledger Activity
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Latest 5 credits & debits across your accounts
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/transactions')}
          className="text-xs font-medium text-primary hover:text-primary/80 gap-1 px-2.5 h-8"
        >
          <span>View All</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>

      <CardContent className="px-5 sm:px-6 pb-5 pt-0">
        {isLoading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : transactions.length > 0 ? (
          <div className="divide-y divide-border/40">
            {transactions.map((tx) => {
              const isIncome = tx.type === 'income';
              const catKey = (tx.category || '').toLowerCase();
              const Icon =
                CATEGORY_ICONS[catKey] || (isIncome ? TrendingUp : TrendingDown);
              const customColor = categoryColorMap.get(catKey) || (isIncome ? '#10B981' : '#64748B');
              const { whole, paise } = formatINRParts(tx.amount);

              return (
                <div
                  key={`${tx.type}-${tx.id}`}
                  className="group flex items-center justify-between py-3 sm:py-3.5 first:pt-1 last:pb-1 hover:bg-accent/40 rounded-xl px-2 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="relative flex items-center justify-center h-10 w-10 rounded-xl shrink-0 transition-transform group-hover:scale-105"
                      style={{
                        backgroundColor: `${customColor}18`,
                        color: customColor,
                        border: `1px solid ${customColor}30`,
                      }}
                    >
                      <Icon className="h-4 w-4" />
                      <span
                        className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full ring-2 ring-card"
                        style={{ backgroundColor: customColor }}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold truncate text-foreground">
                          {tx.description}
                        </p>
                        {tx.isAutoInterest && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                            <Sparkles className="h-2.5 w-2.5" />
                            Auto
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: customColor }}
                            aria-hidden="true"
                          />
                          <span className="capitalize">{tx.category}</span>
                        </span>
                        <span>•</span>
                        <span>{formatDate(tx.date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <p
                      className={`text-sm sm:text-base font-bold tabular-nums tracking-tight ${
                        isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground'
                      }`}
                    >
                      {isIncome ? '+' : '-'}₹{whole}
                      {paise ? (
                        <span className="text-[0.65em] font-medium opacity-75">.{paise}</span>
                      ) : null}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="relative mb-3">
              <div
                className="absolute inset-0 blur-xl bg-primary/10 rounded-full"
                aria-hidden="true"
              />
              <div className="relative h-16 w-16 rounded-2xl bg-accent grid place-items-center shadow-[var(--elev-1)]">
                <Receipt className="h-8 w-8 text-muted-foreground/60" />
              </div>
            </div>
            <p className="text-base font-semibold text-foreground">No transactions yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-5 max-w-[28ch]">
              Your ledger has no records this month. Add an entry to see it here.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => navigate('/income')}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Add Income
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/expense')}
                className="text-xs"
              >
                Add Expense
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentTransactions;