import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Layers, Sparkles } from 'lucide-react';

interface PebbleMosaicChartProps {
  categories: { category: string; value: number }[];
  totalAmount: number;
}

export const PebbleMosaicChart: React.FC<PebbleMosaicChartProps> = ({
  categories,
  totalAmount,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const fallbackPebbles = [
    { category: 'Saving Vault', value: 11148.53, span: 'col-span-2 row-span-2' },
    { category: 'Dining & Cafes', value: 3400, span: 'col-span-1 row-span-1' },
    { category: 'Groceries', value: 5200, span: 'col-span-1 row-span-2' },
    { category: 'Utilities & Bills', value: 2400, span: 'col-span-1 row-span-1' },
    { category: 'Shopping', value: 1800, span: 'col-span-1 row-span-1' },
    { category: 'Transport', value: 1200, span: 'col-span-1 row-span-1' },
    { category: 'Subscriptions', value: 899, span: 'col-span-1 row-span-1' },
  ];

  const sourceData = categories.length > 0 ? categories.slice(0, 7) : fallbackPebbles;
  const safeTotal = totalAmount > 0 ? totalAmount : sourceData.reduce((s, i) => s + i.value, 0) || 1;

  // Organic pebble border radius classes
  const pebbleRadii = [
    'rounded-[38px_24px_42px_28px]',
    'rounded-[28px_44px_24px_38px]',
    'rounded-[44px_28px_36px_48px]',
    'rounded-[32px_46px_28px_40px]',
    'rounded-[48px_30px_42px_26px]',
    'rounded-[26px_38px_46px_30px]',
    'rounded-[40px_26px_30px_44px]',
  ];

  return (
    <Card className="ambient-glow-card relative overflow-hidden bg-card/90 dark:bg-black/50 border border-border/80 shadow-2xl rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Layers className="h-4 w-4" />
          </div>
          <CardTitle className="text-lg font-bold tracking-tight">
            Organic Pebble Treemap
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          Voronoi-inspired organic pebble tessellation (Reference 4 layout)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Organic Pebble Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 p-2 bg-muted/20 dark:bg-zinc-950/40 rounded-2xl border border-border/50">
          {sourceData.map((item, idx) => {
            const isHovered = hoveredIdx === idx;
            const pct = ((item.value / safeTotal) * 100).toFixed(0);
            const radiusClass = pebbleRadii[idx % pebbleRadii.length];
            const isBig = idx === 0;

            return (
              <div
                key={item.category}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`relative group cursor-pointer transition-all duration-300 p-4 flex flex-col justify-between border ${
                  isBig ? 'col-span-2 row-span-2 min-h-[160px]' : 'min-h-[100px]'
                } ${radiusClass} ${
                  isHovered
                    ? 'bg-zinc-100 dark:bg-zinc-800 border-primary/50 shadow-xl scale-[1.03] z-20'
                    : 'bg-zinc-50 dark:bg-zinc-900/90 border-border/80 hover:border-zinc-400 dark:hover:border-zinc-600'
                }`}
                style={{
                  boxShadow: isHovered ? '0 12px 24px -8px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
                    {item.category}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted font-bold">
                    {pct}%
                  </span>
                </div>

                <div className="mt-3">
                  <div className="text-sm sm:text-base font-bold font-mono text-foreground">
                    ₹{item.value.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {isBig ? 'Dominant Capital Pool' : 'Volume share'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center text-xs text-muted-foreground pt-1 flex items-center justify-center gap-1.5">
          <Sparkles className="h-3 w-3 text-emerald-500" />
          Click or hover on any organic pebble to inspect exact expenditure share
        </div>
      </CardContent>
    </Card>
  );
};

export default PebbleMosaicChart;
