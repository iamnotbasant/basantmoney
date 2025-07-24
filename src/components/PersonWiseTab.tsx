
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { UdaarEntry } from '@/types/finance';
import { PaymentService } from '@/utils/paymentService';

interface PersonWiseTabProps {
  udaarList: UdaarEntry[];
  handlePersonCardClick: (personName: string, entries: UdaarEntry[]) => void;
}

const PersonWiseTab: React.FC<PersonWiseTabProps> = ({
  udaarList,
  handlePersonCardClick,
}) => {
  const getPersonWiseUdaar = () => {
    const personMap = new Map<string, UdaarEntry[]>();
    
    udaarList.forEach(entry => {
      if (!personMap.has(entry.personName)) {
        personMap.set(entry.personName, []);
      }
      personMap.get(entry.personName)!.push(entry);
    });
    
    return Array.from(personMap.entries()).map(([name, entries]) => {
      const balance = PaymentService.calculatePersonBalance(entries);
      return { 
        name, 
        entries,
        receivable: balance.pendingReceivable,
        payable: balance.pendingPayable,
        totalGiven: balance.totalGiven,
        totalReceived: balance.totalReceived,
        netBalance: balance.netBalance
      };
    });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {getPersonWiseUdaar().map(person => (
        <Card 
          key={person.name} 
          className="cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handlePersonCardClick(person.name, person.entries)}
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              {person.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">You'll get:</span>
              <span className="text-green-600 font-medium">₹{person.receivable.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">You'll give:</span>
              <span className="text-red-600 font-medium">₹{person.payable.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Net Balance:</span>
              <span className={`font-bold ${person.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{Math.abs(person.netBalance).toLocaleString('en-IN')}
                {person.netBalance >= 0 ? ' (you get)' : ' (you give)'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {person.entries.length} transaction{person.entries.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-blue-600 font-medium">
              Click to view details →
            </div>
          </CardContent>
        </Card>
      ))}
      {getPersonWiseUdaar().length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">No person-wise data available yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PersonWiseTab;
