
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import AddGoalForm from '@/components/AddGoalForm';
import GoalCard from '@/components/GoalCard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { FinancialGoal } from '@/types/finance';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const FinancialGoals = () => {
  const navigate = useNavigate();
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Load goals from localStorage on component mount
  useEffect(() => {
    const storedGoals = localStorage.getItem('financialGoals');
    if (storedGoals) {
      setGoals(JSON.parse(storedGoals));
    } else {
      // Initialize with sample data
      const sampleGoals: FinancialGoal[] = [
        {
          id: 'goal-001',
          title: 'Emergency Fund',
          targetAmount: 100000,
          savedAmount: 25000,
          targetDate: '2025-12-31',
          wallet: 'saving',
          status: 'active',
          description: 'Build emergency fund for unexpected expenses'
        },
        {
          id: 'goal-002',
          title: 'New Laptop',
          targetAmount: 80000,
          savedAmount: 15000,
          targetDate: '2025-06-30',
          wallet: 'wants',
          status: 'active',
          description: 'Upgrade to a new laptop for work'
        }
      ];
      setGoals(sampleGoals);
      localStorage.setItem('financialGoals', JSON.stringify(sampleGoals));
    }
  }, []);

  const updateGoals = (newGoals: FinancialGoal[]) => {
    setGoals(newGoals);
    localStorage.setItem('financialGoals', JSON.stringify(newGoals));
  };

  const addGoal = (goal: Omit<FinancialGoal, 'id' | 'savedAmount' | 'status'>) => {
    const newGoal: FinancialGoal = {
      ...goal,
      id: `goal-${Date.now()}`,
      savedAmount: 0,
      status: 'active'
    };
    const updatedGoals = [...goals, newGoal];
    updateGoals(updatedGoals);
    setIsSheetOpen(false);
  };

  const updateGoal = (updatedGoal: FinancialGoal) => {
    const updatedGoals = goals.map(goal => 
      goal.id === updatedGoal.id ? updatedGoal : goal
    );
    updateGoals(updatedGoals);
  };

  const deleteGoal = (goalId: string) => {
    const updatedGoals = goals.filter(goal => goal.id !== goalId);
    updateGoals(updatedGoals);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Button>
            <h1 className="text-3xl font-bold text-foreground">Financial Goals</h1>
          </div>
          
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Goal</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>Add New Financial Goal</SheetTitle>
                <SheetDescription>
                  Set a new savings target and track your progress
                </SheetDescription>
              </SheetHeader>
              <AddGoalForm onAddGoal={addGoal} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Goals Grid */}
        {goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((goal, index) => (
              <div 
                key={goal.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <GoalCard 
                  goal={goal} 
                  onUpdateGoal={updateGoal}
                  onDeleteGoal={deleteGoal}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-medium">No goals yet</h3>
              <p className="text-sm">Start by creating your first financial goal</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FinancialGoals;
