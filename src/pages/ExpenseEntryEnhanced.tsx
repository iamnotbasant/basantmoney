
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Calendar } from 'lucide-react';
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

interface PaymentMethod {
  id: string;
  name: string;
  color: string;
}

const ExpenseEntryEnhanced = () => {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    // Load categories from localStorage
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      const allCategories = JSON.parse(storedCategories);
      const expenseCategories = allCategories.filter((cat: Category) => cat.type === 'expense');
      setCategories(expenseCategories);
    }

    // Load payment methods from localStorage
    const storedMethods = localStorage.getItem('paymentMethods');
    if (storedMethods) {
      setPaymentMethods(JSON.parse(storedMethods));
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !amount || !date || !selectedCategory || !selectedPaymentMethod || !notes.trim()) {
      toast.error('Please fill in all required fields including description');
      return;
    }

    const expenseAmount = parseFloat(amount);
    if (expenseAmount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    // Create expense entry
    const newExpenseEntry = {
      id: Date.now(),
      description: title.trim(),
      amount: expenseAmount,
      date: date.toISOString().split('T')[0],
      category: selectedCategory,
      paymentMethod: selectedPaymentMethod,
      notes: notes.trim(),
      attachment: attachment?.name || undefined,
      deductions: [] // This would be handled by expense processing logic
    };

    // Save expense (simplified for this example)
    const currentExpenseData = JSON.parse(localStorage.getItem('expenseData') || '[]');
    const updatedExpenseData = [...currentExpenseData, newExpenseEntry];
    localStorage.setItem('expenseData', JSON.stringify(updatedExpenseData));

    toast.success(`₹${expenseAmount.toLocaleString('en-IN')} expense added successfully!`);

    // Reset form
    setTitle('');
    setAmount('');
    setDate(new Date());
    setSelectedCategory('');
    setSelectedPaymentMethod('');
    setNotes('');
    setAttachment(null);

    // Navigate back to dashboard after a short delay
    setTimeout(() => {
      navigate('/');
    }, 1500);
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
            <h1 className="text-xl font-semibold text-foreground">Add Expense</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Minus className="h-5 w-5 mr-2 text-red-500" />
              Expense Details
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
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Expense Title *</Label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Groceries, Fuel, Restaurant"
                  className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label>Date Spent *</Label>
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
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={(value) => setSelectedCategory(value)}
                >
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-background border border-border shadow-lg">
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="default" disabled>
                        No categories available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select 
                  value={selectedPaymentMethod} 
                  onValueChange={(value) => setSelectedPaymentMethod(value)}
                >
                  <SelectTrigger className="transition-all duration-200 focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-background border border-border shadow-lg">
                    {paymentMethods.length > 0 ? (
                      paymentMethods.map((method) => (
                        <SelectItem key={method.id} value={method.name}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: method.color }}
                            />
                            {method.name}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="default" disabled>
                        No payment methods available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Description *</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Thumbnail, Rent, Editing, etc."
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
              >
                Add Expense
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ExpenseEntryEnhanced;
