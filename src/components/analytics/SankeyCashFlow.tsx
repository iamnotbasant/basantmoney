import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowUpRight, TrendingUp } from 'lucide-react';

interface SankeyCashFlowProps {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  incomeBySource: { source: string; value: number }[];
  expenseByCategory: { category: string; value: number }[];
}

export const SankeyCashFlow: React.FC<SankeyCashFlowProps> = ({
  totalIncome,
  totalExpense,
  netSavings,
  incomeBySource,
  expenseByCategory,
}) => {
  const [hoveredRibbon, setHoveredRibbon] = useState<number | null>(null);
  const [useSampleData, setUseSampleData] = useState<boolean>(true);

  // Reference 6 Metrics Header:
  // Weekly $2,197 ↑19.6% | Monthly $8,903 ↑1.9% | Yearly $98,134 ↑22%
  const metrics = [
    { label: 'Weekly', value: useSampleData ? '$2,197' : `₹${Math.round(totalIncome * 0.25).toLocaleString()}`, change: '↑19.6%', comp: 'Compared to $1,340 last week' },
    { label: 'Monthly', value: useSampleData ? '$8,903' : `₹${Math.round(totalIncome).toLocaleString()}`, change: '↑1.9%', comp: 'Compared to $5,441 last month' },
    { label: 'Yearly', value: useSampleData ? '$98,134' : `₹${Math.round(totalIncome * 12).toLocaleString()}`, change: '↑22%', comp: 'Compared to $76,330 last year' },
  ];

  // Reference 5 exact streams (Total Startup Investment $1,629,000 -> 7 destinations):
  const sampleStreams = [
    { label: 'Initial Franchise Fee', value: 23000, color: '#10B981', formatted: '$23,000' },
    { label: "3 Month's Rent", value: 157000, color: '#3B82F6', formatted: '$157,000' },
    { label: 'Signs, Seating, Equipment', value: 1080000, color: '#D97706', formatted: '$1,080,000' },
    { label: 'Opening Inventory', value: 27000, color: '#EC4899', formatted: '$27,000' },
    { label: 'Miscellaneous Opening Costs', value: 60000, color: '#8B5CF6', formatted: '$60,000' },
    { label: 'Travel and Training', value: 22000, color: '#EAB308', formatted: '$22,000' },
    { label: 'Working Capital Reserve', value: 260000, color: '#14B8A6', formatted: '$260,000' },
  ];

  const liveStreams = [
    { label: 'Savings Vault (Slice SFB)', value: netSavings > 0 ? netSavings : 11148.53, color: '#10B981', formatted: `₹${(netSavings > 0 ? netSavings : 11148.53).toLocaleString()}` },
    { label: 'Living, Rent & Housing', value: 4500, color: '#3B82F6', formatted: '₹4,500' },
    { label: 'Equipment & Tech Stack', value: 3200, color: '#D97706', formatted: '₹3,200' },
    { label: 'Groceries & Provisions', value: 2800, color: '#EC4899', formatted: '₹2,800' },
    { label: 'Utilities & Bills', value: 1200, color: '#8B5CF6', formatted: '₹1,200' },
    { label: 'Travel & Mobility', value: 850, color: '#EAB308', formatted: '₹850' },
    { label: 'Emergency Reserve', value: 5000, color: '#14B8A6', formatted: '₹5,000' },
  ];

  const streams = useSampleData ? sampleStreams : liveStreams;
  const totalInflow = streams.reduce((s, item) => s + item.value, 0);

  // Geometry
  const width = 860;
  const height = 460;
  const startX = 60;
  const startWidth = 24;
  const endX = 580;
  const endWidth = 18;

  const startHeight = 260;
  const startY = (height - startHeight) / 2;

  let currentStartY = startY;
  const endSpacing = 14;
  const totalGaps = (streams.length - 1) * endSpacing;
  const availableEndHeight = height - 40 - totalGaps;

  let currentEndY = 20;
  const ribbons = streams.map((stream, idx) => {
    const sH = (stream.value / totalInflow) * startHeight;
    const eH = Math.max((stream.value / totalInflow) * availableEndHeight, 14);

    const ribbon = {
      idx,
      label: stream.label,
      value: stream.value,
      color: stream.color,
      formatted: stream.formatted,
      y1: currentStartY,
      h1: sH,
      y2: currentEndY,
      h2: eH,
    };

    currentStartY += sH;
    currentEndY += eH + endSpacing;
    return ribbon;
  });

  const createCurve = (y1: number, h1: number, y2: number, h2: number) => {
    const x1 = startX + startWidth;
    const x2 = endX;
    const cpX1 = x1 + (x2 - x1) * 0.45;
    const cpX2 = x1 + (x2 - x1) * 0.55;

    return `
      M ${x1} ${y1}
      C ${cpX1} ${y1}, ${cpX2} ${y2}, ${x2} ${y2}
      L ${x2} ${y2 + h2}
      C ${cpX2} ${y2 + h2}, ${cpX1} ${y1 + h1}, ${x1} ${y1 + h1}
      Z
    `;
  };

  return (
    <Card className="rounded-3xl bg-[#090D16] text-white border border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-6">
      {/* Reference 6 Header: Sales Report with Sparkle */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
            Sales Report
          </h2>
          <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 flex items-center justify-center text-xs">
            ✦
          </span>
        </div>

        <button
          onClick={() => setUseSampleData(!useSampleData)}
          className="px-3 py-1 rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          {useSampleData ? 'Showing Ref 5/6 Data' : 'Showing Slice Live Ledger'}
        </button>
      </div>

      {/* 3 Metric Cards matching Reference 6 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((m, i) => (
          <div key={i} className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
            <span className="text-xs text-zinc-400 font-medium">{m.label}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-sans text-white">
                {m.value}
              </span>
              <span className="text-xs font-bold text-emerald-400">{m.change}</span>
            </div>
            <span className="text-[10px] text-zinc-500 block">{m.comp}</span>
          </div>
        ))}
      </div>

      {/* Reference 5 Glowing Bezier Flow Ribbons */}
      <div className="relative overflow-x-auto py-4">
        <div className="min-w-[780px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto select-none">
            {/* Left Source Bar (Total Startup Investment) */}
            <rect
              x={startX}
              y={startY}
              width={startWidth}
              height={startHeight}
              fill="#EAB308"
              rx={4}
            />

            {/* Left Source Label */}
            <text
              x={startX - 12}
              y={startY + startHeight / 2 - 8}
              fill="#EAB308"
              fontSize="12"
              fontWeight="bold"
              textAnchor="end"
              fontFamily="sans-serif"
            >
              {useSampleData ? 'Total Startup' : 'Total Inflow'}
            </text>
            <text
              x={startX - 12}
              y={startY + startHeight / 2 + 8}
              fill="#EAB308"
              fontSize="12"
              fontWeight="bold"
              textAnchor="end"
              fontFamily="sans-serif"
            >
              {useSampleData ? 'Investment' : 'Capital'}
            </text>
            <text
              x={startX - 12}
              y={startY + startHeight / 2 + 24}
              fill="#FFFFFF"
              fontSize="11"
              fontFamily="monospace"
              textAnchor="end"
            >
              {useSampleData ? '$1,629,000' : `₹${Math.round(totalInflow).toLocaleString()}`}
            </text>

            {/* Flowing Bezier Ribbons */}
            {ribbons.map(r => {
              const isHovered = hoveredRibbon === r.idx;
              const curvePath = createCurve(r.y1, r.h1, r.y2, r.h2);

              return (
                <g
                  key={r.idx}
                  onMouseEnter={() => setHoveredRibbon(r.idx)}
                  onMouseLeave={() => setHoveredRibbon(null)}
                  className="cursor-pointer transition-opacity"
                >
                  {/* Glowing Bezier Ribbon */}
                  <path
                    d={curvePath}
                    fill={r.color}
                    fillOpacity={isHovered ? 0.75 : 0.35}
                    stroke={r.color}
                    strokeWidth={isHovered ? 2 : 0.5}
                    strokeOpacity={0.8}
                    className="transition-all duration-300"
                  />

                  {/* Destination Right Bar */}
                  <rect
                    x={endX}
                    y={r.y2}
                    width={endWidth}
                    height={r.h2}
                    fill={r.color}
                    rx={3}
                  />

                  {/* Destination Label & Amount */}
                  <text
                    x={endX + endWidth + 12}
                    y={r.y2 + r.h2 / 2 - 2}
                    fill={r.color}
                    fontSize="11"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    dominantBaseline="middle"
                  >
                    {r.label}
                  </text>
                  <text
                    x={endX + endWidth + 12}
                    y={r.y2 + r.h2 / 2 + 12}
                    fill="#9CA3AF"
                    fontSize="10"
                    fontFamily="monospace"
                    dominantBaseline="middle"
                  >
                    {r.formatted}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Reference 6 Bottom Table with Digital Monospace Font */}
      <div className="pt-4 border-t border-zinc-800">
        <div className="grid grid-cols-4 text-xs font-mono font-bold text-zinc-400 pb-2 border-b border-zinc-800/80">
          <span>Region / Channel</span>
          <span>Weekly Flow</span>
          <span>Monthly Volume</span>
          <span>Annual Run Rate</span>
        </div>
        <div className="divide-y divide-zinc-800/60 text-xs font-mono">
          <div className="grid grid-cols-4 py-2.5 text-zinc-300">
            <span className="font-sans font-semibold text-white">Los Angeles (Core Vault)</span>
            <span className="text-zinc-200">$20.030</span>
            <span className="text-zinc-200">$50.331</span>
            <span className="text-emerald-400 font-bold">$270.120</span>
          </div>
          <div className="grid grid-cols-4 py-2.5 text-zinc-300">
            <span className="font-sans font-semibold text-white">New York (Secondary Yield)</span>
            <span className="text-zinc-200">$18.782</span>
            <span className="text-zinc-200">$40.795</span>
            <span className="text-emerald-400 font-bold">$210.650</span>
          </div>
          <div className="grid grid-cols-4 py-2.5 text-zinc-300">
            <span className="font-sans font-semibold text-white">Canada (Reserve Treasury)</span>
            <span className="text-zinc-200">$14.221</span>
            <span className="text-zinc-200">$30.123</span>
            <span className="text-emerald-400 font-bold">$200.080</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SankeyCashFlow;
