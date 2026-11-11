import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ArrowLeft, Receipt, FileText, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import CollapsibleSection from '@/components/CollapsibleSection';
import { useExpenseData } from '@/hooks/useExpenseData';
import { useBankAccounts } from '@/hooks/useBankAccounts';

const ExpenseEntry = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState<Date>();
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Supabase hooks for data persistence
  const { currentAccount } = useBankAccounts();
  const { addExpense, expenseData } = useExpenseData(currentAccount?.id);

  useEffect(() => {
    loadData();
    setDate(new Date());

    const handleCategoryUpdate = () => {
      const storedCategories = localStorage.getItem('categories');
      if (storedCategories) {
        const allCategories = JSON.parse(storedCategories);
        const expenseCategories = allCategories.filter((cat: any) => cat.type === 'expense');
        setCategories(expenseCategories);
      }
    };

    window.addEventListener('categoriesChanged', handleCategoryUpdate);
    return () => window.removeEventListener('categoriesChanged', handleCategoryUpdate);
  }, []);

  const loadData = () => {
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      const allCategories = JSON.parse(storedCategories);
      const expenseCategories = allCategories.filter((cat: any) => cat.type === 'expense');
      setCategories(expenseCategories);
    } else {
      const defaultCategories = [
        { id: '1', name: 'Food', color: '#EF4444' },
        { id: '2', name: 'Transport', color: '#F59E0B' },
        { id: '3', name: 'Entertainment', color: '#EC4899' },
        { id: '4', name: 'Bills', color: '#06B6D4' },
        { id: '5', name: 'Shopping', color: '#8B5CF6' },
      ];
      setCategories(defaultCategories);
    }

    const storedPaymentMethods = localStorage.getItem('paymentMethods');
    if (storedPaymentMethods) {
      setPaymentMethods(JSON.parse(storedPaymentMethods));
    } else {
      const defaultMethods = [
        { id: '1', name: 'UPI', color: '#3B82F6' },
        { id: '2', name: 'Cash', color: '#10B981' },
        { id: '3', name: 'Credit Card', color: '#EF4444' },
        { id: '4', name: 'Bank Transfer', color: '#8B5CF6' },
      ];
      setPaymentMethods(defaultMethods);
    }
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !title || !category || !paymentMethod || !date || !notes.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields including description",
        variant: "destructive",
      });
      return;
    }

    const expenseAmount = parseFloat(amount);
    if (isNaN(expenseAmount) || expenseAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;

      const result = await addExpense({
        description: title.trim(),
        amount: expenseAmount,
        category,
        payment_method: paymentMethod,
        date: localDateString,
        notes: notes.trim() || null,
        bank_account_id: currentAccount?.id || null,
      });

      if (!result) {
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Success",
        description: `₹${expenseAmount.toLocaleString()} expense recorded!`,
      });

      // Reset form
      setAmount('');
      setTitle('');
      setCategory('');
      setPaymentMethod('');
      setNotes('');
      setAttachment(null);
      setDate(new Date());

      setTimeout(() => navigate('/'), 1000);
    } catch (error) {
      console.error('Error saving expense:', error);
      toast({
        title: "Error",
        description: "Failed to save expense",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Receipt className="h-5 w-5 text-red-600" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Add Expense</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
          <h2 className="text-lg font-medium text-foreground mb-6 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Expense Details
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="title">Expense Title *</Label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What did you spend on?"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="date">Date Spent *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.name}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: method.color }}
                          />
                          {method.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="notes">Description / Notes *</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Grocery store, Fuel, Monthly bill, etc."
                  className="mt-1"
                  rows={3}
                  required
                />
              </div>
            </div>

            <CollapsibleSection title="More Options" defaultOpen={false}>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label htmlFor="attachment">Attachment</Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Cloud storage coming soon</span>
                  </div>
                  <div className="mt-1">
                    <div className="flex items-center justify-center w-full h-20 border-2 border-dashed border-border rounded-lg bg-muted/20">
                      <div className="text-center">
                        <Upload className="h-5 w-5 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">
                          Receipt / bill upload will be supported in an upcoming storage release
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Expense"}
            </Button>
          </form>
        </div>

        {/* Recent Expenses */}
        {expenseData && expenseData.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6 mt-8 animate-fade-in">
            <h3 className="font-semibold text-foreground mb-4">Recent Expenses</h3>
            <div className="space-y-2">
              {expenseData.slice(0, 5).map((exp) => (
                <div key={exp.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">{exp.description}</div>
                    <div className="text-xs text-muted-foreground">{exp.date} • {exp.category}</div>
                  </div>
                  <div className="font-semibold text-red-600">
                    -₹{Number(exp.amount).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExpenseEntry;
