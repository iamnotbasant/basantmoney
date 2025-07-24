
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, Edit3, Trash2 } from 'lucide-react';
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
}) => {
  const getSortedUdaarList = () => {
    return [...udaarList].sort((a, b) => {
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
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Default History</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={(value: 'date' | 'amount' | 'person') => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
                <SelectItem value="person">Person</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getSortedUdaarList().length > 0 ? getSortedUdaarList().map(item => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.personName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.description || '-'}</TableCell>
                  <TableCell>{formatDate(item.date)}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'paid' ? 'default' : 'secondary'} className={item.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${item.type === 'gave' ? 'text-green-600' : 'text-red-600'}`}>
                    {item.type === 'gave' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditUdaar(item)}>
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      {item.status === 'pending' && (
                        <Button variant="outline" size="sm" onClick={() => handleMarkAsPaid(item.id)}>
                          Mark Paid
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => handleDeleteUdaar(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">No default records yet. Start by adding one!</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default DefaultHistoryTab;
