"use client"

import { animate, stagger, utils, type JSAnimation } from "animejs"
import * as React from "react"

import { ChartButton } from "@/components/ui/chart-button"
import { ChartCard } from "@/components/ui/chart-card"
import { DotsHorizontalIcon } from "@/components/ui/chart-icons"
import { releaseStyles, useChartEntrance, useCountUp, useInView, useIsomorphicLayoutEffect, useReducedMotion } from "@/hooks/use-chart-motion"
import { useChartSize } from "@/hooks/use-chart-size"
import { useControllableState } from "@/hooks/use-controllable-state"
import { formatCompactCurrency, formatCurrency } from "@/lib/chart-format"
import { barTicks, starPath } from "@/lib/chart-series"
import { cn } from "@/lib/utils"

type CashFlowBarColor = "purple" | "blue" | "green" | "orange"

/** One bar of every month: what it measures and its colour while its month is highlighted (it is grey otherwise). */
type CashFlowBarSeries = {
  id: string
  label: string
  color?: CashFlowBarColor
}

type CashFlowBarMonth = {
  /** Axis label ("Jan"). */
  label: string
  /** One amount per series, by series id; a missing one is 0. */
  values: Record<string, number>
}

type CashFlowMonthlyBarChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  title?: string
  /** The soft line under the title. */
  description?: string
  /** The bars of each month, left to right. */
  series?: CashFlowBarSeries[]
  data?: CashFlowBarMonth[]
  /** The y-axis values, lowest first (one grid line each). Six round values from $0 by default. */
  ticks?: number[]
  /** The highlighted month (an index into `data`). */
  index?: number
  /** The month with the tallest bar by default. */
  defaultIndex?: number
  onIndexChange?: (index: number, month: CashFlowBarMonth) => void
  /** Called by the ⋯ button. */
  onMoreClick?: () => void
  locale?: string
  currency?: string
}

// Figma geometry ("Cash Flow Monthly Bar Chart" 1473:83003)
const PLOT_WIDTH = 594
const PLOT_HEIGHT = 280
const INSET = 8 // the bars run from 8px in on the left to 8px in on the right
const BAR_WIDTH = 32 // at most; narrower when the months don't fit
const BAR_GAP = 8 // between the bars of a month
const GROUP_GAP = 16 // the least space between two months
const LIFT = 4 // the bars stand 4px above the $0 line
const MIN_BAR = 6 // a small amount still shows
const TICK_COUNT = 6
const TIP_GAP = 8 // between the month's bars and the tooltip
const TIP_DROP = 6 // the tooltip's top is 6px under the taller bar's top
const TIP_PADDING_X = 24 // the tooltip's 12px side padding, twice
const TIP_PADDING_Y = 16 // and its 8px top and bottom padding
const TIP_ROW = 36 // a row (20) and the gaps around the divider under it (8 + 8)
const GLINT = 64 // the glint's box, below the bar until it sweeps up
const SHINE_DELAY = 750 // a month has to stay highlighted this long before its shine loops start (its streak has swelled by then)

const MONTH = '[data-slot="cash-flow-monthly-bar-chart-bar"]'
// Figma's blurs are Gaussians with a standard deviation of 0.45 × their radius (fitted against the Figma render): a
// layer blur r is CSS blur(0.45r), a shadow of radius r a box-shadow blur of 0.9r (the bar's 30.85 inner glow is 27.8px).

/** The highlighted look of a series: Figma's two (purple and blue) and two more in the same recipe. */
type Tone = {
  /** The bar's fill, top to bottom. */
  fill: string
  /** The soft drop shadow and the 1px ring (the white inner glow is the same for all, on top of the bar's content). */
  shadow: string
  /** The light streak in the middle (added with plus-lighter). */
  glow: string
  /** The tooltip swatch's inner glow (over its streak), its 0.5px ring and its light streak. */
  swatch: string
  swatchRing: string
  dot: string
}

const tones: Record<CashFlowBarColor, Tone> = {
  purple: {
    fill: "from-primary-purple-400 via-primary-purple-600 to-primary-purple-700",
    shadow: "shadow-[0_6.171px_11.1px_-3.085px_rgb(38_45_58/0.2),0_0_0_1px_#9c3aff]",
    glow: "bg-primary-purple-600",
    swatch: "shadow-[inset_0_0_7.2px_rgb(255_255_255/0.46)]",
    swatchRing: "fill-[#9c3aff]",
    dot: "bg-primary-purple-500",
  },
  blue: {
    fill: "from-primary-blue-300 via-primary-blue-500 to-primary-blue-600",
    shadow: "shadow-[0_6.171px_11.1px_-3.085px_rgb(38_45_58/0.2),0_0_0_1px_var(--primary-blue-500)]",
    glow: "bg-primary-blue-500",
    swatch: "shadow-[inset_0_0_27.8px_rgb(255_255_255/0.46)]",
    swatchRing: "fill-primary-blue-500",
    dot: "bg-primary-blue-500",
  },
  green: {
    fill: "from-primary-green-300 via-primary-green-500 to-primary-green-600",
    shadow: "shadow-[0_6.171px_11.1px_-3.085px_rgb(38_45_58/0.2),0_0_0_1px_var(--primary-green-500)]",
    glow: "bg-primary-green-500",
    swatch: "shadow-[inset_0_0_7.2px_rgb(255_255_255/0.46)]",
    swatchRing: "fill-primary-green-500",
    dot: "bg-primary-green-500",
  },
  orange: {
    fill: "from-primary-orange-300 via-primary-orange-500 to-primary-orange-600",
    shadow: "shadow-[0_6.171px_11.1px_-3.085px_rgb(38_45_58/0.2),0_0_0_1px_var(--primary-orange-500)]",
    glow: "bg-primary-orange-500",
    swatch: "shadow-[inset_0_0_7.2px_rgb(255_255_255/0.46)]",
    swatchRing: "fill-primary-orange-500",
    dot: "bg-primary-orange-500",
  },
}

type Sparkle = { x: number; y: number; rx: number; ry: number; star?: boolean; dim?: boolean }

// Figma "stars": a 221 × 172 field of white dots and four-point stars, laid over each highlighted bar twice (the second
// copy 163.66px lower) and clipped by it. These are the ones that can show inside a 32px bar, by their centres in the
// field's coordinates; `dim` ones are at 10% in the lower copy.
const SPARKLES: Sparkle[] = [
  { x: 54.079, y: 9.656, rx: 1.37917, ry: 1.27012 },
  { x: 58.756, y: 117.053, rx: 1.37917, ry: 1.27012, dim: true },
  { x: 27.58, y: 57.951, rx: 1.37917, ry: 1.27012, dim: true },
  { x: 62.3185, y: 40.173, rx: 0.9195, ry: 0.847, star: true },
  { x: 62.9395, y: 133.7135, rx: 0.459596, ry: 0.423256, dim: true },
  { x: 75.5395, y: 22.2405, rx: 0.459596, ry: 0.423256 },
  { x: 62.4265, y: 89.9905, rx: 0.459596, ry: 0.423256, dim: true },
  { x: 41.5505, y: 29.7715, rx: 0.459596, ry: 0.423256 },
  { x: 57.4735, y: 59.1185, rx: 0.459596, ry: 0.423256 },
  { x: 27.753, y: 141.24, rx: 1.37917, ry: 1.27012, dim: true },
  { x: 33.9485, y: 105.7015, rx: 0.459596, ry: 0.423256, dim: true },
]
const STAR = SPARKLES.find((sparkle) => sparkle.star) ?? SPARKLES[0]
const SPARKLE_PERIOD = 163.659
const TWINKLE_GROUPS = 3
// Where the field sits on the first and the second bar of a month (Figma's purple and blue bar)
const SPARKLE_OFFSETS = [
  { x: -41.824, y: -2.029 },
  { x: -38.816, y: -21.029 },
]
// Bottom to top: the lower copy blurred (20%) and sharp (40% of dots at 50%), then the upper copy blurred (50%) and
// sharp (30%). The sharp ones are added with plus-lighter.
const SPARKLE_LAYERS = [
  { tile: 1, className: "opacity-20 blur-[4.17px]" },
  { tile: 1, className: "opacity-20 mix-blend-plus-lighter" },
  { tile: 0, className: "opacity-50 blur-[4.17px]" },
  { tile: 0, className: "opacity-30 mix-blend-plus-lighter" },
]

// The glow in Figma is 18 × 111 on the 207px bar and 20 × 150 on the 256px one, 10px below the middle: it grows with the
// bar along the curve through both.
const GLOW_SPAN = Math.log(256 / 207)
const GLOW_HEIGHT_POWER = Math.log(150 / 111) / GLOW_SPAN
const GLOW_WIDTH_POWER = Math.log(20 / 18) / GLOW_SPAN

function glowBox(height: number, width: number) {
  const scale = Math.max(height, 1) / 207
  const glowHeight = Math.min(111 * scale ** GLOW_HEIGHT_POWER, height)
  const glowWidth = 18 * scale ** GLOW_WIDTH_POWER * (width / BAR_WIDTH)
  return { left: (width - glowWidth) / 2, top: height / 2 + 10 - glowHeight / 2, width: glowWidth, height: glowHeight }
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

const sampleCashFlowSeries: CashFlowBarSeries[] = [
  { id: "in", label: "Money in", color: "purple" },
  { id: "out", label: "Money out", color: "blue" },
]

// The Figma card: January to June with March highlighted. Every amount puts its bar where Figma draws it on the
// $0–$30K axis (to the pixel); March's money out is the tooltip's $27,874.93.
const sampleCashFlowMonths: CashFlowBarMonth[] = [
  [13942.18, 19836.4],
  [8021.65, 17560.92],
  [22628.05, 27874.93],
  [8047.3, 13193.85],
  [15951.06, 19512.74],
  [17905.48, 13917.2],
].map(([moneyIn, moneyOut], i) => ({ label: MONTHS[i], values: { in: moneyIn, out: moneyOut } }))

/**
 * Where everything sits at a plot width. The months are spread from 8px in on the left to 8px in on the right, each a
 * group of bars 8px apart; a value's bar reaches its height on the ticks' scale (the lowest tick on the bottom grid
 * line, the highest on the top one) and stands 4px above the bottom line, its top on a whole pixel like Figma's.
 */
function layoutBars(data: CashFlowBarMonth[], series: CashFlowBarSeries[], ticks: number[], width: number) {
  const n = data.length
  const k = Math.max(1, series.length)
  const inner = Math.max(0, width - 2 * INSET)
  const fit = ((n ? inner / n : inner) - GROUP_GAP - (k - 1) * BAR_GAP) / k
  const barWidth = Math.max(2, Math.min(BAR_WIDTH, fit))
  const groupWidth = k * barWidth + (k - 1) * BAR_GAP
  const spacing = n > 1 ? (inner - groupWidth) / (n - 1) : 0
  const lo = ticks[0] ?? 0
  const hi = ticks[ticks.length - 1] ?? 1
  const y = (value: number) => (hi > lo ? PLOT_HEIGHT - ((value - lo) / (hi - lo)) * PLOT_HEIGHT : PLOT_HEIGHT)
  const baseline = PLOT_HEIGHT - LIFT
  const groups = data.map((month, i) => {
    const left = n > 1 ? INSET + i * spacing : (width - groupWidth) / 2
    const bars = series.map((s, j) => {
      const value = month.values[s.id] ?? 0
      const height = value > lo ? Math.max(baseline - Math.round(y(value)), MIN_BAR) : 0
      return { id: s.id, value, x: left + j * (barWidth + BAR_GAP), height }
    })
    const top = baseline - Math.max(0, ...bars.map((bar) => bar.height))
    return { left, right: left + groupWidth, centre: left + groupWidth / 2, top, bars }
  })
  const columns = groups.map((group, i) => {
    const from = i > 0 ? (groups[i - 1].centre + group.centre) / 2 : 0
    const to = i < n - 1 ? (group.centre + groups[i + 1].centre) / 2 : width
    return { left: from, width: to - from }
  })
  return { barWidth, groupWidth, spacing, groups, columns, grid: ticks.map((tick) => y(tick)) }
}

/** The month under a pointer x (the nearest group). */
function monthAt(x: number, n: number, spacing: number, groupWidth: number, width: number) {
  if (n <= 1) return 0
  const first = INSET + groupWidth / 2
  return Math.min(n - 1, Math.max(0, Math.round((Math.min(Math.max(x, 0), width) - first) / (spacing || 1))))
}

/** A capsule (fully rounded ends) as an SVG path. */
function capsule(x: number, y: number, width: number, height: number) {
  const r = Math.min(width, height) / 2
  return `M${x + r} ${y}A${r} ${r} 0 0 1 ${x + width} ${y + r}V${y + height - r}A${r} ${r} 0 0 1 ${x + r} ${y + height}A${r} ${r} 0 0 1 ${x} ${y + height - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
}
// The swatch's 0.5px ring outside and 0.5px stroke inside, as filled rings: Chrome draws strokes under 1px as shifted
// hairlines, a fill covers exactly the half pixel like Figma's.
const SWATCH_RING = capsule(-0.5, -0.5, 6, 21) + capsule(0, 0, 5, 20)
const SWATCH_STROKE = capsule(0, 0, 5, 20) + capsule(0.5, 0.5, 4, 19)

/** A highlighted bar's glossy swatch, 5 × 20: the bar's fill, light streak and inner glow, a 0.5px ring and stroke. */
function GlossSwatch({ color }: { color: CashFlowBarColor }) {
  const tone = tones[color]
  const id = `cash-flow-swatch-${React.useId().replace(/[^\w-]/g, "")}`
  return (
    <span aria-hidden data-slot="cash-flow-monthly-bar-chart-swatch" className="relative h-5 w-[5px] shrink-0">
      <span className={cn("absolute inset-0 isolate overflow-hidden rounded-full bg-linear-to-b/srgb", tone.fill)}>
        <span className={cn("absolute top-1 left-[1.5px] h-3 w-0.5 rounded-[50%] mix-blend-plus-lighter blur-[1.35px]", tone.dot)} />
        <span className={cn("absolute inset-0 rounded-[inherit]", tone.swatch)} />
      </span>
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0.24} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={SWATCH_RING} fillRule="evenodd" className={tone.swatchRing} />
        <path d={SWATCH_STROKE} fillRule="evenodd" fill={`url(#${id})`} />
      </svg>
    </span>
  )
}

/** Figma "Marker Line": 1px across the tooltip, #c3cefd to #cbdbfd, fading out at both ends; centred on its spot. */
function TooltipDivider({ width }: { width: number }) {
  const id = `cash-flow-divider-${React.useId().replace(/[^\w-]/g, "")}`
  return (
    <span aria-hidden className="relative block h-0 w-full shrink-0">
      <svg width={width} height={2} className="absolute -top-px left-0 overflow-visible">
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" x2={width} y1="0" y2="0">
            <stop offset="0" stopColor="#c3cefd" stopOpacity={0} />
            <stop offset="0.298" stopColor="#c3cefd" />
            <stop offset="0.697" stopColor="#cbdbfd" />
            <stop offset="1" stopColor="#cbdbfd" stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1={0} x2={width} y1={1} y2={1} stroke={`url(#${id})`} strokeLinecap="round" />
      </svg>
    </span>
  )
}

type TooltipRow = { id: string; label: string; color: CashFlowBarColor; value: number }

/** A row's amount, counting from the previous one when it changes. */
function TooltipValue({ value, format }: { value: number; format: (value: number) => string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  useCountUp(ref, value, format, { duration: 400 })
  return (
    <span ref={ref} data-slot="cash-flow-monthly-bar-chart-tooltip-value" data-value={value} className="typo-label-03-medium hug-w text-fg-loud">
      {format(value)}
    </span>
  )
}

/** The tooltip's rows, the larger amount first. Rendered twice: visible (the amounts count) and as an invisible copy that is measured. */
function TooltipRows({ rows, format, dividerWidth, live }: { rows: TooltipRow[]; format: (value: number) => string; dividerWidth: number; live?: boolean }) {
  return rows.map((row, i) => (
    <React.Fragment key={row.id}>
      {i > 0 && <TooltipDivider width={dividerWidth} />}
      <span data-slot={live ? "cash-flow-monthly-bar-chart-tooltip-row" : undefined} data-series={row.id} className="flex items-center gap-1.5 pr-3">
        <GlossSwatch color={row.color} />
        {live ? <TooltipValue value={row.value} format={format} /> : <span className="typo-label-03-medium hug-w">{format(row.value)}</span>}
        <span className="sr-only">{row.label}</span>
      </span>
    </React.Fragment>
  ))
}

/** The sparkle field over a highlighted bar: its four layers, and a flare over each four-point star (hidden at rest). */
function Sparkles({ slot }: { slot: number }) {
  const offset = SPARKLE_OFFSETS[slot % SPARKLE_OFFSETS.length]
  return (
    <>
      {SPARKLE_LAYERS.map((layer, l) => (
        <svg
          key={l}
          aria-hidden
          data-slot="cash-flow-monthly-bar-chart-sparkles"
          className={cn("pointer-events-none absolute inset-0 size-full overflow-visible", layer.className)}
        >
          <g transform={`translate(${offset.x} ${offset.y + layer.tile * SPARKLE_PERIOD})`} className="fill-surface-white">
            {Array.from({ length: TWINKLE_GROUPS }, (_, group) => (
              <g key={group} data-twinkle={group}>
                {SPARKLES.map((sparkle, i) => {
                  if (i % TWINKLE_GROUPS !== group) return null
                  const opacity = layer.tile === 1 && sparkle.dim ? 0.1 : undefined
                  return sparkle.star ? (
                    <path key={i} d={starPath(sparkle)} opacity={opacity} />
                  ) : (
                    <ellipse key={i} cx={sparkle.x} cy={sparkle.y} rx={sparkle.rx} ry={sparkle.ry} opacity={opacity} />
                  )
                })}
              </g>
            ))}
          </g>
        </svg>
      ))}
      {[0, 1].map((tile) => (
        <span
          key={tile}
          aria-hidden
          data-slot="cash-flow-monthly-bar-chart-flare"
          className="pointer-events-none absolute size-[11px] -translate-1/2 opacity-0 mix-blend-plus-lighter"
          style={{ left: offset.x + STAR.x, top: offset.y + tile * SPARKLE_PERIOD + STAR.y }}
        >
          <svg viewBox="0 0 10 10" className="block size-full fill-surface-white">
            <path d="M5 0L5.96 4.04L10 5L5.96 5.96L5 10L4.04 5.96L0 5L4.04 4.04Z" />
          </svg>
        </span>
      ))}
      {/* a soft diagonal sheen, parked under the bar until it sweeps up */}
      <span aria-hidden data-slot="cash-flow-monthly-bar-chart-glint" className="pointer-events-none absolute inset-x-0 top-full mix-blend-plus-lighter" style={{ height: GLINT }}>
        <span className="absolute -inset-x-3 top-1/2 h-8 -translate-y-1/2 -rotate-[20deg] bg-linear-to-b from-surface-white/0 via-surface-white/26 to-surface-white/0" />
      </span>
    </>
  )
}

/**
 * "Cash Flow Monthly Bar Chart" from the Keitoto library: money in and out per month as pairs of bars on a $0–$30K
 * grid. The highlighted month (March in Figma, the tallest bar by default) lights up in glossy purple and blue with a
 * light streak and a field of sparkles in each bar, and a tooltip lists its amounts; the other months stay grey. Hover
 * (or drag on touch) previews a month, click or the arrow keys select one. Animated with anime.js: the grid draws in,
 * the bars grow from the baseline one month after another, then the highlighted pair lights up with a glint sweeping
 * up and the tooltip pops in while its amounts count up. While a month is highlighted its bars shine: the sparkles
 * twinkle and drift, the four-point stars flare now and then, the light streak breathes and a glint sweeps up the
 * pair every few seconds. A new month cross-fades the shine and slides the tooltip over; new data regrows the bars.
 */
function CashFlowMonthlyBarChart({
  title = "Cash Flow",
  description = "Track money moving in and out across all accounts",
  series = sampleCashFlowSeries,
  data = sampleCashFlowMonths,
  ticks: ticksProp,
  index: indexProp,
  defaultIndex,
  onIndexChange,
  onMoreClick,
  locale = "en-US",
  currency = "USD",
  className,
  ...props
}: CashFlowMonthlyBarChartProps) {
  const n = data.length
  const max = Math.max(0, ...data.flatMap((month) => series.map((s) => month.values[s.id] ?? 0)))
  const peaks = data.map((month) => Math.max(0, ...series.map((s) => month.values[s.id] ?? 0)))
  const tallest = peaks.reduce((best, peak, i) => (peak > peaks[best] ? i : best), 0)
  const [indexValue, setIndex] = useControllableState({
    value: indexProp,
    defaultValue: defaultIndex ?? tallest,
    onChange: (next: number) => {
      if (data[next]) onIndexChange?.(next, data[next])
    },
  })
  const ticks = React.useMemo(() => (ticksProp?.length ? [...ticksProp].sort((a, b) => a - b) : barTicks(max, TICK_COUNT)), [ticksProp, max])
  const [plotRef, plot] = useChartSize<HTMLDivElement>({ width: PLOT_WIDTH, height: PLOT_HEIGHT })
  const width = plot.width || PLOT_WIDTH
  const layout = React.useMemo(() => layoutBars(data, series, ticks, width), [data, series, ticks, width])
  const { barWidth, groupWidth, spacing, groups, columns, grid } = layout
  // Content keys: parents may pass new arrays on every render, so changes are detected by value.
  const dataKey = `${series.map((s) => `${s.id}:${s.color ?? ""}`).join(",")}|${data.map((m) => `${m.label}=${series.map((s) => m.values[s.id] ?? 0).join(",")}`).join(";")}|${ticks.join(",")}`
  const ticksKey = ticks.join(";")
  const labelsKey = data.map((month) => month.label).join(";")

  const [hovered, setHovered] = React.useState<number | null>(null)
  const selected = n ? Math.min(Math.max(Math.round(indexValue), 0), n - 1) : -1
  const active = hovered !== null && hovered < n ? hovered : selected
  const month = data[active]
  const group = groups[active]

  const money = React.useCallback((value: number) => formatCurrency(value, { locale, currency }), [locale, currency])
  const colorOf = (s: CashFlowBarSeries, j: number): CashFlowBarColor => s.color ?? (["purple", "blue", "green", "orange"] as const)[j % 4]
  // The larger amount first (Figma lists the taller blue bar above the purple one)
  const rows: TooltipRow[] = month
    ? series
        .map((s, j) => ({ id: s.id, label: s.label, color: colorOf(s, j), value: month.values[s.id] ?? 0 }))
        .sort((a, b) => b.value - a.value)
    : []
  const order = rows.map((row) => row.id).join(",")

  // The tooltip sits right of the month's bars, or left of them when it would run past the plot, its top 6px under the
  // taller bar's. Its size is measured on an invisible copy that holds the final text.
  const [sizerRef, sizer] = useChartSize<HTMLSpanElement>({ width: 108, height: 56 })
  const tipWidth = sizer.width + TIP_PADDING_X
  const tipHeight = sizer.height + TIP_PADDING_Y
  const flipped = group ? Math.round(group.right + TIP_GAP) + tipWidth > width : false
  const tipLeft = group ? (flipped ? Math.max(0, Math.round(group.left - TIP_GAP - tipWidth)) : Math.round(group.right + TIP_GAP)) : 0
  const tipTop = group ? Math.round(Math.min(Math.max(group.top + TIP_DROP, 0), Math.max(0, PLOT_HEIGHT - tipHeight))) : 0

  const reduced = useReducedMotion()
  const root = React.useRef<HTMLDivElement>(null)
  const tipRef = React.useRef<HTMLDivElement>(null)
  const inView = useInView(root)
  const all = (selector: string) => Array.from(root.current?.querySelectorAll<HTMLElement>(selector) ?? [])
  // The shine loops start once the entrance is over (they never start with reduced motion).
  const [lit, setLit] = React.useState(false)

  // Entrance, once the card is in view: the grid lines draw in from the left and the divider grows up, the ticks and
  // the months fade in, the bars grow from the baseline one month after another; when the highlighted pair is up it
  // lights up (its streak swelling and its sparkles coming in) with a glint sweeping up, then the tooltip pops in and
  // its amounts count up.
  useChartEntrance(root, (timeline) => {
    const bars = all(MONTH)
    const at = Math.max(0, active) * 70 + 150 + 500
    timeline
      .add(all('[data-slot="cash-flow-monthly-bar-chart-grid-line"]'), { x2: { from: 0 }, duration: 900, ease: "outQuad", delay: stagger(45, { from: "last" }) }, 0)
      .add(all('[data-slot="cash-flow-monthly-bar-chart-divider"]'), { y1: { from: PLOT_HEIGHT }, duration: 900, ease: "outExpo" }, 100)
      .add(all('[data-slot="cash-flow-monthly-bar-chart-tick"]'), { opacity: { from: 0 }, translateX: { from: -4 }, duration: 600, ease: "outQuad", delay: stagger(45, { from: "last" }) }, 200)
    const monthLabels = all('[data-slot="cash-flow-monthly-bar-chart-axis-label"] > span')
    if (monthLabels.length) timeline.add(monthLabels, { opacity: { from: 0 }, translateY: { from: 4 }, duration: 600, ease: "outQuad", delay: stagger(70) }, 300)
    // one month after another, the second bar of a month 45ms after the first
    const delays = bars.map((bar) => Number(bar.dataset.month) * 70 + Number(bar.dataset.position) * 45)
    if (bars.length) timeline.add(bars, { height: { from: 0 }, duration: 1100, ease: "outExpo", delay: (_, i) => delays[i ?? 0] ?? 0 }, 150)
    const pair = all(`${MONTH}[data-month="${active}"]`)
    const glosses = pair.map((bar) => bar.querySelector<HTMLElement>('[data-slot="cash-flow-monthly-bar-chart-gloss"]')).filter((el): el is HTMLElement => !!el)
    const glows = pair.map((bar) => bar.querySelector<HTMLElement>('[data-slot="cash-flow-monthly-bar-chart-glow"]')).filter((el): el is HTMLElement => !!el)
    const glints = pair.map((bar) => bar.querySelector<HTMLElement>('[data-slot="cash-flow-monthly-bar-chart-glint"]')).filter((el): el is HTMLElement => !!el)
    const bases = pair.map((bar) => bar.querySelector<HTMLElement>('[data-slot="cash-flow-monthly-bar-chart-base"]')).filter((el): el is HTMLElement => !!el)
    // the pair grows grey and lights up once it is up (the grey stays under the gloss until that is in)
    if (bases.length) timeline.add(bases, { opacity: [1, 1], duration: at + 700, onComplete: releaseStyles("opacity") }, 0)
    if (glosses.length) timeline.add(glosses, { opacity: { from: 0 }, duration: 600, ease: "outQuad", delay: stagger(60) }, at)
    if (glows.length) timeline.add(glows, { opacity: { from: 0 }, scaleY: { from: 0.4 }, duration: 1100, ease: "outExpo", delay: stagger(60) }, at + 100)
    const sparkles = pair.flatMap((bar) => Array.from(bar.querySelectorAll<HTMLElement>('[data-slot="cash-flow-monthly-bar-chart-sparkles"]')))
    if (sparkles.length) timeline.add(sparkles, { opacity: { from: 0 }, duration: 700, ease: "outQuad", delay: stagger(40) }, at + 250)
    glints.forEach((glint, i) => {
      const height = (glint.parentElement?.offsetHeight ?? 0) + GLINT
      timeline.add(glint, { translateY: [0, -height], duration: 1000, ease: "inOutSine", onComplete: releaseStyles("transform") }, at + 200 + i * 120)
    })
    const tip = tipRef.current
    const values = all('[data-slot="cash-flow-monthly-bar-chart-tooltip-value"]')
    if (tip) timeline.add(tip, { opacity: { from: 0 }, translateY: { from: 6 }, scale: { from: 0.94 }, duration: 500, ease: "outBack(1.6)" }, at + 350)
    if (values.length) {
      const counter = { t: 0 }
      const count = () => values.forEach((el) => (el.textContent = money(Number(el.dataset.value) * counter.t)))
      count()
      timeline.add(counter, { t: [0, 1], duration: 1000, ease: "outExpo", onUpdate: count }, at + 350)
    }
    timeline.call(() => setLit(true))
    return () => {
      values.forEach((el) => (el.textContent = money(Number(el.dataset.value))))
    }
  })

  // A new highlighted month cross-fades the gloss (a quick hover back and forth reverses instead of jumping) and swells
  // the new pair's streak.
  const lastActive = React.useRef(active)
  useIsomorphicLayoutEffect(() => {
    const previous = lastActive.current
    lastActive.current = active
    if (reduced || previous === active) return
    const layer = (i: number, slot: string) => all(`${MONTH}[data-month="${i}"] > [data-slot="cash-flow-monthly-bar-chart-${slot}"]`)
    // React already applied the new classes: start from the inline opacity of a fade still running, else the other end
    for (const [elements, to] of [[layer(active, "gloss"), 1], [layer(previous, "gloss"), 0]] as const) {
      for (const el of elements) {
        const from = el.style.opacity === "" ? 1 - to : Number(el.style.opacity)
        animate(el, { opacity: [from, to], duration: 280, ease: "outQuad", onComplete: releaseStyles("opacity") })
      }
    }
    // the grey stays under the new gloss until it is in
    const bases = layer(active, "base")
    if (bases.length) animate(bases, { opacity: [1, 1], duration: 280, onComplete: releaseStyles("opacity") })
    const glows = all(`${MONTH}[data-month="${active}"] [data-slot="cash-flow-monthly-bar-chart-glow"]`)
    if (glows.length) animate(glows, { scaleY: [0.6, 1], opacity: [0.4, 1], duration: 700, ease: "outExpo", onComplete: releaseStyles("transform", "opacity") })
  }, [active, reduced])

  // The tooltip slides to the new month; when it changes sides it pops in again.
  const lastTip = React.useRef({ tipLeft, tipTop, flipped, width })
  useIsomorphicLayoutEffect(() => {
    const before = lastTip.current
    lastTip.current = { tipLeft, tipTop, flipped, width }
    const tip = tipRef.current
    if (!tip || reduced || before.width !== width) return
    if (before.flipped !== flipped) {
      animate(tip, { opacity: [0, 1], scale: [0.94, 1], duration: 300, ease: "outQuad", onComplete: releaseStyles("opacity", "transform") })
      return
    }
    if (before.tipLeft === tipLeft && before.tipTop === tipTop) return
    animate(tip, {
      translateX: [before.tipLeft - tipLeft + utils.get(tip, "translateX", false), 0],
      translateY: [before.tipTop - tipTop + utils.get(tip, "translateY", false), 0],
      duration: 450,
      ease: "outExpo",
      onComplete: releaseStyles("transform"),
    })
  }, [tipLeft, tipTop, flipped, width, reduced])

  // When the larger amount changes series, the rows swap places.
  const lastOrder = React.useRef(order)
  useIsomorphicLayoutEffect(() => {
    const before = lastOrder.current.split(",")
    lastOrder.current = order
    if (reduced || before.join(",") === order) return
    const now = order.split(",")
    for (const row of all('[data-slot="cash-flow-monthly-bar-chart-tooltip-row"]')) {
      const from = before.indexOf(row.dataset.series ?? "")
      const to = now.indexOf(row.dataset.series ?? "")
      if (from < 0 || from === to) continue
      animate(row, { translateY: [(from - to) * TIP_ROW, 0], duration: 450, ease: "outExpo", onComplete: releaseStyles("transform") })
    }
  }, [order, reduced])

  // New data grows or shrinks every bar from its previous height (new bars from the baseline).
  const heights = groups.map((g) => g.bars.map((bar) => bar.height))
  const lastHeights = React.useRef({ key: dataKey, heights })
  useIsomorphicLayoutEffect(() => {
    const before = lastHeights.current
    lastHeights.current = { key: dataKey, heights }
    if (before.key === dataKey || reduced) return
    for (const bar of all(MONTH)) {
      const i = Number(bar.dataset.month)
      const j = Number(bar.dataset.position)
      const from = before.heights[i]?.[j] ?? 0
      const to = heights[i]?.[j] ?? 0
      if (from !== to) animate(bar, { height: [from, to], duration: 800, delay: i * 35, ease: "outExpo" })
    }
  }, [dataKey, reduced])

  // New ticks or months fade their labels in again.
  const lastLabels = React.useRef({ ticksKey, labelsKey })
  useIsomorphicLayoutEffect(() => {
    const before = lastLabels.current
    lastLabels.current = { ticksKey, labelsKey }
    if (reduced) return
    const tickLabels = all('[data-slot="cash-flow-monthly-bar-chart-tick"]')
    const monthLabels = all('[data-slot="cash-flow-monthly-bar-chart-axis-label"] > span')
    if (before.ticksKey !== ticksKey && tickLabels.length)
      animate(tickLabels, { opacity: [0, 1], duration: 500, delay: stagger(35), ease: "outQuad", onComplete: releaseStyles("opacity") })
    if (before.labelsKey !== labelsKey && monthLabels.length)
      animate(monthLabels, { opacity: [0, 1], translateY: [4, 0], duration: 500, delay: stagger(35), ease: "outQuad", onComplete: releaseStyles("opacity", "transform") })
  }, [ticksKey, labelsKey, reduced])

  // A selection by click or key sends a glint up the pair.
  const lastSelected = React.useRef(selected)
  React.useEffect(() => {
    const before = lastSelected.current
    lastSelected.current = selected
    if (reduced || before === selected || !lit) return
    all(`${MONTH}[data-month="${selected}"] [data-slot="cash-flow-monthly-bar-chart-glint"]`).forEach((glint, i) => {
      const height = (glint.parentElement?.offsetHeight ?? 0) + GLINT
      animate(glint, { translateY: [0, -height], duration: 900, delay: i * 120, ease: "inOutSine", onComplete: releaseStyles("transform") })
    })
  }, [selected, reduced, lit])

  // The shine of the highlighted pair, while the card is on screen: the sparkles twinkle in three groups at their own
  // pace and drift up and back, the four-point stars flare now and then, the light streak breathes, and every few
  // seconds a glint sweeps up the first bar and then the second. Everything starts from the Figma frame and goes back to
  // it, so stopping (another month, off screen, reduced motion) reverts to the still card.
  React.useEffect(() => {
    if (reduced || !lit || !inView || active < 0) return
    const running = new Set<JSAnimation>()
    const timers = new Set<number>()
    const later = (callback: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id)
        callback()
      }, ms)
      timers.add(id)
    }
    const run = (animation: JSAnimation) => {
      running.add(animation)
      return animation
    }
    later(() => {
      const bars = all(`${MONTH}[data-month="${active}"]`)
      bars.forEach((bar, k) => {
        const glow = bar.querySelector('[data-slot="cash-flow-monthly-bar-chart-glow"]')
        if (glow) run(animate(glow, { opacity: [1, 0.8], scale: [1, 1.08], duration: 2600 + k * 550, delay: k * 400, ease: "inOutSine", loop: true, alternate: true }))
        const drifting = bar.querySelectorAll('[data-slot="cash-flow-monthly-bar-chart-sparkles"], [data-slot="cash-flow-monthly-bar-chart-flare"]')
        if (drifting.length) run(animate(drifting, { translateY: [0, -5], duration: 4200 + k * 900, ease: "inOutSine", loop: true, alternate: true }))
        for (let group = 0; group < TWINKLE_GROUPS; group++) {
          const targets = bar.querySelectorAll(`[data-twinkle="${group}"]`)
          if (targets.length)
            run(animate(targets, { opacity: [1, 0.15], duration: utils.random(1100, 2100), delay: utils.random(0, 1500), ease: "inOutSine", loop: true, alternate: true }))
        }
        bar.querySelectorAll<HTMLElement>('[data-slot="cash-flow-monthly-bar-chart-flare"]').forEach((flare) => {
          const flash = () => {
            const animation = run(
              animate(flare, {
                // upright at its brightest
                opacity: [0, 0.85, 0],
                scale: [0.2, 1, 0.2],
                rotate: [-45, 45],
                duration: 1100,
                ease: "inOutSine",
                onComplete: () => {
                  running.delete(animation)
                  later(flash, utils.random(2600, 6400))
                },
              }),
            )
          }
          later(flash, utils.random(500, 3200))
        })
      })
      const glints = bars.map((bar) => bar.querySelector<HTMLElement>('[data-slot="cash-flow-monthly-bar-chart-glint"]'))
      const sweep = () => {
        glints.forEach((glint, i) => {
          if (!glint) return
          const height = (glint.parentElement?.offsetHeight ?? 0) + GLINT
          const animation = run(
            animate(glint, {
              translateY: [0, -height],
              duration: 1000 + height * 1.5,
              delay: i * 140,
              ease: "inOutSine",
              onComplete: (self) => {
                running.delete(animation)
                releaseStyles("transform")(self)
              },
            }),
          )
        })
        later(sweep, utils.random(3600, 6000))
      }
      later(sweep, utils.random(1200, 2400))
    }, SHINE_DELAY)
    return () => {
      for (const id of timers) window.clearTimeout(id)
      for (const animation of running) animation.revert()
    }
  }, [active, lit, inView, reduced, dataKey, width])

  const select = (next: number) => {
    if (!n) return
    setIndex(Math.min(Math.max(next, 0), n - 1))
  }
  const pointerMonth = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.currentTarget
    const box = target.getBoundingClientRect()
    // CSS zoom (the live demo scales wide demos down) scales the box but not the layout
    const zoom = box.width / (target.offsetWidth || box.width || 1) || 1
    return monthAt((event.clientX - box.left) / zoom, n, spacing, groupWidth, width)
  }
  const onColumnKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const next = { ArrowRight: selected + 1, ArrowDown: selected + 1, ArrowLeft: selected - 1, ArrowUp: selected - 1, Home: 0, End: n - 1 }[event.key]
    if (next === undefined || !n) return
    event.preventDefault()
    const index = Math.max(0, Math.min(n - 1, next))
    setHovered(null)
    select(index)
    root.current?.querySelectorAll<HTMLButtonElement>('[data-slot="cash-flow-monthly-bar-chart-column"]')[index]?.focus()
  }

  const describe = (m: CashFlowBarMonth) => `${m.label}: ${series.map((s) => `${s.label} ${money(m.values[s.id] ?? 0)}`).join(", ")}`

  return (
    <ChartCard ref={root} role="group" aria-label={title} className={cn("w-full gap-7", className)} {...props}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
          <p className="typo-label-04-semibold -my-0.5 truncate py-0.5 text-fg-loud">{title}</p>
          {description && <p className="typo-label-02-medium -my-0.5 truncate py-0.5 text-fg-soft">{description}</p>}
        </div>
        <ChartButton size="icon" aria-label="More options" onClick={onMoreClick}>
          <DotsHorizontalIcon />
        </ChartButton>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <div
            ref={plotRef}
            data-slot="cash-flow-monthly-bar-chart-plot"
            className="relative min-w-0 flex-1 touch-pan-y"
            style={{ height: PLOT_HEIGHT }}
            onPointerMove={(event) => setHovered(pointerMonth(event))}
            onPointerLeave={() => setHovered(null)}
            onPointerUp={(event) => {
              if (event.button === 0) select(pointerMonth(event))
            }}
          >
            {/* Figma "Grid Line": 1px Border/Soft over [y - 1, y] for each tick, and the "Divider" over [x, x + 1] on the right */}
            <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
              {grid.map((y, i) => (
                <line key={i} data-slot="cash-flow-monthly-bar-chart-grid-line" x1={0} x2={width} y1={y - 0.5} y2={y - 0.5} className="stroke-border-soft" />
              ))}
              <line data-slot="cash-flow-monthly-bar-chart-divider" x1={width + 0.5} x2={width + 0.5} y1={0} y2={PLOT_HEIGHT} className="stroke-border-soft" />
            </svg>

            <div aria-hidden className="pointer-events-none absolute inset-0">
              {groups.map((g, i) =>
                g.bars.map((bar, j) => {
                  const on = i === active
                  const tone = tones[colorOf(series[j], j)]
                  const left = Math.floor(bar.x)
                  const fraction = Math.round((bar.x - left) * 1000) / 1000
                  return (
                    <span
                      key={`${i}-${bar.id}`}
                      data-slot="cash-flow-monthly-bar-chart-bar"
                      data-month={i}
                      data-position={j}
                      className="absolute rounded-lg"
                      // a whole-pixel left plus the fraction as a translate: Chrome anti-aliases the edges like Figma
                      style={{ left, translate: fraction ? `${fraction}px 0` : undefined, bottom: LIFT, width: barWidth, height: bar.height }}
                    >
                      {/* grey: Background/Disable to Soft (at 56%) to Subdued, a 1px Background/Soft ring. Hidden under a lit bar,
                          where it would show through the anti-aliased edge. */}
                      <span
                        data-slot="cash-flow-monthly-bar-chart-base"
                        className={cn(
                          "absolute inset-0 rounded-[inherit] bg-linear-to-b/srgb from-surface-disable via-surface-soft via-[56.457%] to-surface-subdued shadow-[0_0_0_1px_var(--surface-soft)]",
                          on && "opacity-0",
                        )}
                      />
                      {/* highlighted: the tone's fill, ring, drop shadow and inner glow, the streak and the sparkles */}
                      <span
                        data-slot="cash-flow-monthly-bar-chart-gloss"
                        data-active={on || undefined}
                        className={cn("absolute inset-0 isolate overflow-hidden rounded-[inherit] bg-linear-to-b/srgb", tone.fill, tone.shadow, on ? "opacity-100" : "opacity-0")}
                      >
                        <span
                          data-slot="cash-flow-monthly-bar-chart-glow"
                          className={cn("absolute rounded-[50%] mix-blend-plus-lighter blur-[10.8px]", tone.glow)}
                          style={glowBox(bar.height, barWidth)}
                        />
                        {on && <Sparkles slot={j} />}
                        {/* Figma draws a frame's inner shadow over its children: the white glow goes over the streak and the sparkles */}
                        <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_27.8px_rgb(255_255_255/0.46)]" />
                      </span>
                      {/* Figma's 1px inside stroke: white at 24% fading out toward the baseline */}
                      <span className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [background:linear-gradient(rgb(255_255_255/0.24),rgb(255_255_255/0))_border-box] [mask:linear-gradient(#000_0_0)_padding-box_exclude,linear-gradient(#000_0_0)]" />
                    </span>
                  )
                }),
              )}
            </div>

            <div role="group" aria-label={`${title} by month`}>
              {columns.map((column, i) => (
                <button
                  key={i}
                  type="button"
                  data-slot="cash-flow-monthly-bar-chart-column"
                  aria-label={describe(data[i])}
                  aria-pressed={i === selected}
                  tabIndex={i === selected ? 0 : -1}
                  onClick={(event) => {
                    // pointers select on pointer up (where a touch drag ends); this is Enter and Space
                    if (event.detail === 0) select(i)
                  }}
                  onKeyDown={onColumnKeyDown}
                  className="group/column absolute inset-y-0 cursor-pointer outline-none"
                  style={{ left: column.left, width: column.width }}
                >
                  {/* keyboard focus rings the month's bars */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute rounded-xl opacity-0 ring-2 ring-primary-blue-500/40 transition-opacity duration-150 group-focus-visible/column:opacity-100"
                    style={{ left: groups[i].left - column.left - 6, width: groupWidth + 12, top: groups[i].top - 6, bottom: LIFT - 4 }}
                  />
                </button>
              ))}
            </div>

            {month && (
              <div
                ref={tipRef}
                aria-hidden
                data-slot="cash-flow-monthly-bar-chart-tooltip"
                className={cn(
                  "pointer-events-none absolute flex flex-col items-start justify-end gap-2 overflow-hidden rounded-xl bg-surface-white px-3 py-2 whitespace-nowrap",
                  // Figma paints later effects on top; CSS paints the first shadow on top
                  "shadow-[0_0_0_1px_#ececec,0_2px_4px_rgb(0_0_0/0.06),0_4px_16px_rgb(0_0_0/0.08)]",
                )}
                style={{ top: tipTop, left: tipLeft, width: tipWidth }}
              >
                <TooltipRows rows={rows} format={money} dividerWidth={sizer.width} live />
              </div>
            )}
            {/* the same rows with their final text, measured to place the tooltip (the visible ones change width while they count) */}
            {month && (
              <span ref={sizerRef} aria-hidden className="pointer-events-none invisible absolute top-0 left-0 flex flex-col items-start gap-2 whitespace-nowrap">
                <TooltipRows rows={rows} format={money} dividerWidth={0} />
              </span>
            )}
          </div>

          {/* Figma "Y Axis Labels": 34px wide, spread from the top to 8px short of the bottom, left-aligned */}
          <div aria-hidden className="hug-w flex min-w-[34px] shrink-0 flex-col justify-between self-stretch pb-2">
            {[...ticks].reverse().map((tick) => (
              <span key={tick} data-slot="cash-flow-monthly-bar-chart-tick" className="typo-label-02-regular whitespace-nowrap text-fg-soft">
                {formatCompactCurrency(tick, { locale, currency })}
              </span>
            ))}
          </div>
        </div>

        {/* the month names, centred under their bars */}
        <div aria-hidden className="relative h-3.5">
          {groups.map((g, i) => (
            <span key={`${i}-${data[i].label}`} data-slot="cash-flow-monthly-bar-chart-axis-label" className="absolute top-0" style={{ left: g.centre }}>
              <span className="typo-label-02-regular block -translate-x-1/2 whitespace-nowrap text-fg-soft">{data[i].label}</span>
            </span>
          ))}
        </div>
      </div>
    </ChartCard>
  )
}

export {
  CashFlowMonthlyBarChart,
  sampleCashFlowMonths,
  sampleCashFlowSeries,
  type CashFlowBarColor,
  type CashFlowBarMonth,
  type CashFlowBarSeries,
  type CashFlowMonthlyBarChartProps,
}
