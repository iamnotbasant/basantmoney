import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Category } from '@/types/finance';
import CollapsibleSection from '@/components/CollapsibleSection';
import { useIncomeData } from '@/hooks/useIncomeData';
import { useBankAccounts } from '@/hooks/useBankAccounts';

interface PaymentMethod {
  id: string;
  name: string;
  color: string;
}

const IncomeEntry = () => {
  const navigate = useNavigate();
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Supabase hooks for data persistence
  const { currentAccount } = useBankAccounts();
  const { incomeData, addIncome } = useIncomeData(currentAccount?.id);

  useEffect(() => {
    const requiredIncomeCategories: Category[] = [
      { id: 'cat-interest', name: 'Interest', type: 'income', color: '#10B981' },
      { id: 'cat-cashback', name: 'Cashback', type: 'income', color: '#06B6D4' },
      { id: 'cat-freelancing', name: 'Freelancing', type: 'income', color: '#3B82F6' },
    ];

    // Load categories from localStorage
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      let allCategories: Category[] = JSON.parse(storedCategories);
      let updated = false;

      for (const req of requiredIncomeCategories) {
        if (!allCategories.some(c => c.name.toLowerCase() === req.name.toLowerCase() && c.type === 'income')) {
          allCategories.push(req);
          updated = true;
        }
      }

      if (updated) {
        localStorage.setItem('categories', JSON.stringify(allCategories));
      }

      const incomeCategories = allCategories.filter((cat: Category) => cat.type === 'income');
      setCategories(incomeCategories);
    } else {
      // Initialize default categories if none exist
      const defaultCategories: Category[] = [
        { id: '1', name: 'Salary', type: 'income', color: '#10B981' },
        { id: '2', name: 'Freelance', type: 'income', color: '#3B82F6' },
        { id: '3', name: 'Investment', type: 'income', color: '#8B5CF6' },
        { id: '4', name: 'Interest', type: 'income', color: '#10B981' },
        { id: '5', name: 'Cashback', type: 'income', color: '#06B6D4' },
        { id: '6', name: 'Freelancing', type: 'income', color: '#6366F1' },
      ];
      localStorage.setItem('categories', JSON.stringify(defaultCategories));
      const incomeCategories = defaultCategories.filter(cat => cat.type === 'income');
      setCategories(incomeCategories);
    }

    // Load payment methods from localStorage
    const storedMethods = localStorage.getItem('paymentMethods');
    if (storedMethods) {
      setPaymentMethods(JSON.parse(storedMethods));
    } else {
      const defaultMethods = [
        { id: '1', name: 'Cash', color: '#10B981' },
        { id: '2', name: 'UPI', color: '#3B82F6' },
        { id: '3', name: 'Bank Transfer', color: '#8B5CF6' },
        { id: '4', name: 'Credit Card', color: '#EF4444' },
        { id: '5', name: 'Cheque', color: '#EC4899' },
      ];
      localStorage.setItem('paymentMethods', JSON.stringify(defaultMethods));
      setPaymentMethods(defaultMethods);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!source.trim() || !amount || !date || !selectedCategory || !selectedPaymentMethod || !notes.trim()) {
      toast.error('Please fill in all required fields including description');
      return;
    }

    const incomeAmount = parseFloat(amount);
    if (incomeAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);

    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;
      
      const result = await addIncome({
        source: source.trim(),
        amount: incomeAmount,
        date: localDateString,
        category: selectedCategory,
        payment_method: selectedPaymentMethod,
        notes: notes.trim() || null,
        bank_account_id: currentAccount?.id || null,
      });

      if (!result) {
        setIsSubmitting(false);
        return;
      }

      toast.success(`₹${incomeAmount.toLocaleString('en-IN')} income added to account balance!`);

      // Reset form
      setSource('');
      setAmount('');
      setDate(new Date());
      setSelectedCategory('');
      setSelectedPaymentMethod('');
      setNotes('');
      setAttachment(null);

      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (error) {
      console.error('Error saving income:', error);
      toast.error('Failed to save income');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="mr-4 hover:bg-accent"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold text-foreground">Add Income</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="h-5 w-5 mr-2 text-primary" />
              Income Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source / Payer *</Label>
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="e.g., Client name, Employer, Slice, etc."
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
                  <SelectTrigger id="category">
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

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod} required>
                  <SelectTrigger id="paymentMethod">
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

              <div className="space-y-2">
                <Label htmlFor="notes">Description / Notes *</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Monthly salary, Freelance project, etc."
                  className="min-h-[80px]"
                  required
                />
              </div>

              <CollapsibleSection title="▶ More Options">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="attachment">Attachment (Optional)</Label>
                    <Input
                      id="attachment"
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*,.pdf,.doc,.docx"
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                    />
                    {attachment && (
                      <p className="text-sm text-muted-foreground">
                        Selected: {attachment.name}
                      </p>
                    )}
                  </div>
                </div>
              </CollapsibleSection>

              <Button
                type="submit"
                className="w-full transition-all duration-200 hover:scale-[1.02]"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Income"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Income History */}
        {incomeData.length > 0 && (
          <Card className="mt-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle>Recent Income Entries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {incomeData.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-3 bg-accent rounded-lg hover:bg-accent/80 transition-colors duration-200">
                    <div>
                      <div className="font-medium">{entry.source}</div>
                      <div className="text-sm text-muted-foreground">{entry.date}</div>
                    </div>
                    <div className="text-lg font-semibold text-foreground">
                      ₹{Number(entry.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default IncomeEntry;
