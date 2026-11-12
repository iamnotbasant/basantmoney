import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Edit3, Trash2, CheckCircle, Search, Handshake, Plus, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { UdaarEntry } from '@/types/finance';

interface DefaultHistoryTabProps {
  udaarList: UdaarEntry[];
  sortBy: 'date' | 'amount' | 'person';
  sortOrder: 'asc' | 'desc';
  setSortBy: (value: 'date' | 'amount' | 'person') => void;
  setSortOrder: (value: 'asc' | 'desc') => void;
  handleEditUdaar: (udaar: UdaarEntry) => void;
  handleMarkAsPaid: (id: string) => void;
  handleDeleteUdaar: (id: string) => void;
  formatDate: (dateString: string) => string;
  onAddNewUdaar?: () => void;
}

const DefaultHistoryTab: React.FC<DefaultHistoryTabProps> = ({
  udaarList,
  sortBy,
  sortOrder,
  setSortBy,
  setSortOrder,
  handleEditUdaar,
  handleMarkAsPaid,
  handleDeleteUdaar,
  formatDate,
  onAddNewUdaar,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'gave' | 'took'>('all');

  const filteredAndSortedList = useMemo(() => {
    return udaarList
      .filter(item => {
        const matchesType = typeFilter === 'all' ? true : item.type === typeFilter;
        const matchesSearch =
          item.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        let comparison = 0;
        switch (sortBy) {
          case 'date':
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
          case 'amount':
            comparison = a.amount - b.amount;
            break;
          case 'person':
            comparison = a.personName.localeCompare(b.personName);
            break;
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [udaarList, sortBy, sortOrder, typeFilter, searchTerm]);

  const gaveCount = udaarList.filter(u => u.type === 'gave').length;
  const tookCount = udaarList.filter(u => u.type === 'took').length;

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by person name or note..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-background/60 border-border/60 rounded-xl text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/50 p-0.5 rounded-xl border border-border/40">
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                typeFilter === 'all'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All ({udaarList.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('gave')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                typeFilter === 'gave'
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownLeft className="h-3 w-3 text-emerald-600" />
              I Gave ({gaveCount})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('took')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                typeFilter === 'took'
                  ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpRight className="h-3 w-3 text-rose-600" />
              I Took ({tookCount})
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <Select value={sortBy} onValueChange={(value: 'date' | 'amount' | 'person') => setSortBy(value)}>
              <SelectTrigger className="w-28 h-9 rounded-xl text-xs bg-background/60 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="person">Person</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-border/60 hover:bg-muted"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredAndSortedList.length > 0 ? (
        <Card className="border border-border/70 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Person</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Type</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Description</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-right">Amount</TableHead>
                  <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedList.map(item => {
                  const initials = item.personName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {initials || 'U'}
                          </div>
                          <span className="font-semibold">{item.personName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.type === 'gave'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/20'
                          }`}
                        >
                          {item.type === 'gave' ? (
                            <>
                              <ArrowDownLeft className="h-3 w-3" />
                              You Gave
                            </>
                          ) : (
                            <>
                              <ArrowUpRight className="h-3 w-3" />
                              You Took
                            </>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                        {item.description || '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(item.date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs capitalize font-medium gap-1.5 px-2.5 py-1 rounded-full ${
                            item.status === 'paid'
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                            }`}
                          />
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold text-base ${
                          item.type === 'gave'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {item.type === 'gave' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                            onClick={() => handleEditUdaar(item)}
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          {item.status !== 'paid' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-lg text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                              onClick={() => handleMarkAsPaid(item.id)}
                              title="Mark as Settled"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            onClick={() => handleDeleteUdaar(item.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        /* Delightful Empty State */
        <Card className="border border-dashed border-border/80 bg-card/40 py-12 px-6">
          <CardContent className="flex flex-col items-center justify-center text-center p-0">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500/20 via-primary/10 to-transparent flex items-center justify-center text-primary mb-4 ring-1 ring-primary/20 shadow-inner">
              <Handshake className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              {searchTerm || typeFilter !== 'all' ? 'No matching udaar records' : 'No default history yet'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {searchTerm || typeFilter !== 'all'
                ? 'Try adjusting your search terms or filter to see relevant records.'
                : 'Keep track of borrowed money or loans given to friends and family with ease.'}
            </p>
            {onAddNewUdaar && !searchTerm && typeFilter === 'all' && (
              <Button
                onClick={onAddNewUdaar}
                className="mt-6 rounded-xl gap-2 shadow-sm font-semibold h-10 px-5"
              >
                <Plus className="h-4 w-4" />
                Add First Default Entry
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DefaultHistoryTab;
