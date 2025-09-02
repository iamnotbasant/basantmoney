
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Plus, Trash2, Tag } from 'lucide-react';
import { Category } from '@/types/finance';
import { useToast } from '@/hooks/use-toast';

const CategoryManager = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('income');
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6');

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
    '#F97316', '#EAB308', '#22C55E', '#14B8A6', '#0EA5E9', '#6366F1', '#A855F7', '#D946EF',
    '#F43F5E', '#64748B', '#78716C', '#6B7280', '#374151', '#1F2937', '#DC2626', '#B91C1C',
    '#059669', '#047857', '#0D9488', '#0F766E', '#0284C7', '#0369A1', '#7C3AED', '#6D28D9'
  ];

  useEffect(() => {
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories));
    } else {
      // Default categories
      const defaultCategories: Category[] = [
        { id: '1', name: 'Salary', type: 'income', color: '#10B981' },
        { id: '2', name: 'Freelance', type: 'income', color: '#3B82F6' },
        { id: '3', name: 'Investment', type: 'income', color: '#8B5CF6' },
        { id: '4', name: 'Food', type: 'expense', color: '#EF4444' },
        { id: '5', name: 'Transport', type: 'expense', color: '#F59E0B' },
        { id: '6', name: 'Entertainment', type: 'expense', color: '#EC4899' },
        { id: '7', name: 'Bills', type: 'expense', color: '#06B6D4' },
      ];
      setCategories(defaultCategories);
      localStorage.setItem('categories', JSON.stringify(defaultCategories));
    }
  }, []);

  const addCategory = () => {
    if (!newCategoryName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a category name",
        variant: "destructive",
      });
      return;
    }

    const newCategory: Category = {
      id: Date.now().toString(),
      name: newCategoryName.trim(),
      type: newCategoryType,
      color: newCategoryColor
    };

    const updatedCategories = [...categories, newCategory];
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));

    setNewCategoryName('');
    toast({
      title: "Success",
      description: "Category added successfully",
    });
  };

  const deleteCategory = (categoryId: string) => {
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));
    
    toast({
      title: "Success",
      description: "Category deleted successfully",
    });
  };

  const incomeCategories = categories.filter(cat => cat.type === 'income');
  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Tag className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Category Management</h2>
      </div>

      {/* Add New Category */}
      <div className="bg-card rounded-lg border p-4 space-y-4">
        <h3 className="font-medium">Add New Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="categoryName">Category Name</Label>
            <Input
              id="categoryName"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Enter category name"
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={newCategoryType} onValueChange={(value: 'income' | 'expense') => setNewCategoryType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Color</Label>
            <div className="space-y-3 mt-2">
              {/* Predefined Colors */}
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-full border-2 ${newCategoryColor === color ? 'border-foreground' : 'border-border'} hover:scale-110 transition-transform`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCategoryColor(color)}
                  />
                ))}
              </div>
              
              {/* Custom Color Input */}
              <div className="flex items-center gap-2">
                <Label htmlFor="customColor" className="text-sm text-muted-foreground">Custom:</Label>
                <Input
                  id="customColor"
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-16 h-8 p-1 rounded border cursor-pointer"
                />
                <span className="text-xs text-muted-foreground">{newCategoryColor}</span>
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <Button onClick={addCategory} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>
      </div>

      {/* Income Categories */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-medium mb-4">Income Categories</h3>
        <div className="flex flex-wrap gap-2">
          {incomeCategories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
                <button
                  onClick={() => deleteCategory(category.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Expense Categories */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-medium mb-4">Expense Categories</h3>
        <div className="flex flex-wrap gap-2">
          {expenseCategories.map((category) => (
            <div key={category.id} className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
                <button
                  onClick={() => deleteCategory(category.id)}
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

export default CategoryManager;
