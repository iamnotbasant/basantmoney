import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Layers } from 'lucide-react';

interface PebbleMosaicChartProps {
  categories: { category: string; value: number }[];
  totalAmount: number;
}

export const PebbleMosaicChart: React.FC<PebbleMosaicChartProps> = ({
  categories,
  totalAmount,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [useOriginalPebbles, setUseOriginalPebbles] = useState<boolean>(true);

  // Exact 18 pebbles from Reference 4
  const referencePebbles = [
    { name: 'Hip-Hop', weight: 'col-span-2 row-span-2', radius: 'rounded-[44px_38px_50px_40px]' },
    { name: 'Pop', weight: 'col-span-2 row-span-2', radius: 'rounded-[38px_48px_40px_52px]' },
    { name: 'R&B', weight: 'col-span-2 row-span-2', radius: 'rounded-[46px_40px_54px_36px]' },
    { name: 'Rock', weight: 'col-span-2 row-span-2', radius: 'rounded-[40px_52px_38px_46px]' },
    { name: 'Indie', weight: 'col-span-1 row-span-1', radius: 'rounded-[36px_42px_32px_44px]' },
    { name: 'Jazz', weight: 'col-span-1 row-span-1', radius: 'rounded-[42px_36px_44px_34px]' },
    { name: 'Dance', weight: 'col-span-2 row-span-1', radius: 'rounded-[50px_36px_46px_42px]' },
    { name: 'Latin', weight: 'col-span-1 row-span-2', radius: 'rounded-[38px_44px_42px_48px]' },
    { name: 'Country', weight: 'col-span-1 row-span-2', radius: 'rounded-[44px_38px_48px_36px]' },
    { name: 'K-Pop', weight: 'col-span-1 row-span-1', radius: 'rounded-[36px_46px_34px_42px]' },
    { name: 'Punk', weight: 'col-span-1 row-span-1', radius: 'rounded-[42px_34px_46px_38px]' },
    { name: 'Blues', weight: 'col-span-1 row-span-1', radius: 'rounded-[38px_42px_36px_44px]' },
    { name: 'Folk', weight: 'col-span-1 row-span-1', radius: 'rounded-[44px_36px_42px_38px]' },
    { name: 'Metal', weight: 'col-span-1 row-span-1', radius: 'rounded-[36px_44px_38px_42px]' },
    { name: 'Classical', weight: 'col-span-1 row-span-1', radius: 'rounded-[42px_38px_44px_36px]' },
    { name: 'Soul', weight: 'col-span-1 row-span-1', radius: 'rounded-[38px_42px_36px_40px]' },
    { name: 'Reggae', weight: 'col-span-1 row-span-1', radius: 'rounded-[40px_36px_44px_38px]' },
    { name: 'Gospel', weight: 'col-span-1 row-span-1', radius: 'rounded-[36px_40px_38px_42px]' },
  ];

  // Financial domain adaptation
  const financialPebbles = [
    { name: 'Savings Vault', weight: 'col-span-2 row-span-2', radius: 'rounded-[44px_38px_50px_40px]', val: '₹11,148' },
    { name: 'Groceries', weight: 'col-span-2 row-span-2', radius: 'rounded-[38px_48px_40px_52px]', val: '₹6,400' },
    { name: 'Living & Rent', weight: 'col-span-2 row-span-2', radius: 'rounded-[46px_40px_54px_36px]', val: '₹8,500' },
    { name: 'Investments', weight: 'col-span-2 row-span-2', radius: 'rounded-[40px_52px_38px_46px]', val: '₹5,000' },
    { name: 'SFB Yield', weight: 'col-span-1 row-span-1', radius: 'rounded-[36px_42px_32px_44px]', val: '₹18.48' },
    { name: 'Dining', weight: 'col-span-1 row-span-1', radius: 'rounded-[42px_36px_44px_34px]', val: '₹3,200' },
    { name: 'Utilities', weight: 'col-span-2 row-span-1', radius: 'rounded-[50px_36px_46px_42px]', val: '₹2,400' },
    { name: 'Shopping', weight: 'col-span-1 row-span-2', radius: 'rounded-[38px_44px_42px_48px]', val: '₹1,800' },
    { name: 'Transport', weight: 'col-span-1 row-span-2', radius: 'rounded-[44px_38px_48px_36px]', val: '₹1,200' },
    { name: 'Tech & Gear', weight: 'col-span-1 row-span-1', radius: 'rounded-[36px_46px_34px_42px]', val: '₹4,500' },
    { name: 'Subscriptions', weight: 'col-span-1 row-span-1', radius: 'rounded-[42px_34px_46px_38px]', val: '₹899' },
    { name: 'Health', weight: 'col-span-1 row-span-1', radius: 'rounded-[38px_42px_36px_44px]', val: '₹1,500' },
    { name: 'Emergency', weight: 'col-span-1 row-span-1', radius: 'rounded-[44px_36px_42px_38px]', val: '₹10,000' },
    { name: 'Travel', weight: 'col-span-1 row-span-1', radius: 'rounded-[36px_44px_38px_42px]', val: '₹3,000' },
    { name: 'Gifts', weight: 'col-span-1 row-span-1', radius: 'rounded-[42px_38px_44px_36px]', val: '₹500' },
    { name: 'Fitness', weight: 'col-span-1 row-span-1', radius: 'rounded-[38px_42px_36px_40px]', val: '₹1,200' },
    { name: 'Books', weight: 'col-span-1 row-span-1', radius: 'rounded-[40px_36px_44px_38px]', val: '₹600' },
    { name: 'Buffer', weight: 'col-span-1 row-span-1', radius: 'rounded-[36px_40px_38px_42px]', val: '₹2,000' },
  ];

  const pebbles = useOriginalPebbles ? referencePebbles : financialPebbles;

  return (
    <Card className="rounded-3xl bg-black text-white border border-zinc-900 shadow-2xl p-6 sm:p-8 flex flex-col justify-between min-h-[580px]">
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-900">
        <div>
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest block">
            REFERENCE 4 FIDELITY
          </span>
          <h3 className="text-xl font-extrabold text-white font-sans tracking-tight">
            Organic Pebble Voronoi Treemap
          </h3>
        </div>

        <button
          onClick={() => setUseOriginalPebbles(!useOriginalPebbles)}
          className="px-3 py-1 rounded-full bg-zinc-900 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
        >
          {useOriginalPebbles ? 'Showing Ref 4 Genres' : 'Showing Financial Vault'}
        </button>
      </div>

      {/* The Pure Black Canvas with Off-White Pebbles (Reference 4) */}
      <div className="my-6 p-4 rounded-3xl bg-black border border-zinc-900 overflow-hidden">
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 auto-rows-[70px]">
          {pebbles.map((p: any, idx) => {
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`cursor-pointer transition-all duration-300 flex flex-col items-center justify-center p-3 text-center bg-[#F4F4F2] text-black ${p.weight} ${p.radius} ${
                  isHovered ? 'scale-105 shadow-2xl bg-white z-20 ring-2 ring-zinc-400' : 'hover:scale-[1.02]'
                }`}
              >
                <span className="font-semibold text-xs sm:text-sm tracking-tight font-sans">
                  {p.name}
                </span>
                {p.val && (
                  <span className="text-[10px] font-mono text-zinc-500 font-bold block mt-0.5">
                    {p.val}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Notes */}
      <div className="w-full text-center text-xs text-zinc-500 pt-3 border-t border-zinc-900">
        Organic smooth Voronoi pebble shapes with narrow dark channels and fluid stone boundaries
      </div>
    </Card>
  );
};

export default PebbleMosaicChart;
