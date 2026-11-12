import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Plus, ArrowRight, ArrowDownLeft, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { UdaarEntry } from '@/types/finance';
import { PaymentService } from '@/utils/paymentService';

interface PersonWiseTabProps {
  udaarList: UdaarEntry[];
  handlePersonCardClick: (personName: string, entries: UdaarEntry[]) => void;
  onAddNewUdaar?: () => void;
}

const PersonWiseTab: React.FC<PersonWiseTabProps> = ({
  udaarList,
  handlePersonCardClick,
  onAddNewUdaar,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const personWiseData = useMemo(() => {
    const personMap = new Map<string, UdaarEntry[]>();

    udaarList.forEach(entry => {
      if (!personMap.has(entry.personName)) {
        personMap.set(entry.personName, []);
      }
      personMap.get(entry.personName)!.push(entry);
    });

    return Array.from(personMap.entries())
      .map(([name, entries]) => {
        const balance = PaymentService.calculatePersonBalance(entries);
        return {
          name,
          entries,
          receivable: balance.pendingReceivable,
          payable: balance.pendingPayable,
          totalGiven: balance.totalGiven,
          totalReceived: balance.totalReceived,
          netBalance: balance.netBalance,
        };
      })
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance));
  }, [udaarList, searchTerm]);

  return (
    <div className="space-y-4">
      {/* Search Header if we have people */}
      {udaarList.length > 0 && (
        <div className="flex items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border/70 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by person name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 bg-background/60 border-border/60 rounded-xl text-sm"
            />
          </div>
          <span className="text-xs text-muted-foreground font-medium px-2">
            {personWiseData.length} {personWiseData.length === 1 ? 'person' : 'people'}
          </span>
        </div>
      )}

      {/* Grid of Person Cards */}
      {personWiseData.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {personWiseData.map(person => {
            const initials = person.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            const isSettled = person.receivable === 0 && person.payable === 0;

            return (
              <Card
                key={person.name}
                className="cursor-pointer border border-border/70 hover:border-primary/40 hover:shadow-lg transition-all duration-200 group overflow-hidden bg-card/80 backdrop-blur-sm"
                onClick={() => handlePersonCardClick(person.name, person.entries)}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Top: Avatar, Name & Status Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 flex items-center justify-center text-primary font-bold text-sm shadow-xs group-hover:scale-105 transition-transform">
                        {initials || 'U'}
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-base tracking-tight group-hover:text-primary transition-colors">
                          {person.name}
                        </h4>
                        <span className="text-xs text-muted-foreground">
                          {person.entries.length} {person.entries.length === 1 ? 'transaction' : 'transactions'}
                        </span>
                      </div>
                    </div>

                    {isSettled ? (
                      <Badge variant="outline" className="text-xs font-semibold gap-1 text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                        <CheckCircle2 className="h-3 w-3" />
                        Settled
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs font-semibold text-amber-600 border-amber-500/30 bg-amber-500/10">
                        Active
                      </Badge>
                    )}
                  </div>

                  {/* 2-column Get vs Give breakdown */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/50 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">You'll get</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        ₹{person.receivable.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">You'll give</span>
                      <span className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                        ₹{person.payable.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {/* Net Balance Callout Banner */}
                  <div
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                      person.netBalance > 0
                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                        : person.netBalance < 0
                        ? 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300'
                        : 'bg-muted border-border/60 text-muted-foreground'
                    }`}
                  >
                    <span>Net Balance</span>
                    <span className="text-sm font-bold flex items-center gap-1">
                      {person.netBalance > 0 ? (
                        <>
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                          + ₹{Math.abs(person.netBalance).toLocaleString('en-IN')} (get)
                        </>
                      ) : person.netBalance < 0 ? (
                        <>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          - ₹{Math.abs(person.netBalance).toLocaleString('en-IN')} (give)
                        </>
                      ) : (
                        '₹0 (all clear)'
                      )}
                    </span>
                  </div>

                  {/* Footer link */}
                  <div className="flex items-center justify-between pt-1 text-xs text-primary font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>View ledger & settle dues</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <Card className="border border-dashed border-border/80 bg-card/40 py-12 px-6">
          <CardContent className="flex flex-col items-center justify-center text-center p-0">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-primary/10 to-transparent flex items-center justify-center text-primary mb-4 ring-1 ring-primary/20 shadow-inner">
              <Users className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">
              {searchTerm ? 'No matching people found' : 'No person-wise records yet'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {searchTerm
                ? 'Try searching with another name.'
                : 'Whenever you add an udaar entry with someone, their personal running balance sheet will show up here.'}
            </p>
            {onAddNewUdaar && !searchTerm && (
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

export default PersonWiseTab;
