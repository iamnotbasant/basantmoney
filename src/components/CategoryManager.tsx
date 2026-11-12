import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  DEFAULT_CATEGORIES,
  migrateCategories,
} from '@/lib/categoryDefaults';
import { IconPickerButton, ColorPickerButton } from '@/components/CategoryPickers';

const CategoryManager = () => {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('income');
  const [newCategoryColor, setNewCategoryColor] = useState('#10B981');
  const [newCategoryIcon, setNewCategoryIcon] = useState('generic');
  // Which row's picker is open: `icon:<id>` / `color:<id>` / 'icon:new' / 'color:new'
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  const persist = (list: Category[]) => {
    setCategories(list);
    localStorage.setItem('categories', JSON.stringify(list));
    window.dispatchEvent(new Event('categoriesChanged'));
  };

  useEffect(() => {
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      const { list, changed } = migrateCategories(JSON.parse(storedCategories));
      setCategories(list);
      if (changed) localStorage.setItem('categories', JSON.stringify(list));
    } else {
      setCategories(DEFAULT_CATEGORIES);
      localStorage.setItem('categories', JSON.stringify(DEFAULT_CATEGORIES));
    }
  }, []);

  const updateCategory = (categoryId: string, patch: Partial<Category>) => {
    persist(categories.map((cat) => (cat.id === categoryId ? { ...cat, ...patch } : cat)));
  };

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
      color: newCategoryColor,
      icon: newCategoryIcon,
    };

    persist([...categories, newCategory]);
    setNewCategoryName('');
    toast({
      title: "Success",
      description: "Category added successfully",
    });
  };

  const deleteCategory = (categoryId: string) => {
    persist(categories.filter(cat => cat.id !== categoryId));
    toast({
      title: "Success",
      description: "Category deleted successfully",
    });
  };

  const incomeCategories = categories.filter(cat => cat.type === 'income');
  const expenseCategories = categories.filter(cat => cat.type === 'expense');

  const renderCategoryRow = (category: Category) => (
    <div key={category.id} className="flex items-center gap-2 rounded-lg border bg-card px-2 py-2">
      <IconPickerButton
        value={category.icon}
        onChange={(key) => updateCategory(category.id, { icon: key })}
        open={openPicker === `icon:${category.id}`}
        onOpenChange={(open) => setOpenPicker(open ? `icon:${category.id}` : null)}
        title={`Change icon for ${category.name}`}
      />
      <ColorPickerButton
        value={category.color}
        onChange={(hex) => updateCategory(category.id, { color: hex })}
        open={openPicker === `color:${category.id}`}
        onOpenChange={(open) => setOpenPicker(open ? `color:${category.id}` : null)}
        title={`Change colour for ${category.name}`}
      />
      <span className="flex-1 min-w-0 text-sm font-medium truncate">{category.name}</span>
      <button
        onClick={() => deleteCategory(category.id)}
        className="ml-1 hover:text-destructive shrink-0"
        aria-label={`Delete ${category.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Icon</Label>
            <IconPickerButton
              value={newCategoryIcon}
              onChange={setNewCategoryIcon}
              open={openPicker === 'icon:new'}
              onOpenChange={(open) => setOpenPicker(open ? 'icon:new' : null)}
              title="Choose an icon for the new category"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground">Colour</Label>
            <ColorPickerButton
              value={newCategoryColor}
              onChange={setNewCategoryColor}
              open={openPicker === 'color:new'}
              onOpenChange={(open) => setOpenPicker(open ? 'color:new' : null)}
              title="Choose a colour for the new category"
            />
            <span className="text-xs text-muted-foreground">{newCategoryColor}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Button onClick={addCategory}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </div>
      </div>

      {/* Income Categories */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-medium mb-4">Income Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {incomeCategories.map(renderCategoryRow)}
        </div>
      </div>

      {/* Expense Categories */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="font-medium mb-4">Expense Categories</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {expenseCategories.map(renderCategoryRow)}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
