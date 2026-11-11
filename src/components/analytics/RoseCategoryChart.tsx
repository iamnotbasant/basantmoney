import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from 'lucide-react';

interface RoseCategoryChartProps {
  categories: { category: string; value: number }[];
  totalAmount: number;
}

export const RoseCategoryChart: React.FC<RoseCategoryChartProps> = ({
  categories,
  totalAmount,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [useOriginalReferenceLabels, setUseOriginalReferenceLabels] = useState<boolean>(true);

  // Reference 3 original exact 8 petals:
  // Happiness: 12, Awe: 10, Admiration: 5, Surprise: 12, Sadness: 6, Fear: 4, Anger: 2, Anticipation: 5
  const originalPetals = [
    { label: 'Happiness', value: 12, maxCap: 15 },
    { label: 'Awe', value: 10, maxCap: 15 },
    { label: 'Admiration', value: 5, maxCap: 15 },
    { label: 'Surprise', value: 12, maxCap: 15 },
    { label: 'Sadness', value: 6, maxCap: 15 },
    { label: 'Fear', value: 4, maxCap: 15 },
    { label: 'Anger', value: 2, maxCap: 15 },
    { label: 'Anticipation', value: 5, maxCap: 15 },
  ];

  // Financial domain adaptation if user toggles
  const financialPetals = [
    { label: 'Main Vault', value: 12, maxCap: 15 },
    { label: 'SFB Yield', value: 10, maxCap: 15 },
    { label: 'Groceries', value: 5, maxCap: 15 },
    { label: 'Surplus', value: 12, maxCap: 15 },
    { label: 'Bills', value: 6, maxCap: 15 },
    { label: 'Rent', value: 4, maxCap: 15 },
    { label: 'Fuel', value: 2, maxCap: 15 },
    { label: 'Discretionary', value: 5, maxCap: 15 },
  ];

  const activeData = useOriginalReferenceLabels ? originalPetals : financialPetals;

  // Geometry
  const size = 440;
  const cx = size / 2;
  const cy = size / 2;
  const innerHoleRadius = 38;
  const maxOuterRadius = 180;
  const numPetals = 8;
  const angleStep = (2 * Math.PI) / numPetals;
  // Starting at -PI/2 (top) + angleStep/2 for centered top petal orientation
  const angleOffset = -Math.PI / 2;

  // Function to create rounded wedge path
  const createWedge = (rInner: number, rOuter: number, startAngle: number, endAngle: number, pad: number = 0.04) => {
    const a1 = startAngle + pad;
    const a2 = endAngle - pad;

    const x1 = cx + rInner * Math.cos(a1);
    const y1 = cy + rInner * Math.sin(a1);
    const x2 = cx + rOuter * Math.cos(a1);
    const y2 = cy + rOuter * Math.sin(a1);
    const x3 = cx + rOuter * Math.cos(a2);
    const y3 = cy + rOuter * Math.sin(a2);
    const x4 = cx + rInner * Math.cos(a2);
    const y4 = cy + rInner * Math.sin(a2);

    return `
      M ${x1} ${y1}
      L ${x2} ${y2}
      A ${rOuter} ${rOuter} 0 0 1 ${x3} ${y3}
      L ${x4} ${y4}
      A ${rInner} ${rInner} 0 0 0 ${x1} ${y1}
      Z
    `;
  };

  return (
    <Card className="rounded-3xl bg-[#1C1C1F] text-white border border-zinc-800 shadow-2xl p-6 sm:p-8 flex flex-col items-center justify-between min-h-[580px]">
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-zinc-800/80">
        <div>
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest block">
            REFERENCE 3 FIDELITY
          </span>
          <h3 className="text-xl font-extrabold text-white font-sans tracking-tight">
            Nightingale Rose Spectrum
          </h3>
        </div>

        <button
          onClick={() => setUseOriginalReferenceLabels(!useOriginalReferenceLabels)}
          className="px-3 py-1 rounded-full bg-zinc-800 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          {useOriginalReferenceLabels ? 'Showing Ref 3 Values' : 'Showing Financial Vault'}
        </button>
      </div>

      {/* SVG Rose Container */}
      <div className="my-6 relative flex items-center justify-center">
        <svg viewBox={`0 0 ${size} ${size}`} className="w-[360px] sm:w-[400px] h-auto select-none">
          {/* Background Center Cutout */}
          <circle cx={cx} cy={cy} r={innerHoleRadius} fill="#141416" />

          {/* 8 Sectors with Outer Dark Cap and Inner Light Fill */}
          {activeData.map((item, idx) => {
            const startAngle = idx * angleStep + angleOffset;
            const endAngle = (idx + 1) * angleStep + angleOffset;
            const midAngle = (startAngle + endAngle) / 2;

            // Outer cap radius
            const capRadius = maxOuterRadius;
            // Value scaled radius
            const valueRadius = innerHoleRadius + (item.value / 15) * (maxOuterRadius - innerHoleRadius);

            const isHovered = hoveredIdx === idx;

            // Coordinates for centered text
            const textDist = (innerHoleRadius + capRadius) / 2;
            const textX = cx + textDist * Math.cos(midAngle);
            const textY = cy + textDist * Math.sin(midAngle);

            // Path for outer dark cap
            const outerCapPath = createWedge(innerHoleRadius, capRadius, startAngle, endAngle);
            // Path for inner light/lavender petal
            const innerPetalPath = createWedge(innerHoleRadius, valueRadius, startAngle, endAngle);

            // In Reference 3:
            // Petals with high value (like 12 Happiness, 10 Awe, 12 Surprise) have light fill and dark text!
            // Petals with lower value (like 2 Anger, 4 Fear) have dark background showing through and light text!
            const isBrightPetal = item.value >= 8;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-pointer transition-transform duration-200"
                style={{
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                }}
              >
                {/* 1. Dark Outer Cap (Reference 3: Charcoal #4A4A52) */}
                <path
                  d={outerCapPath}
                  fill="#4A4A52"
                  className="transition-colors"
                />

                {/* 2. Light Inner Petal (Reference 3: Light Ivory/Lavender #EAE7F0) */}
                <path
                  d={innerPetalPath}
                  fill="#EAE7F0"
                  className="transition-all duration-300"
                />

                {/* 3. Text Inside Petal (Bold Number + Subtitle) */}
                <text
                  x={textX}
                  y={textY - 4}
                  fill={isBrightPetal ? '#1A1A1E' : '#FFFFFF'}
                  fontSize="16"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {item.value}
                </text>
                <text
                  x={textX}
                  y={textY + 12}
                  fill={isBrightPetal ? '#2A2A30' : '#CCCCCC'}
                  fontSize="10"
                  fontWeight="500"
                  textAnchor="middle"
                  fontFamily="sans-serif"
                >
                  {item.label}
                </text>
              </g>
            );
          })}

          {/* Center Circular Mask Ring */}
          <circle cx={cx} cy={cy} r={innerHoleRadius} fill="#18181B" stroke="#2C2C30" strokeWidth="2" />
        </svg>
      </div>

      {/* Footer Notes */}
      <div className="w-full text-center text-xs text-zinc-400 pt-3 border-t border-zinc-800">
        Exact 8-petal Nightingale Rose geometry with authentic dark caps and ivory value scaling
      </div>
    </Card>
  );
};

export default RoseCategoryChart;
