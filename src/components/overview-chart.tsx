import { animate, stagger, utils, type JSAnimation } from "animejs"
import * as React from "react"

import { ChartButton } from "@/components/ui/chart-button"
import { ChartCard } from "@/components/ui/chart-card"
import { ArrowCircleDownIcon, ArrowCircleUpIcon, ChevronDownIcon, InfoCircleLineIcon, PlusIcon, XCloseIcon } from "@/components/ui/chart-icons"
import { ChartMenu, ChartMenuContent, ChartMenuRadioGroup, ChartMenuRadioItem, ChartMenuTrigger } from "@/components/ui/chart-menu"
import { ChartSegmentedControl } from "@/components/ui/chart-segmented-control"
import { releaseStyles, useChartEntrance, useCountUp, useIsomorphicLayoutEffect, useReducedMotion } from "@/hooks/use-chart-motion"
import { useChartSize } from "@/hooks/use-chart-size"
import { useControllableState } from "@/hooks/use-controllable-state"
import { formatCurrency, formatDay, formatPercent } from "@/lib/chart-format"
import { seededRandom } from "@/lib/chart-series"
import { cn } from "@/lib/utils"

type OverviewDay = {
  /** The day, as an ISO date ("2026-01-20"). */
  date: string
  value: number
}

/** One metric's data for one period. */
type OverviewSeries = {
  /** One bar per day, oldest first: the period's days and any days around them, which are drawn dimmed. */
  days: OverviewDay[]
  /** The big number. The sum of the period's days by default. */
  total?: number
  /** The total's change in percent, shown under it with the period's `changeLabel`. Without it there is no change row. */
  change?: number
}

/** One option of the metric menu. */
type OverviewMetric = {
  value: string
  /** In the menu and over the selection's summary ("Revenue"). */
  label: string
  /** Over the total ("Total revenue"). */
  totalLabel?: string
  /** Its data per period (`periods[].value`). */
  series: Record<string, OverviewSeries>
}

/** A selection of days: [first, last], as ISO dates. */
type OverviewRange = [string, string]

/** One segment of the period control. */
type OverviewPeriod = {
  value: string
  label: string
  /** The period's first and last day (ISO dates); days outside them are context: dimmed, outside the brush, not selectable. All days by default. */
  start?: string
  end?: string
  /** After the total's change ("vs last quarter"). */
  changeLabel?: string
  /** The days selected when the period opens. None by default. */
  defaultRange?: OverviewRange
}

type OverviewChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  title?: string
  /** The soft line under the title. */
  description?: string
  metrics?: OverviewMetric[]
  metric?: string
  defaultMetric?: string
  onMetricChange?: (metric: string) => void
  periods?: OverviewPeriod[]
  period?: string
  defaultPeriod?: string
  onPeriodChange?: (period: string) => void
  /** The selected days of the current period, or null for none. Uncontrolled (one selection per period, from `defaultRange`) when left out. */
  range?: OverviewRange | null
  onRangeChange?: (range: OverviewRange | null, period: string) => void
  /** The primary button's text. */
  createLabel?: string
  onCreate?: () => void
  /** Called by the (i) after the total's label. */
  onInfoClick?: () => void
  /** After the selection's change: up or level, and down. */
  increaseLabel?: string
  decreaseLabel?: string
  /** Text for the selected days in the summary ("Jan 20 – Feb 17, 2026"); the dates are ISO, equal for one day. */
  formatRange?: (start: string, end: string) => string
  locale?: string
  currency?: string
}

// Figma geometry ("Overview Chart" 1473:83943)
const PLOT_WIDTH = 888
const PLOT_HEIGHT = 280 // the plot, its 1px Border/Soft axis included
const BASE = PLOT_HEIGHT - 1 // the bars stand on the axis line
const MAX_BAR = 226 // the tallest bar
const BAR_GAP = 1
const BAR_RADIUS = 2
const BRUSH_GAP = 2 // the brush's parts sit 2px apart
const SUMMARY_INSET = 3 // the summary starts 3px in from the selection's left edge…
const SUMMARY_BOTTOM = 12 // …12px above the plot's bottom
const TIP_GAP = 8 // the day tooltip floats 8px over its bar
const LABEL_EDGE = 12 // month labels closer to an end than this are left out
const MORPH = 700
const MORPH_STAGGER = 3 // the bars morph left to right, 3ms apart
const SELECT_AT = 900 // the entrance lights the selection up once the bars are in
const RING = "focus-visible:ring-primary-orange-500/40" // the card's focus rings are orange, like its brush

const DAY = 86_400_000
const iso = (time: number) => new Date(time).toISOString().slice(0, 10)
const dayTime = (date: string) => Date.parse(`${date}T00:00:00Z`)
const addDays = (date: string, days: number) => iso(dayTime(date) + days * DAY)
/** Months since year 0, so neighbouring months are one apart. */
const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1
const round2 = (n: number) => Math.round(n * 100) / 100
const sum = (days: OverviewDay[], from = 0, to = days.length - 1) => {
  let total = 0
  for (let i = Math.max(0, from); i <= Math.min(to, days.length - 1); i++) total += days[i].value
  return total
}

/** `count` daily amounts that swing around `level` with some momentum and a lot of day-to-day noise. */
function sampleAmounts(seed: number, count: number, level: number) {
  const random = seededRandom(seed)
  let swing = 0
  return Array.from({ length: count }, () => {
    swing = swing * 0.92 + (random() - 0.5) * 0.3
    return round2(Math.max(level * 0.12, level * Math.exp(swing) * (0.35 + random() * 1.15)))
  })
}

// The Figma card's bars: 16 December 2025 to 4 April 2026, so the brush track starts on 1 January (Q1) and the green
// selection's light and dark parts are January and February. The values are the drawn heights (the tallest, 226px, is
// $380.32), and Q1's days add up to the card's $18,645.16.
const FIGMA_REVENUE = [
  53.85, 104.33, 124.53, 53.85, 84.14, 65.63, 84.14, 124.53, 163.23, 201.93, 301.22, 326.46, 254.1, 117.79, 90.87, 84.14, 220.44, 156.5, 201.93,
  254.1, 326.46, 190.15, 163.23, 124.53, 166.59, 70.68, 90.87, 137.99, 65.63, 166.59, 201.93, 65.63, 90.87, 137.99, 156.5, 277.66, 301.22, 319.73,
  353.39, 380.32, 360.12, 334.87, 284.39, 318.04, 328.14, 292.8, 306.27, 311.31, 319.73, 306.27, 269.24, 282.71, 292.8, 245.69, 259.15, 292.8, 233.91,
  254.1, 269.24, 318.04, 265.88, 328.14, 311.31, 318.04, 353.38, 287.75, 254.1, 126.21, 213.71, 198.57, 240.64, 198.57, 84.14, 237.27, 57.21, 215.4,
  166.59, 163.23, 104.33, 156.5, 228.86, 201.93, 254.1, 287.75, 353.38, 235.59, 195.2, 90.87, 31.97, 156.5, 124.53, 84.14, 48.8, 129.57, 72.36, 156.5,
  90.87, 129.57, 163.23, 38.7, 104.33, 65.63, 228.86, 195.2, 90.87, 104.33, 129.57, 190.15, 201.93, 163.23,
]
const SAMPLE_START = "2025-12-16"
const SAMPLE_DAYS = 291 // to 2 October 2026
const dated = (values: number[]): OverviewDay[] => values.map((value, i) => ({ date: addDays(SAMPLE_START, i), value }))

// Revenue after 4 April is generated (seeded); payouts follow revenue over a few days and affiliate revenue is a share of
// it, higher during two campaigns.
const sampleRevenue = [...FIGMA_REVENUE, ...sampleAmounts(26, SAMPLE_DAYS - FIGMA_REVENUE.length, 215)]
const samplePayouts = (() => {
  const random = seededRandom(7)
  return sampleRevenue.map((_, i) => {
    const recent = sampleRevenue.slice(Math.max(0, i - 4), i + 1)
    return round2((recent.reduce((total, value) => total + value, 0) / recent.length) * (0.5 + random() * 0.25))
  })
})()
const sampleAffiliates = (() => {
  const random = seededRandom(11)
  return sampleRevenue.map((value, i) => {
    const date = addDays(SAMPLE_START, i)
    const campaign = (date >= "2026-03-02" && date <= "2026-03-20") || (date >= "2026-08-03" && date <= "2026-08-24") ? 1.45 : 1
    return round2(value * (0.12 + random() * 0.08) * campaign)
  })
})()

const sampleOverviewPeriods: OverviewPeriod[] = [
  { value: "q1", label: "Q1", start: "2026-01-01", end: "2026-03-31", changeLabel: "vs last quarter", defaultRange: ["2026-01-20", "2026-02-17"] },
  { value: "q2", label: "Q2", start: "2026-04-01", end: "2026-06-30", changeLabel: "vs last quarter", defaultRange: ["2026-04-20", "2026-05-18"] },
  { value: "q3", label: "Q3", start: "2026-07-01", end: "2026-09-30", changeLabel: "vs last quarter", defaultRange: ["2026-07-20", "2026-08-17"] },
]

/** Each quarter's 110 days, from 16 days before it starts; Q2 and Q3 change against the quarter before (Q1's is given). */
function quarterly(values: number[], firstChange: number): Record<string, OverviewSeries> {
  const days = dated(values)
  const series: Record<string, OverviewSeries> = {}
  let previous: number | undefined
  for (const period of sampleOverviewPeriods) {
    const from = days.findIndex((day) => day.date === addDays(period.start ?? SAMPLE_START, -16))
    const slice = days.slice(from, from + 110)
    const total = slice.filter((day) => day.date >= (period.start ?? "") && day.date <= (period.end ?? "~")).reduce((all, day) => all + day.value, 0)
    series[period.value] = { days: slice, change: previous ? round2((total / previous - 1) * 100) : firstChange }
    previous = total
  }
  return series
}

const sampleOverviewMetrics: OverviewMetric[] = [
  { value: "revenue", label: "Revenue", totalLabel: "Total revenue", series: quarterly(sampleRevenue, 4.82) },
  { value: "payouts", label: "Payouts", totalLabel: "Total payouts", series: quarterly(samplePayouts, 3.27) },
  { value: "affiliates", label: "Affiliates", totalLabel: "Affiliate revenue", series: quarterly(sampleAffiliates, -2.41) },
]

const rangeFormats = new Map<string, Intl.DateTimeFormat>()
/** "Jan 20 – Feb 17, 2026" (en-US), one date for one day; read in UTC so the server and the browser agree. */
function formatDays(start: string, end: string, locale: string) {
  let format = rangeFormats.get(locale)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
    rangeFormats.set(locale, format)
  }
  const from = dayTime(start)
  const to = dayTime(end)
  return from === to ? format.format(from) : format.formatRange(Math.min(from, to), Math.max(from, to))
}

/**
 * Where the bars sit at a plot width: one per day across the plot, 1px apart; the tallest is 226px. `first` and `last`
 * are the period's days (the others are context), `months` the days that start a month.
 */
function layoutDays(days: OverviewDay[], start: string | undefined, end: string | undefined, width: number) {
  const n = days.length
  const pitch = n ? (width + BAR_GAP) / n : width
  const barWidth = Math.max(0, pitch - BAR_GAP)
  const max = Math.max(0, ...days.map((day) => day.value))
  const heights = days.map((day) => (max > 0 ? (Math.max(0, day.value) / max) * MAX_BAR : 0))
  const xs = days.map((_, i) => i * pitch)
  let first = start ? days.findIndex((day) => day.date >= start) : 0
  if (first < 0) first = n
  let last = n - 1
  if (end) while (last >= 0 && days[last].date > end) last--
  const months: number[] = []
  for (let i = 1; i < n; i++) if (days[i].date.slice(0, 7) !== days[i - 1].date.slice(0, 7)) months.push(i)
  return { n, pitch, barWidth, heights, xs, first, last, months }
}

type Layout = ReturnType<typeof layoutDays>
type Selection = { a: number; b: number }

/** The selected days' indices, inside the period; null when nothing (or nothing in the period) is selected. */
function selectionOf(days: OverviewDay[], range: OverviewRange | null | undefined, layout: Layout): Selection | null {
  if (!range || layout.first > layout.last) return null
  const [from, to] = range[0] <= range[1] ? range : [range[1], range[0]]
  let a = days.findIndex((day) => day.date >= from)
  let b = days.length - 1
  while (b >= 0 && days[b].date > to) b--
  if (a < 0 || b < a) return null
  a = Math.max(a, layout.first)
  b = Math.min(b, layout.last)
  return a <= b ? { a, b } : null
}

/**
 * The brush under the plot, in the plot's x: the grey track over the period's days, split around the selection, which is
 * orange from its first bar's left edge to its last bar's right edge between two 24px dividers. A marker (an I-beam)
 * stands on each month start inside the selection and cuts the orange there; the outer ends carry white grips.
 */
function brushOf(layout: Layout, selection: Selection | null) {
  const { xs, barWidth, first, last, months } = layout
  if (first > last) return null
  const trackLeft = xs[first]
  const trackRight = xs[last] + barWidth
  if (!selection) return { tracks: [[trackLeft, trackRight]], dividers: [] as number[], segments: [] as number[][], markers: [] as number[], left: 0, right: 0 }
  const left = xs[selection.a]
  const right = xs[selection.b] + barWidth
  const markers = months.filter((i) => i > selection.a && i <= selection.b).map((i) => xs[i] - BAR_GAP / 2)
  const edges = [left, ...markers.flatMap((x) => [x - BRUSH_GAP, x + BRUSH_GAP]), right]
  const segments: number[][] = []
  for (let i = 0; i < edges.length; i += 2) if (edges[i + 1] - edges[i] > 0.5) segments.push([edges[i], edges[i + 1]])
  const tracks = [
    [trackLeft, left - 3 - BRUSH_GAP],
    [right + 3 + BRUSH_GAP, trackRight],
  ].filter(([from, to]) => to - from > 0.5)
  return { tracks, dividers: [left - 3, right + 2], segments, markers, left, right }
}

const fixed = (n: number) => Math.round(n * 1000) / 1000

/** A bar standing on the axis with Figma's 2px top corners. */
function barPath(x: number, width: number, height: number) {
  if (!(height > 0.01) || !(width > 0)) return ""
  const r = Math.min(BAR_RADIUS, width / 2, height)
  const top = BASE - height
  return `M${fixed(x)} ${BASE}V${fixed(top + r)}A${fixed(r)} ${fixed(r)} 0 0 1 ${fixed(x + r)} ${fixed(top)}H${fixed(x + width - r)}A${fixed(r)} ${fixed(r)} 0 0 1 ${fixed(x + width)} ${fixed(top + r)}V${BASE}Z`
}

/** The brush grip: a 1 × 12 white tick, rounded on the side facing out. `x` is its outer edge. */
function gripPath(x: number, side: "left" | "right") {
  const k = side === "left" ? 1 : -1
  const c = fixed(x + k * 0.44772)
  const inner = fixed(x + k)
  return `M${fixed(x)} 7C${fixed(x)} 6.44772 ${c} 6 ${inner} 6V18C${c} 18 ${fixed(x)} 17.5523 ${fixed(x)} 17V7Z`
}

/** The marker's I-beam: a 1px line with filled triangle caps, 24px tall, centred on x. */
function markerPath(x: number) {
  const l = fixed(x - 0.5)
  const r = fixed(x + 0.5)
  const wl = fixed(x - 2.88675)
  const wr = fixed(x + 2.88675)
  return `M${l} 4.5H${r}V19.5H${l}Z M${r} 5L${wr} 0H${wl}L${l} 5Z M${l} 19L${wl} 24H${wr}L${r} 19Z`
}

const outExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t)) // per bar, in the morph's wave

type SummaryText = { title: string; dates: string; amount: string; change?: string; down?: boolean; changeLabel?: string }

/** The selection's summary: what it measures, its days, its total and its change. Rendered twice: visible and as a measured copy. */
function SummaryRows({
  text,
  onClear,
  amountRef,
  changeRef,
}: {
  text: SummaryText
  onClear?: () => void
  amountRef?: React.Ref<HTMLSpanElement>
  changeRef?: React.Ref<HTMLSpanElement>
}) {
  return (
    <>
      <span className="flex w-full items-start gap-1.5">
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
          <span className="typo-label-02-medium hug-w whitespace-nowrap text-fg-loud">{text.title}</span>
          <span className="typo-label-01-medium hug-w whitespace-nowrap text-fg-soft">{text.dates}</span>
        </span>
        {onClear ? (
          <button
            type="button"
            aria-label="Clear the selection"
            onClick={onClear}
            className={cn(
              "relative size-4 shrink-0 cursor-pointer rounded-sm text-icon-soft outline-none transition-colors duration-200 before:absolute before:-inset-2 hover:text-icon-normal focus-visible:ring-2",
              RING,
            )}
          >
            <XCloseIcon />
          </button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
      </span>
      <span className="flex items-end gap-7 whitespace-nowrap">
        {/* Figma sets the amount in SF Pro Rounded Bold, 16px, outside the text styles */}
        <span ref={amountRef} className="hug-w text-[16px] leading-none font-bold text-fg-loud">
          {text.amount}
        </span>
        {text.change !== undefined && (
          <span className="flex items-center gap-1">
            <span ref={changeRef} className={cn("typo-label-01-medium hug-w", text.down ? "text-error-500" : "text-primary-green-500")}>
              {text.change}
            </span>
            {text.changeLabel && <span className="typo-label-01-regular hug-w text-fg-soft">{text.changeLabel}</span>}
          </span>
        )}
      </span>
    </>
  )
}

type DragKind = "new" | "start" | "end" | "body"

/**
 * "Overview Chart" from the Keitoto library: a metric menu (Revenue, Payouts, Affiliates) and a primary action, the
 * period's total with its change and a Q1 / Q2 / Q3 switch, and the period's daily bars with a few days around it
 * dimmed. Drag across the bars, or along the brush under them, to select days: they turn green (month by month, light
 * and dark), the brush shows them in orange with a marker on each month start, and a summary gives their total and the
 * change against as many days before them; the × clears it. The brush's ends resize the selection and its middle moves
 * it; hovering a bar shows its day. Animated with anime.js: the panels rise, the total counts up, the bars grow from
 * the axis left to right, then the selection lights up, the brush opens and the summary pops in; a new metric or
 * period morphs the bars in a wave while every number counts.
 */
function OverviewChart({
  title = "Overview",
  description = "Track revenue, payouts, and affiliate performance in a single powerful chart.",
  metrics = sampleOverviewMetrics,
  metric: metricProp,
  defaultMetric,
  onMetricChange,
  periods = sampleOverviewPeriods,
  period: periodProp,
  defaultPeriod,
  onPeriodChange,
  range: rangeProp,
  onRangeChange,
  createLabel = "Create",
  onCreate,
  onInfoClick,
  increaseLabel = "Increase",
  decreaseLabel = "Decrease",
  formatRange,
  locale = "en-US",
  currency = "USD",
  className,
  ...props
}: OverviewChartProps) {
  const [metricValue, setMetric] = useControllableState({ value: metricProp, defaultValue: defaultMetric ?? metrics[0]?.value ?? "", onChange: onMetricChange })
  const [periodValue, setPeriod] = useControllableState({ value: periodProp, defaultValue: defaultPeriod ?? periods[0]?.value ?? "", onChange: onPeriodChange })
  const metric = metrics.find((option) => option.value === metricValue) ?? metrics[0]
  const period = periods.find((option) => option.value === periodValue) ?? periods[0]
  const series = metric && period ? metric.series[period.value] : undefined
  const days = React.useMemo(() => series?.days ?? [], [series])
  const [plotRef, plot] = useChartSize<HTMLDivElement>({ width: PLOT_WIDTH, height: PLOT_HEIGHT })
  const width = plot.width || PLOT_WIDTH
  const layout = React.useMemo(() => layoutDays(days, period?.start, period?.end, width), [days, period?.start, period?.end, width])
  const { n, pitch, barWidth, heights, xs, first, last } = layout
  // Content key: parents may pass new arrays on every render, so changes are detected by value.
  const dataKey = `${metric?.value}|${period?.value}|${days.map((day) => `${day.date}=${day.value}`).join(";")}`

  // The selection: one per period unless controlled.
  const [ranges, setRanges] = React.useState<Record<string, OverviewRange | null>>({})
  const key = period?.value ?? ""
  const range = rangeProp !== undefined ? rangeProp : key in ranges ? ranges[key] : (period?.defaultRange ?? null)
  const selection = React.useMemo(() => selectionOf(days, range, layout), [days, range, layout])
  const brush = brushOf(layout, selection)

  const [hovered, setHovered] = React.useState<number | null>(null)
  // the tooltip keeps showing the last day while it fades out
  const [tipIndex, setTipIndex] = React.useState<number | null>(null)
  const hover = (index: number | null) => {
    setHovered(index)
    if (index !== null) setTipIndex(index)
  }
  const [dragging, setDragging] = React.useState<DragKind | null>(null)
  const active = hovered !== null && hovered < n && !dragging ? hovered : null

  const money = React.useCallback((value: number) => formatCurrency(value, { locale, currency }), [locale, currency])
  const signedPercent = React.useCallback((value: number) => formatPercent(value, { locale, signDisplay: "exceptZero" }), [locale])
  const headPercent = React.useCallback((value: number) => formatPercent(Math.abs(value), { locale }), [locale])

  const periodTotal = series?.total ?? (first <= last ? sum(days, first, last) : 0)
  const periodChange = series?.change
  const totalLabel = metric?.totalLabel ?? `Total ${metric?.label.toLowerCase() ?? ""}`

  const selectionTotal = selection ? sum(days, selection.a, selection.b) : 0
  const length = selection ? selection.b - selection.a + 1 : 0
  const previousTotal = selection && selection.a - length >= 0 ? sum(days, selection.a - length, selection.a - 1) : undefined
  const selectionChange = previousTotal ? (selectionTotal / previousTotal - 1) * 100 : undefined
  const summary: SummaryText | undefined = selection
    ? {
        title: metric?.label ?? "",
        dates: formatRange ? formatRange(days[selection.a].date, days[selection.b].date) : formatDays(days[selection.a].date, days[selection.b].date, locale),
        amount: money(selectionTotal),
        change: selectionChange !== undefined ? signedPercent(selectionChange) : undefined,
        down: selectionChange !== undefined && selectionChange < 0,
        changeLabel: selectionChange !== undefined ? (selectionChange < 0 ? decreaseLabel : increaseLabel) : undefined,
      }
    : undefined

  // The summary sits 3px in from the selection's left edge and 12px above the axis, inside the plot. Its size is
  // measured on an invisible copy that holds the final text (the visible numbers change width while they count).
  const [sizerRef, sizer] = useChartSize<HTMLSpanElement>({ width: 207, height: 60 })
  const summaryWidth = sizer.width + 20
  const summaryHeight = sizer.height + 16
  const summaryLeft = brush && selection ? Math.max(0, Math.min(Math.round(brush.left) + SUMMARY_INSET, width - summaryWidth)) : 0
  const summaryTop = PLOT_HEIGHT - SUMMARY_BOTTOM - summaryHeight

  const reduced = useReducedMotion()
  const root = React.useRef<HTMLDivElement>(null)
  const totalRef = React.useRef<HTMLParagraphElement>(null)
  const changeRef = React.useRef<HTMLSpanElement>(null)
  const summaryRef = React.useRef<HTMLDivElement>(null)
  const amountRef = React.useRef<HTMLSpanElement>(null)
  const summaryChangeRef = React.useRef<HTMLSpanElement>(null)
  const selectionRef = React.useRef<SVGGElement>(null)
  const tipRef = React.useRef<HTMLDivElement>(null)
  const ids = React.useId().replace(/[^\w-]/g, "")
  const all = (selector: string) => Array.from(root.current?.querySelectorAll<HTMLElement>(selector) ?? [])
  const totalText = money(periodTotal)
  const latest = React.useRef({ selection, layout, totalText, periodChange, summary })
  useIsomorphicLayoutEffect(() => {
    latest.current = { selection, layout, totalText, periodChange, summary }
  })

  // New numbers count from the previous ones.
  useCountUp(totalRef, periodTotal, money, { duration: 900 })
  useCountUp(changeRef, Math.abs(periodChange ?? 0), headPercent, { duration: 900 })
  useCountUp(amountRef, selectionTotal, money, { duration: 450 })
  useCountUp(summaryChangeRef, selectionChange ?? 0, signedPercent, { duration: 450 })

  // Entrance, once the card is in view: the panels rise, the total counts up, the bars grow from the axis left to right
  // and the month labels come in; then the selection lights up, the brush's track and orange open, the markers pop and
  // the summary pops in with its numbers counting.
  useChartEntrance(root, (timeline) => {
    const total = totalRef.current
    const change = changeRef.current
    const amount = amountRef.current
    const summaryChange = summaryChangeRef.current
    const counters = { total: 0, change: 0, amount: 0, summaryChange: 0 }
    const count = () => {
      if (total) total.textContent = money(counters.total)
      if (change) change.textContent = headPercent(counters.change)
      if (amount) amount.textContent = money(counters.amount)
      if (summaryChange) summaryChange.textContent = signedPercent(counters.summaryChange)
    }
    count()
    timeline
      .add(all('[data-slot="overview-chart-panel"]'), { opacity: { from: 0 }, translateY: { from: 12 }, duration: 700, ease: "outExpo", delay: stagger(90) }, 0)
      .add(counters, { total: [0, periodTotal], change: [0, Math.abs(periodChange ?? 0)], duration: 1400, ease: "outExpo", onUpdate: count }, 150)
      .add(all('[data-slot="overview-chart-change"]'), { opacity: { from: 0 }, translateY: { from: 4 }, duration: 600, ease: "outQuad" }, 350)
      .add(all('[data-slot="overview-chart-bar"]'), { scaleY: { from: 0 }, duration: 800, ease: "outExpo", delay: stagger(6) }, 200)
      .add(all('[data-slot="overview-chart-label"] > span'), { opacity: { from: 0 }, translateY: { from: 4 }, duration: 600, ease: "outQuad", delay: stagger(60) }, 400)
      .add(all('[data-slot="overview-chart-track"]'), { scaleX: { from: 0 }, duration: 900, ease: "outExpo" }, 350)
    const lit = all('[data-slot="overview-chart-bar"][data-selected]')
    if (lit.length) {
      timeline
        .add(lit.map((bar) => bar.querySelector('[data-layer="base"]')).filter((el): el is Element => !!el), { opacity: { from: 1 }, duration: 500, ease: "outQuad", delay: stagger(12), onComplete: releaseStyles("opacity") }, SELECT_AT)
        .add(lit.map((bar) => bar.querySelector('[data-layer="fill"]')).filter((el): el is Element => !!el), { opacity: { from: 0 }, duration: 500, ease: "outQuad", delay: stagger(12), onComplete: releaseStyles("opacity") }, SELECT_AT)
    }
    if (selectionRef.current) timeline.add(selectionRef.current, { scaleX: { from: 0 }, opacity: { from: 0 }, duration: 700, ease: "outExpo" }, SELECT_AT + 100)
    timeline
      .add(all('[data-slot="overview-chart-divider"]'), { opacity: { from: 0 }, scaleY: { from: 0.4 }, duration: 500, ease: "outBack(2)" }, SELECT_AT + 200)
      .add(all('[data-slot="overview-chart-marker"]'), { scale: { from: 0 }, duration: 500, ease: "outBack(2.2)", delay: stagger(80) }, SELECT_AT + 350)
    if (summaryRef.current) {
      timeline
        .add(summaryRef.current, { opacity: { from: 0 }, translateY: { from: 6 }, scale: { from: 0.94 }, duration: 500, ease: "outBack(1.6)" }, SELECT_AT + 400)
        .add(counters, { amount: [0, selectionTotal], summaryChange: [0, selectionChange ?? 0], duration: 1100, ease: "outExpo", onUpdate: count }, SELECT_AT + 400)
    }
    return () => {
      const now = latest.current
      if (total) total.textContent = now.totalText
      if (change) change.textContent = headPercent(Math.abs(now.periodChange ?? 0))
      if (amount && now.summary) amount.textContent = now.summary.amount
      if (summaryChange && now.summary?.change) summaryChange.textContent = now.summary.change
    }
  })

  // A new metric or period (or new data) morphs the bars from what is on screen, in a wave from left to right; bars that
  // weren't there grow from the axis. A resize redraws them at once.
  const drawn = React.useRef<number[]>(heights)
  const morph = React.useRef<JSAnimation | null>(null)
  const lastMorph = React.useRef({ dataKey, width })
  useIsomorphicLayoutEffect(() => {
    const before = lastMorph.current
    lastMorph.current = { dataKey, width }
    if (before.dataKey === dataKey && before.width === width) return
    morph.current?.cancel()
    const bars = all('[data-slot="overview-chart-bar"]')
    const paint = (frame: number[]) => {
      drawn.current = frame
      bars.forEach((bar, i) => {
        const d = barPath(xs[i] ?? 0, barWidth, frame[i] ?? 0)
        for (const path of Array.from(bar.children)) path.setAttribute("d", d)
      })
    }
    const from = drawn.current
    const to = heights
    if (reduced || before.dataKey === dataKey) {
      paint(to)
      return
    }
    const state = { t: 0 }
    const total = MORPH + MORPH_STAGGER * n
    const frame = () => paint(to.map((h, i) => (from[i] ?? 0) + (h - (from[i] ?? 0)) * outExpo(Math.min(1, Math.max(0, (state.t * total - i * MORPH_STAGGER) / MORPH)))))
    frame()
    morph.current = animate(state, { t: 1, duration: total, ease: "linear", onUpdate: frame, onComplete: () => paint(to) })
  }, [dataKey, width, reduced])
  React.useEffect(
    () => () => {
      morph.current?.cancel()
    },
    [],
  )

  // New month labels (another period) fade in again.
  const labelsKey = layout.months.map((i) => days[i]?.date).join(";")
  const lastLabels = React.useRef(labelsKey)
  useIsomorphicLayoutEffect(() => {
    const before = lastLabels.current
    lastLabels.current = labelsKey
    if (before === labelsKey || reduced) return
    animate(all('[data-slot="overview-chart-label"] > span'), { opacity: [0, 1], translateY: [4, 0], duration: 450, delay: stagger(40), ease: "outQuad", onComplete: releaseStyles("opacity", "transform") })
  }, [labelsKey, reduced])

  // The summary slides along with the selection and pops in when a selection starts.
  const lastSummary = React.useRef({ shown: !!selection, left: summaryLeft })
  useIsomorphicLayoutEffect(() => {
    const before = lastSummary.current
    lastSummary.current = { shown: !!selection, left: summaryLeft }
    const element = summaryRef.current
    if (!element || reduced) return
    if (!before.shown) {
      animate(element, { opacity: [0, 1], translateY: [6, 0], scale: [0.94, 1], duration: 400, ease: "outBack(1.6)", onComplete: releaseStyles("opacity", "transform") })
      return
    }
    if (before.left !== summaryLeft)
      animate(element, { translateX: [before.left - summaryLeft + utils.get(element, "translateX", false), 0], duration: 450, ease: "outExpo", onComplete: releaseStyles("transform") })
  }, [selection, summaryLeft, reduced])

  // Clearing (below) fades its elements out and hands them back once React has drawn the cleared state.
  const clearing = React.useRef(false)
  const pendingRelease = React.useRef<Element[] | null>(null)
  const releasePending = () => {
    for (const element of pendingRelease.current ?? []) (element as HTMLElement).style.removeProperty("opacity")
    pendingRelease.current = null
  }

  // A new selection crossfades the bars that change: green in, grey out (and back), from wherever a fade left them.
  const selectedKey = selection ? `${selection.a}-${selection.b}` : ""
  const lastSelected = React.useRef(selection)
  useIsomorphicLayoutEffect(() => {
    const before = lastSelected.current
    lastSelected.current = selection
    if (pendingRelease.current) {
      releasePending()
      return
    }
    if (reduced) return
    const was = (i: number) => !!before && i >= before.a && i <= before.b
    const is = (i: number) => !!selection && i >= selection.a && i <= selection.b
    all('[data-slot="overview-chart-bar"]').forEach((bar, i) => {
      if (was(i) === is(i)) return
      const [base, fill] = Array.from(bar.children) as HTMLElement[]
      for (const [element, to] of [
        [fill, is(i) ? 1 : 0],
        [base, is(i) ? 0 : 1],
      ] as const) {
        if (!element) continue
        const from = element.style.opacity === "" ? 1 - to : Number(element.style.opacity)
        animate(element, { opacity: [from, to], duration: 220, ease: "outQuad", onComplete: releaseStyles("opacity") })
      }
    })
  }, [selectedKey, reduced])

  // The day tooltip glides from bar to bar and fades in and out.
  const shown = React.useRef(false)
  useIsomorphicLayoutEffect(() => {
    const tip = tipRef.current
    if (!tip) return
    if (active === null) {
      if (shown.current) animate(tip, { opacity: 0, duration: reduced ? 0 : 150, ease: "outQuad" })
      shown.current = false
      return
    }
    const tipWidth = tip.offsetWidth
    const x = Math.min(Math.max(xs[active] + barWidth / 2 - tipWidth / 2, 0), Math.max(0, width - tipWidth))
    const y = Math.max(0, BASE - heights[active] - TIP_GAP - tip.offsetHeight)
    const duration = reduced || !shown.current ? 0 : 300
    animate(tip, { x, y, duration, ease: "outExpo" })
    if (!shown.current) animate(tip, { opacity: [0, 1], duration: reduced ? 0 : 150, ease: "outQuad" })
    shown.current = true
  }, [active, width, heights, xs, barWidth, reduced])

  const commit = (next: Selection | null) => {
    if (!period) return
    const value: OverviewRange | null = next ? [days[next.a].date, days[next.b].date] : null
    const current = latest.current.selection
    if (current && next && current.a === next.a && current.b === next.b) return
    if (!current && !next) return
    if (rangeProp === undefined) setRanges((previous) => ({ ...previous, [period.value]: value }))
    onRangeChange?.(value, period.value)
  }

  // × (and Escape) fades the summary, the brush's selection and the green out together, then clears the selection; the
  // faded elements are handed back once React has drawn the cleared state (or right away if a controlling parent keeps it).
  const clear = () => {
    const current = latest.current.selection
    if (!current || clearing.current) return
    if (reduced) {
      commit(null)
      return
    }
    const bars = all('[data-slot="overview-chart-bar"]').slice(current.a, current.b + 1)
    const fills = bars.map((bar) => bar.children[1]).filter(Boolean)
    const bases = bars.map((bar) => bar.children[0]).filter(Boolean)
    const parts: Element[] = [...all('[data-slot="overview-chart-divider"], [data-slot="overview-chart-marker"]')]
    for (const element of [summaryRef.current, selectionRef.current]) if (element) parts.push(element)
    clearing.current = true
    const done = () => {
      clearing.current = false
      pendingRelease.current = [...parts, ...fills, ...bases]
      commit(null)
      requestAnimationFrame(releasePending)
    }
    animate([...parts, ...fills], { opacity: 0, duration: 200, ease: "outQuad" })
    animate(bases, { opacity: [0, 1], duration: 200, ease: "outQuad", onComplete: done })
  }

  // Pointer positions in the plot's own pixels (the live demo may scale the card with CSS zoom).
  const chartRef = React.useRef<HTMLDivElement>(null)
  const indexAt = (event: React.PointerEvent<HTMLElement>) => {
    const element = chartRef.current
    if (!element || !n) return 0
    const box = element.getBoundingClientRect()
    const zoom = box.width / (element.offsetWidth || box.width || 1) || 1
    return Math.min(n - 1, Math.max(0, Math.floor(((event.clientX - box.left) / zoom + BAR_GAP / 2) / pitch)))
  }
  const inPeriod = (i: number) => Math.min(Math.max(i, first), last)
  const drag = React.useRef<{ kind: DragKind; anchor: number; offset: number; length: number } | null>(null)
  const startDrag = (kind: DragKind, event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || first > last) return
    const i = inPeriod(indexAt(event))
    const current = latest.current.selection
    if (kind !== "new" && !current) return
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
    drag.current = { kind, anchor: i, offset: current ? i - current.a : 0, length: current ? current.b - current.a : 0 }
    if (kind === "new") commit({ a: i, b: i })
    setDragging(kind)
  }
  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const state = drag.current
    if (!state) {
      if (event.pointerType === "mouse") hover(indexAt(event))
      return
    }
    const i = inPeriod(indexAt(event))
    const current = latest.current.selection
    if (state.kind === "new") commit({ a: Math.min(state.anchor, i), b: Math.max(state.anchor, i) })
    else if (current && state.kind === "start") commit({ a: Math.min(i, current.b), b: current.b })
    else if (current && state.kind === "end") commit({ a: current.a, b: Math.max(i, current.a) })
    else if (state.kind === "body") {
      const a = Math.min(Math.max(i - state.offset, first), last - state.length)
      commit({ a, b: a + state.length })
    }
  }
  const endDrag = (event: React.PointerEvent<HTMLElement>) => {
    drag.current = null
    setDragging(null)
    if (event.type === "pointerup" && event.pointerType === "mouse") hover(indexAt(event))
  }

  // Keyboard: the plot is a slider over the days (Enter selects the day, Shift extends the selection to it); the brush's
  // ends are sliders over the selection's first and last day; Escape clears.
  const anchor = React.useRef<number | null>(null)
  const steps: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 7, PageDown: -7 }
  const onPlotKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!n) return
    const at = active ?? selection?.b ?? last
    if (event.key === "Escape") {
      if (selection) clear()
      else setHovered(null)
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      const i = inPeriod(at)
      anchor.current = i
      commit({ a: i, b: i })
      return
    }
    const next = event.key === "Home" ? 0 : event.key === "End" ? n - 1 : steps[event.key] !== undefined ? at + steps[event.key] : undefined
    if (next === undefined) return
    event.preventDefault()
    const i = Math.min(Math.max(next, 0), n - 1)
    hover(i)
    if (event.shiftKey && first <= last) {
      const from = anchor.current ?? selection?.a ?? inPeriod(at)
      anchor.current = from
      commit({ a: Math.min(from, inPeriod(i)), b: Math.max(from, inPeriod(i)) })
    }
  }
  const onHandleKeyDown = (end: "start" | "end") => (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!selection) return
    if (event.key === "Escape") {
      clear()
      return
    }
    const at = end === "start" ? selection.a : selection.b
    const next =
      event.key === "Home" ? (end === "start" ? first : selection.a) : event.key === "End" ? (end === "start" ? selection.b : last) : steps[event.key] !== undefined ? at + steps[event.key] : undefined
    if (next === undefined) return
    event.preventDefault()
    if (end === "start") commit({ a: Math.min(Math.max(next, first), selection.b), b: selection.b })
    else commit({ a: selection.a, b: Math.max(Math.min(next, last), selection.a) })
  }

  const dayText = (i: number) => (days[i] ? `${formatDay(days[i].date, { month: "long", day: "numeric", year: "numeric" }, locale)}: ${money(days[i].value)}` : undefined)
  const plotValue = active ?? selection?.b ?? Math.max(0, Math.min(last, n - 1))
  const up = (periodChange ?? 0) >= 0
  const labels = layout.months.filter((i) => xs[i] - BAR_GAP / 2 >= LABEL_EDGE && xs[i] - BAR_GAP / 2 <= width - LABEL_EDGE)

  return (
    <ChartCard ref={root} role="group" aria-label={title} className={cn("w-full gap-1.5 bg-surface-disable", className)} {...props}>
      <div data-slot="overview-chart-panel" className="flex items-center gap-2.5 overflow-hidden rounded-[20px] bg-surface-white p-4">
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
          <p className="typo-heading-01-semibold -my-0.5 truncate py-0.5 text-fg-loud">{title}</p>
          {description && <p className="typo-label-02-medium -my-0.5 truncate py-0.5 text-fg-soft">{description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {metrics.length > 1 && (
            <ChartMenu>
              <ChartMenuTrigger {...{ asChild: true }}>
                <ChartButton corner="rounded" aria-label={`Metric: ${metric?.label ?? ""}`} className={cn("group/trigger text-fg-normal", RING)}>
                  {metric?.label ?? ""}
                  <ChevronDownIcon className="transition-transform duration-200 group-data-[state=open]/trigger:rotate-180" />
                </ChartButton>
              </ChartMenuTrigger>
              <ChartMenuContent>
                <ChartMenuRadioGroup
                  value={metric?.value}
                  onValueChange={(next) => {
                    setHovered(null)
                    setMetric(next)
                  }}
                >
                  {metrics.map((option) => (
                    <ChartMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </ChartMenuRadioItem>
                  ))}
                </ChartMenuRadioGroup>
              </ChartMenuContent>
            </ChartMenu>
          )}
          {createLabel && (
            // Keitoto's Primary button, with its fill and ring overridden to orange as in Figma
            <ChartButton
              variant="primary"
              corner="rounded"
              onClick={onCreate}
              className={cn("transition-[background-color,scale] [--chart-button-accent:var(--primary-orange-500)] active:scale-[0.97]", RING)}
            >
              <PlusIcon />
              {createLabel}
            </ChartButton>
          )}
        </div>
      </div>

      <div data-slot="overview-chart-panel" className="flex flex-col overflow-hidden rounded-[20px] bg-surface-white">
        <div className="flex items-center gap-2 p-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex items-center gap-1">
              <p className="typo-label-03-medium hug-w whitespace-nowrap text-fg-normal">{totalLabel}</p>
              <button
                type="button"
                aria-label={`About the ${totalLabel.toLowerCase()}`}
                onClick={onInfoClick}
                className={cn(
                  "relative size-4 shrink-0 cursor-pointer rounded-full text-icon-soft outline-none transition-colors duration-200 before:absolute before:-inset-2 hover:text-icon-normal focus-visible:ring-2",
                  RING,
                )}
              >
                <InfoCircleLineIcon />
              </button>
            </div>
            <div className="flex flex-col items-start gap-2">
              <p ref={totalRef} className="typo-heading-04-semibold hug-w whitespace-nowrap text-fg-loud">
                {totalText}
              </p>
              {periodChange !== undefined && (
                <p data-slot="overview-chart-change" className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className={cn("flex items-center gap-1", up ? "text-primary-green-500" : "text-error-500")}>
                    {up ? <ArrowCircleUpIcon className="size-3 shrink-0" /> : <ArrowCircleDownIcon className="size-3 shrink-0" />}
                    <span ref={changeRef} className="typo-label-01-medium hug-w">
                      {headPercent(periodChange)}
                    </span>
                  </span>
                  {period?.changeLabel && <span className="typo-label-01-medium hug-w text-fg-soft">{period.changeLabel}</span>}
                </p>
              )}
            </div>
          </div>
          {periods.length > 1 && (
            <ChartSegmentedControl
              aria-label="Period"
              variant="rounded"
              size="fit"
              value={period?.value}
              onValueChange={(next) => {
                setHovered(null)
                setPeriod(next)
              }}
              items={periods.map((option) => ({ value: option.value, label: option.label }))}
              className="shrink-0"
            />
          )}
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div ref={chartRef} data-slot="overview-chart-chart" className="flex flex-col">
            <div ref={plotRef} data-slot="overview-chart-plot" className="relative" style={{ height: PLOT_HEIGHT }}>
              <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
                <defs>
                  {/* the selected days, a month light and a month dark: Primary/Green 300 → 100 → 12%, and 600 → 400 → 12% */}
                  <linearGradient id={`${ids}-light`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" style={{ stopColor: "var(--primary-green-300)" }} />
                    <stop offset="0.5048" style={{ stopColor: "var(--primary-green-100)" }} />
                    <stop offset="1" style={{ stopColor: "var(--primary-green-300)", stopOpacity: 0.12 }} />
                  </linearGradient>
                  <linearGradient id={`${ids}-dark`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" style={{ stopColor: "var(--primary-green-600)" }} />
                    <stop offset="0.4808" style={{ stopColor: "var(--primary-green-400)" }} />
                    <stop offset="1" style={{ stopColor: "var(--primary-green-600)", stopOpacity: 0.12 }} />
                  </linearGradient>
                </defs>
                {/* Figma "Plot Area": a 1px Border/Soft stroke along the bottom */}
                <line x1={0} x2={width} y1={BASE + 0.5} y2={BASE + 0.5} className="stroke-border-soft" />
                {days.map((day, i) => {
                  const context = i < first || i > last
                  const selected = !!selection && i >= selection.a && i <= selection.b
                  const dark = monthIndex(day.date) % 2 === 1
                  const hot = i === active
                  const d = barPath(xs[i], barWidth, heights[i])
                  return (
                    <g key={i} data-slot="overview-chart-bar" data-selected={selected || undefined} className="origin-bottom [transform-box:fill-box]">
                      {/* the day outside the period in Background/Disable, inside it in Background/Soft; a shade darker under the pointer */}
                      <path
                        data-layer="base"
                        d={d}
                        className={cn(
                          "transition-[fill] duration-200 motion-reduce:transition-none",
                          context ? (hot ? "fill-surface-soft" : "fill-surface-disable") : hot ? "fill-surface-subdued" : "fill-surface-soft",
                          selected && "opacity-0",
                        )}
                      />
                      <path
                        data-layer="fill"
                        d={d}
                        fill={`url(#${ids}-${dark ? "dark" : "light"})`}
                        className={cn("transition-[filter] duration-200 motion-reduce:transition-none", selected ? "opacity-100" : "opacity-0", selected && hot && "brightness-90")}
                      />
                    </g>
                  )
                })}
              </svg>

              <div
                role="slider"
                tabIndex={n ? 0 : -1}
                aria-label={`${metric?.label ?? title} by day`}
                aria-orientation="horizontal"
                aria-valuemin={0}
                aria-valuemax={Math.max(0, n - 1)}
                aria-valuenow={plotValue}
                aria-valuetext={dayText(plotValue)}
                data-slot="overview-chart-scrubber"
                onPointerLeave={() => setHovered(null)}
                onKeyDown={onPlotKeyDown}
                onFocus={(event) => {
                  if (event.currentTarget.matches(":focus-visible") && hovered === null) hover(plotValue)
                }}
                onBlur={() => setHovered(null)}
                className={cn("absolute inset-0 cursor-crosshair touch-pan-y rounded-lg outline-none focus-visible:ring-2", RING)}
                onPointerDown={(event) => startDrag("new", event)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              />

              {summary && (
                <div
                  ref={summaryRef}
                  role="group"
                  aria-label="Selected days"
                  data-slot="overview-chart-summary"
                  className={cn(
                    "absolute z-10 flex origin-bottom-left flex-col items-start gap-3 overflow-hidden rounded-xl bg-surface-white py-2 pr-2 pl-3",
                    // Figma paints later effects on top; CSS paints the first shadow on top
                    "shadow-[0_0_0_1px_#f2f2f2,0_2px_4px_rgb(0_0_0/0.06),0_4px_16px_rgb(0_0_0/0.08)]",
                  )}
                  style={{ left: summaryLeft, top: summaryTop }}
                >
                  <SummaryRows text={summary} onClear={clear} amountRef={amountRef} changeRef={summaryChangeRef} />
                </div>
              )}
              {/* the same rows with their final text, measured to place the summary */}
              {summary && (
                <span ref={sizerRef} aria-hidden className="pointer-events-none invisible absolute top-0 left-0 flex flex-col items-start gap-3">
                  <SummaryRows text={summary} />
                </span>
              )}

              <div
                ref={tipRef}
                aria-hidden
                data-slot="overview-chart-tooltip"
                className="pointer-events-none absolute top-0 left-0 z-20 flex items-center gap-1.5 rounded-xl bg-surface-white px-3 py-2 whitespace-nowrap opacity-0 shadow-[0_0_0_1px_#ececec,0_2px_4px_rgb(0_0_0/0.06),0_4px_16px_rgb(0_0_0/0.08)]"
              >
                {tipIndex !== null && days[tipIndex] && (
                  <>
                    <span className="typo-label-03-medium hug-w text-fg-loud">{money(days[tipIndex].value)}</span>
                    <span className="typo-label-02-regular hug-w text-fg-soft">{formatDay(days[tipIndex].date, { month: "short", day: "numeric" }, locale)}</span>
                  </>
                )}
              </div>
            </div>

            {/* the brush: the period's track, the selection in orange between two dividers, a marker on each month start */}
            <div data-slot="overview-chart-brush" className="relative h-6" onPointerLeave={() => setHovered(null)}>
              <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
                <defs>
                  {/* Figma's orange effects (the 0.5px ring is drawn as a rect: Chrome's feMorphology grows by whole pixels): a 0 3 6
                      black 8% shadow and a white inner glow (blur 3, spread 1, 32%) */}
                  <filter id={`${ids}-orange`} filterUnits="userSpaceOnUse" x={-20} y={-10} width={width + 40} height={50} colorInterpolationFilters="sRGB">
                    <feOffset in="SourceAlpha" dy={3} />
                    <feGaussianBlur stdDeviation={3} />
                    <feComposite in2="SourceAlpha" operator="out" />
                    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.08 0" result="shadow" />
                    <feMorphology in="SourceAlpha" operator="erode" radius={1} />
                    <feGaussianBlur stdDeviation={1.5} />
                    <feComposite in2="SourceAlpha" operator="arithmetic" k2={-1} k3={1} />
                    <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.32 0" result="glow" />
                    <feMerge>
                      <feMergeNode in="shadow" />
                      <feMergeNode in="SourceGraphic" />
                      <feMergeNode in="glow" />
                    </feMerge>
                  </filter>
                  <linearGradient id={`${ids}-stroke`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff" />
                    <stop offset="1" stopColor="#fff" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                {brush?.tracks.map(([from, to], i) => (
                  <rect key={i} data-slot="overview-chart-track" x={from} y={4} width={to - from} height={16} rx={2} className="origin-left fill-surface-base [transform-box:fill-box]" />
                ))}
                {brush?.dividers.map((x, i) => (
                  // #dbdbdb in Figma (no variable)
                  <rect key={i} data-slot="overview-chart-divider" x={x} y={0} width={1} height={24} rx={0.5} fill="#dbdbdb" className="origin-center [transform-box:fill-box]" />
                ))}
                {brush && brush.segments.length > 0 && (
                  <g ref={selectionRef} data-slot="overview-chart-selection" className="origin-center [transform-box:fill-box]">
                    {/* the 0.5px orange-500 ring around each part */}
                    {brush.segments.map(([from, to], i) => (
                      <rect key={i} x={from - 0.5} y={3.5} width={to - from + 1} height={17} rx={2.5} className="fill-primary-orange-500" />
                    ))}
                    <g filter={`url(#${ids}-orange)`}>
                      {brush.segments.map(([from, to], i) => (
                        <React.Fragment key={i}>
                          <rect x={from} y={4} width={to - from} height={16} rx={2} className="fill-primary-orange-500" />
                          {/* a 0.5px inside stroke, white fading to half, at 16% */}
                          <rect x={from + 0.25} y={4.25} width={Math.max(0, to - from - 0.5)} height={15.5} rx={1.75} fill="none" stroke={`url(#${ids}-stroke)`} strokeOpacity={0.16} strokeWidth={0.5} />
                        </React.Fragment>
                      ))}
                      <path d={gripPath(brush.segments[0][0] + 2, "left")} className="fill-surface-white" />
                      <path d={gripPath(brush.segments[brush.segments.length - 1][1] - 2, "right")} className="fill-surface-white" />
                    </g>
                  </g>
                )}
                {brush?.markers.map((x) => (
                  // #171717 in Figma (no variable; Icon/Loud's value)
                  <path key={x} data-slot="overview-chart-marker" d={markerPath(x)} className="origin-center fill-icon-loud [transform-box:fill-box]" />
                ))}
              </svg>

              {brush && first <= last && (
                <div
                  aria-hidden
                  className="absolute inset-y-0 cursor-pointer touch-pan-y"
                  style={{ left: xs[first], width: xs[last] + barWidth - xs[first] }}
                  onPointerDown={(event) => startDrag("new", event)}
                  onPointerMove={moveDrag}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                />
              )}
              {brush && selection && (
                <>
                  <div
                    aria-hidden
                    data-slot="overview-chart-brush-body"
                    className={cn("absolute inset-y-0 touch-none", dragging === "body" ? "cursor-grabbing" : "cursor-grab")}
                    style={{ left: brush.left, width: brush.right - brush.left }}
                    onPointerDown={(event) => startDrag("body", event)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                  />
                  {(["start", "end"] as const).map((end) => {
                    const x = end === "start" ? brush.left - 2.5 : brush.right + 2.5
                    const day = days[end === "start" ? selection.a : selection.b]
                    return (
                      <div
                        key={end}
                        role="slider"
                        tabIndex={0}
                        aria-label={end === "start" ? "First selected day" : "Last selected day"}
                        aria-orientation="horizontal"
                        aria-valuemin={end === "start" ? first : selection.a}
                        aria-valuemax={end === "start" ? selection.b : last}
                        aria-valuenow={end === "start" ? selection.a : selection.b}
                        aria-valuetext={day ? formatDay(day.date, { month: "long", day: "numeric", year: "numeric" }, locale) : undefined}
                        data-slot="overview-chart-handle"
                        onKeyDown={onHandleKeyDown(end)}
                        className={cn("absolute inset-y-0 w-3 cursor-ew-resize touch-none rounded-sm outline-none focus-visible:ring-2", RING)}
                        style={{ left: x - 6 }}
                        onPointerDown={(event) => startDrag(end, event)}
                        onPointerMove={moveDrag}
                        onPointerUp={endDrag}
                        onPointerCancel={endDrag}
                      />
                    )
                  })}
                </>
              )}
            </div>
          </div>

          {/* the month labels, centred on each month's first day */}
          <div aria-hidden className="relative h-3.5">
            {labels.map((i) => (
              <span key={days[i].date} data-slot="overview-chart-label" className="absolute top-0" style={{ left: xs[i] - BAR_GAP / 2 }}>
                <span className="typo-label-02-regular block -translate-x-1/2 whitespace-nowrap text-fg-soft">{formatDay(days[i].date, { month: "short" }, locale)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

export {
  OverviewChart,
  sampleOverviewMetrics,
  sampleOverviewPeriods,
  type OverviewChartProps,
  type OverviewDay,
  type OverviewMetric,
  type OverviewPeriod,
  type OverviewRange,
  type OverviewSeries,
}
