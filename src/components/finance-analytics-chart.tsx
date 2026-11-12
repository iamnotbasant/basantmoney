import { animate, stagger, utils, type JSAnimation } from "animejs"
import * as React from "react"

import { ChartButton } from "@/components/ui/chart-button"
import { ChartCard } from "@/components/ui/chart-card"
import { CalendarSolidIcon, ChevronDownIcon, DotsHorizontalIcon } from "@/components/ui/chart-icons"
import { ChartMenu, ChartMenuContent, ChartMenuRadioGroup, ChartMenuRadioItem, ChartMenuTrigger } from "@/components/ui/chart-menu"
import { releaseStyles, useChartEntrance, useCountUp, useInView, useIsomorphicLayoutEffect, useReducedMotion } from "@/hooks/use-chart-motion"
import { useChartSize } from "@/hooks/use-chart-size"
import { useControllableState } from "@/hooks/use-controllable-state"
import { formatCurrency } from "@/lib/chart-format"
import { fittedDash, niceTicks } from "@/lib/chart-series"
import { cn } from "@/lib/utils"

/** A slot of the chart (a month of the year, a week of the month, a day of the week) and what came in and went out. */
type FinanceAnalyticsPoint = {
  /** The x-axis label ("Apr"). */
  label: string
  /** The tooltip's heading, also read by screen readers ("April 2026"); the label by default. */
  title?: string
  income: number
  expenses: number
}

/** A period of the menu ("Yearly") and its slots. */
type FinanceAnalyticsPeriod = {
  value: string
  /** The menu's and the button's text. */
  label: string
  /** Oldest first. */
  points: FinanceAnalyticsPoint[]
  /** The slot the period opens on (an index into `points`); the latest by default. */
  defaultIndex?: number
}

type FinanceAnalyticsChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  title?: string
  /** The soft line under the title. */
  description?: string
  periods?: FinanceAnalyticsPeriod[]
  /** The period shown (a `value` of `periods`); the first one by default. */
  period?: string
  defaultPeriod?: string
  onPeriodChange?: (period: string) => void
  /** The lit slot (an index into the period's points). A new period lights its own `defaultIndex`. */
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number, point: FinanceAnalyticsPoint) => void
  /** The y-axis values, lowest first (one grid line each). Eight round values from $0 by default. */
  ticks?: number[]
  incomeLabel?: string
  expensesLabel?: string
  /** Called by the ⋯ button. */
  onMoreClick?: () => void
  locale?: string
  currency?: string
}

type Slot = { x: number; width: number; center: number; income: number; expenses: number }
type Glow = { x: number; width: number; top: number; pour: number }

// Figma geometry ("Finance Analytics Chart" 1473:92633)
const PLOT_WIDTH = 899 // the grid lines at Figma's 984px card
const ROW = 16 // a y label's row: the label 2px down, its grid line through the middle…
const PITCH = 42 // …the rows 42px apart
const TICK_COUNT = 8
const GRID_HEIGHT = (TICK_COUNT - 1) * PITCH + ROW // 310
const GRID_TOP = ROW / 2 - 0.5 // a 1px line covers [y - 1, y] of its row's middle (8), so its centre is at 7.5…
const GRID_BOTTOM = GRID_TOP + (TICK_COUNT - 1) * PITCH // …and the $0 line's at 301.5
const AXIS_TOP = GRID_BOTTOM + 0.5 + 20 // the x labels sit 20px under the $0 line
const PLOT_HEIGHT = AXIS_TOP + 12
const BAR_WIDTH = 64 // the ticks: 64 × 4, 12px apart, centred on their value…
const BAR_HEIGHT = 4
const BAR_GAP = 12
const OVERHANG = 1 // …the last one ending 1px past the grid lines (900px of ticks over 899px of lines), as drawn
const DASH = 6 // the grid's 6/6 dashes; the $0 line is solid
const TIP_GAP = 6 // the tooltip sits 6px right of the lit column (left of it near the edge)…
const TIP_RISE = 53 // …its top 53px above the slot's higher tick (the income tick in Figma)
const TIP_MIN_WIDTH = 185
const TIP_PADDING = 12 // its 6px padding, twice
const LABEL_CHAR = 6.5 // about how wide a character of Label/01 is
const LABEL_GAP = 8 // the least space between two x labels
const RISE_AT = 200
const RISE_STAGGER = 55
const RISE = 950
const SLIDE = 480
const MORPH = 750
const RING = "focus-visible:ring-primary-orange-500/40" // the card's focus rings are orange
const SHINE_DELAY = 400 // a slot has to stay lit this long before its sparkles start to twinkle

// Figma "Plot Area" under the lit tick: a column as wide as the tick from under it down to the $0 line, filled with a
// raw #fc7116 fading out downward (32% under a 28% paint), and three tapered layers of it fading out the same way, each
// narrower at the bottom than at the top: a darkened one blurred 4 and two screened ones blurred 8 (Figma's blur r
// renders like CSS blur(0.45r)). The insets are for a 64px column (they scale with narrower ticks).
const GLOW = "#fc7116"
const GLOW_FILL = 0.32 * 0.28
const GLOW_LAYERS = [
  { top: 1, bottom: 13, alpha: 0.32, blur: 1.8, blend: "mix-blend-darken" },
  { top: 11, bottom: 23, alpha: 0.6, blur: 3.6, blend: "mix-blend-screen" },
  { top: 21, bottom: 29, alpha: 0.6, blur: 3.6, blend: "mix-blend-screen" },
]
// Figma "Star": the sparkles of its two fields that land inside the 64 × 212 column, by their centres from its top left,
// with their radius and opacity. They are added with plus-lighter, in three groups that twinkle at their own pace.
const SPARKLES: [x: number, y: number, r: number, opacity: number][] = [
  [40.67, 32.85, 0.93, 0.6],
  [48.76, 75.91, 0.47, 0.6],
  [46.68, 31.42, 0.47, 0.6],
  [42.23, 14.61, 0.47, 0.6],
  [47.62, 59.19, 1.01, 0.2],
  [23.02, 145.39, 1.01, 1],
  [6.47, 35.61, 1.01, 0.6],
  [33.31, 120.64, 1.01, 0.2],
  [41.77, 53.02, 1.01, 0.2],
  [24.93, 106.54, 0.5, 1],
  [6.16, 83.13, 0.5, 0.6],
  [57.98, 69.5, 0.5, 0.2],
  [55.72, 91.17, 0.5, 0.2],
  [50.47, 57.92, 0.5, 0.2],
  [37.07, 118.29, 0.5, 0.2],
  [13.53, 35.27, 0.5, 0.6],
  [45.44, 77.92, 0.5, 0.2],
  [12.21, 16.47, 0.5, 0.6],
  [40.78, 107.31, 0.5, 0.2],
  [44.66, 91.84, 0.5, 0.2],
]
const TWINKLE_GROUPS = 3
const SPARKLE_REST = 0.4 // a twinkle group at rest; it flares to full opacity
const SPARKLE_GAIN = 0.2 // a sparkle's Figma opacity on top of the group's (about what Figma's field adds at rest)

// The Figma card is 2026 by month with April lit. Every amount puts its tick on the row Figma draws it on the $0–$7,000
// axis it produces (42px per $1,000; Figma's labels run $0, $100, $200 … $1000, $2000), so April reads $5,102.87 and
// $4,151.99 where Figma's tooltip writes $6,874.93 and $2,273.64. Monthly (the weeks of April) and Weekly (20 to 26
// April) are sample periods.
const YEAR: [string, string, number, number][] = [
  ["Jan", "January", 4057.76, 3558.77],
  ["Feb", "February", 4675.08, 3205.65],
  ["Mar", "March", 5346.75, 2770.05],
  ["Apr", "April", 5102.87, 4151.99],
  ["May", "May", 4393.22, 3060.8],
  ["Jun", "June", 4581.99, 3468.76],
  ["Jul", "July", 5150.34, 2536.49],
  ["Aug", "August", 5488.17, 3844.2],
  ["Sep", "September", 5888.23, 4469.05],
  ["Oct", "October", 5058.86, 3388.32],
  ["Nov", "November", 4698.08, 3682.16],
  ["Dec", "December", 4222.1, 2128.85],
]
const sampleFinanceAnalyticsPeriods: FinanceAnalyticsPeriod[] = [
  {
    value: "yearly",
    label: "Yearly",
    defaultIndex: 3,
    points: YEAR.map(([label, month, income, expenses]) => ({ label, title: `${month} 2026`, income, expenses })),
  },
  {
    value: "monthly",
    label: "Monthly",
    defaultIndex: 3,
    points: [
      { label: "Mar 30", title: "Mar 30 – Apr 5, 2026", income: 1084.2, expenses: 912.45 },
      { label: "Apr 6", title: "Apr 6 – 12, 2026", income: 1262.75, expenses: 1015.3 },
      { label: "Apr 13", title: "Apr 13 – 19, 2026", income: 1198.4, expenses: 1103.85 },
      { label: "Apr 20", title: "Apr 20 – 26, 2026", income: 1342.65, expenses: 948.2 },
      { label: "Apr 27", title: "Apr 27 – May 3, 2026", income: 1119.8, expenses: 1061.55 },
    ],
  },
  {
    value: "weekly",
    label: "Weekly",
    defaultIndex: 4,
    points: [
      { label: "Mon", title: "Mon, Apr 20, 2026", income: 214.3, expenses: 132.4 },
      { label: "Tue", title: "Tue, Apr 21, 2026", income: 186.75, expenses: 158.9 },
      { label: "Wed", title: "Wed, Apr 22, 2026", income: 205.1, expenses: 121.65 },
      { label: "Thu", title: "Thu, Apr 23, 2026", income: 228.4, expenses: 175.3 },
      { label: "Fri", title: "Fri, Apr 24, 2026", income: 252.85, expenses: 143.75 },
      { label: "Sat", title: "Sat, Apr 25, 2026", income: 131.2, expenses: 118.6 },
      { label: "Sun", title: "Sun, Apr 26, 2026", income: 124.05, expenses: 97.6 },
    ],
  },
]

const r3 = (n: number) => Math.round(n * 1000) / 1000
const outExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Where the ticks sit at a plot width: spread from its left edge to 1px past its right one, 64px wide while there is
 * room (centred in their slots when the slots are wider), each centred on its value on the ticks' scale (the lowest
 * tick on the $0 line, the highest on the top line) with its top on a whole pixel like Figma's.
 */
function layoutChart(points: FinanceAnalyticsPoint[], ticks: number[], width: number) {
  const n = points.length
  const lo = ticks[0] ?? 0
  const hi = ticks[ticks.length - 1] ?? 1
  const y = (value: number) => (hi > lo ? GRID_BOTTOM - ((Math.min(Math.max(value, lo), hi) - lo) / (hi - lo)) * (GRID_BOTTOM - GRID_TOP) : GRID_BOTTOM)
  const top = (value: number) => Math.round(y(value) - BAR_HEIGHT / 2)
  const pitch = n ? (width + OVERHANG + BAR_GAP) / n : 0
  const barWidth = Math.max(2, Math.min(BAR_WIDTH, pitch - BAR_GAP))
  const slots: Slot[] = points.map((point, i) => {
    const left = i * pitch + (pitch - BAR_GAP - barWidth) / 2
    const x = Math.round(left)
    return { x, width: Math.round(left + barWidth) - x, center: left + barWidth / 2, income: top(point.income), expenses: top(point.expenses) }
  })
  return { pitch, slots, grid: ticks.map((tick) => y(tick)), base: top(lo) }
}

/** The glow's column and its three tapered layers, `width` wide and `height` tall, from its top left. */
function glowShapes(width: number, height: number) {
  const k = width / BAR_WIDTH
  const h = r3(Math.max(0, height))
  return GLOW_LAYERS.map(({ top, bottom }) => {
    const [a, b] = [r3(top * k), r3(bottom * k)]
    return `M${a} 0L${r3(width - a)} 0L${r3(width - b)} ${h}L${b} ${h}Z`
  })
}

/** The glow's height under a tick whose top is at `top`: down to the $0 line's top edge. */
const glowHeight = (top: number) => Math.max(0, GRID_BOTTOM - 0.5 - (top + BAR_HEIGHT))

/** A capsule (fully rounded ends) as an SVG path. */
function capsule(x: number, y: number, width: number, height: number) {
  const r = Math.min(width, height) / 2
  return `M${x + r} ${y}A${r} ${r} 0 0 1 ${x + width} ${y + r}V${y + height - r}A${r} ${r} 0 0 1 ${x + r} ${y + height}A${r} ${r} 0 0 1 ${x} ${y + height - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
}
// The swatch's 0.5px ring outside and 0.5px stroke inside, as filled rings: Chrome draws strokes under 1px as shifted
// hairlines, a fill covers exactly the half pixel like Figma's.
const SWATCH_RING = capsule(-0.5, -0.5, 6, 21) + capsule(0, 0, 5, 20)
const SWATCH_STROKE = capsule(0, 0, 5, 20) + capsule(0.5, 0.5, 4, 19)

const swatchTones = {
  // orange-200 → orange-400 at 35% → orange-600 at 91%, an orange-500 ring and streak
  income: { fill: "from-primary-orange-200 via-primary-orange-400 via-35% to-primary-orange-600 to-91%", dot: "h-[11px] bg-primary-orange-500", ring: "fill-primary-orange-500" },
  // Background/Disable → Soft → Subdued, a Subdued ring and streak
  expenses: { fill: "from-surface-disable via-surface-soft to-surface-subdued", dot: "h-3 bg-surface-subdued", ring: "fill-surface-subdued" },
}

/**
 * Figma's 5 × 20 legend swatch: a capsule of its colour's gradient with a darkened streak down the middle (blurred 3),
 * a white inner glow, a 0.5px ring, a 0.5px white inside stroke fading out downward and a soft drop shadow.
 */
function PillSwatch({ tone }: { tone: keyof typeof swatchTones }) {
  const id = `finance-analytics-swatch-${React.useId().replace(/[^\w-]/g, "")}`
  const t = swatchTones[tone]
  return (
    <span aria-hidden data-slot="finance-analytics-chart-swatch" className="relative h-5 w-[5px] shrink-0 rounded-full shadow-[0_6.171px_11.1px_-3.085px_rgb(38_45_58/0.2)]">
      <span className={cn("absolute inset-0 isolate overflow-hidden rounded-full bg-linear-to-b/srgb", t.fill)}>
        <span className={cn("absolute top-1 left-[1.5px] w-0.5 rounded-[50%] mix-blend-darken blur-[1.35px]", t.dot)} />
        <span className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_3.6px_rgb(255_255_255/0.46)]" />
      </span>
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0.24} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={SWATCH_RING} fillRule="evenodd" className={t.ring} />
        <path d={SWATCH_STROKE} fillRule="evenodd" fill={`url(#${id})`} />
      </svg>
    </span>
  )
}

/** Figma "Marker Line": 1px across the tooltip in `color`, fading out at both ends; centred on its spot. */
function MarkerLine({ width, color }: { width: number; color: string }) {
  const id = `finance-analytics-line-${React.useId().replace(/[^\w-]/g, "")}`
  return (
    <span aria-hidden className="relative block h-0 w-full shrink-0">
      <svg width={width} height={2} className="absolute -top-px left-0 overflow-visible">
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" x2={width} y1="0" y2="0">
            <stop offset="0" stopColor={color} stopOpacity={0} />
            <stop offset="0.298" stopColor={color} />
            <stop offset="0.697" stopColor={color} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <line x1={0} x2={width} y1={1} y2={1} stroke={`url(#${id})`} strokeLinecap="round" />
      </svg>
    </span>
  )
}

/** A tooltip row: the series' swatch and name, and its amount. */
function TooltipRow({ tone, label, value, valueRef }: { tone: keyof typeof swatchTones; label: string; value: string; valueRef?: React.Ref<HTMLSpanElement> }) {
  return (
    <span className="flex h-5 items-center gap-1.5">
      <PillSwatch tone={tone} />
      <span className="typo-label-01-medium min-w-0 flex-1 truncate text-fg-soft">{label}</span>
      <span ref={valueRef} className="typo-label-03-medium hug-w whitespace-nowrap text-fg-loud">
        {value}
      </span>
    </span>
  )
}

/** The tooltip's content. Rendered twice: visible (its amounts count) and as an invisible copy that is measured. */
function TooltipBody({
  title,
  rows,
  lineWidth,
  valueRefs,
}: {
  title: string
  rows: { tone: keyof typeof swatchTones; label: string; value: string }[]
  lineWidth: number
  valueRefs?: React.Ref<HTMLSpanElement>[]
}) {
  return (
    <>
      {/* Figma "April 2026 Content": the heading over a Border/Soft line, 6px apart */}
      <span className="flex flex-col gap-1.5">
        <span className="typo-label-01-medium hug-w whitespace-nowrap text-fg-normal">{title}</span>
        <MarkerLine width={lineWidth} color="var(--border-soft)" />
      </span>
      {rows.map((row, k) => (
        <React.Fragment key={row.tone}>
          {/* between the rows, Primary/Orange/orange-100 */}
          {k > 0 && <MarkerLine width={lineWidth} color="var(--primary-orange-100)" />}
          <TooltipRow tone={row.tone} label={row.label} value={row.value} valueRef={valueRefs?.[k]} />
        </React.Fragment>
      ))}
    </>
  )
}

/**
 * "Finance Analytics Chart" from the Keitoto library: recurring income and expenses as two ticks per slot (a month of
 * the year in Figma) on a dashed grid, income in orange and expenses in grey, with a period menu. The lit slot (April in
 * Figma) has its income tick in full orange with a glow pouring down from it to the axis, sparkles in the glow, and a
 * white tooltip with both amounts beside it. Hover previews a slot, click or the arrow keys light one. Animated with
 * anime.js: the grid draws in, the ticks rise from the axis one slot after another, then the lit tick lights up, its
 * glow pours down and the tooltip pops in while its amounts count up; while a slot is lit its sparkles twinkle and the
 * glow breathes. Another slot slides the glow and the tooltip over (the amounts count); another period moves every tick
 * to its new place.
 */
function FinanceAnalyticsChart({
  title = "Finance Analytics",
  description = "Track recurring income and expenses.",
  periods = sampleFinanceAnalyticsPeriods,
  period: periodProp,
  defaultPeriod,
  onPeriodChange,
  index: indexProp,
  defaultIndex,
  onIndexChange,
  ticks: ticksProp,
  incomeLabel = "Income",
  expensesLabel = "Expenses",
  onMoreClick,
  locale = "en-US",
  currency = "USD",
  className,
  ...props
}: FinanceAnalyticsChartProps) {
  const [periodValue, setPeriod] = useControllableState<string>({
    value: periodProp,
    defaultValue: defaultPeriod ?? periods[0]?.value ?? "",
    onChange: onPeriodChange,
  })
  const current = periods.find((p) => p.value === periodValue) ?? periods[0]
  const points = React.useMemo(() => current?.points ?? [], [current])
  const n = points.length
  const opening = (p: FinanceAnalyticsPeriod | undefined) => Math.min(Math.max(p?.defaultIndex ?? (p?.points.length ?? 1) - 1, 0), Math.max(0, (p?.points.length ?? 1) - 1))
  const [indexValue, setIndexValue] = useControllableState({ value: indexProp, defaultValue: defaultIndex ?? opening(current) })
  /** Lights slot `next` of `list` (the period's points; a new period's when it changes). */
  const setIndex = (next: number, list = points) => {
    setIndexValue(next)
    if (list[next]) onIndexChange?.(next, list[next])
  }

  const max = Math.max(0, ...points.flatMap((point) => [point.income, point.expenses]))
  const ticks = React.useMemo(() => (ticksProp?.length ? [...ticksProp].sort((a, b) => a - b) : niceTicks(0, max > 0 ? max : 1, TICK_COUNT)), [ticksProp, max])
  const rowPitch = ticks.length > 1 ? ((TICK_COUNT - 1) * PITCH) / (ticks.length - 1) : 0
  const [plotRef, plot] = useChartSize<HTMLDivElement>({ width: PLOT_WIDTH, height: PLOT_HEIGHT })
  const width = plot.width || PLOT_WIDTH
  const { pitch, slots, grid, base } = React.useMemo(() => layoutChart(points, ticks, width), [points, ticks, width])
  // Content keys: parents may pass new arrays on every render, so changes are detected by value.
  const shapeKey = slots.map((s) => `${s.x},${s.width},${s.income},${s.expenses}`).join(";")
  const ticksKey = ticks.join(";")
  const labelsKey = points.map((point) => point.label).join(";")

  const [hovered, setHovered] = React.useState<number | null>(null)
  const selected = n ? Math.min(Math.max(Math.round(indexValue), 0), n - 1) : -1
  const active = hovered !== null && hovered < n ? hovered : selected
  const point = points[active]
  const slot = slots[active]
  const glow: Glow | null = slot ? { x: slot.x, width: slot.width, top: slot.income, pour: 1 } : null

  const money = React.useCallback((value: number) => formatCurrency(value, { locale, currency }), [locale, currency])
  const tickText = (tick: number) => formatCurrency(tick, { locale, currency, maximumFractionDigits: Number.isInteger(tick) ? 0 : undefined, useGrouping: false })
  const pointTitle = (p: FinanceAnalyticsPoint) => p.title ?? p.label

  // The tooltip sits right of the lit column (left of it when it would run past the plot), its top 53px above the slot's
  // higher tick, kept inside the grid. Its size is measured on an invisible copy that holds the final text.
  const [sizerRef, sizer] = useChartSize<HTMLSpanElement>({ width: TIP_MIN_WIDTH - TIP_PADDING, height: 88 })
  const tipWidth = Math.max(TIP_MIN_WIDTH, Math.ceil(sizer.width) + TIP_PADDING)
  const tipHeight = Math.ceil(sizer.height) + TIP_PADDING
  const lineWidth = tipWidth - TIP_PADDING
  const flipped = slot ? slot.x + slot.width + TIP_GAP + tipWidth > width : false
  const tipLeft = slot ? (flipped ? Math.max(0, slot.x - TIP_GAP - tipWidth) : slot.x + slot.width + TIP_GAP) : 0
  const tipTop = slot ? Math.round(Math.min(Math.max(Math.min(slot.income, slot.expenses) - TIP_RISE, 0), Math.max(0, GRID_HEIGHT - tipHeight))) : 0
  const tipRows = point
    ? [
        { tone: "income" as const, label: incomeLabel, value: money(point.income) },
        { tone: "expenses" as const, label: expensesLabel, value: money(point.expenses) },
      ]
    : []

  // The x axis names every slot, or every second (third…) one when the slots come too close for their labels.
  const longest = Math.max(0, ...points.map((p) => p.label.length))
  const every = n > 1 && pitch > 0 ? Math.max(1, Math.ceil((longest * LABEL_CHAR + LABEL_GAP) / pitch)) : 1

  const reduced = useReducedMotion()
  const root = React.useRef<HTMLDivElement>(null)
  const tipRef = React.useRef<HTMLDivElement>(null)
  const incomeRef = React.useRef<HTMLSpanElement>(null)
  const expensesRef = React.useRef<HTMLSpanElement>(null)
  const glowRef = React.useRef<SVGGElement>(null)
  const litRef = React.useRef<SVGRectElement>(null)
  const sparklesRef = React.useRef<SVGGElement>(null)
  const inView = useInView(root)
  const ids = React.useId().replace(/[^\w-]/g, "")
  const tipValues = { income: point?.income ?? 0, expenses: point?.expenses ?? 0 }
  // what the entrance's and the morphs' frames need when they run (the card may be resized as its font loads, or another
  // slot lit before they are done)
  const latest = React.useRef({ slots, base, glow, tipValues })
  useIsomorphicLayoutEffect(() => {
    latest.current = { slots, base, glow, tipValues }
  })
  const all = (selector: string) => Array.from(root.current?.querySelectorAll<HTMLElement>(selector) ?? [])
  const tickRects = () => ({
    income: Array.from(root.current?.querySelectorAll<SVGRectElement>('[data-slot="finance-analytics-chart-income"]') ?? []),
    expenses: Array.from(root.current?.querySelectorAll<SVGRectElement>('[data-slot="finance-analytics-chart-expenses"]') ?? []),
  })

  /** Draws the ticks of a frame (their tops, and how far the entrance has brought them in). */
  const drawTicks = (frame: Slot[], rise?: number[]) => {
    const rects = tickRects()
    const { base } = latest.current
    frame.forEach((s, i) => {
      const t = rise ? outExpo(rise[i] ?? 1) : 1
      for (const [rect, top] of [
        [rects.income[i], s.income],
        [rects.expenses[i], s.expenses],
      ] as const) {
        if (!rect) continue
        rect.setAttribute("x", String(s.x))
        rect.setAttribute("width", String(s.width))
        rect.setAttribute("y", String(r3(lerp(base, top, t))))
        if (rise) rect.style.opacity = t >= 1 ? "" : String(Math.min(1, t * 2.5))
      }
    })
  }

  /** Draws the lit tick and its glow: the column under the tick, poured `pour` of the way down. */
  const drawGlow = (frame: Glow) => {
    const g = glowRef.current
    const lit = litRef.current
    if (lit) {
      lit.setAttribute("x", String(r3(frame.x)))
      lit.setAttribute("y", String(r3(frame.top)))
      lit.setAttribute("width", String(r3(frame.width)))
    }
    if (!g) return
    const height = glowHeight(frame.top) * frame.pour
    g.setAttribute("transform", `translate(${r3(frame.x)} ${r3(frame.top + BAR_HEIGHT)})`)
    // the column's fill and its clip (in the SVG's defs)
    for (const rect of Array.from(g.ownerSVGElement?.querySelectorAll<SVGRectElement>("[data-glow-box]") ?? [])) {
      rect.setAttribute("width", String(r3(frame.width)))
      rect.setAttribute("height", String(r3(height)))
    }
    const shapes = glowShapes(frame.width, height)
    Array.from(g.querySelectorAll<SVGPathElement>("[data-glow-layer]")).forEach((path, k) => path.setAttribute("d", shapes[k] ?? ""))
  }

  // How far the entrance has brought each slot's ticks up (null without one), and the glow and ticks on screen, so a
  // redraw or a morph starts from them.
  const rising = React.useRef<number[] | null>(null)
  const pouring = React.useRef<{ t: number } | null>(null)
  const shownTicks = React.useRef<Slot[]>(slots)
  const shownGlow = React.useRef<Glow | null>(glow)
  const tickMorph = React.useRef<JSAnimation | null>(null)
  const glowMorph = React.useRef<JSAnimation | null>(null)
  // The sparkles twinkle once the entrance is over (they never do with reduced motion).
  const [lit, setLit] = React.useState(false)

  // New amounts count from the previous ones.
  useCountUp(incomeRef, tipValues.income, money, { duration: 550 })
  useCountUp(expensesRef, tipValues.expenses, money, { duration: 550 })

  // Entrance, once the card is in view: the grid lines draw in from the left and the labels come in, the ticks rise from
  // the axis one slot after another, then the lit tick lights up, its glow pours down to the axis with its sparkles, and
  // the tooltip pops in while its amounts count up.
  useChartEntrance(root, (timeline) => {
    const rise = latest.current.slots.map(() => 0)
    rising.current = rise
    const pour = { t: 0 }
    pouring.current = pour
    const draw = () => drawTicks(latest.current.slots, rise)
    const drawPour = () => {
      const now = latest.current.glow
      if (now) drawGlow({ ...now, pour: outExpo(pour.t) })
    }
    draw()
    drawPour()
    const state = rise.map(() => ({ t: 0 }))
    timeline
      .add(all('[data-slot="finance-analytics-chart-grid-line"]'), { x2: { from: 0 }, duration: 900, ease: "outQuad", delay: stagger(45, { from: "last" }) }, 0)
      .add(all('[data-slot="finance-analytics-chart-tick"]'), { opacity: { from: 0 }, translateX: { from: -4 }, duration: 600, ease: "outQuad", delay: stagger(45, { from: "last" }) }, 100)
    const axisLabels = all('[data-slot="finance-analytics-chart-axis-label"] > span')
    if (axisLabels.length) timeline.add(axisLabels, { opacity: { from: 0 }, translateY: { from: 4 }, duration: 600, ease: "outQuad", delay: stagger(40) }, 200)
    state.forEach((s, i) =>
      timeline.add(
        s,
        {
          t: [0, 1],
          duration: RISE,
          ease: "linear",
          onUpdate: () => {
            rise[i] = s.t
            draw()
          },
        },
        RISE_AT + i * RISE_STAGGER,
      ),
    )
    const litAt = RISE_AT + Math.max(0, active) * RISE_STAGGER + RISE * 0.4
    if (litRef.current) timeline.add(litRef.current, { opacity: { from: 0 }, duration: 400, ease: "outQuad", onComplete: releaseStyles("opacity") }, litAt)
    timeline.add(pour, { t: [0, 1], duration: 1100, ease: "linear", onUpdate: drawPour }, litAt + 120)
    if (sparklesRef.current) timeline.add(sparklesRef.current, { opacity: { from: 0 }, duration: 900, ease: "outQuad", onComplete: releaseStyles("opacity") }, litAt + 400)
    const tip = tipRef.current
    const values = [incomeRef.current, expensesRef.current]
    const counter = { t: 0 }
    const count = () => {
      const now = latest.current.tipValues
      if (values[0]) values[0].textContent = money(now.income * counter.t)
      if (values[1]) values[1].textContent = money(now.expenses * counter.t)
    }
    count()
    if (tip) timeline.add(tip, { opacity: { from: 0 }, translateY: { from: 6 }, scale: { from: 0.94 }, duration: 500, ease: "outBack(1.6)", onComplete: releaseStyles("opacity", "transform") }, litAt + 250)
    timeline.add(counter, { t: [0, 1], duration: 1000, ease: "outExpo", onUpdate: count }, litAt + 250)
    timeline.call(() => setLit(true))
    return () => {
      if (rising.current === rise) rising.current = null
      if (pouring.current === pour) pouring.current = null
      drawTicks(latest.current.slots)
      const now = latest.current.glow
      if (now) drawGlow(now)
      counter.t = 1
      count()
    }
  })

  // New data, a new axis or a new width moves every tick from where it is on screen to its new place; a new number of
  // slots raises them all from the axis again. During the entrance the ticks are redrawn as far as it has brought them.
  const lastShape = React.useRef({ key: shapeKey, width, n })
  useIsomorphicLayoutEffect(() => {
    const before = lastShape.current
    lastShape.current = { key: shapeKey, width, n }
    if (before.key === shapeKey) return
    const morphing = !!tickMorph.current
    tickMorph.current?.cancel()
    tickMorph.current = null
    const entrance = rising.current
    if (entrance?.some((t) => t < 1)) {
      shownTicks.current = slots
      drawTicks(slots, slots.map((_, i) => entrance[i] ?? 1))
      return
    }
    const draw = (frame: Slot[]) => {
      shownTicks.current = frame
      drawTicks(frame)
    }
    if (reduced || (before.width !== width && !morphing)) {
      draw(slots)
      return
    }
    const from = before.n === n ? shownTicks.current : []
    const state = { t: 0 }
    const at = (t: number) =>
      slots.map((s, i) => {
        const start = from[i] ?? { ...s, income: base, expenses: base }
        return { ...s, x: lerp(start.x, s.x, t), width: lerp(start.width, s.width, t), income: lerp(start.income, s.income, t), expenses: lerp(start.expenses, s.expenses, t) }
      })
    draw(at(0))
    tickMorph.current = animate(state, {
      t: 1,
      duration: MORPH,
      ease: "outExpo",
      onUpdate: () => draw(at(state.t)),
      onComplete: () => {
        tickMorph.current = null
        draw(slots)
      },
    })
  }, [shapeKey, reduced])

  // Another lit slot (or a new layout) slides the lit tick and its glow over from where they are on screen; during the
  // entrance the glow is redrawn as far as it has poured.
  const glowKey = glow ? `${glow.x},${glow.width},${glow.top}` : ""
  const lastGlow = React.useRef({ key: glowKey, width })
  useIsomorphicLayoutEffect(() => {
    const before = lastGlow.current
    lastGlow.current = { key: glowKey, width }
    if (before.key === glowKey || !glow) return
    glowMorph.current?.cancel()
    glowMorph.current = null
    const pour = pouring.current
    if (pour && pour.t < 1) {
      drawGlow({ ...glow, pour: outExpo(pour.t) })
      shownGlow.current = glow
      return
    }
    const from = shownGlow.current
    const draw = (frame: Glow) => {
      shownGlow.current = frame
      drawGlow(frame)
    }
    if (reduced || !from || before.width !== width) {
      draw(glow)
      return
    }
    const state = { t: 0 }
    const at = (t: number): Glow => ({ x: lerp(from.x, glow.x, t), width: lerp(from.width, glow.width, t), top: lerp(from.top, glow.top, t), pour: 1 })
    draw(at(0))
    glowMorph.current = animate(state, {
      t: 1,
      duration: SLIDE,
      ease: "outExpo",
      onUpdate: () => draw(at(state.t)),
      onComplete: () => {
        glowMorph.current = null
        draw(glow)
      },
    })
  }, [glowKey, reduced])
  React.useEffect(
    () => () => {
      tickMorph.current?.cancel()
      glowMorph.current?.cancel()
    },
    [],
  )

  // The tooltip slides to the lit slot; when it changes sides it pops in again.
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
      duration: SLIDE,
      ease: "outExpo",
      onComplete: releaseStyles("transform"),
    })
  }, [tipLeft, tipTop, flipped, width, reduced])

  // New ticks or labels fade in again.
  const lastLabels = React.useRef({ ticksKey, labelsKey })
  useIsomorphicLayoutEffect(() => {
    const before = lastLabels.current
    lastLabels.current = { ticksKey, labelsKey }
    if (reduced) return
    const tickLabels = all('[data-slot="finance-analytics-chart-tick"]')
    const axisLabels = all('[data-slot="finance-analytics-chart-axis-label"] > span')
    if (before.ticksKey !== ticksKey && tickLabels.length)
      animate(tickLabels, { opacity: [0, 1], translateX: [-4, 0], duration: 450, delay: stagger(35), ease: "outQuad", onComplete: releaseStyles("opacity", "transform") })
    if (before.labelsKey !== labelsKey && axisLabels.length)
      animate(axisLabels, { opacity: [0, 1], translateY: [4, 0], duration: 500, delay: stagger(30), ease: "outQuad", onComplete: releaseStyles("opacity", "transform") })
  }, [ticksKey, labelsKey, reduced])

  // The shine of the lit slot, while the card is on screen: its sparkles twinkle in three groups at their own pace and
  // its glow breathes. Everything starts from the Figma frame and goes back to it, so stopping (another slot, off
  // screen, reduced motion) reverts to the still card.
  React.useEffect(() => {
    if (reduced || !lit || !inView || active < 0) return
    const twinkles = Array.from(sparklesRef.current?.querySelectorAll<SVGGElement>("[data-twinkle]") ?? [])
    const layers = Array.from(glowRef.current?.querySelectorAll<SVGPathElement>("[data-glow-layer]") ?? [])
    const loops: JSAnimation[] = []
    const timer = window.setTimeout(() => {
      twinkles.forEach((group, k) =>
        loops.push(animate(group, { opacity: [SPARKLE_REST, 1, SPARKLE_REST], duration: 1500 + k * 620, delay: k * 380, ease: "inOutSine", loop: true })),
      )
      layers.forEach((layer, k) => loops.push(animate(layer, { opacity: [1, 0.78, 1], duration: 2600 + k * 500, delay: k * 300, ease: "inOutSine", loop: true })))
    }, SHINE_DELAY)
    return () => {
      window.clearTimeout(timer)
      loops.forEach((loop) => loop.revert())
    }
  }, [reduced, lit, inView, active])

  const changePeriod = (next: string) => {
    const target = periods.find((p) => p.value === next)
    if (!target || next === current?.value) return
    setHovered(null)
    setPeriod(next)
    setIndex(opening(target), target.points)
  }
  const select = (next: number) => {
    if (!n) return
    setIndex(Math.min(Math.max(next, 0), n - 1))
  }
  // The pointer picks the slot under it (in the plot's own pixels: the live demo may zoom the card).
  const slotAt = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.currentTarget
    const box = target.getBoundingClientRect()
    // CSS zoom (the live demo scales wide demos down) scales the box but not the layout
    const zoom = box.width / (target.offsetWidth || box.width || 1) || 1
    const x = (event.clientX - box.left) / zoom
    return n && pitch > 0 ? Math.min(n - 1, Math.max(0, Math.floor((x + BAR_GAP / 2) / pitch))) : 0
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const next = { ArrowRight: selected + 1, ArrowUp: selected + 1, ArrowLeft: selected - 1, ArrowDown: selected - 1, Home: 0, End: n - 1 }[event.key]
    if (next === undefined || !n) return
    event.preventDefault()
    setHovered(null)
    select(next)
  }
  const valueText = (i: number) => {
    const p = points[i]
    return p ? `${pointTitle(p)}: ${incomeLabel.toLowerCase()} ${money(p.income)}, ${expensesLabel.toLowerCase()} ${money(p.expenses)}` : undefined
  }

  const gridDash = fittedDash(width, DASH, DASH)
  const glowNow = glow ?? { x: 0, width: BAR_WIDTH, top: GRID_BOTTOM, pour: 1 }
  const glowNowHeight = glowHeight(glowNow.top)
  const layers = glowShapes(glowNow.width, glowNowHeight)

  return (
    <ChartCard ref={root} role="group" aria-label={title} className={cn("w-full gap-5 p-4", className)} {...props}>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
          <p className="typo-heading-01-semibold -my-0.5 min-w-0 truncate py-0.5 text-fg-loud">{title}</p>
          <p className="typo-label-03-medium -my-0.5 min-w-0 truncate py-0.5 text-fg-soft">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ChartMenu>
            <ChartMenuTrigger {...{ asChild: true }}>
              <ChartButton corner="rounded" aria-label={`Period: ${current?.label ?? ""}`} className={cn("group/trigger text-fg-normal", RING)}>
                <CalendarSolidIcon />
                {current?.label ?? ""}
                <ChevronDownIcon className="transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
              </ChartButton>
            </ChartMenuTrigger>
            <ChartMenuContent>
              <ChartMenuRadioGroup value={current?.value ?? ""} onValueChange={changePeriod}>
                {periods.map((p) => (
                  <ChartMenuRadioItem key={p.value} value={p.value}>
                    {p.label}
                  </ChartMenuRadioItem>
                ))}
              </ChartMenuRadioGroup>
            </ChartMenuContent>
          </ChartMenu>
          <ChartButton corner="rounded" size="icon" aria-label="More options" onClick={onMoreClick} className={RING}>
            <DotsHorizontalIcon />
          </ChartButton>
        </div>
      </div>

      {/* Figma "Income Row": the legend, 12px between its items, 4px above and below */}
      <div className="flex flex-wrap items-center gap-3 py-1">
        {(["income", "expenses"] as const).map((tone) => (
          <span key={tone} className="flex items-center gap-1.5">
            <PillSwatch tone={tone} />
            <span className="typo-label-02-medium hug-w whitespace-nowrap text-fg-normal">{tone === "income" ? incomeLabel : expensesLabel}</span>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        {/* Figma "Value": the y labels 6px into a 45px column (wider labels widen it), one per 16px row */}
        <div aria-hidden className="hug-w flex min-w-[45px] shrink-0 flex-col pl-1.5" style={{ gap: rowPitch - ROW }}>
          {[...ticks].reverse().map((tick) => (
            <span key={tick} className="flex h-4 items-center">
              <span data-slot="finance-analytics-chart-tick" className="typo-label-01-regular whitespace-nowrap text-fg-soft">
                {tickText(tick)}
              </span>
            </span>
          ))}
        </div>

        <div ref={plotRef} data-slot="finance-analytics-chart-plot" className="relative min-w-0 flex-1" style={{ height: PLOT_HEIGHT }}>
          <svg aria-hidden className="pointer-events-none absolute inset-x-0 top-0 w-full overflow-visible" style={{ height: GRID_HEIGHT }}>
            <defs>
              <linearGradient id={`${ids}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={GLOW} stopOpacity={GLOW_FILL} />
                <stop offset="1" stopColor={GLOW} stopOpacity={0} />
              </linearGradient>
              {GLOW_LAYERS.map((layer, k) => (
                <linearGradient key={k} id={`${ids}-layer-${k}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={GLOW} stopOpacity={layer.alpha} />
                  <stop offset="1" stopColor={GLOW} stopOpacity={0} />
                </linearGradient>
              ))}
              {/* the lit column, in the glow's own coordinates */}
              <clipPath id={`${ids}-column`}>
                <rect data-glow-box x={0} y={0} width={glowNow.width} height={glowNowHeight} />
              </clipPath>
            </defs>
            {/* the card's white, for the glow's darken and screen layers to blend with */}
            <rect x={0} y={0} width={width + OVERHANG} height={GRID_HEIGHT} className="fill-surface-white" />
            {/* Figma "Divider": 1px Border/Soft through each row's middle, dashed 6/6, the $0 line solid */}
            {grid.map((y, k) => (
              <line
                key={ticks[k]}
                data-slot="finance-analytics-chart-grid-line"
                x1={0}
                x2={width}
                y1={r3(y)}
                y2={r3(y)}
                className="stroke-border-soft"
                {...(k === 0 ? {} : gridDash)}
              />
            ))}
            {/* expenses in Background/Soft, income in Primary/Orange/orange-100 */}
            {slots.map((s, i) => (
              <rect key={`e${i}`} data-slot="finance-analytics-chart-expenses" x={s.x} y={s.expenses} width={s.width} height={BAR_HEIGHT} className="fill-surface-soft" />
            ))}
            {slots.map((s, i) => (
              <rect key={`i${i}`} data-slot="finance-analytics-chart-income" x={s.x} y={s.income} width={s.width} height={BAR_HEIGHT} className="fill-primary-orange-100" />
            ))}
            {glow && (
              <>
                {/* the lit tick in Primary/Orange/orange-500 */}
                <rect ref={litRef} data-slot="finance-analytics-chart-lit" x={glow.x} y={glow.top} width={glow.width} height={BAR_HEIGHT} className="fill-primary-orange-500" />
                <g ref={glowRef} data-slot="finance-analytics-chart-glow" transform={`translate(${glow.x} ${glow.top + BAR_HEIGHT})`}>
                  <rect data-glow-box x={0} y={0} width={glowNow.width} height={glowNowHeight} fill={`url(#${ids}-fill)`} />
                  {/* each layer clipped itself (a clipped group would only blend with its own content) */}
                  {GLOW_LAYERS.map((layer, k) => (
                    <path
                      key={k}
                      data-glow-layer
                      d={layers[k]}
                      fill={`url(#${ids}-layer-${k})`}
                      clipPath={`url(#${ids}-column)`}
                      className={layer.blend}
                      style={{ filter: `blur(${layer.blur}px)` }}
                    />
                  ))}
                  <g ref={sparklesRef} clipPath={`url(#${ids}-column)`} className="fill-surface-white mix-blend-plus-lighter">
                    {Array.from({ length: TWINKLE_GROUPS }, (_, group) => (
                      <g key={group} data-twinkle={group} opacity={SPARKLE_REST}>
                        {SPARKLES.map(([x, y, r, o], k) =>
                          k % TWINKLE_GROUPS === group ? <circle key={k} cx={x} cy={y} r={r} opacity={r3(o * SPARKLE_GAIN)} /> : null,
                        )}
                      </g>
                    ))}
                  </g>
                </g>
              </>
            )}
          </svg>

          <div
            role="slider"
            tabIndex={n ? 0 : -1}
            aria-label={`${incomeLabel} and ${expensesLabel.toLowerCase()}, ${current?.label.toLowerCase() ?? ""}`}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, n - 1)}
            aria-valuenow={Math.max(0, selected)}
            aria-valuetext={valueText(selected)}
            data-slot="finance-analytics-chart-scrubber"
            onPointerMove={(event) => setHovered(slotAt(event))}
            onPointerLeave={() => setHovered(null)}
            onPointerUp={(event) => {
              if (event.button === 0) select(slotAt(event))
            }}
            onKeyDown={onKeyDown}
            className={cn("absolute inset-x-0 top-0 cursor-pointer touch-pan-y rounded-lg outline-none focus-visible:ring-2", RING)}
            style={{ height: GRID_HEIGHT }}
          />

          {point && (
            <div
              ref={tipRef}
              aria-hidden
              data-slot="finance-analytics-chart-tooltip"
              className={cn(
                "pointer-events-none absolute z-10 flex flex-col items-stretch gap-2.5 overflow-hidden rounded-lg bg-surface-white p-1.5 whitespace-nowrap",
                // Figma paints later effects on top; CSS paints the first shadow on top
                "shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_4px_7.2px_rgb(0_0_0/0.12)]",
              )}
              style={{ left: tipLeft, top: tipTop, width: tipWidth }}
            >
              <TooltipBody title={pointTitle(point)} rows={tipRows} lineWidth={lineWidth} valueRefs={[incomeRef, expensesRef]} />
            </div>
          )}
          {/* the same content with its final text, measured to place the tooltip (the visible amounts change width while they count) */}
          {point && (
            <span ref={sizerRef} aria-hidden className="pointer-events-none invisible absolute top-0 left-0 flex w-max flex-col gap-2.5 whitespace-nowrap">
              <TooltipBody title={pointTitle(point)} rows={tipRows} lineWidth={0} />
            </span>
          )}

          {/* each slot's label centred under its ticks */}
          <div aria-hidden className="absolute inset-x-0 h-3" style={{ top: AXIS_TOP }}>
            {points.map((p, i) =>
              i % every === 0 && slots[i] ? (
                <span key={`${i}-${p.label}`} data-slot="finance-analytics-chart-axis-label" className="absolute top-0" style={{ left: r3(slots[i].center) }}>
                  <span className="typo-label-01-regular block -translate-x-1/2 whitespace-nowrap text-fg-disable">{p.label}</span>
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

export { FinanceAnalyticsChart, sampleFinanceAnalyticsPeriods, type FinanceAnalyticsChartProps, type FinanceAnalyticsPeriod, type FinanceAnalyticsPoint }
