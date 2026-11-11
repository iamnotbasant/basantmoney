import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X, Heart, ShieldCheck, Check } from 'lucide-react';

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
  const [useSampleData, setUseSampleData] = useState<boolean>(true);

  return (
    <div className="space-y-4">
      {/* Container with soft light background matching References 7 & 8 */}
      <div className="rounded-3xl p-6 sm:p-8 bg-[#EBECEF] dark:bg-[#121316] border border-zinc-200/80 dark:border-zinc-800 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-300/60 dark:border-zinc-800">
          <div>
            <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">
              REFERENCES 7 & 8 FIDELITY
            </span>
            <h3 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 font-sans tracking-tight">
              Apple / VisionOS Neo-Glass Vitals
            </h3>
          </div>

          <button
            onClick={() => setUseSampleData(!useSampleData)}
            className="px-3 py-1 rounded-full bg-white dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-100 transition-colors"
          >
            {useSampleData ? 'Showing Ref 7/8 Vitals' : 'Showing Financial Vault'}
          </button>
        </div>

        {/* Top Row: Green Glow Cards (103 mg/dl LDL Cholesterol & 43 ng/dl Vitamin D) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Card 1: Emerald Lush Green Glow Card (Reference 7 & 8) */}
          <div className="relative rounded-3xl p-6 bg-gradient-to-br from-[#1DB954] to-[#15803D] text-white shadow-xl overflow-hidden min-h-[160px] flex flex-col justify-between">
            {/* Ambient Radial Mesh Blur */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between z-10">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <Heart className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-emerald-100">Optimal</span>
            </div>

            <div className="space-y-0.5 z-10 pt-4">
              <div className="text-4xl sm:text-5xl font-dot-matrix tracking-tight font-bold text-white flex items-baseline gap-1">
                {useSampleData ? '103' : '101'}<span className="text-sm font-sans font-medium text-emerald-100">mg/dl</span>
              </div>
              <p className="text-xs text-emerald-100 font-medium font-sans">
                {useSampleData ? 'LDL Cholesterol' : 'SFB Liquidity Balance'}
              </p>
            </div>
          </div>

          {/* Card 2: Lime Lush Green Glow Card (Reference 7 & 8) */}
          <div className="relative rounded-3xl p-6 bg-gradient-to-br from-[#22C55E] to-[#16A34A] text-white shadow-xl overflow-hidden min-h-[160px] flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between z-10">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold text-green-100">Normal</span>
            </div>

            <div className="space-y-0.5 z-10 pt-4">
              <div className="text-4xl sm:text-5xl font-dot-matrix tracking-tight font-bold text-white flex items-baseline gap-1">
                {useSampleData ? '43' : '5.5'}<span className="text-sm font-sans font-medium text-green-100">{useSampleData ? 'ng/dL' : '% p.a.'}</span>
              </div>
              <p className="text-xs text-green-100 font-medium font-sans">
                {useSampleData ? 'Vitamin D' : 'Savings Interest Rate'}
              </p>
            </div>
          </div>
        </div>

        {/* Middle Row: Frosted Cards with Hot Pink Radar Pulse & Sunrise Amber (Reference 7 & 8) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Card 3: Upload Records / Existing Records */}
          <div className="rounded-3xl p-5 bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl border border-white/60 dark:border-zinc-700 shadow-lg flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block">Upload</span>
                <span className="text-xs text-zinc-500">Health Records</span>
              </div>
              <button className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="pt-6">
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Existing Records
              </div>
              <span className="text-[11px] text-zinc-400">2 files</span>
            </div>
          </div>

          {/* Card 4: Hot Pink Radial Center with Radar Pulse Concentric Circles (Reference 7 & 8) */}
          <div className="relative rounded-3xl p-5 bg-gradient-to-br from-[#FFE4E6] to-[#FECDD3] dark:from-[#37101B] dark:to-[#4C0519] border border-rose-200 dark:border-rose-900 shadow-lg flex flex-col justify-between overflow-hidden">
            {/* Ambient hot pink glow center */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 bg-[#FF2D78]/35 rounded-full blur-2xl" />
            </div>

            <div className="flex items-start justify-between z-10">
              <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Connect<br />Health Tracker
              </div>
              <button className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 shadow-sm flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Concentric Pulse Radar Rings from Reference 7 & 8 */}
            <div className="my-4 flex items-center justify-center relative py-2 z-10">
              <div className="w-16 h-16 rounded-full border border-rose-500/30 flex items-center justify-center animate-ping opacity-40 absolute" />
              <div className="w-14 h-14 rounded-full border-2 border-rose-500/40 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-[#FF2D78] flex items-center justify-center shadow-lg shadow-rose-500/50">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#A3E635]" />
                </div>
              </div>
            </div>

            <div className="text-center z-10">
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-300">
                (((( O ))))
              </span>
            </div>
          </div>

          {/* Card 5: Sunrise Orange Ambient Glow with Biological Age 25 (Reference 8) */}
          <div className="relative rounded-3xl p-5 bg-gradient-to-br from-[#FFEDD5] via-[#FED7AA] to-[#FDBA74] dark:from-[#451A03] dark:via-[#78350F] dark:to-[#9A3412] border border-amber-300 dark:border-amber-800 shadow-lg flex flex-col justify-between overflow-hidden">
            {/* Ambient orange glow */}
            <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/30 rounded-full blur-2xl pointer-events-none" />

            <div className="z-10">
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                Biological age
              </span>
              <div className="text-5xl font-dot-matrix font-bold text-amber-950 dark:text-amber-100 my-1">
                25
              </div>
              <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                2.5 years younger
              </span>
            </div>

            {/* Horizontal Tick Ruler Slider (Reference 8) */}
            <div className="flex items-center justify-between gap-1 pt-4 border-t border-amber-400/30 z-10">
              {[15, 20, 25, 30, 35, 40].map((tick, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`w-0.5 rounded-full ${tick === 25 ? 'h-4 bg-amber-950 dark:bg-white' : 'h-2 bg-amber-800/40'}`} />
                  <span className="text-[9px] font-mono text-amber-900 dark:text-amber-200">{tick}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row: Pending Results (7-10 Days) & Lab Draw (Reference 8) */}
        <div className="rounded-3xl p-6 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl border border-white/60 dark:border-zinc-700 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500">Your results are pending</span>
            </div>
            <div className="text-3xl font-bold font-sans text-zinc-900 dark:text-zinc-100 flex items-baseline gap-1">
              7-10 <span className="text-sm font-normal text-zinc-400">Days</span>
            </div>
            <p className="text-xs text-zinc-500">
              Until then your lab draw data is processed.
            </p>
          </div>

          {/* Test Tube Illustration Graphic */}
          <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center shrink-0 shadow-inner">
            <div className="w-4 h-9 rounded-full bg-amber-500/80 border-2 border-white dark:border-zinc-800 flex items-end justify-center p-0.5">
              <div className="w-full h-1/2 bg-rose-500 rounded-b-full" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default NeoGlassVitals;
