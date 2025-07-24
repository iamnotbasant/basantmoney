import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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

    return (
        <div className="min-h-screen bg-background">
            <header className="bg-background border-b border-border">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="mr-4">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <h1 className="text-xl font-semibold text-foreground">Payments & Default</h1>
                        </div>
                        <div className="flex gap-2">
                            <Dialog open={isUdaarDialogOpen} onOpenChange={setIsUdaarDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Default
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
                                    <Button>
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add Payment
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
            </header>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <PaymentSummaryCards udaarList={udaarList} customPayments={customPayments} />

                <Tabs defaultValue="udaar" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="udaar">Default History</TabsTrigger>
                        <TabsTrigger value="payments">Custom Payments</TabsTrigger>
                        <TabsTrigger value="people">Person-wise</TabsTrigger>
                    </TabsList>

                    <TabsContent value="udaar" className="space-y-4">
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
                        />
                    </TabsContent>

                    <TabsContent value="payments" className="space-y-4">
                        <CustomPaymentsTab
                            customPayments={customPayments}
                            handleTogglePaymentStatus={handleTogglePaymentStatus}
                            formatDate={formatDate}
                        />
                    </TabsContent>

                    <TabsContent value="people" className="space-y-4">
                        <PersonWiseTab
                            udaarList={udaarList}
                            handlePersonCardClick={handlePersonCardClick}
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
