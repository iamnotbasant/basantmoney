import * as React from "react"

import { cn } from "@/lib/utils"

// Figma's 14px dot and the dot scaled to 12px, where the ring, the inside stroke and the shadows shrink with it
const SIZES = {
  14: {
    className: "relative inline-block size-3.5 shrink-0 overflow-hidden rounded-full [--dot-ring:transparent] transition-[background-color,box-shadow] duration-200",
    // Figma paints later effects on top; CSS paints the first shadow on top
    shadow: "shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)]",
  },
  12: {
    className: "relative inline-block size-3 shrink-0 rounded-full [--dot-ring:transparent]",
    shadow: "shadow-[0_6.171px_11.106px_-3.085px_rgb(38_45_58/0.2),0_0_0_0.857px_var(--dot-ring),inset_0_-3.085px_5.554px_-3.085px_rgb(0_0_0/0.05)]",
  },
}

type ChartLegendDotProps = React.ComponentProps<"span"> & {
  /** 14 (the default) or 12: the dot scaled down, with a 0.86px ring and stroke. */
  size?: 14 | 12
}

/**
 * The round legend swatch of the Keitoto chart cards (ChartLegendSwatch is the square one): 14px, a 1px ring (its
 * colour is the --dot-ring CSS variable, transparent unless set: `[--dot-ring:var(--primary-blue-500)]`), a soft drop
 * shadow, a faint inner shadow along the bottom and a 1px white inside stroke that fades out downward. `size={12}` is
 * the dot scaled to 12px. Set the fill with a background class.
 */
function ChartLegendDot({ size = 14, className, ...props }: ChartLegendDotProps) {
  // useId() may contain characters that don't belong in a url(#…) reference
  const gradient = `chart-legend-dot-${React.useId().replace(/[^\w-]/g, "")}`
  return (
    <span aria-hidden data-slot="chart-legend-dot" className={cn(SIZES[size].className, SIZES[size].shadow, className)} {...props}>
      {/* Figma: the inside stroke, white at 24% fading out toward the bottom */}
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0.24} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        {size === 12 ? (
          // a filled ring: Chrome draws strokes under 1px as shifted hairlines
          <path d="M6 0A6 6 0 1 1 6 12A6 6 0 1 1 6 0ZM6 0.857A5.143 5.143 0 1 0 6 11.143A5.143 5.143 0 1 0 6 0.857Z" fillRule="evenodd" fill={`url(#${gradient})`} />
        ) : (
          <circle cx="7" cy="7" r="6.5" fill="none" stroke={`url(#${gradient})`} strokeWidth={1} />
        )}
      </svg>
    </span>
  )
}

export { ChartLegendDot, type ChartLegendDotProps }
