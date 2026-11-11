import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ShieldCheck, Zap, Radio, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NeoGlassVitalsProps {
  savingsRate: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
}

export const NeoGlassVitals: React.FC<NeoGlassVitalsProps> = ({
  savingsRate,
  totalIncome,
  totalExpense,
  netSavings,
}) => {
  const navigate = useNavigate();

  // Financial Health Score (0 - 100)
  const healthScore = Math.min(Math.max(Math.round(50 + (savingsRate * 0.5)), 40), 99);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Card 1: Emerald Vitality (Reference 7 & 8) */}
      <div className="ambient-glow-card relative rounded-3xl p-5 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 overflow-hidden shadow-xl group hover:border-emerald-500/40 transition-all duration-300">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/25 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              Financial Vitality
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
            Optimal
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-dot-matrix text-emerald-600 dark:text-emerald-400">
            {healthScore}<span className="text-sm font-sans text-muted-foreground font-normal"> / 100</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Solid liquidity & disciplined burn
          </p>
        </div>
      </div>

      {/* Card 2: Sunset Coral Daily Interest Compound (Reference 7 & 8) */}
      <div className="ambient-glow-card relative rounded-3xl p-5 bg-gradient-to-b from-amber-500/10 via-rose-500/5 to-transparent border border-amber-500/20 overflow-hidden shadow-xl group hover:border-amber-500/40 transition-all duration-300">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/25 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Zap className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
              Daily SFB Yield
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
            5.50% p.a.
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-dot-matrix text-amber-600 dark:text-amber-400">
            ₹1.68<span className="text-xs font-sans text-muted-foreground font-normal"> / day</span>
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            ₹18.48 accrued up to 11 Nov 2026
          </p>
        </div>
      </div>

      {/* Card 3: Radiant Magenta Radar Rings (Reference 7 & 8) */}
      <div className="ambient-glow-card relative rounded-3xl p-5 bg-gradient-to-b from-pink-500/15 via-rose-500/10 to-transparent border border-pink-500/30 overflow-hidden shadow-xl group hover:border-pink-500/50 transition-all duration-300 flex flex-col justify-between">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-pink-500/30 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-pink-700 dark:text-pink-300 uppercase tracking-wider block">
              Auto Accumulator
            </span>
            <p className="text-[11px] text-muted-foreground">
              Slice Daily Interest Engine
            </p>
          </div>

          <button
            onClick={() => navigate('/income')}
            className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 shadow-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all text-pink-600 dark:text-pink-400"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Concentric Pulse Rings Graphic (from Reference 7 & 8) */}
        <div className="my-2 flex items-center justify-center relative py-2">
          <div className="w-16 h-16 rounded-full border border-pink-500/30 flex items-center justify-center animate-ping opacity-30 absolute" />
          <div className="w-12 h-12 rounded-full border-2 border-pink-500/40 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/50">
              <div className="w-2 h-2 rounded-full bg-yellow-300" />
            </div>
          </div>
        </div>

        <div className="text-center">
          <span className="text-[11px] font-mono font-bold text-pink-600 dark:text-pink-300">
            ((( LIVE COMPOUNDING )))
          </span>
        </div>
      </div>

      {/* Card 4: Savings Rate Velocity (Reference 7 & 8) */}
      <div className="ambient-glow-card relative rounded-3xl p-5 bg-gradient-to-b from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20 overflow-hidden shadow-xl group hover:border-blue-500/40 transition-all duration-300">
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/25 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
              Savings Efficiency
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">
            {savingsRate >= 20 ? 'Strong' : 'Moderate'}
          </span>
        </div>

        <div className="space-y-1">
          <div className="text-3xl sm:text-4xl font-dot-matrix text-blue-600 dark:text-blue-400">
            {savingsRate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground font-medium">
            Net Surplus: ₹{netSavings >= 0 ? `+${netSavings.toLocaleString()}` : netSavings.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NeoGlassVitals;
