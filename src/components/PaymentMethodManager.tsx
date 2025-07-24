
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethod {
  id: string;
  name: string;
  color: string;
}

const PaymentMethodManager = () => {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [newMethodName, setNewMethodName] = useState('');

  const generateRandomColor = () => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', 
      '#06B6D4', '#84CC16', '#F97316', '#6366F1', '#14B8A6', '#F59E0B',
      '#EF4444', '#8B5CF6', '#06B6D4', '#F97316', '#10B981', '#EC4899'
    ];
    
    const usedColors = paymentMethods.map(method => method.color);
    const availableColors = colors.filter(color => !usedColors.includes(color));
    
    if (availableColors.length === 0) {
      // Generate a random hex color if all predefined colors are used
      return '#' + Math.floor(Math.random()*16777215).toString(16);
    }
    
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  };

  useEffect(() => {
    const storedMethods = localStorage.getItem('paymentMethods');
    if (storedMethods) {
      setPaymentMethods(JSON.parse(storedMethods));
    } else {
      // Default payment methods
      const defaultMethods: PaymentMethod[] = [
        { id: '1', name: 'Cash', color: '#10B981' },
        { id: '2', name: 'UPI', color: '#3B82F6' },
        { id: '3', name: 'Bank Transfer', color: '#8B5CF6' },
        { id: '4', name: 'Credit Card', color: '#EF4444' },
        { id: '5', name: 'Wallet', color: '#F59E0B' },
        { id: '6', name: 'Cheque', color: '#EC4899' },
      ];
      setPaymentMethods(defaultMethods);
      localStorage.setItem('paymentMethods', JSON.stringify(defaultMethods));
    }
  }, []);

  const addPaymentMethod = () => {
    if (!newMethodName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a payment method name",
        variant: "destructive",
      });
      return;
    }

    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      name: newMethodName.trim(),
      color: generateRandomColor()
    };

    const updatedMethods = [...paymentMethods, newMethod];
    setPaymentMethods(updatedMethods);
    localStorage.setItem('paymentMethods', JSON.stringify(updatedMethods));

    setNewMethodName('');
    toast({
      title: "Success",
      description: "Payment method added successfully",
    });
  };

  const deletePaymentMethod = (methodId: string) => {
    const updatedMethods = paymentMethods.filter(method => method.id !== methodId);
    setPaymentMethods(updatedMethods);
    localStorage.setItem('paymentMethods', JSON.stringify(updatedMethods));
    
    toast({
      title: "Success",
      description: "Payment method deleted successfully",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <CreditCard className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Payment Method Management</h2>
      </div>

      {/* Add New Payment Method */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <h3 className="font-medium">Add New Payment Method</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label htmlFor="methodName">Payment Method Name</Label>
            <Input
              id="methodName"
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder="Enter payment method name"
            />
          </div>
          <div className="flex items-end">
            <Button onClick={addPaymentMethod}>
              <Plus className="h-4 w-4 mr-2" />
              Add Method
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Methods List */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-medium mb-4">Payment Methods</h3>
        <div className="flex flex-wrap gap-2">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: method.color }}
                />
                {method.name}
                <button
                  onClick={() => deletePaymentMethod(method.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodManager;
