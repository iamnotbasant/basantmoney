
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

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
}

const CustomPaymentsTab: React.FC<CustomPaymentsTabProps> = ({
  customPayments,
  handleTogglePaymentStatus,
  formatDate,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Payments</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customPayments.length > 0 ? customPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.title}</TableCell>
                  <TableCell>{payment.category}</TableCell>
                  <TableCell className="text-muted-foreground">{payment.description || '-'}</TableCell>
                  <TableCell>{formatDate(payment.date)}</TableCell>
                  <TableCell>
                    <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'} className={payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">₹{payment.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm" onClick={() => handleTogglePaymentStatus(payment.id)}>
                      {payment.status === 'pending' ? 'Mark Complete' : 'Mark Pending'}
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">No custom payments yet. Start by adding one!</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomPaymentsTab;
