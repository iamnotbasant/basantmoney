// Shared icon + colour pickers for the Settings managers (CategoryManager,
// PaymentMethodManager). Both use shadcn Popover: click the current
// icon/colour, pick a new one from the grid, done. The pickers are
// controlled from the parent (open state lives there so only one opens).
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CATEGORY_ICON_LIST, getCategoryIcon } from '@/lib/categoryIcons';
import { PALETTE } from '@/lib/categoryDefaults';
import { cn } from '@/lib/utils';

export const IconPickerButton = ({
  value,
  onChange,
  open,
  onOpenChange,
  title,
}: {
  value?: string;
  onChange: (key: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) => {
  const CurrentIcon = getCategoryIcon(value);
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          aria-label={title}
          className="h-8 w-8 shrink-0 rounded-md border border-border bg-background flex items-center justify-center text-foreground hover:bg-accent transition-colors"
        >
          <CurrentIcon className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[264px] p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground px-1 pb-2">Choose an icon</p>
        <div className="grid grid-cols-8 gap-1">
          {CATEGORY_ICON_LIST.map((opt) => {
            const OptIcon = opt.Icon;
            const selected = opt.key === value;
            return (
              <button
                key={opt.key}
                type="button"
                title={opt.label}
                aria-label={opt.label}
                onClick={() => {
                  onChange(opt.key);
                  onOpenChange(false);
                }}
                className={cn(
                  'h-8 w-8 rounded-md flex items-center justify-center text-foreground hover:bg-accent transition-colors',
                  selected && 'bg-primary/10 ring-2 ring-primary'
                )}
              >
                <OptIcon className="h-4 w-4" />
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const ColorPickerButton = ({
  value,
  onChange,
  open,
  onOpenChange,
  title,
}: {
  value: string;
  onChange: (hex: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
}) => {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          aria-label={title}
          className="h-8 w-8 shrink-0 rounded-full border-2 border-border hover:scale-110 transition-transform"
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[216px] p-2" align="start">
        <p className="text-xs font-medium text-muted-foreground px-1 pb-2">Choose a colour</p>
        <div className="flex flex-wrap gap-2">
          {PALETTE.map((c) => (
            <button
              key={c.hex}
              type="button"
              title={c.label}
              aria-label={c.label}
              onClick={() => {
                onChange(c.hex);
                onOpenChange(false);
              }}
              className={cn(
                'w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform',
                value.toUpperCase() === c.hex ? 'border-foreground' : 'border-border'
              )}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
