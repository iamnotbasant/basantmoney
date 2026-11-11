import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowRightLeft, Sparkles, TrendingUp, TrendingDown, Eye } from 'lucide-react';

export interface SankeyNode {
  id: string;
  label: string;
  value: number;
  color: string;
  category?: 'income' | 'hub' | 'expense' | 'savings';
}

export interface SankeyLink {
  sourceId: string;
  targetId: string;
  value: number;
  gradientId: string;
  colorFrom: string;
  colorTo: string;
}

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
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Normalize data for safe rendering
  const safeIncome = Math.max(totalIncome, 1);
  const topIncomes = incomeBySource
    .filter(i => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const topExpenses = expenseByCategory
    .filter(e => e.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // If no income, fallback to display placeholder flow
  const displayInflows = topIncomes.length > 0 ? topIncomes : [
    { source: 'Primary Bank Inflow', value: Math.max(safeIncome, 10000) }
  ];

  const displaySavings = Math.max(netSavings, 0);
  const displayOutflows = topExpenses.length > 0 ? topExpenses : [
    { category: 'General Expenses', value: Math.max(totalExpense, 5000) }
  ];

  // SVG canvas dimensions
  const width = 860;
  const height = 400;
  const nodeWidth = 20;

  // Node columns: Left (X=40), Middle (X=420), Right (X=780)
  const leftX = 40;
  const midX = 420;
  const rightX = 780;

  // Compute Left Nodes (Inflow Sources)
  const leftTotal = displayInflows.reduce((sum, item) => sum + item.value, 0) || 1;
  const leftUsableHeight = height - 60;
  const leftSpacing = 16;
  const totalLeftGaps = (displayInflows.length - 1) * leftSpacing;
  const leftAvailableForBars = Math.max(leftUsableHeight - totalLeftGaps, 100);

  const incomeColors = ['#10B981', '#06B6D4', '#3B82F6', '#8B5CF6', '#F59E0B'];
  let currentLeftY = 30;
  const leftNodes = displayInflows.map((item, idx) => {
    const barHeight = Math.max((item.value / leftTotal) * leftAvailableForBars, 28);
    const node = {
      id: `in-${idx}`,
      label: item.source,
      value: item.value,
      color: incomeColors[idx % incomeColors.length],
      x: leftX,
      y: currentLeftY,
      height: barHeight,
    };
    currentLeftY += barHeight + leftSpacing;
    return node;
  });

  // Center Hub Node (Total Cash Flow)
  const midHeight = Math.min(Math.max((safeIncome / (safeIncome + totalExpense)) * 260, 180), 300);
  const midY = (height - midHeight) / 2;
  const centerNode = {
    id: 'hub-main',
    label: 'Total Available Funds',
    value: totalIncome,
    color: '#6366F1',
    x: midX,
    y: midY,
    height: midHeight,
  };

  // Compute Right Nodes (Outflows & Savings)
  const rightItems = [
    ...(displaySavings > 0 ? [{ category: 'Savings / Main Vault', value: displaySavings, isSavings: true }] : []),
    ...displayOutflows.map(o => ({ ...o, isSavings: false }))
  ];

  const rightTotal = rightItems.reduce((sum, item) => sum + item.value, 0) || 1;
  const rightSpacing = 14;
  const totalRightGaps = (rightItems.length - 1) * rightSpacing;
  const rightAvailableForBars = Math.max(leftUsableHeight - totalRightGaps, 100);

  const expenseColors = ['#10B981', '#EC4899', '#F43F5E', '#FB923C', '#EAB308', '#A855F7', '#64748B'];
  let currentRightY = 30;
  const rightNodes = rightItems.map((item, idx) => {
    const barHeight = Math.max((item.value / rightTotal) * rightAvailableForBars, 26);
    const node = {
      id: `out-${idx}`,
      label: item.category,
      value: item.value,
      color: item.isSavings ? '#10B981' : expenseColors[idx % expenseColors.length],
      x: rightX,
      y: currentRightY,
      height: barHeight,
      isSavings: item.isSavings,
    };
    currentRightY += barHeight + rightSpacing;
    return node;
  });

  // Calculate Left -> Center Links
  let leftOffsetInMid = midY;
  const leftLinks = leftNodes.map((lNode, idx) => {
    const linkMidHeight = (lNode.value / leftTotal) * midHeight;
    const link = {
      id: idx,
      sourceId: lNode.id,
      targetId: centerNode.id,
      value: lNode.value,
      x1: lNode.x + nodeWidth,
      y1: lNode.y,
      h1: lNode.height,
      x2: centerNode.x,
      y2: leftOffsetInMid,
      h2: linkMidHeight,
      colorFrom: lNode.color,
      colorTo: centerNode.color,
      label: `${lNode.label} → Inflow`,
    };
    leftOffsetInMid += linkMidHeight;
    return link;
  });

  // Calculate Center -> Right Links
  let rightOffsetInMid = midY;
  const rightLinks = rightNodes.map((rNode, idx) => {
    const linkMidHeight = (rNode.value / rightTotal) * midHeight;
    const link = {
      id: 100 + idx,
      sourceId: centerNode.id,
      targetId: rNode.id,
      value: rNode.value,
      x1: centerNode.x + nodeWidth,
      y1: rightOffsetInMid,
      h1: linkMidHeight,
      x2: rNode.x,
      y2: rNode.y,
      h2: rNode.height,
      colorFrom: centerNode.color,
      colorTo: rNode.color,
      label: `Allocation → ${rNode.label}`,
    };
    rightOffsetInMid += linkMidHeight;
    return link;
  });

  // Helper to generate SVG cubic bezier ribbon path
  const createRibbonPath = (x1: number, y1: number, h1: number, x2: number, y2: number, h2: number) => {
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
    <Card className="ambient-glow-card relative overflow-hidden bg-card/90 dark:bg-black/50 border border-border/80 shadow-2xl rounded-2xl">
      {/* Background neon ambient glows (VisionOS style) */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="relative z-10 pb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">
              Interactive Cash Flow Sankey
            </CardTitle>
          </div>
          <CardDescription className="text-xs sm:text-sm mt-0.5">
            Real-time multi-stage money trajectory from Inflow sources to Allocations
          </CardDescription>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
            <TrendingUp className="h-3 w-3" />
            Inflows: ₹{totalIncome.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-medium">
            <TrendingDown className="h-3 w-3" />
            Outflows: ₹{totalExpense.toLocaleString()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative z-10 pt-2 pb-6">
        {/* SVG Container */}
        <div className="w-full overflow-x-auto pb-2">
          <div className="min-w-[760px] max-w-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto select-none"
              style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.05))' }}
            >
              <defs>
                {/* Linear Gradients for flowing ribbons */}
                {leftLinks.map(link => (
                  <linearGradient key={`grad-left-${link.id}`} id={`grad-left-${link.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={link.colorFrom} stopOpacity={hoveredLink === link.id ? 0.85 : 0.45} />
                    <stop offset="100%" stopColor={link.colorTo} stopOpacity={hoveredLink === link.id ? 0.85 : 0.45} />
                  </linearGradient>
                ))}
                {rightLinks.map(link => (
                  <linearGradient key={`grad-right-${link.id}`} id={`grad-right-${link.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={link.colorFrom} stopOpacity={hoveredLink === link.id ? 0.85 : 0.45} />
                    <stop offset="100%" stopColor={link.colorTo} stopOpacity={hoveredLink === link.id ? 0.85 : 0.45} />
                  </linearGradient>
                ))}
              </defs>

              {/* Render Left Links (Inflow -> Hub) */}
              {leftLinks.map(link => {
                const isHovered = hoveredLink === link.id;
                return (
                  <g key={`link-${link.id}`}>
                    <path
                      d={createRibbonPath(link.x1, link.y1, link.h1, link.x2, link.y2, link.h2)}
                      fill={`url(#grad-left-${link.id})`}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered ? 'drop-shadow(0 0 10px rgba(99,102,241,0.6))' : 'none',
                      }}
                      onMouseEnter={() => setHoveredLink(link.id)}
                      onMouseLeave={() => setHoveredLink(null)}
                    />
                  </g>
                );
              })}

              {/* Render Right Links (Hub -> Outflows) */}
              {rightLinks.map(link => {
                const isHovered = hoveredLink === link.id;
                return (
                  <g key={`link-${link.id}`}>
                    <path
                      d={createRibbonPath(link.x1, link.y1, link.h1, link.x2, link.y2, link.h2)}
                      fill={`url(#grad-right-${link.id})`}
                      className="transition-all duration-300 cursor-pointer"
                      style={{
                        filter: isHovered ? 'drop-shadow(0 0 10px rgba(236,72,153,0.6))' : 'none',
                      }}
                      onMouseEnter={() => setHoveredLink(link.id)}
                      onMouseLeave={() => setHoveredLink(null)}
                    />
                  </g>
                );
              })}

              {/* Render Left Nodes (Inflow Sources) */}
              {leftNodes.map(node => (
                <g
                  key={node.id}
                  className="cursor-pointer transition-transform"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={nodeWidth}
                    height={node.height}
                    rx={6}
                    fill={node.color}
                    className="transition-all duration-300 shadow-md"
                    style={{
                      filter: hoveredNode === node.id ? `drop-shadow(0 0 8px ${node.color})` : 'none',
                    }}
                  />
                  {/* Label */}
                  <text
                    x={node.x - 8}
                    y={node.y + node.height / 2 - 4}
                    textAnchor="end"
                    className="fill-foreground font-semibold text-xs transition-colors"
                  >
                    {node.label}
                  </text>
                  <text
                    x={node.x - 8}
                    y={node.y + node.height / 2 + 10}
                    textAnchor="end"
                    className="fill-muted-foreground text-[10px] font-mono"
                  >
                    ₹{node.value.toLocaleString()}
                  </text>
                </g>
              ))}

              {/* Render Center Hub Node */}
              <g
                className="cursor-pointer"
                onMouseEnter={() => setHoveredNode(centerNode.id)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <rect
                  x={centerNode.x}
                  y={centerNode.y}
                  width={nodeWidth}
                  height={centerNode.height}
                  rx={6}
                  fill={centerNode.color}
                  className="transition-all duration-300"
                  style={{
                    filter: hoveredNode === centerNode.id ? 'drop-shadow(0 0 14px rgba(99,102,241,0.8))' : 'none',
                  }}
                />
                <text
                  x={centerNode.x + nodeWidth / 2}
                  y={centerNode.y - 10}
                  textAnchor="middle"
                  className="fill-foreground font-bold text-xs"
                >
                  Total Volume
                </text>
                <text
                  x={centerNode.x + nodeWidth / 2}
                  y={centerNode.y + centerNode.height / 2 + 4}
                  textAnchor="middle"
                  className="fill-white font-mono text-[11px] font-bold"
                  transform={`rotate(-90, ${centerNode.x + nodeWidth / 2}, ${centerNode.y + centerNode.height / 2 + 4})`}
                >
                  ₹{safeIncome.toLocaleString()}
                </text>
              </g>

              {/* Render Right Nodes (Outflows & Savings) */}
              {rightNodes.map(node => (
                <g
                  key={node.id}
                  className="cursor-pointer transition-transform"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  <rect
                    x={node.x}
                    y={node.y}
                    width={nodeWidth}
                    height={node.height}
                    rx={6}
                    fill={node.color}
                    className="transition-all duration-300 shadow-md"
                    style={{
                      filter: hoveredNode === node.id ? `drop-shadow(0 0 8px ${node.color})` : 'none',
                    }}
                  />
                  {/* Label */}
                  <text
                    x={node.x + nodeWidth + 8}
                    y={node.y + node.height / 2 - 4}
                    textAnchor="start"
                    className="fill-foreground font-semibold text-xs transition-colors"
                  >
                    {node.label}
                  </text>
                  <text
                    x={node.x + nodeWidth + 8}
                    y={node.y + node.height / 2 + 10}
                    textAnchor="start"
                    className="fill-muted-foreground text-[10px] font-mono"
                  >
                    ₹{node.value.toLocaleString()} ({((node.value / rightTotal) * 100).toFixed(0)}%)
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Dynamic Interactive Legend Bar */}
        <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Inflows & Savings Reserve</span>
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 ml-2" />
            <span>Central Cashflow</span>
            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 ml-2" />
            <span>Category Deductions</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
            Hover over any path or category node to inspect flow
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SankeyCashFlow;
