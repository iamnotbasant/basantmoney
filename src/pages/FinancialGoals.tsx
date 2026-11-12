import React, { useState, useEffect, useMemo } from 'react';
import Header from '@/components/Header';
import AddGoalForm from '@/components/AddGoalForm';
import GoalCard from '@/components/GoalCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Target, TrendingUp, Sparkles, PiggyBank, Search, Filter } from 'lucide-react';
import { FinancialGoal } from '@/types/finance';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const FinancialGoals = () => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');

  // Load goals from localStorage on component mount
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const storedGoals = localStorage.getItem('financialGoals');
    if (storedGoals) {
      try {
        const parsed: FinancialGoal[] = JSON.parse(storedGoals);
        // If sample goals from 2025 exist, modernize their dates so they aren't permanently overdue
        const modernized = parsed.map(g => {
          if (g.id === 'goal-001' && g.targetDate.startsWith('2025')) {
            return { ...g, targetDate: `${currentYear + 1}-12-31` };
          }
          if (g.id === 'goal-002' && g.targetDate.startsWith('2025')) {
            return { ...g, targetDate: `${currentYear + 1}-06-30` };
          }
          return g;
        });
        setGoals(modernized);
      } catch {
        setGoals([]);
      }
    } else {
      // Initialize with sample data
      const sampleGoals: FinancialGoal[] = [
        {
          id: 'goal-001',
          title: 'Emergency Fund',
          targetAmount: 100000,
          savedAmount: 35000,
          targetDate: `${currentYear + 1}-12-31`,
          wallet: 'saving',
          status: 'active',
          description: '6 months emergency fund buffer for safety and peace of mind'
        },
        {
          id: 'goal-002',
          title: 'New Laptop',
          targetAmount: 85000,
          savedAmount: 42000,
          targetDate: `${currentYear + 1}-06-30`,
          wallet: 'wants',
          status: 'active',
          description: 'High performance laptop upgrade for work and side projects'
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
    const updatedGoals = [newGoal, ...goals];
    updateGoals(updatedGoals);
    setIsDialogOpen(false);
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

  // Aggregated Summary Metrics
  const summary = useMemo(() => {
    const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    const totalSaved = goals.reduce((sum, g) => sum + (g.savedAmount || 0), 0);
    const completedGoals = goals.filter(g => (g.savedAmount || 0) >= (g.targetAmount || 1)).length;
    const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
    return {
      totalTarget,
      totalSaved,
      completedGoals,
      activeGoals: goals.length - completedGoals,
      overallProgress
    };
  }, [goals]);

  // Filtered Goals
  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      const matchesSearch = goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (goal.description && goal.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const isCompleted = (goal.savedAmount || 0) >= (goal.targetAmount || 1);
      if (filterStatus === 'completed' && !isCompleted) return false;
      if (filterStatus === 'active' && isCompleted) return false;

      return matchesSearch;
    });
  }, [goals, searchQuery, filterStatus]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Header (No 'Back to Dashboard' button, clean and aligned with Transactions/Payments) */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Financial Goals
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground border border-border/60">
                {goals.length} {goals.length === 1 ? 'goal' : 'goals'}
              </span>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Set milestones, track your savings progress, and achieve your financial targets
            </p>
          </div>
          
          {/* Add Goal Dialog Trigger */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 px-5 gap-2 font-semibold shadow-sm rounded-xl">
                <Plus className="h-4 w-4" />
                <span>Add Goal</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <Target className="h-4 w-4" />
                  </div>
                  <span>Create Financial Goal</span>
                </DialogTitle>
                <DialogDescription>
                  Define a savings milestone with target amount and completion deadline.
                </DialogDescription>
              </DialogHeader>
              <AddGoalForm 
                onAddGoal={addGoal} 
                onCancel={() => setIsDialogOpen(false)} 
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
          {/* Total Saved */}
          <Card className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Saved</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <PiggyBank className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                ₹{summary.totalSaved.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                across all tracked goals
              </div>
            </CardContent>
          </Card>

          {/* Total Target */}
          <Card className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Target</span>
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Target className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                ₹{summary.totalTarget.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                combined goal value
              </div>
            </CardContent>
          </Card>

          {/* Overall Progress */}
          <Card className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Progress</span>
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {summary.overallProgress.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                ₹{Math.max(summary.totalTarget - summary.totalSaved, 0).toLocaleString('en-IN')} remaining
              </div>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card className="rounded-2xl border border-border/70 bg-card/60 backdrop-blur shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Milestones</span>
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-baseline gap-2">
                <span>{summary.completedGoals}</span>
                <span className="text-xs font-normal text-muted-foreground">achieved / {goals.length}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {summary.activeGoals} currently in progress
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter and Search Bar */}
        {goals.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-6">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search goals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-card border-border/70"
              />
            </div>

            {/* Status Pills */}
            <div className="inline-flex items-center gap-1 p-1 bg-muted/60 rounded-xl border border-border/60 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none",
                  filterStatus === 'all'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({goals.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('active')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none",
                  filterStatus === 'active'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                In Progress ({summary.activeGoals})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all select-none",
                  filterStatus === 'completed'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Achieved ({summary.completedGoals})
              </button>
            </div>
          </div>
        )}

        {/* Goals Grid */}
        {filteredGoals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal, index) => (
              <div 
                key={goal.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <GoalCard 
                  goal={goal} 
                  onUpdateGoal={updateGoal}
                  onDeleteGoal={deleteGoal}
                />
              </div>
            ))}
          </div>
        ) : goals.length > 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-border/80 rounded-2xl bg-card/40">
            <Filter className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="text-base font-semibold text-foreground mb-1">No matching goals</h3>
            <p className="text-xs text-muted-foreground mb-4">No goals match your current search or filter criteria.</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
              className="rounded-xl text-xs font-semibold"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="text-center py-20 px-4 border border-dashed border-border/80 rounded-3xl bg-card/30">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 text-primary mx-auto flex items-center justify-center mb-4">
              <Target className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">No goals created yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
              Create your first target savings goal—whether for an emergency fund, travel, electronics, or investments.
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="gap-2 font-semibold h-11 px-6 rounded-xl shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Goal</span>
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default FinancialGoals;
