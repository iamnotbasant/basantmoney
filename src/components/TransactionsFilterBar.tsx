
import React from 'react';
import { Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TransactionsFilterBarProps {
  filterType: string;
  setFilterType: (val: string) => void;
  filterMonth: string;
  setFilterMonth: (val: string) => void;
  filterCategory: string;
  setFilterCategory: (val: string) => void;
  getUniqueMonths: () => string[];
  formatMonthForDisplay: (monthYear: string) => string;
  getUniqueCategories: () => string[];
}

const TransactionsFilterBar: React.FC<TransactionsFilterBarProps> = ({
  filterType,
  setFilterType,
  filterMonth,
  setFilterMonth,
  filterCategory,
  setFilterCategory,
  getUniqueMonths,
  formatMonthForDisplay,
  getUniqueCategories,
}) => {
  return (
    <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
      <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filter by</span>
      </div>
      <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-10 w-full rounded-md text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="h-10 w-full rounded-md text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {getUniqueCategories().map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="h-10 w-full rounded-md text-sm">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {getUniqueMonths().map(month => (
              <SelectItem key={month} value={month}>
                {formatMonthForDisplay(month)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default TransactionsFilterBar;
