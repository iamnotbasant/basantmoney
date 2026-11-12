import React from 'react';
import { Search, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TransactionsFilterBarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  filterType: string;
  setFilterType: (val: string) => void;
  filterMonth: string;
  setFilterMonth: (val: string) => void;
  filterCategory: string;
  setFilterCategory: (val: string) => void;
  filterPaymentMethod: string;
  setFilterPaymentMethod: (val: string) => void;
  getUniqueMonths: () => string[];
  formatMonthForDisplay: (monthYear: string) => string;
  getUniqueCategories: () => string[];
  getUniquePaymentMethods: () => string[];
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  filteredCount: number;
  totalCount: number;
  filteredIncomeTotal: number;
  filteredExpenseTotal: number;
  filteredNetTotal: number;
}

const TransactionsFilterBar: React.FC<TransactionsFilterBarProps> = ({
  searchQuery,
  setSearchQuery,
  filterType,
  setFilterType,
  filterMonth,
  setFilterMonth,
  filterCategory,
  setFilterCategory,
  filterPaymentMethod,
  setFilterPaymentMethod,
  getUniqueMonths,
  formatMonthForDisplay,
  getUniqueCategories,
  getUniquePaymentMethods,
  onResetFilters,
  hasActiveFilters,
  filteredCount,
  totalCount,
  filteredIncomeTotal,
  filteredExpenseTotal,
  filteredNetTotal,
}) => {
  return (
    <div className="space-y-3.5">
      {/* Search and Filters row */}
      <div className="flex flex-col lg:flex-row gap-2.5 items-stretch lg:items-center">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search transactions by source, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-10 bg-background/80 border-border/80 text-sm focus-visible:ring-1"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-full transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filters dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-shrink-0">
          {/* Type Filter */}
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="h-10 bg-background/80 border-border/80 text-xs sm:text-sm">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income (+)</SelectItem>
              <SelectItem value="expense">Expense (-)</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-10 bg-background/80 border-border/80 text-xs sm:text-sm">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {getUniqueCategories().map((category) => (
                <SelectItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Payment Method Filter */}
          <Select value={filterPaymentMethod} onValueChange={setFilterPaymentMethod}>
            <SelectTrigger className="h-10 bg-background/80 border-border/80 text-xs sm:text-sm">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              {getUniquePaymentMethods().map((method) => (
                <SelectItem key={method} value={method}>
                  {method}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Month Filter */}
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="h-10 bg-background/80 border-border/80 text-xs sm:text-sm">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {getUniqueMonths().map((month) => (
                <SelectItem key={month} value={month}>
                  {formatMonthForDisplay(month)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Reset button */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-10 px-3 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-center lg:self-auto shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* Summary / Stats Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground/80" />
          <span>
            Showing <strong className="text-foreground font-semibold">{filteredCount}</strong> of {totalCount} transactions
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium text-[11px]">
              Filtered
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Income:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              +₹{filteredIncomeTotal.toLocaleString('en-IN')}
            </span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Expense:</span>
            <span className="text-rose-600 dark:text-rose-400 font-semibold">
              -₹{filteredExpenseTotal.toLocaleString('en-IN')}
            </span>
          </span>
          <span className="flex items-center gap-1.5 border-l border-border/60 pl-3">
            <span>Net:</span>
            <span className={`font-semibold ${filteredNetTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {filteredNetTotal >= 0 ? '+' : '-'}₹{Math.abs(filteredNetTotal).toLocaleString('en-IN')}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default TransactionsFilterBar;
