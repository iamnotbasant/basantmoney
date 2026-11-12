import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DEFAULT_PAYMENT_METHODS,
  migratePaymentMethods,
  type PaymentMethodRecord,
} from '@/lib/categoryDefaults';
import { IconPickerButton, ColorPickerButton } from '@/components/CategoryPickers';

const PaymentMethodManager = () => {
  const { toast } = useToast();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRecord[]>([]);
  const [newMethodName, setNewMethodName] = useState('');
  const [newMethodColor, setNewMethodColor] = useState('#3B82F6');
  const [newMethodIcon, setNewMethodIcon] = useState('generic');
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  const persist = (list: PaymentMethodRecord[]) => {
    setPaymentMethods(list);
    localStorage.setItem('paymentMethods', JSON.stringify(list));
    window.dispatchEvent(new Event('paymentMethodsChanged'));
  };

  useEffect(() => {
    const storedMethods = localStorage.getItem('paymentMethods');
    if (storedMethods) {
      const { list, changed } = migratePaymentMethods(JSON.parse(storedMethods));
      setPaymentMethods(list);
      if (changed) localStorage.setItem('paymentMethods', JSON.stringify(list));
    } else {
      setPaymentMethods(DEFAULT_PAYMENT_METHODS);
      localStorage.setItem('paymentMethods', JSON.stringify(DEFAULT_PAYMENT_METHODS));
    }
  }, []);

  const updateMethod = (methodId: string, patch: Partial<PaymentMethodRecord>) => {
    persist(paymentMethods.map((m) => (m.id === methodId ? { ...m, ...patch } : m)));
  };

  const addPaymentMethod = () => {
    if (!newMethodName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a payment method name",
        variant: "destructive",
      });
      return;
    }

    const newMethod: PaymentMethodRecord = {
      id: Date.now().toString(),
      name: newMethodName.trim(),
      color: newMethodColor,
      icon: newMethodIcon,
    };

    persist([...paymentMethods, newMethod]);
    setNewMethodName('');
    toast({
      title: "Success",
      description: "Payment method added successfully",
    });
  };

  const deletePaymentMethod = (methodId: string) => {
    persist(paymentMethods.filter(method => method.id !== methodId));
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
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[180px]">
            <Label htmlFor="methodName">Payment Method Name</Label>
            <Input
              id="methodName"
              value={newMethodName}
              onChange={(e) => setNewMethodName(e.target.value)}
              placeholder="Enter payment method name"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Icon</Label>
            <IconPickerButton
              value={newMethodIcon}
              onChange={setNewMethodIcon}
              open={openPicker === 'icon:new'}
              onOpenChange={(open) => setOpenPicker(open ? 'icon:new' : null)}
              title="Choose an icon for the new payment method"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Colour</Label>
            <ColorPickerButton
              value={newMethodColor}
              onChange={setNewMethodColor}
              open={openPicker === 'color:new'}
              onOpenChange={(open) => setOpenPicker(open ? 'color:new' : null)}
              title="Choose a colour for the new payment method"
            />
          </div>
          <Button onClick={addPaymentMethod}>
            <Plus className="h-4 w-4 mr-2" />
            Add Method
          </Button>
        </div>
      </div>

      {/* Payment Methods List */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-medium mb-4">Payment Methods</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center gap-2 rounded-lg border bg-card px-2 py-2">
              <IconPickerButton
                value={method.icon}
                onChange={(key) => updateMethod(method.id, { icon: key })}
                open={openPicker === `icon:${method.id}`}
                onOpenChange={(open) => setOpenPicker(open ? `icon:${method.id}` : null)}
                title={`Change icon for ${method.name}`}
              />
              <ColorPickerButton
                value={method.color}
                onChange={(hex) => updateMethod(method.id, { color: hex })}
                open={openPicker === `color:${method.id}`}
                onOpenChange={(open) => setOpenPicker(open ? `color:${method.id}` : null)}
                title={`Change colour for ${method.name}`}
              />
              <span className="flex-1 min-w-0 text-sm font-medium truncate">{method.name}</span>
              <button
                onClick={() => deletePaymentMethod(method.id)}
                className="ml-1 hover:text-destructive shrink-0"
                aria-label={`Delete ${method.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodManager;
