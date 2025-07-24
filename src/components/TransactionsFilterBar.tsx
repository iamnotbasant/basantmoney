
import React from 'react';
import { Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-row flex-wrap gap-4 items-center w-full lg:w-auto">
      {/* Filter label */}
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5 text-muted-foreground" />
        <span className="text-base text-muted-foreground font-medium">Filters:</span>
      </div>

      {/* Type dropdown */}
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="w-40 h-11 text-base font-normal rounded-md border">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="income">Income</SelectItem>
          <SelectItem value="expense">Expense</SelectItem>
        </SelectContent>
      </Select>

      {/* Month label and dropdown */}
      <span className="text-base text-muted-foreground font-medium">Month</span>
      <Select value={filterMonth} onValueChange={setFilterMonth}>
        <SelectTrigger className="w-48 h-11 text-base font-normal rounded-md border">
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

      {/* Category dropdown */}
      <Select value={filterCategory} onValueChange={setFilterCategory}>
        <SelectTrigger className="w-56 h-11 text-base font-normal rounded-md border font-normal outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
          style={{ boxShadow: 'none', borderColor: '#132144' }}
        >
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
    </div>
  );
};

export default TransactionsFilterBar;
