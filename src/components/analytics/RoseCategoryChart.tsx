import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, PieChart, Info } from 'lucide-react';

interface RoseCategoryChartProps {
  categories: { category: string; value: number }[];
  totalAmount: number;
}

export const RoseCategoryChart: React.FC<RoseCategoryChartProps> = ({
  categories,
  totalAmount,
}) => {
  const [hoveredPetal, setHoveredPetal] = useState<number | null>(null);

  // Take top 8 categories (or pad with standard finance categories if fewer)
  const defaultCategories = [
    { category: 'Saving Vault', value: 18.48 },
    { category: 'Dining & Food', value: 340 },
    { category: 'Groceries', value: 650 },
    { category: 'Bills & Utilities', value: 450 },
    { category: 'Shopping', value: 200 },
    { category: 'Transport', value: 150 },
    { category: 'Subscriptions', value: 120 },
    { category: 'Personal', value: 80 },
  ];

  const processedData = categories.length >= 4 ? categories.slice(0, 8) : defaultCategories;
  const maxVal = Math.max(...processedData.map(c => c.value), 1);

  // Geometry calculations for 8 petals
  const size = 380;
  const cx = size / 2;
  const cy = size / 2;
  const numPetals = processedData.length;
  const anglePerPetal = (2 * Math.PI) / numPetals;
  const minRadius = 40;
  const maxRadius = 145;

  const petals = processedData.map((item, idx) => {
    const startAngle = idx * anglePerPetal - Math.PI / 2;
    const endAngle = startAngle + anglePerPetal;
    const midAngle = (startAngle + endAngle) / 2;

    // Petal radius scaled proportionally
    const r = minRadius + (item.value / maxVal) * (maxRadius - minRadius);

    // Generate smooth curved petal path
    const p1x = cx + minRadius * Math.cos(startAngle);
    const p1y = cy + minRadius * Math.sin(startAngle);

    const cp1x = cx + r * 1.15 * Math.cos(startAngle + anglePerPetal * 0.15);
    const cp1y = cy + r * 1.15 * Math.sin(startAngle + anglePerPetal * 0.15);

    const tipX = cx + r * Math.cos(midAngle);
    const tipY = cy + r * Math.sin(midAngle);

    const cp2x = cx + r * 1.15 * Math.cos(endAngle - anglePerPetal * 0.15);
    const cp2y = cy + r * 1.15 * Math.sin(endAngle - anglePerPetal * 0.15);

    const p2x = cx + minRadius * Math.cos(endAngle);
    const p2y = cy + minRadius * Math.sin(endAngle);

    const path = `
      M ${p1x} ${p1y}
      C ${cp1x} ${cp1y}, ${tipX} ${tipY}, ${tipX} ${tipY}
      C ${tipX} ${tipY}, ${cp2x} ${cp2y}, ${p2x} ${p2y}
      Z
    `;

    // Label coordinates
    const labelDist = r * 0.65;
    const labelX = cx + labelDist * Math.cos(midAngle);
    const labelY = cy + labelDist * Math.sin(midAngle);

    return {
      idx,
      category: item.category,
      value: item.value,
      percentage: totalAmount > 0 ? ((item.value / totalAmount) * 100).toFixed(0) : '12',
      path,
      labelX,
      labelY,
      tipX,
      tipY,
    };
  });

  return (
    <Card className="ambient-glow-card relative overflow-hidden bg-card/90 dark:bg-black/50 border border-border/80 shadow-2xl rounded-2xl flex flex-col justify-between">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <PieChart className="h-4 w-4" />
          </div>
          <CardTitle className="text-lg font-bold tracking-tight">
            Nightingale Rose Spectrum
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          Circular petal allocation inspired by emotional spectrum & polar analysis
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center justify-center p-2 relative">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[340px] h-auto select-none">
          <defs>
            {/* Subtle radial center glow */}
            <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Background Concentric Radar Rings */}
          <circle cx={cx} cy={cy} r={minRadius} fill="none" stroke="currentColor" strokeDasharray="3 3" className="stroke-muted-foreground/20" />
          <circle cx={cx} cy={cy} r={minRadius + (maxRadius - minRadius) * 0.5} fill="none" stroke="currentColor" strokeDasharray="3 3" className="stroke-muted-foreground/15" />
          <circle cx={cx} cy={cy} r={maxRadius} fill="none" stroke="currentColor" strokeDasharray="3 3" className="stroke-muted-foreground/10" />

          {/* Center Glow */}
          <circle cx={cx} cy={cy} r={maxRadius} fill="url(#centerGlow)" />

          {/* Petals */}
          {petals.map(petal => {
            const isHovered = hoveredPetal === petal.idx;
            const isDark = petal.idx % 2 === 0;

            return (
              <g
                key={petal.idx}
                className="cursor-pointer transition-all duration-300"
                onMouseEnter={() => setHoveredPetal(petal.idx)}
                onMouseLeave={() => setHoveredPetal(null)}
              >
                <path
                  d={petal.path}
                  className={`transition-all duration-300 ${
                    isHovered
                      ? 'fill-purple-500/80 stroke-purple-400 stroke-2'
                      : isDark
                      ? 'fill-zinc-800/80 dark:fill-zinc-800/90 stroke-zinc-700/50 stroke-1 hover:fill-purple-500/50'
                      : 'fill-zinc-200/90 dark:fill-zinc-700/70 stroke-zinc-400/40 dark:stroke-zinc-600/50 stroke-1 hover:fill-purple-400/60'
                  }`}
                  style={{
                    filter: isHovered ? 'drop-shadow(0 0 12px rgba(168,85,247,0.5))' : 'none',
                    transformOrigin: `${cx}px ${cy}px`,
                    transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  }}
                />

                {/* Text inside petal */}
                <text
                  x={petal.labelX}
                  y={petal.labelY - 5}
                  textAnchor="middle"
                  className={`text-xs font-bold font-mono transition-colors pointer-events-none ${
                    isHovered
                      ? 'fill-white'
                      : isDark
                      ? 'fill-zinc-300 dark:fill-zinc-200'
                      : 'fill-zinc-800 dark:fill-zinc-100'
                  }`}
                >
                  ₹{petal.value > 1000 ? `${(petal.value / 1000).toFixed(1)}k` : Math.round(petal.value)}
                </text>
                <text
                  x={petal.labelX}
                  y={petal.labelY + 9}
                  textAnchor="middle"
                  className={`text-[9px] font-medium transition-colors pointer-events-none truncate max-w-[60px] ${
                    isHovered
                      ? 'fill-white/90'
                      : isDark
                      ? 'fill-zinc-400'
                      : 'fill-zinc-600 dark:fill-zinc-300'
                  }`}
                >
                  {petal.category.slice(0, 9)}
                </text>
              </g>
            );
          })}

          {/* Central Core Pin */}
          <circle cx={cx} cy={cy} r={14} className="fill-background stroke-border stroke-2 shadow-inner" />
          <circle cx={cx} cy={cy} r={6} className="fill-purple-500 animate-pulse" />
        </svg>

        {/* Hovered Category Detail Pill */}
        <div className="w-full mt-2 pt-2 border-t border-border/50 text-center text-xs">
          {hoveredPetal !== null ? (
            <span className="font-semibold text-foreground">
              {petals[hoveredPetal].category}:{' '}
              <strong className="text-purple-600 dark:text-purple-400">
                ₹{petals[hoveredPetal].value.toLocaleString()}
              </strong>{' '}
              ({petals[hoveredPetal].percentage}% of budget)
            </span>
          ) : (
            <span className="text-muted-foreground flex items-center justify-center gap-1.5">
              <Sparkles className="h-3 w-3 text-purple-500" />
              Hover on any petal to reveal category weight
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoseCategoryChart;
