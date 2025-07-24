
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, AlertTriangle, Save, RotateCcw, Target, TrendingUp, TrendingDown } from 'lucide-react';
import { ExpenseData } from '@/types/finance';
import { toast } from '@/hooks/use-toast';
import Header from '@/components/Header';

interface BudgetData {
  housing: number;
  food: number;
  transportation: number;
  entertainment: number;
  others: number;
}

interface CategorySpending {
  category: string;
  budget: number;
  spent: number;
  remaining: number;
  isOverBudget: boolean;
}

const Budgeting = () => {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState<BudgetData>({
    housing: 0,
    food: 0,
    transportation: 0,
    entertainment: 0,
    others: 0
  });
  const [categoryData, setCategoryData] = useState<CategorySpending[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const categories = [
    { key: 'housing', label: 'Housing' },
    { key: 'food', label: 'Food' },
    { key: 'transportation', label: 'Transportation' },
    { key: 'entertainment', label: 'Entertainment' },
    { key: 'others', label: 'Others' }
  ];

  useEffect(() => {
    loadBudgetData();
  }, []);

  useEffect(() => {
    calculateCategoryData();
  }, [budgets]);

  const loadBudgetData = () => {
    const storedBudgets = localStorage.getItem('budgets');
    if (storedBudgets) {
      setBudgets(JSON.parse(storedBudgets));
    } else {
      // Set default budgets
      const defaultBudgets: BudgetData = {
        housing: 20000,
        food: 8000,
        transportation: 5000,
        entertainment: 3000,
        others: 2000
      };
      setBudgets(defaultBudgets);
      localStorage.setItem('budgets', JSON.stringify(defaultBudgets));
    }
  };

  const getCurrentMonthExpenses = () => {
    const storedExpenses = localStorage.getItem('expenseData');
    if (!storedExpenses) return [];

    const expenses: ExpenseData[] = JSON.parse(storedExpenses);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    return expenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear;
    });
  };

  const calculateSpentByCategory = (category: string) => {
    const currentMonthExpenses = getCurrentMonthExpenses();
    const categoryKey = category.toLowerCase();
    
    return currentMonthExpenses
      .filter(expense => expense.category === categoryKey)
      .reduce((total, expense) => total + expense.amount, 0);
  };

  const calculateCategoryData = () => {
    const data: CategorySpending[] = categories.map(({ key, label }) => {
      const budget = budgets[key as keyof BudgetData] || 0;
      const spent = calculateSpentByCategory(label);
      const remaining = budget - spent;
      const isOverBudget = spent > budget && budget > 0;

      return {
        category: label,
        budget,
        spent,
        remaining,
        isOverBudget
      };
    });

    setCategoryData(data);
  };

  const handleBudgetChange = (category: string, value: string) => {
    const amount = parseFloat(value) || 0;
    const categoryKey = categories.find(cat => cat.label === category)?.key;
    
    if (categoryKey) {
      setBudgets(prev => ({
        ...prev,
        [categoryKey]: amount
      }));
      setHasUnsavedChanges(true);
    }
  };

  const saveBudgets = () => {
    localStorage.setItem('budgets', JSON.stringify(budgets));
    setHasUnsavedChanges(false);
    toast({
      title: "Budgets Saved",
      description: "Your budget settings have been updated successfully.",
    });
  };

  const resetBudgets = () => {
    const defaultBudgets: BudgetData = {
      housing: 20000,
      food: 8000,
      transportation: 5000,
      entertainment: 3000,
      others: 2000
    };
    setBudgets(defaultBudgets);
    setHasUnsavedChanges(true);
    toast({
      title: "Budgets Reset",
      description: "Budget values have been reset to defaults.",
    });
  };

  const getTotalBudget = () => {
    return Object.values(budgets).reduce((total, amount) => total + amount, 0);
  };

  const getTotalSpent = () => {
    return categoryData.reduce((total, category) => total + category.spent, 0);
  };

  const getOverBudgetCategories = () => {
    return categoryData.filter(category => category.isOverBudget);
  };

  const overBudgetCategories = getOverBudgetCategories();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Budget Management</h1>
          <p className="text-gray-600">Set and track your monthly spending limits by category</p>
        </div>

        {/* Over Budget Alert */}
        {overBudgetCategories.length > 0 && (
          <Alert className="mb-6 sm:mb-8 border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <strong>Budget Alert:</strong> You have exceeded the budget for: {overBudgetCategories.map(cat => cat.category).join(', ')}
            </AlertDescription>
          </Alert>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Budget</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    ₹{getTotalBudget().toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="ml-4 p-2 bg-blue-100 rounded-full">
                  <Target className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Total Spent</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">
                    ₹{getTotalSpent().toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="ml-4 p-2 bg-red-100 rounded-full">
                  <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500 mb-1">Remaining</p>
                  <p className={`text-xl sm:text-2xl font-bold ${getTotalBudget() - getTotalSpent() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{(getTotalBudget() - getTotalSpent()).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className={`ml-4 p-2 rounded-full ${getTotalBudget() - getTotalSpent() >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <TrendingUp className={`h-5 w-5 sm:h-6 sm:w-6 ${getTotalBudget() - getTotalSpent() >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget Management Card */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl">Monthly Budget by Category</CardTitle>
                <p className="text-sm text-gray-600 mt-1">Set spending limits for each category</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetBudgets}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button
                  size="sm"
                  onClick={saveBudgets}
                  disabled={!hasUnsavedChanges}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200">
                    <TableHead className="font-semibold text-gray-900">Category</TableHead>
                    <TableHead className="font-semibold text-gray-900">Monthly Budget</TableHead>
                    <TableHead className="font-semibold text-gray-900">Spent This Month</TableHead>
                    <TableHead className="font-semibold text-gray-900">Remaining</TableHead>
                    <TableHead className="font-semibold text-gray-900">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryData.map((category) => (
                    <TableRow
                      key={category.category}
                      className={`hover:bg-gray-50 border-gray-100 ${category.isOverBudget ? 'bg-red-50' : ''}`}
                    >
                      <TableCell className="font-medium text-gray-900">{category.category}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">₹</span>
                          <Input
                            type="number"
                            value={category.budget}
                            onChange={(e) => handleBudgetChange(category.category, e.target.value)}
                            className="w-32 h-9"
                            min="0"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">₹{category.spent.toLocaleString('en-IN')}</TableCell>
                      <TableCell className={`font-medium ${category.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ₹{category.remaining.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        {category.isOverBudget ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Over Budget
                          </span>
                        ) : category.budget > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            On Track
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            No Budget
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {categoryData.map((category) => (
                <div key={category.category} className={`p-4 hover:bg-gray-50 transition-colors ${category.isOverBudget ? 'bg-red-50' : ''}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">{category.category}</h3>
                    {category.isOverBudget ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Over Budget
                      </span>
                    ) : category.budget > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        On Track
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        No Budget
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Monthly Budget</label>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">₹</span>
                        <Input
                          type="number"
                          value={category.budget}
                          onChange={(e) => handleBudgetChange(category.category, e.target.value)}
                          className="flex-1 h-9"
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Spent:</span>
                        <span className="ml-1 font-medium text-gray-900">₹{category.spent.toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Remaining:</span>
                        <span className={`ml-1 font-medium ${category.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{category.remaining.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasUnsavedChanges && (
              <div className="m-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-700">
                  You have unsaved changes. Click "Save Changes" to update your budgets.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Budgeting;
