import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ArrowUpRight, Eye, EyeOff } from 'lucide-react';

interface NetBalanceDisplayProps {
  netBalance: number;
}

const NetBalanceDisplay: React.FC<NetBalanceDisplayProps> = ({ netBalance }) => {
  const navigate = useNavigate();
  const [isBlurred, setIsBlurred] = useState(false);
  const isPositive = netBalance >= 0;
  const abs = Math.abs(netBalance);
  let whole = Math.trunc(abs);
  let paise = Math.round((abs - whole) * 100);
  if (paise >= 100) {
    whole += 1;
    paise = 0;
  }

  return (
    <div className="space-y-4">
      {/* Main Glass Balance Card */}
      <div className="relative bg-card/90 backdrop-blur-sm py-8 sm:py-12 px-6 sm:px-10 rounded-2xl shadow-sm border border-border/80 transition-all dark:dark-glass-card dark:rounded-[32px] overflow-hidden">
        {/* Subtle glass glare reflection overlay in dark mode */}
        <div 
          className="hidden dark:block pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-3/4 h-48 bg-gradient-to-b from-white/[0.12] via-white/[0.03] to-transparent rounded-full blur-xl" 
          aria-hidden="true"
        />

        {/* Card Header Row */}
        <div className="flex items-center justify-between mb-4 sm:mb-6 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-medium text-muted-foreground dark:text-zinc-400 tracking-wide">
              Your money
            </span>
            <button
              onClick={() => setIsBlurred(prev => !prev)}
              className="p-1 rounded-md text-muted-foreground/70 hover:text-foreground dark:text-zinc-500 hover:dark:text-zinc-200 transition-colors"
              title={isBlurred ? "Show balance" : "Hide balance"}
              aria-label={isBlurred ? "Show balance" : "Hide balance"}
            >
              {isBlurred ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium text-muted-foreground border border-border/60 bg-muted/40 dark:bg-white/[0.06] dark:border-white/[0.14] dark:text-zinc-300 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
            <span>Slice</span>
          </div>
        </div>

        {/* Big Balance Number */}
        <div className="text-left relative z-10 py-1 sm:py-3">
          <div
            onClick={() => setIsBlurred(prev => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsBlurred(prev => !prev);
              }
            }}
            title={isBlurred ? 'Click to show balance' : 'Click to hide balance'}
            className={`inline-block cursor-pointer select-none transition-all duration-300 text-5xl sm:text-7xl md:text-8xl font-black tracking-tight ${
              isPositive ? 'text-green-600' : 'text-red-600'
            } dark:silver-text-gradient ${isBlurred ? 'blur-md sm:blur-lg' : 'blur-none'}`}
          >
            {netBalance < 0 && '-'}<span className="font-extrabold mr-1">₹</span>{whole.toLocaleString('en-IN')}
            {paise > 0 && (
              <span className="text-[0.55em] font-bold align-baseline ml-0.5 opacity-90">
                .{String(paise).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pill Action Buttons (Identical to reference image) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <button
          onClick={() => navigate('/income')}
          className="group flex items-center justify-center gap-2 py-3.5 sm:py-4 px-4 sm:px-6 rounded-full font-medium text-sm sm:text-base border border-border bg-card/80 hover:bg-accent text-foreground shadow-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] dark:dark-glass-pill dark:text-zinc-200 hover:dark:text-white"
        >
          <Plus className="h-4 w-4 transition-transform group-hover:scale-125" />
          <span>+ add money</span>
        </button>

        <button
          onClick={() => navigate('/expense')}
          className="group flex items-center justify-center gap-2 py-3.5 sm:py-4 px-4 sm:px-6 rounded-full font-medium text-sm sm:text-base border border-border bg-card/80 hover:bg-accent text-foreground shadow-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] dark:dark-glass-pill dark:text-zinc-200 hover:dark:text-white"
        >
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          <span>transfer</span>
        </button>
      </div>
    </div>
  );
};

export default NetBalanceDisplay;
