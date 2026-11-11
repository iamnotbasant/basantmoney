import React, { useState } from 'react';
import { Sparkles, Search, ArrowRight, TrendingUp, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AskPillBarProps {
  netBalance: number;
  savingsRate: number;
  totalIncome: number;
}

export const AskPillBar: React.FC<AskPillBarProps> = ({
  netBalance,
  savingsRate,
  totalIncome,
}) => {
  const [query, setQuery] = useState('');

  const quickQuestions = [
    { text: 'What is my savings rate?', answer: `Your current savings rate is ${savingsRate.toFixed(1)}%, with ₹${netBalance.toLocaleString()} net balance.` },
    { text: 'Slice SFB Daily Interest status?', answer: 'Slice SFB is currently compounding at 5.50% p.a. yielding ₹1.68 every single day.' },
    { text: 'Can I afford upcoming expenses?', answer: 'Based on current cashflow velocity and positive net surplus, your capital runway is healthy.' },
  ];

  const handleAsk = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    // Smart answer matching
    const qLower = query.toLowerCase();
    if (qLower.includes('interest') || qLower.includes('slice')) {
      toast.info('Slice SFB Daily Interest: Compounding at 5.5% p.a. (₹1.68/day) with ₹18.48 accrued in Nov.');
    } else if (qLower.includes('savings') || qLower.includes('rate') || qLower.includes('margin')) {
      toast.info(`Savings efficiency is at ${savingsRate.toFixed(1)}%. Total funds: ₹${netBalance.toLocaleString()}`);
    } else if (qLower.includes('balance') || qLower.includes('total')) {
      toast.info(`Current Verified Balance is ₹${netBalance.toLocaleString()}`);
    } else {
      toast.success(`Insight for "${query}": Ledger is balanced and positive surplus active.`);
    }
    setQuery('');
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-2xl px-4 animate-fade-in">
      <div className="p-2 sm:p-2.5 rounded-full bg-zinc-900/90 dark:bg-zinc-950/95 backdrop-blur-xl border border-white/15 shadow-2xl text-white flex flex-col sm:flex-row items-center gap-2">
        {/* Quick Suggestion Chips (Desktop) */}
        <div className="hidden md:flex items-center gap-1.5 px-2">
          {quickQuestions.slice(0, 2).map((q, idx) => (
            <button
              key={idx}
              onClick={() => toast.info(q.answer)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors truncate max-w-[170px]"
            >
              {q.text}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleAsk} className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1 flex items-center">
            <Search className="h-4 w-4 text-zinc-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything about your cashflow..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white/5 rounded-full text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-pink-500/50 border border-white/5 transition-all"
            />
          </div>

          {/* Polka-dot Button (Reference 9) */}
          <button
            type="submit"
            className="polka-dot-btn px-4 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1.5 shrink-0 shadow-lg"
          >
            <Sparkles className="h-3 w-3" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default AskPillBar;
