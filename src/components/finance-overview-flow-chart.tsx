"use client"

import { animate, stagger, type JSAnimation } from "animejs"
import * as React from "react"

import { ChartButton } from "@/components/ui/chart-button"
import { ChartCard } from "@/components/ui/chart-card"
import { ArrowCircleDownIcon, ArrowCircleUpIcon, DotsHorizontalIcon } from "@/components/ui/chart-icons"
import { useChartEntrance, useIsomorphicLayoutEffect, useReducedMotion } from "@/hooks/use-chart-motion"
import { useChartSize } from "@/hooks/use-chart-size"
import { useControllableState } from "@/hooks/use-controllable-state"
import { formatCurrency } from "@/lib/chart-format"
import { cn } from "@/lib/utils"

/** One period of the card: a stat at the top, a marker on the stream and a column of the table. */
type FinanceOverviewFlowHorizon = {
  key: string
  /** The table's column ("Weekly"), also in each row's accessible name. */
  label: string
  /** The stat's label ("Weekly net cash flow"). */
  title: string
  /** The previous period's total: the badge shows the change from it. Without it there is no badge. */
  previous?: number
  /** The text after the badge ("vs last week"). */
  compareLabel?: string
}

/** One row of the table and one band of the stream: the region's amount for each horizon, by key. */
type FinanceOverviewFlowRegion = {
  key: string
  label: string
  values: Record<string, number>
}

type FinanceOverviewFlowChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  title?: string
  /** The periods, shortest first: the stats, the markers along the stream and the table's columns. */
  horizons?: FinanceOverviewFlowHorizon[]
  /** The table's rows; the selected one is the stream's green core, the others its rings in table order. */
  regions?: FinanceOverviewFlowRegion[]
  /** The selected region's key. */
  region?: string
  defaultRegion?: string
  onRegionChange?: (region: string) => void
  /** The table's first header. */
  regionLabel?: string
  /** Called by the ✦ button. */
  onInsightsClick?: () => void
  /** Called by the ⋯ button. */
  onMoreClick?: () => void
  locale?: string
  currency?: string
}

type Cubic = readonly [number, number, number, number, number, number, number, number]
/** The stream at every sample: its thickness factor, and each band's share of it (outermost band first). */
type Frame = { level: number[]; bands: number[][] }

// Figma geometry ("Finance Overview Flow Chart" 1473:79707)
const PLOT_WIDTH = 800
const PLOT_HEIGHT = 340
const TIP_HEIGHT = 36
const TIP_TOP = (PLOT_HEIGHT - TIP_HEIGHT) / 2 // the markers' values are centred in the plot…
const DIVIDER_GAP = 1 // …with the divider 1px above and under them
const CROWDED = 124 // closer than this, every second pill moves up a pill's height so they don't overlap
// Figma "Area Fill" 1473:79748, the stream's outline: its top and bottom edges as cubic segments, left to right, in
// the plot's pixels at Figma's 800px width (a flat stem, a rise, a slow climb, a second rise and a plateau)
const OUTLINE_TOP: Cubic[] = [
  [0, 173.5211, 36.4332, 173.5211, 72.8664, 173.5211, 109.2997, 173.5211],
  [109.2997, 173.5211, 109.2997, 173.5211, 182.1606, 121.4544, 229.6211, 103.0986],
  [229.6211, 103.0986, 268.1975, 88.1789, 411.9403, 103.0986, 464.2939, 83.3803],
  [464.2939, 83.3803, 507.2971, 67.1837, 537.156, 24.2254, 580.4822, 24.2254],
  [580.4822, 24.2254, 675.0861, 24.2253, 800, 20, 800, 20],
]
const OUTLINE_BOTTOM: Cubic[] = [
  [0, 204.507, 36.4332, 204.507, 72.8664, 204.507, 109.2997, 204.507],
  [109.2997, 204.507, 109.2997, 204.507, 182.3452, 245.1079, 229.6211, 259.4366],
  [229.6211, 259.4366, 267.279, 270.8502, 388.0597, 259.4366, 464.2939, 259.4366],
  [464.2939, 259.4366, 525.7604, 259.4366, 537.6364, 320, 580.4822, 320],
  [580.4822, 320, 650.7463, 320, 800, 320, 800, 320],
]
// The inner bands are the outline scaled toward this line (the spine) by their share: Figma's two inner "Area Fill"s
// are its copies scaled by 0.669 and 0.356 about 189.70 and 189.87.
const SPINE = 189.8
// Figma's three markers (the dividers' centres) in its 800px; more or fewer periods are spread along these
const MARKERS = [181, 404.5, 630]
const STEP = 4 // the outline is sampled every 4px (within 0.06px of the curves)
const FEATHER = 160 // the soft edge of the stream as it flows in
const SHEEN = 180 // the light that runs along the core when it fills
const GLASS_TIP =
  "shadow-[inset_0_2px_8px_rgb(255_255_255/0.24),0_0_0_1px_var(--surface-muted),0_2px_4px_rgb(0_0_0/0.06),0_4px_16px_rgb(0_0_0/0.08)]"
const DIVIDER = "shadow-[0_0_0_1px_var(--surface-muted),0_2px_4px_rgb(0_0_0/0.06),0_4px_16px_rgb(0_0_0/0.08)]"
// The bands' gradients, from the core outward (Figma: green, light blue, blue), each darkest at the right edge and
// fading out to the left: [right end, at 41.35% from the right, left end (transparent)]
const BAND_COLORS = [
  ["var(--primary-green-500)", "var(--primary-green-200)", "var(--primary-green-200)"],
  ["var(--accent-light-blue-700)", "var(--accent-light-blue-500)", "var(--accent-light-blue-500)"],
  ["var(--primary-blue-700)", "var(--primary-blue-500)", "var(--primary-blue-400)"],
  ["var(--primary-purple-700)", "var(--primary-purple-500)", "var(--primary-purple-400)"],
  ["var(--primary-orange-700)", "var(--primary-orange-500)", "var(--primary-orange-400)"],
]
const FLOW_AT = 350
const FLOW = 1700
const MORPH = 750
const RIPPLE = 450 // a new selection flows along the stream from left to right
const COUNT = 900
const SWEEP = 1300

/** x and y of a cubic segment at t. */
function pointOf(c: Cubic, t: number) {
  const u = 1 - t
  const a = u * u * u
  const b = 3 * u * u * t
  const d = 3 * u * t * t
  const e = t * t * t
  return [a * c[0] + b * c[2] + d * c[4] + e * c[6], a * c[1] + b * c[3] + d * c[5] + e * c[7]]
}

/** y of an edge at x (its segments run left to right, each one steadily). */
function edgeAt(edge: Cubic[], x: number) {
  const c = edge.find((segment) => x <= segment[6]) ?? edge[edge.length - 1]
  let lo = 0
  let hi = 1
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (pointOf(c, mid)[0] < x) lo = mid
    else hi = mid
  }
  return pointOf(c, (lo + hi) / 2)[1]
}

const thicknessAt = (x: number) => edgeAt(OUTLINE_BOTTOM, x) - edgeAt(OUTLINE_TOP, x)

// The outline sampled every STEP px plus its corners and the three markers, as distances from the spine.
const SAMPLE_X = [
  ...new Set([...Array.from({ length: PLOT_WIDTH / STEP + 1 }, (_, i) => i * STEP), 109.2997, 229.6211, 464.2939, 580.4822, ...MARKERS]),
].sort((a, b) => a - b)
const SAMPLE_UP = SAMPLE_X.map((x) => SPINE - edgeAt(OUTLINE_TOP, x))
const SAMPLE_DOWN = SAMPLE_X.map((x) => edgeAt(OUTLINE_BOTTOM, x) - SPINE)

/** The markers' x in Figma's 800px, one per period: Figma's three, or as many spread along them. */
const markersOf = (count: number) =>
  Array.from({ length: count }, (_, i) => {
    const t = count > 1 ? i / (count - 1) : 0.5
    return t <= 0.5 ? MARKERS[0] + (MARKERS[1] - MARKERS[0]) * t * 2 : MARKERS[1] + (MARKERS[2] - MARKERS[1]) * (t - 0.5) * 2
  })

/** values[i] at markers[i], eased (smoothstep) from one marker to the next and level before the first and after the last. */
function along(markers: number[], values: number[], x: number) {
  const n = markers.length
  if (!n) return 0
  if (x <= markers[0]) return values[0]
  if (x >= markers[n - 1]) return values[n - 1]
  let i = 0
  while (i < n - 2 && x > markers[i + 1]) i++
  const t = (x - markers[i]) / (markers[i + 1] - markers[i] || 1)
  return values[i] + (values[i + 1] - values[i]) * t * t * (3 - 2 * t)
}

/**
 * The stream for some regions: its thickness at each marker is the period's total (the same px per dollar for
 * every marker, the largest filling Figma's outline there), eased between the markers along Figma's outline; inside
 * it, the selected region is the core and the others are rings around it, in table order, each as thick as its share.
 */
function layoutFlow(regions: FinanceOverviewFlowRegion[], horizons: FinanceOverviewFlowHorizon[], selected: number) {
  const markers = markersOf(horizons.length)
  const amount = (region: FinanceOverviewFlowRegion, horizon: FinanceOverviewFlowHorizon) => Math.max(0, region.values[horizon.key] ?? 0)
  const totals = horizons.map((horizon) => regions.reduce((sum, region) => sum + amount(region, horizon), 0))
  const rates = totals.map((total, i) => total / (thicknessAt(markers[i]) || 1))
  const top = Math.max(0, ...rates)
  const levels = rates.map((rate) => (top > 0 ? rate / top : 0))
  // the core first, then the others in table order; each band covers the regions up to its own
  const order = selected >= 0 ? [selected, ...regions.map((_, i) => i).filter((i) => i !== selected)] : regions.map((_, i) => i)
  const shares = order.map((_, k) =>
    horizons.map((horizon, i) => (totals[i] > 0 ? order.slice(0, k + 1).reduce((sum, r) => sum + amount(regions[r], horizon), 0) / totals[i] : (k + 1) / order.length)),
  )
  // outermost band first: it covers every region
  const bandShares = shares.map((_, k) => shares[shares.length - 1 - k])
  const frame: Frame = {
    level: SAMPLE_X.map((x) => along(markers, levels, x)),
    bands: bandShares.map((band) => SAMPLE_X.map((x) => along(markers, band, x))),
  }
  return { markers, totals, order, levels, bandShares, frame }
}

const round = (n: number) => Math.round(n * 1000) / 1000

/** A band's outline at a plot width: along its top edge and back along its bottom one. */
function bandPath(frame: Frame, band: number, width: number) {
  const scale = width / PLOT_WIDTH
  const shares = frame.bands[band]
  if (!shares) return ""
  let top = ""
  let bottom = ""
  for (let i = 0; i < SAMPLE_X.length; i++) {
    const size = frame.level[i] * shares[i]
    const x = round(SAMPLE_X[i] * scale)
    top += `${i ? " L" : "M"} ${x} ${round(SPINE - SAMPLE_UP[i] * size)}`
    bottom = ` L ${x} ${round(SPINE + SAMPLE_DOWN[i] * size)}${bottom}`
  }
  return `${top}${bottom} Z`
}

/** The visible part of a band (its outline less the next band's), for the hover highlight. */
const ringPath = (frame: Frame, band: number, width: number) =>
  band < 0 ? "" : `${bandPath(frame, band, width)}${band < frame.bands.length - 1 ? ` ${bandPath(frame, band + 1, width)}` : ""}`

/** A frame between two others, each sample at its own progress. */
function blend(from: Frame, to: Frame, progress: (i: number) => number): Frame {
  return {
    level: to.level.map((value, i) => (from.level[i] ?? value) + (value - (from.level[i] ?? value)) * progress(i)),
    bands: to.bands.map((band, k) => band.map((value, i) => (from.bands[k]?.[i] ?? value) + (value - (from.bands[k]?.[i] ?? value)) * progress(i))),
  }
}

const outExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
/** Inverse of inOutSine: how far into the flow (0–1) its edge reaches `fraction` of its run. */
const flowTime = (fraction: number) => Math.acos(1 - 2 * clamp01(fraction)) / Math.PI

// The Figma card. Figma's table doesn't match its stream (see FIGMA-GAPS.md): these amounts give the drawn stream,
// 113px thick at the weekly marker, 168px at the monthly and 296px at the yearly one, with North America, Europe and
// Asia Pacific taking 35.6%, 31.3% and 33.1% of it at each; scaled to keep North America's weekly $2,746.26.
const sampleFinanceOverviewFlowHorizons: FinanceOverviewFlowHorizon[] = [
  { key: "weekly", label: "Weekly", title: "Weekly net cash flow", previous: 7098.4, compareLabel: "vs last week" },
  { key: "monthly", label: "Monthly", title: "Monthly net cash flow", previous: 10385, compareLabel: "vs last month" },
  { key: "yearly", label: "Yearly", title: "Yearly net cash flow", previous: 17846, compareLabel: "vs last year" },
]
const sampleFinanceOverviewFlowRegions: FinanceOverviewFlowRegion[] = [
  { key: "north-america", label: "North America", values: { weekly: 2746.26, monthly: 4075, yearly: 7192 } },
  { key: "europe", label: "Europe", values: { weekly: 2411.04, monthly: 3577, yearly: 6314 } },
  { key: "asia-pacific", label: "Asia Pacific", values: { weekly: 2552.86, monthly: 3788, yearly: 6685 } },
]

/** Untitled UI "stars-01" solid with Figma's purple-400 to blue-500 gradient (16px). */
function SparklesIcon(props: React.ComponentProps<"svg">) {
  const gradient = `finance-overview-flow-sparkles-${React.useId().replace(/[^\w-]/g, "")}`
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden data-slot="icon" {...props}>
      <defs>
        <linearGradient id={gradient} x1="7.99984" y1="0.666504" x2="7.99984" y2="15.3332" gradientUnits="userSpaceOnUse">
          <stop style={{ stopColor: "var(--primary-purple-400)" }} />
          <stop offset="1" style={{ stopColor: "var(--primary-blue-500)" }} />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradient})`}
        d="M10.6221 1.09385C10.523 0.83639 10.2757 0.666504 9.99984 0.666504C9.72399 0.666504 9.47663 0.83639 9.37761 1.09385L8.59186 3.1368C8.39159 3.65749 8.32866 3.80754 8.24258 3.9286C8.1562 4.05007 8.05007 4.1562 7.9286 4.24258C7.80754 4.32866 7.65749 4.39159 7.1368 4.59186L5.09385 5.37761C4.83639 5.47663 4.6665 5.72399 4.6665 5.99984C4.6665 6.27569 4.83639 6.52304 5.09385 6.62207L7.1368 7.40782C7.65749 7.60808 7.80754 7.67102 7.9286 7.7571C8.05007 7.84347 8.1562 7.9496 8.24258 8.07107C8.32866 8.19213 8.39159 8.34218 8.59186 8.86288L9.37761 10.9058C9.47663 11.1633 9.72399 11.3332 9.99984 11.3332C10.2757 11.3332 10.523 11.1633 10.6221 10.9058L11.4078 8.86288C11.6081 8.34218 11.671 8.19213 11.7571 8.07107C11.8435 7.9496 11.9496 7.84347 12.0711 7.7571C12.1921 7.67102 12.3422 7.60808 12.8629 7.40782L14.9058 6.62207C15.1633 6.52304 15.3332 6.27569 15.3332 5.99984C15.3332 5.72399 15.1633 5.47663 14.9058 5.37761L12.8629 4.59186C12.3422 4.39159 12.1921 4.32866 12.0711 4.24258C11.9496 4.1562 11.8435 4.05007 11.7571 3.9286C11.671 3.80754 11.6081 3.65749 11.4078 3.1368L10.6221 1.09385Z"
      />
      <path
        fill={`url(#${gradient})`}
        d="M4.92946 8.36836C4.81653 8.14251 4.58568 7.99984 4.33317 7.99984C4.08066 7.99984 3.84981 8.14251 3.73689 8.36836L3.21391 9.41431C3.02559 9.79095 2.9682 9.89934 2.89848 9.9898C2.82854 10.0805 2.7472 10.1619 2.65647 10.2318C2.56601 10.3015 2.45762 10.3589 2.08097 10.5472L1.03503 11.0702C0.809172 11.1831 0.666504 11.414 0.666504 11.6665C0.666504 11.919 0.809172 12.1499 1.03503 12.2628L2.08097 12.7858C2.45762 12.9741 2.56601 13.0315 2.65647 13.1012C2.7472 13.1711 2.82854 13.2525 2.89848 13.3432C2.9682 13.4337 3.02559 13.5421 3.21391 13.9187L3.73689 14.9646C3.84981 15.1905 4.08066 15.3332 4.33317 15.3332C4.58569 15.3332 4.81653 15.1905 4.92946 14.9646L5.45243 13.9187C5.64075 13.5421 5.69814 13.4337 5.76787 13.3432C5.8378 13.2525 5.91914 13.1711 6.00988 13.1012C6.10034 13.0315 6.20872 12.9741 6.58537 12.7858L7.63131 12.2628C7.85717 12.1499 7.99984 11.919 7.99984 11.6665C7.99984 11.414 7.85717 11.1831 7.63131 11.0702L6.58537 10.5472C6.20872 10.3589 6.10034 10.3015 6.00988 10.2318C5.91914 10.1619 5.8378 10.0805 5.76787 9.9898C5.69814 9.89934 5.64075 9.79095 5.45243 9.41431L4.92946 8.36836Z"
      />
    </svg>
  )
}

/**
 * A period's marker: a dark divider through the plot with the selected region's amount in a dark pill at its middle.
 * The divider sits on the marker's x (fractions anti-aliased like Figma's); the pill is centred on it at a whole pixel,
 * so its text is crisp.
 */
function FlowMarker({ x, top, value }: { x: number; top: number; value: string }) {
  const [textRef, text] = useChartSize<HTMLSpanElement>({ width: 74, height: 16 })
  const pillWidth = text.width + 28 // 12px padding and the 2px around the text, on both sides
  const left = Math.floor(x - 1)
  return (
    <div data-slot="finance-overview-flow-chart-marker" aria-hidden className="pointer-events-none absolute inset-y-0 left-0">
      <span className="absolute top-0 w-0.5" style={{ left, height: top - DIVIDER_GAP, translate: `${round(x - 1 - left)}px 0` }}>
        <span data-slot="finance-overview-flow-chart-divider" className={cn("block size-full origin-bottom bg-surface-loud", DIVIDER)} />
      </span>
      <span className="absolute bottom-0 w-0.5" style={{ left, height: PLOT_HEIGHT - top - TIP_HEIGHT - DIVIDER_GAP, translate: `${round(x - 1 - left)}px 0` }}>
        <span data-slot="finance-overview-flow-chart-divider" className={cn("block size-full origin-top bg-surface-loud", DIVIDER)} />
      </span>
      <span
        data-slot="finance-overview-flow-chart-pill"
        className={cn("absolute flex items-center rounded-full bg-surface-loud px-3 whitespace-nowrap text-fg-white", GLASS_TIP)}
        style={{ left: Math.round(x - pillWidth / 2), top, height: TIP_HEIGHT }}
      >
        <span ref={textRef} data-slot="finance-overview-flow-chart-pill-value" className="typo-label-03-medium hug-w px-0.5">
          {value}
        </span>
      </span>
    </div>
  )
}

/**
 * "Finance Overview Flow Chart" from the Keitoto library: net cash flow by region over a week, a month and a year.
 * The stats give each period's total with its change (green and up, or red and down); the stream widens from the week
 * to the year, as thick at each period's marker as that period's total, with the selected region as its green core and
 * the other regions as rings around it, and a dark marker for each period with the selected region's amount; the table
 * lists every region's amounts, the selected one in bold. Pick a region in the table (or click its band) to bring it
 * to the core. Animated with anime.js: the numbers count up, the glow blooms, the stream flows in from the left while
 * its inner bands swell out of the spine, the markers draw out of their pills as the flow reaches them, and the
 * table's rows come in; a new region flows into the core from left to right while the markers count to its amounts.
 */
function FinanceOverviewFlowChart({
  title = "Finance Overview",
  horizons = sampleFinanceOverviewFlowHorizons,
  regions = sampleFinanceOverviewFlowRegions,
  region: regionProp,
  defaultRegion,
  onRegionChange,
  regionLabel = "Region",
  onInsightsClick,
  onMoreClick,
  locale = "en-US",
  currency = "USD",
  className,
  ...props
}: FinanceOverviewFlowChartProps) {
  const [regionValue, setRegion] = useControllableState({ value: regionProp, defaultValue: defaultRegion ?? regions[0]?.key ?? "", onChange: onRegionChange })
  const selected = regions.findIndex((r) => r.key === regionValue)
  const active = selected >= 0 ? selected : regions.length ? 0 : -1
  const [plotRef, plot] = useChartSize<HTMLDivElement>({ width: PLOT_WIDTH, height: PLOT_HEIGHT })
  const width = plot.width || PLOT_WIDTH
  const { markers, order, levels, bandShares, frame } = React.useMemo(() => layoutFlow(regions, horizons, active), [regions, horizons, active])
  const bandCount = frame.bands.length
  // on a narrow card the pills would overlap: every second one moves up
  const crowded = markers.some((x, i) => i > 0 && ((x - markers[i - 1]) / PLOT_WIDTH) * width < CROWDED)
  // Content keys: parents may pass new arrays on every render, so changes are detected by value.
  const shapeKey = frame.bands.map((band) => band.map(round).join(",")).join("|") + `|${frame.level.map(round).join(",")}`
  const sums = horizons.map((horizon) => regions.reduce((sum, r) => sum + (r.values[horizon.key] ?? 0), 0))
  const picked = regions[active]
  const pickedValues = horizons.map((horizon) => picked?.values[horizon.key] ?? 0)

  const money = React.useCallback((value: number) => formatCurrency(value, { locale, currency }), [locale, currency])
  const wholeMoney = React.useCallback((value: number) => formatCurrency(Math.abs(value), { locale, currency, maximumFractionDigits: 0 }), [locale, currency])

  // the hovered region (a band or a row) and the last one, whose highlight fades out
  const [hovered, setHovered] = React.useState<number | null>(null)
  const [highlight, setHighlight] = React.useState<number | null>(null)
  const hover = (index: number | null) => {
    setHovered(index)
    if (index !== null) setHighlight(index)
  }
  const bandOf = (index: number | null) => (index === null ? -1 : bandCount - 1 - order.indexOf(index))
  const highlightBand = highlight !== null && highlight < regions.length ? bandOf(highlight) : -1

  const reduced = useReducedMotion()
  const root = React.useRef<HTMLDivElement>(null)
  const bandRefs = React.useRef<(SVGPathElement | null)[]>([])
  const ringRef = React.useRef<SVGPathElement>(null)
  const sheenRef = React.useRef<SVGPathElement>(null)
  const sheenLight = React.useRef<SVGLinearGradientElement>(null)
  const maskRef = React.useRef<SVGRectElement>(null)
  const ids = React.useId().replace(/[^\w-]/g, "")
  const all = (selector: string) => Array.from(root.current?.querySelectorAll<HTMLElement>(selector) ?? [])

  // What the animations need when they run: the latest layout, and the frame on screen (morphs start from it).
  const shown = React.useRef<Frame>(frame)
  const growing = React.useRef<number[] | null>(null)
  const latest = React.useRef({ frame, width, highlightBand, sums, pickedValues, changes: horizons.map((h, i) => (h.previous !== undefined ? sums[i] - h.previous : 0)) })
  useIsomorphicLayoutEffect(() => {
    latest.current = { frame, width, highlightBand, sums, pickedValues, changes: horizons.map((h, i) => (h.previous !== undefined ? sums[i] - h.previous : 0)) }
  })
  const paint = React.useCallback((next: Frame) => {
    shown.current = next
    const { width: w, highlightBand: ring } = latest.current
    bandRefs.current.forEach((path, b) => path?.setAttribute("d", bandPath(next, b, w)))
    sheenRef.current?.setAttribute("d", bandPath(next, next.bands.length - 1, w))
    ringRef.current?.setAttribute("d", ringPath(next, ring, w))
  }, [])
  // A light runs along the core, left to right (when the core fills: the entrance, a new region).
  const sheen = React.useRef<JSAnimation | null>(null)
  const runSheen = React.useCallback((duration: number) => {
    const light = sheenLight.current
    if (!light) return
    sheen.current?.cancel()
    const state = { x: -SHEEN }
    const move = () => light.setAttribute("gradientTransform", `translate(${round(state.x)} 0)`)
    sheen.current = animate(state, { x: latest.current.width, duration, ease: "inOutSine", onUpdate: move, onComplete: move })
  }, [])
  /** The frame with the inner bands grown `growth[b]` of the way out of the spine (the entrance). */
  const grown = (target: Frame, growth: number[]): Frame => ({ level: target.level, bands: target.bands.map((band, b) => band.map((share) => share * (growth[b] ?? 1))) })

  // Entrance, once the card is in view: the header and the stats come in with their numbers counting up, the glow
  // blooms, the stream flows in from the left (a soft edge) while its inner bands swell out of the spine, each marker
  // draws out of its pill as the flow reaches it and counts up its amount, and the table's rows come in.
  useChartEntrance(root, (timeline) => {
    const mask = maskRef.current
    const statValues = all('[data-slot="finance-overview-flow-chart-stat-value"]')
    const changeValues = all('[data-slot="finance-overview-flow-chart-change"]')
    const pillValues = all('[data-slot="finance-overview-flow-chart-pill-value"]')
    const counters = { stats: 0, pills: markers.map(() => 0) }
    const count = () => {
      const { sums: s, changes, pickedValues: p } = latest.current
      statValues.forEach((el, i) => (el.textContent = money((s[i] ?? 0) * counters.stats)))
      changeValues.forEach((el) => (el.textContent = wholeMoney((changes[Number(el.dataset.index)] ?? 0) * counters.stats)))
      pillValues.forEach((el, i) => (el.textContent = money((p[i] ?? 0) * (counters.pills[i] ?? 1))))
    }
    count()
    const run = latest.current.width + FEATHER
    const reveal = { x: 0 }
    const flow = () => mask?.setAttribute("x", String(round(-run + reveal.x * run)))
    flow()
    // the bands inside the outline swell out of the spine, outermost first
    const growth: number[] = frame.bands.map((_, b) => (b === 0 ? 1 : 0))
    growing.current = growth
    const grow = () => paint(grown(latest.current.frame, growth))
    grow()
    timeline
      .add(all('[data-slot="finance-overview-flow-chart-header"] > p, [data-slot="finance-overview-flow-chart-header"] > div > *'), { opacity: { from: 0 }, translateY: { from: 6 }, duration: 700, ease: "outExpo", delay: stagger(80) }, 0)
      .add(all('[data-slot="finance-overview-flow-chart-stat"]'), { opacity: { from: 0 }, translateY: { from: 8 }, duration: 700, ease: "outExpo", delay: stagger(90) }, 100)
      .add(all('[data-slot="finance-overview-flow-chart-badge"]'), { scale: { from: 0.8 }, duration: 600, ease: "outBack(1.8)", delay: stagger(90) }, 260)
      .add(counters, { stats: [0, 1], duration: 1600, ease: "outExpo", onUpdate: count }, 160)
      .add(all("[data-glow]"), { opacity: { from: 0 }, scale: { from: 0.6 }, duration: 1800, ease: "outQuad", delay: stagger(160) }, 150)
      .add(reveal, { x: [0, 1], duration: FLOW, ease: "inOutSine", onUpdate: flow }, FLOW_AT)
    growth.forEach((_, b) => {
      if (b === 0) return
      const state = { t: 0 }
      timeline.add(
        state,
        {
          t: [0, 1],
          duration: 1100,
          ease: "outCubic",
          onUpdate: () => {
            growth[b] = state.t
            grow()
          },
        },
        FLOW_AT + 350 + (b - 1) * 220,
      )
    })
    all('[data-slot="finance-overview-flow-chart-marker"]').forEach((marker, i) => {
      // the moment the flow's soft edge has half passed the marker
      const at = FLOW_AT + FLOW * flowTime(((markers[i] / PLOT_WIDTH) * latest.current.width + FEATHER / 2) / run)
      const pill = marker.querySelector<HTMLElement>('[data-slot="finance-overview-flow-chart-pill"]')
      if (pill) timeline.add(pill, { opacity: { from: 0 }, scale: { from: 0.6 }, duration: 550, ease: "outBack(1.7)" }, at)
      timeline.add(marker.querySelectorAll<HTMLElement>('[data-slot="finance-overview-flow-chart-divider"]'), { scaleY: { from: 0 }, duration: 800, ease: "outExpo" }, at + 120)
      const state = { t: 0 }
      timeline.add(
        state,
        {
          t: [0, 1],
          duration: 1200,
          ease: "outExpo",
          onUpdate: () => {
            counters.pills[i] = state.t
            count()
          },
        },
        at,
      )
    })
    timeline.add(all('[data-slot="finance-overview-flow-chart-row"]'), { opacity: { from: 0 }, translateY: { from: 8 }, duration: 700, ease: "outExpo", delay: stagger(80) }, 500)
    timeline.call(() => runSheen(SWEEP), FLOW_AT + FLOW - 200)
    return () => {
      if (growing.current === growth) growing.current = null
      mask?.setAttribute("x", "0")
      paint(latest.current.frame)
      const { sums: s, changes, pickedValues: p } = latest.current
      statValues.forEach((el, i) => (el.textContent = money(s[i] ?? 0)))
      changeValues.forEach((el) => (el.textContent = wholeMoney(changes[Number(el.dataset.index)] ?? 0)))
      pillValues.forEach((el, i) => (el.textContent = money(p[i] ?? 0)))
    }
  })

  // A new shape (another region in the core, new data) flows along the stream from left to right, from the frame on
  // screen; a resize redraws it at once. While the entrance runs, it carries on with the new shape.
  const lastShape = React.useRef({ key: shapeKey, width })
  const morph = React.useRef<JSAnimation | null>(null)
  useIsomorphicLayoutEffect(() => {
    const before = lastShape.current
    lastShape.current = { key: shapeKey, width }
    if (before.key === shapeKey && before.width === width) return
    const entrance = growing.current
    if (entrance?.some((g) => g < 1)) {
      paint(grown(frame, entrance))
      return
    }
    morph.current?.cancel()
    morph.current = null
    if (reduced || before.key === shapeKey || shown.current.bands.length !== frame.bands.length) {
      paint(frame)
      return
    }
    const from = shown.current
    const state = { t: 0 }
    if (before.width === width) runSheen(MORPH + RIPPLE)
    morph.current = animate(state, {
      t: [0, 1],
      duration: MORPH + RIPPLE,
      ease: "linear",
      onUpdate: () => {
        const elapsed = state.t * (MORPH + RIPPLE)
        paint(blend(from, frame, (i) => outExpo(clamp01((elapsed - (RIPPLE * SAMPLE_X[i]) / PLOT_WIDTH) / MORPH))))
      },
      onComplete: () => paint(frame),
    })
  }, [shapeKey, width, reduced])
  React.useEffect(
    () => () => {
      morph.current?.cancel()
      sheen.current?.cancel()
    },
    [],
  )

  // The highlight follows the hovered band through morphs.
  useIsomorphicLayoutEffect(() => {
    ringRef.current?.setAttribute("d", ringPath(shown.current, highlightBand, width))
  }, [highlightBand, width])

  // The markers count to the selected region's amounts, and the stats and badges to new totals.
  const countKey = `${pickedValues.join(",")}|${sums.join(",")}`
  const lastCount = React.useRef({ countKey, pickedValues, sums })
  const counting = React.useRef<JSAnimation | null>(null)
  useIsomorphicLayoutEffect(() => {
    const before = lastCount.current
    lastCount.current = { countKey, pickedValues, sums }
    if (before.countKey === countKey || reduced) return
    const pills = all('[data-slot="finance-overview-flow-chart-pill-value"]')
    const stats = all('[data-slot="finance-overview-flow-chart-stat-value"]')
    const changes = all('[data-slot="finance-overview-flow-chart-change"]')
    const previous = horizons.map((h) => h.previous)
    const state = { t: 0 }
    counting.current?.cancel()
    const draw = (t: number) => {
      pills.forEach((el, i) => (el.textContent = money((before.pickedValues[i] ?? 0) + ((pickedValues[i] ?? 0) - (before.pickedValues[i] ?? 0)) * t)))
      stats.forEach((el, i) => (el.textContent = money((before.sums[i] ?? 0) + ((sums[i] ?? 0) - (before.sums[i] ?? 0)) * t)))
      changes.forEach((el) => {
        const i = Number(el.dataset.index)
        const p = previous[i] ?? 0
        el.textContent = wholeMoney((before.sums[i] ?? 0) - p + ((sums[i] ?? 0) - (before.sums[i] ?? 0)) * t)
      })
    }
    counting.current = animate(state, { t: [0, 1], duration: COUNT, ease: "outExpo", onUpdate: () => draw(state.t), onComplete: () => draw(1) })
  }, [countKey, reduced])
  React.useEffect(
    () => () => {
      counting.current?.cancel()
    },
    [],
  )

  const select = (index: number) => {
    const next = regions[index]
    if (next && index !== active) setRegion(next.key)
  }
  // Pointer positions in the plot's own pixels (the live demo may scale the card with CSS zoom): the innermost band
  // under the pointer.
  const regionAt = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.currentTarget
    const box = target.getBoundingClientRect()
    const zoom = box.width / (target.offsetWidth || box.width || 1) || 1
    const x = ((event.clientX - box.left) / zoom) * (PLOT_WIDTH / width)
    const y = (event.clientY - box.top) / zoom
    const at = Math.min(Math.max(x, 0), PLOT_WIDTH)
    const up = SPINE - edgeAt(OUTLINE_TOP, at)
    const down = edgeAt(OUTLINE_BOTTOM, at) - SPINE
    const level = along(markers, levels, at)
    // the innermost band that holds the pointer
    for (let b = bandCount - 1; b >= 0; b--) {
      const size = level * along(markers, bandShares[b], at)
      if (y >= SPINE - up * size && y <= SPINE + down * size) return order[bandCount - 1 - b] ?? null
    }
    return null
  }
  const onRowKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = { ArrowDown: index + 1, ArrowRight: index + 1, ArrowUp: index - 1, ArrowLeft: index - 1, Home: 0, End: regions.length - 1 }[event.key]
    if (next === undefined || !regions.length) return
    event.preventDefault()
    const to = (next + regions.length) % regions.length
    select(to)
    root.current?.querySelectorAll<HTMLButtonElement>('[data-slot="finance-overview-flow-chart-row"]')[to]?.focus()
  }

  return (
    <ChartCard ref={root} role="group" aria-label={title} className={cn("w-full", className)} {...props}>
      <div data-slot="finance-overview-flow-chart-header" className="flex items-center justify-between gap-4">
        {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
        <p className="typo-heading-01-semibold -my-0.5 min-w-0 truncate py-0.5 text-fg-loud">{title}</p>
        <div className="flex shrink-0 items-center gap-3">
          <ChartButton corner="rounded" size="icon" aria-label="Insights" onClick={onInsightsClick}>
            <SparklesIcon />
          </ChartButton>
          <ChartButton corner="rounded" size="icon" aria-label="More options" onClick={onMoreClick}>
            <DotsHorizontalIcon />
          </ChartButton>
        </div>
      </div>

      {/* Figma: three equal columns 8px apart; they wrap when the card gets too narrow for the amounts */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] items-start gap-x-2 gap-y-4">
        {horizons.map((horizon, i) => {
          const change = horizon.previous !== undefined ? sums[i] - horizon.previous : undefined
          const down = change !== undefined && change < 0
          return (
            <div key={horizon.key} data-slot="finance-overview-flow-chart-stat" className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
              <p className="typo-label-03-medium hug-w -my-0.5 max-w-full truncate py-0.5 text-fg-soft">{horizon.title}</p>
              {/* a net outflow reads red */}
              <p
                data-slot="finance-overview-flow-chart-stat-value"
                className={cn("typo-heading-04-semibold hug-w whitespace-nowrap", sums[i] < 0 ? "text-error-500" : "text-fg-loud")}
              >
                {money(sums[i])}
              </p>
              {change !== undefined && (
                <div className="flex max-w-full items-center gap-2">
                  {/* the change is green and up, or red and down (Error/error-50 and error-500) */}
                  <span
                    data-slot="finance-overview-flow-chart-badge"
                    className={cn(
                      "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5",
                      down ? "bg-error-50 text-error-500" : "bg-primary-green-50 text-primary-green-500",
                    )}
                  >
                    {down ? <ArrowCircleDownIcon className="size-3 shrink-0" /> : <ArrowCircleUpIcon className="size-3 shrink-0" />}
                    <span data-slot="finance-overview-flow-chart-change" data-index={i} className="typo-label-01-medium hug-w whitespace-nowrap">
                      {wholeMoney(change)}
                    </span>
                  </span>
                  {horizon.compareLabel && <span className="typo-label-02-medium hug-w -my-0.5 min-w-0 truncate py-0.5 text-fg-soft">{horizon.compareLabel}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div ref={plotRef} data-slot="finance-overview-flow-chart-plot" className="relative" style={{ height: PLOT_HEIGHT }}>
        {/* Figma: two blurred circles (#278df7 and Light Blue/500 at 80%, "layer blur 188" and "160") multiplied
            under the stream */}
        <span
          aria-hidden
          data-glow=""
          className="pointer-events-none absolute top-[93px] h-[168px] w-[443px] rounded-[50%] bg-[#278df7]/80 mix-blend-multiply blur-[84.6px]"
          style={{ left: `${(192 / PLOT_WIDTH) * 100}%` }}
        />
        <span
          aria-hidden
          data-glow=""
          className="pointer-events-none absolute top-[129px] h-[88px] w-[274px] rounded-[50%] bg-accent-light-blue-500/80 mix-blend-multiply blur-[72px]"
          style={{ left: `${(238 / PLOT_WIDTH) * 100}%` }}
        />

        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <defs>
            {frame.bands.map((_, b) => {
              const [end, mid, start] = BAND_COLORS[(bandCount - 1 - b) % BAND_COLORS.length]
              return (
                <linearGradient key={b} id={`${ids}-band-${b}`} x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0" style={{ stopColor: end }} />
                  <stop offset="0.4135" style={{ stopColor: mid }} />
                  <stop offset="1" style={{ stopColor: start, stopOpacity: 0 }} />
                </linearGradient>
              )
            })}
            {/* the light along the core: white at 40% in the middle of SHEEN px, off the plot when idle */}
            <linearGradient ref={sheenLight} id={`${ids}-sheen`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={SHEEN} y2={0} gradientTransform={`translate(${-SHEEN} 0)`}>
              <stop offset="0" stopColor="#fff" stopOpacity={0} />
              <stop offset="0.5" stopColor="#fff" stopOpacity={0.4} />
              <stop offset="1" stopColor="#fff" stopOpacity={0} />
            </linearGradient>
            {/* the flow's soft edge: white (shown) to black (hidden) over its last FEATHER px */}
            <linearGradient id={`${ids}-feather`} x1="0" y1="0" x2="1" y2="0">
              <stop offset={round(width / (width + FEATHER))} stopColor="#fff" />
              <stop offset="1" stopColor="#000" />
            </linearGradient>
            <mask id={`${ids}-flow`} maskUnits="userSpaceOnUse" x={-width - FEATHER} y={0} width={2 * (width + FEATHER)} height={PLOT_HEIGHT}>
              <rect ref={maskRef} x={0} y={0} width={width + FEATHER} height={PLOT_HEIGHT} fill={`url(#${ids}-feather)`} />
            </mask>
          </defs>
          <g mask={`url(#${ids}-flow)`}>
            {frame.bands.map((_, b) => (
              <path
                key={b}
                ref={(node) => {
                  bandRefs.current[b] = node
                }}
                data-slot="finance-overview-flow-chart-band"
                d={bandPath(frame, b, width)}
                fill={`url(#${ids}-band-${b})`}
              />
            ))}
            <path ref={sheenRef} data-slot="finance-overview-flow-chart-sheen" d={bandPath(frame, bandCount - 1, width)} fill={`url(#${ids}-sheen)`} />
            {/* the hovered region's band, lit */}
            <path
              ref={ringRef}
              data-slot="finance-overview-flow-chart-highlight"
              d={ringPath(frame, highlightBand, width)}
              fillRule="evenodd"
              className={cn("fill-surface-white transition-opacity duration-300", hovered !== null ? "opacity-25" : "opacity-0")}
            />
          </g>
        </svg>

        {markers.map((x, i) => (
          <FlowMarker
            key={horizons[i].key}
            x={(x / PLOT_WIDTH) * width}
            top={crowded && i % 2 ? TIP_TOP - TIP_HEIGHT - 12 : TIP_TOP}
            value={money(pickedValues[i] ?? 0)}
          />
        ))}

        {/* hovering a band names its region in the table, a click brings it to the core */}
        <div
          aria-hidden
          data-slot="finance-overview-flow-chart-surface"
          className={cn("absolute inset-0", hovered !== null && hovered !== active && "cursor-pointer")}
          onPointerMove={(event) => hover(regionAt(event))}
          onPointerLeave={() => hover(null)}
          onClick={(event) => {
            const at = regionAt(event as unknown as React.PointerEvent<HTMLElement>)
            if (at === null || at === active) return
            // the bands change places: the highlight comes back with the next move
            select(at)
            hover(null)
          }}
        />
      </div>

      {/* Figma "Region Content": four equal columns 24px apart; the amounts are left-aligned in 88px boxes centred in
          their columns. The rows pick the region. */}
      {/* scrolls sideways on a card too narrow for the amounts (the padding keeps the rows' hover plates unclipped) */}
      <div className="relative -mx-2.5 -mb-2.5 overflow-x-auto px-2.5 pb-2.5">
        <div className="flex min-w-[480px] flex-col">
          <div aria-hidden className="flex items-center gap-6 border-b border-border-soft pt-3 pb-[11px]">
            <span className="flex min-w-0 flex-1">
              <span className="typo-label-02-medium hug-w -my-0.5 truncate py-0.5 text-fg-soft">{regionLabel}</span>
            </span>
            {horizons.map((horizon) => (
              <span key={horizon.key} className="flex min-w-0 flex-1 justify-center">
                <span className="typo-label-02-medium min-w-[88px] whitespace-nowrap text-fg-soft">{horizon.label}</span>
              </span>
            ))}
          </div>
          <div role="radiogroup" aria-label={regionLabel} className="flex flex-col">
            {regions.map((r, index) => {
              const on = index === active
              return (
                <button
                  key={r.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on ? 0 : -1}
                  aria-label={`${r.label}: ${horizons.map((horizon) => `${horizon.label} ${money(r.values[horizon.key] ?? 0)}`).join(", ")}`}
                  data-slot="finance-overview-flow-chart-row"
                  data-hovered={hovered === index ? "" : undefined}
                  onClick={() => select(index)}
                  onKeyDown={(event) => onRowKeyDown(event, index)}
                  onPointerEnter={() => hover(index)}
                  onPointerLeave={() => hover(null)}
                  className={cn(
                    "group/row relative flex cursor-pointer items-center gap-6 border-b border-border-soft pt-4 pb-[15px] text-left outline-none last:border-b-0 last:pb-0",
                    // a soft plate behind the hovered row (and the row of the hovered band), and a focus ring
                    "before:pointer-events-none before:absolute before:inset-x-[-10px] before:top-1.5 before:h-9 before:rounded-[10px] before:bg-surface-disable before:opacity-0 before:transition-opacity before:duration-200",
                    "data-hovered:before:opacity-100 focus-visible:before:opacity-100 focus-visible:before:ring-2 focus-visible:before:ring-primary-blue-500/40",
                  )}
                >
                  <span className="relative flex min-w-0 flex-1">
                    <span className={cn("hug-w -my-0.5 truncate py-0.5", on ? "typo-label-03-semibold text-fg-normal" : "typo-label-03-medium text-fg-loud")}>{r.label}</span>
                  </span>
                  {horizons.map((horizon) => {
                    const value = r.values[horizon.key] ?? 0
                    return (
                      <span key={horizon.key} className="relative flex min-w-0 flex-1 justify-center">
                        <span className={cn("min-w-[88px] whitespace-nowrap", on ? "typo-label-03-semibold" : "typo-label-03-medium", value < 0 ? "text-error-500" : "text-fg-loud")}>
                          {money(value)}
                        </span>
                      </span>
                    )
                  })}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

export {
  FinanceOverviewFlowChart,
  sampleFinanceOverviewFlowHorizons,
  sampleFinanceOverviewFlowRegions,
  type FinanceOverviewFlowChartProps,
  type FinanceOverviewFlowHorizon,
  type FinanceOverviewFlowRegion,
}
