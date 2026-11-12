import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, PlusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UdaarEntry, PaymentHistory } from '@/types/finance';
import { PaymentService } from '@/utils/paymentService';
import PaymentSummaryCards from '@/components/PaymentSummaryCards';
import DefaultHistoryTab from '@/components/DefaultHistoryTab';
import CustomPaymentsTab from '@/components/CustomPaymentsTab';
import PersonWiseTab from '@/components/PersonWiseTab';
import PersonDetailsDialog from '@/components/PersonDetailsDialog';
import AddDefaultDialog from '@/components/AddDefaultDialog';
import AddCustomPaymentDialog from '@/components/AddCustomPaymentDialog';
import EditDefaultDialog from '@/components/EditDefaultDialog';

interface CustomPayment {
  id: string;
  title: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  status: 'pending' | 'completed';
}

const Payments = () => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const [udaarList, setUdaarList] = useState<UdaarEntry[]>([]);
    const [customPayments, setCustomPayments] = useState<CustomPayment[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
    const [isUdaarDialogOpen, setIsUdaarDialogOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingUdaar, setEditingUdaar] = useState<UdaarEntry | null>(null);
    const [sortBy, setSortBy] = useState<'date' | 'amount' | 'person'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Form state
    const [personName, setPersonName] = useState('');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'gave' | 'took'>('gave');
    const [paymentTitle, setPaymentTitle] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDescription, setPaymentDescription] = useState('');
    const [paymentCategory, setPaymentCategory] = useState('');

    // Person details dialog state
    const [isPersonDetailsOpen, setIsPersonDetailsOpen] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<{ name: string; entries: UdaarEntry[] } | null>(null);

    useEffect(() => {
        // Load udaar data
        const storedUdaar = localStorage.getItem('udaarData');
        if (storedUdaar) {
            try {
                const parsedData = JSON.parse(storedUdaar);
                if (Array.isArray(parsedData)) {
                    setUdaarList(parsedData);
                }
            } catch (error) {
                console.error("Failed to parse udaarData from localStorage:", error);
                localStorage.removeItem('udaarData');
            }
        }

        // Load custom payments
        const storedPayments = localStorage.getItem('customPayments');
        if (storedPayments) {
            try {
                const parsedPayments = JSON.parse(storedPayments);
                if (Array.isArray(parsedPayments)) {
                    setCustomPayments(parsedPayments);
                }
            } catch (error) {
                console.error("Failed to parse customPayments from localStorage:", error);
                localStorage.removeItem('customPayments');
            }
        }

        // Load payment history
        const storedHistory = localStorage.getItem('paymentHistory');
        if (storedHistory) {
            try {
                const parsedHistory = JSON.parse(storedHistory);
                if (Array.isArray(parsedHistory)) {
                    setPaymentHistory(parsedHistory);
                }
            } catch (error) {
                console.error("Failed to parse paymentHistory from localStorage:", error);
                localStorage.removeItem('paymentHistory');
            }
        }
    }, []);

    const handleAddUdaar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!personName || !amount || parseFloat(amount) <= 0) {
            toast({ title: 'Invalid Input', description: 'Please fill in a valid person name and amount.', variant: 'destructive' });
            return;
        }

        const newUdaar: UdaarEntry = {
            id: crypto.randomUUID(),
            personName,
            amount: parseFloat(amount),
            description,
            type,
            date: new Date().toISOString(),
            status: 'pending',
        };

        const updatedList = [...udaarList, newUdaar];
        setUdaarList(updatedList);
        localStorage.setItem('udaarData', JSON.stringify(updatedList));

        // Add to history
        const historyEntry = PaymentService.createHistoryEntry(
            newUdaar.id,
            newUdaar.personName,
            'created',
            `New transaction created: ${newUdaar.description || 'No description'}`,
            newUdaar.amount
        );
        updatePaymentHistory([...paymentHistory, historyEntry]);

        toast({ title: 'Success', description: 'Default entry added.' });
        resetUdaarForm();
        setIsUdaarDialogOpen(false);
    };

    const handleAddCustomPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentTitle || !paymentAmount || parseFloat(paymentAmount) <= 0) {
            toast({ title: 'Invalid Input', description: 'Please fill in valid payment details.', variant: 'destructive' });
            return;
        }

        const newPayment: CustomPayment = {
            id: crypto.randomUUID(),
            title: paymentTitle,
            amount: parseFloat(paymentAmount),
            description: paymentDescription,
            date: new Date().toISOString(),
            category: paymentCategory || 'General',
            status: 'pending',
        };

        const updatedPayments = [...customPayments, newPayment];
        setCustomPayments(updatedPayments);
        localStorage.setItem('customPayments', JSON.stringify(updatedPayments));

        toast({ title: 'Success', description: 'Custom payment added.' });
        resetPaymentForm();
        setIsPaymentDialogOpen(false);
    };

    const handleUpdateUdaar = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUdaar || !personName || !amount || parseFloat(amount) <= 0) {
            toast({ title: 'Invalid Input', description: 'Please fill in valid details.', variant: 'destructive' });
            return;
        }

        const updatedUdaar: UdaarEntry = {
            ...editingUdaar,
            personName,
            amount: parseFloat(amount),
            description,
            type,
        };

        const updatedList = udaarList.map(item => 
            item.id === editingUdaar.id ? updatedUdaar : item
        );
        setUdaarList(updatedList);
        localStorage.setItem('udaarData', JSON.stringify(updatedList));

        // Add to history
        const historyEntry = PaymentService.createHistoryEntry(
            updatedUdaar.id,
            updatedUdaar.personName,
            'edited',
            `Transaction updated: ${updatedUdaar.description || 'No description'}`,
            updatedUdaar.amount,
            { originalAmount: editingUdaar.amount, newAmount: updatedUdaar.amount }
        );
        updatePaymentHistory([...paymentHistory, historyEntry]);

        toast({ title: 'Success', description: 'Default entry updated.' });
        resetUdaarForm();
        setEditingUdaar(null);
        setIsEditDialogOpen(false);
    };

    const resetUdaarForm = () => {
        setPersonName('');
        setAmount('');
        setDescription('');
        setType('gave');
    };

    const resetPaymentForm = () => {
        setPaymentTitle('');
        setPaymentAmount('');
        setPaymentDescription('');
        setPaymentCategory('');
    };

    const handleEditUdaar = (udaar: UdaarEntry) => {
        setEditingUdaar(udaar);
        setPersonName(udaar.personName);
        setAmount(udaar.amount.toString());
        setDescription(udaar.description);
        setType(udaar.type);
        setIsEditDialogOpen(true);
    };

    const handleDeleteUdaar = (id: string) => {
        const updatedList = udaarList.filter(item => item.id !== id);
        setUdaarList(updatedList);
        localStorage.setItem('udaarData', JSON.stringify(updatedList));
        toast({ title: 'Success', description: 'Default entry deleted.' });
    };
    
    const handleMarkAsPaid = (id: string) => {
        const transaction = udaarList.find(item => item.id === id);
        if (!transaction) return;

        const updatedList = udaarList.map((item: UdaarEntry) => 
            item.id === id ? { ...item, status: 'paid' as const } : item
        );
        setUdaarList(updatedList);
        localStorage.setItem('udaarData', JSON.stringify(updatedList));

        // Add to history
        const historyEntry = PaymentService.createHistoryEntry(
            id,
            transaction.personName,
            'marked_paid',
            `Transaction marked as fully paid`,
            transaction.amount
        );
        updatePaymentHistory([...paymentHistory, historyEntry]);

        toast({ title: 'Success', description: 'Entry marked as paid.' });
    };

    const handleTogglePaymentStatus = (id: string) => {
        const updatedPayments = customPayments.map(payment =>
            payment.id === id 
                ? { ...payment, status: payment.status === 'pending' ? 'completed' as const : 'pending' as const }
                : payment
        );
        setCustomPayments(updatedPayments);
        localStorage.setItem('customPayments', JSON.stringify(updatedPayments));
        toast({ title: 'Success', description: 'Payment status updated.' });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const updatePaymentHistory = (newHistory: PaymentHistory[]) => {
        setPaymentHistory(newHistory);
        localStorage.setItem('paymentHistory', JSON.stringify(newHistory));
    };

    const handlePartialPayment = (transactionId: string, partialAmount: number, description: string) => {
        const transaction = udaarList.find(t => t.id === transactionId);
        if (!transaction) return;

        const { updatedTransaction, historyEntry } = PaymentService.processPartialPayment(
            transaction,
            partialAmount,
            description
        );

        const updatedList = udaarList.map(item => 
            item.id === transactionId ? updatedTransaction : item
        );
        setUdaarList(updatedList);
        localStorage.setItem('udaarData', JSON.stringify(updatedList));
        updatePaymentHistory([...paymentHistory, historyEntry]);

        toast({ 
            title: 'Success', 
            description: `Partial payment of ₹${partialAmount.toLocaleString('en-IN')} recorded.` 
        });
    };

    const handleSettlePerson = (personName: string) => {
        const personEntries = udaarList.filter(entry => entry.personName === personName);
        const { settledEntries, historyEntries } = PaymentService.settlePerson(personEntries);

        const updatedList = udaarList.map(entry => {
            const settledEntry = settledEntries.find(s => s.id === entry.id);
            return settledEntry || entry;
        });

        setUdaarList(updatedList);
        localStorage.setItem('udaarData', JSON.stringify(updatedList));
        updatePaymentHistory([...paymentHistory, ...historyEntries]);

        toast({ 
            title: 'Success', 
            description: `All transactions with ${personName} have been settled.` 
        });
    };

    const handlePersonCardClick = (personName: string, entries: UdaarEntry[]) => {
        setSelectedPerson({ name: personName, entries });
        setIsPersonDetailsOpen(true);
    };

    const uniquePeopleCount = new Set(udaarList.map(u => u.personName)).size;

    return (
        <div className="min-h-screen bg-background">
            <Header />

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/60">
                    <div className="flex items-center gap-3">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => navigate('/')} 
                            className="h-9 w-9 rounded-full hover:bg-accent border border-border/60 shrink-0"
                            title="Back to Vault"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                    Payments & Default
                                </h1>
                                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                    Ledger
                                </span>
                            </div>
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                                Track loans, borrowed money (Udaar), and custom scheduled payments
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Dialog open={isUdaarDialogOpen} onOpenChange={setIsUdaarDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="h-9 rounded-xl font-semibold gap-1.5 border-border/70 hover:bg-muted text-xs sm:text-sm shadow-xs">
                                    <PlusCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> 
                                    <span>Add Default</span>
                                </Button>
                            </DialogTrigger>
                            <AddDefaultDialog
                                isOpen={isUdaarDialogOpen}
                                onOpenChange={setIsUdaarDialogOpen}
                                personName={personName}
                                amount={amount}
                                description={description}
                                type={type}
                                setPersonName={setPersonName}
                                setAmount={setAmount}
                                setDescription={setDescription}
                                setType={setType}
                                onSubmit={handleAddUdaar}
                            />
                        </Dialog>

                        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-9 rounded-xl font-semibold gap-1.5 shadow-sm text-xs sm:text-sm">
                                    <PlusCircle className="h-4 w-4" /> 
                                    <span>Add Payment</span>
                                </Button>
                            </DialogTrigger>
                            <AddCustomPaymentDialog
                                isOpen={isPaymentDialogOpen}
                                onOpenChange={setIsPaymentDialogOpen}
                                paymentTitle={paymentTitle}
                                paymentAmount={paymentAmount}
                                paymentDescription={paymentDescription}
                                paymentCategory={paymentCategory}
                                setPaymentTitle={setPaymentTitle}
                                setPaymentAmount={setPaymentAmount}
                                setPaymentDescription={setPaymentDescription}
                                setPaymentCategory={setPaymentCategory}
                                onSubmit={handleAddCustomPayment}
                            />
                        </Dialog>
                    </div>
                </div>
            </div>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <PaymentSummaryCards udaarList={udaarList} customPayments={customPayments} />

                <Tabs defaultValue="udaar" className="w-full space-y-6">
                    <div className="flex justify-center sm:justify-start">
                        <TabsList className="h-11 p-1 bg-muted/60 border border-border/60 rounded-2xl gap-1">
                            <TabsTrigger 
                                value="udaar"
                                className="rounded-xl px-4 text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all gap-2"
                            >
                                <span>Default History</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-bold">
                                    {udaarList.length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="payments"
                                className="rounded-xl px-4 text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all gap-2"
                            >
                                <span>Custom Payments</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-bold">
                                    {customPayments.length}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger 
                                value="people"
                                className="rounded-xl px-4 text-xs sm:text-sm font-semibold data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all gap-2"
                            >
                                <span>Person-wise</span>
                                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-muted text-muted-foreground font-bold">
                                    {uniquePeopleCount}
                                </span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="udaar" className="space-y-4 focus-visible:outline-none">
                        <DefaultHistoryTab
                            udaarList={udaarList}
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            setSortBy={setSortBy}
                            setSortOrder={setSortOrder}
                            handleEditUdaar={handleEditUdaar}
                            handleMarkAsPaid={handleMarkAsPaid}
                            handleDeleteUdaar={handleDeleteUdaar}
                            formatDate={formatDate}
                            onAddNewUdaar={() => setIsUdaarDialogOpen(true)}
                        />
                    </TabsContent>

                    <TabsContent value="payments" className="space-y-4 focus-visible:outline-none">
                        <CustomPaymentsTab
                            customPayments={customPayments}
                            handleTogglePaymentStatus={handleTogglePaymentStatus}
                            formatDate={formatDate}
                            onAddNewPayment={() => setIsPaymentDialogOpen(true)}
                        />
                    </TabsContent>

                    <TabsContent value="people" className="space-y-4 focus-visible:outline-none">
                        <PersonWiseTab
                            udaarList={udaarList}
                            handlePersonCardClick={handlePersonCardClick}
                            onAddNewUdaar={() => setIsUdaarDialogOpen(true)}
                        />
                    </TabsContent>
                </Tabs>

                <EditDefaultDialog
                    isOpen={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    personName={personName}
                    amount={amount}
                    description={description}
                    type={type}
                    setPersonName={setPersonName}
                    setAmount={setAmount}
                    setDescription={setDescription}
                    setType={setType}
                    onSubmit={handleUpdateUdaar}
                />

                <PersonDetailsDialog
                    isOpen={isPersonDetailsOpen}
                    onOpenChange={setIsPersonDetailsOpen}
                    selectedPerson={selectedPerson}
                    paymentHistory={paymentHistory}
                    handleEditUdaar={handleEditUdaar}
                    handleMarkAsPaid={handleMarkAsPaid}
                    handleDeleteUdaar={handleDeleteUdaar}
                    handlePartialPayment={handlePartialPayment}
                    handleSettlePerson={handleSettlePerson}
                    formatDate={formatDate}
                />
            </main>
        </div>
    );
};

export default Payments;
