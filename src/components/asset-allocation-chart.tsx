"use client"

import { animate, stagger, utils } from "animejs"
import * as React from "react"

import { ChartButton } from "@/components/ui/chart-button"
import { ChartCard } from "@/components/ui/chart-card"
import { ChartIconTile } from "@/components/ui/chart-icon-tile"
import { ChevronDownIcon, DotsHorizontalIcon, PieChartSegmentsIcon } from "@/components/ui/chart-icons"
import { ChartLegendDot } from "@/components/ui/chart-legend-dot"
import { releaseStyles, useChartEntrance, useCountUp, useIsomorphicLayoutEffect, useReducedMotion } from "@/hooks/use-chart-motion"
import { useChartSize } from "@/hooks/use-chart-size"
import { useControllableState } from "@/hooks/use-controllable-state"
import { formatCompactCurrency, formatPercent, wholePercents } from "@/lib/chart-format"
import { cn } from "@/lib/utils"

/** A class's colour: its bar, legend dot and tooltip swatch, and the tints its bands fade between. */
type AssetAllocationColor = "blue" | "blue-light" | "orange" | "orange-light" | "yellow" | "green" | "purple"

/** One asset class: a bar in the left column ("from") or the right one ("to"), and an item in the legend. */
type AssetAllocationClass = {
  key: string
  label: string
  color: AssetAllocationColor
  /** "from": the left column, what the money moves out of; "to": the right column, where it goes. */
  side: "from" | "to"
}

/** One band: an amount moving from a "from" class to a "to" class (several bands may join the same two classes). */
type AssetAllocationFlow = {
  /** The key of a "from" class. */
  from: string
  /** The key of a "to" class. */
  to: string
  value: number
}

type AssetAllocationChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  title?: string
  /** The soft unit after the title ("$M"); read from the amounts by default (their compact suffix). */
  unit?: string
  description?: string
  /** The glyph in the blue tile (24px, white). */
  icon?: React.ReactNode
  /** The classes in legend order; each column stacks its own classes in this order, top to bottom. */
  classes?: AssetAllocationClass[]
  /** The bands. At every class they stack in this order, top to bottom. */
  flows?: AssetAllocationFlow[]
  allocatedLabel?: string
  /** The label of the second figure. */
  totalLabel?: string
  /** The second figure (the whole portfolio); the sum of every band by default. "Allocated" is the sum of those shown. */
  total?: number
  /** The keys of the classes switched off in the legend (their bands leave the chart). */
  hiddenClasses?: string[]
  defaultHiddenClasses?: string[]
  onHiddenClassesChange?: (hidden: string[]) => void
  /** The selected band (an index into `flows`), or null for none. */
  index?: number | null
  defaultIndex?: number | null
  onIndexChange?: (index: number | null, flow: AssetAllocationFlow | null) => void
  /** The tooltip's first line: the band's share of the class it leaves. */
  reductionsLabel?: string
  /** The tooltip's last line: the band's share of the class it joins. */
  additionsLabel?: string
  /** Called by the ⋯ button. */
  onMoreClick?: () => void
  locale?: string
  currency?: string
}

/** A band's ends: its top at the "from" class (y0) and at the "to" class (y1), and its thickness. */
type FlowShape = { y0: number; y1: number; t: number }
/** What is on screen: every band and bar, each with its opacity (bands and classes switched off fade out in place). */
type Frame = { flows: (FlowShape & { o: number })[]; bars: { y: number; h: number; o: number }[] }

// Figma geometry ("Asset Allocation Chart" 1473:86299)
const PLOT_HEIGHT = 352
const GAP = 4 // between two bands at a class and between two classes, so both columns stack to the same height
const LABEL_INSET = 10 // a band's labels sit 10px under its top edge, centred in thinner bands
const LABEL_HEIGHT = 16
const MIN_LABEL = 14 // thinner bands only show their labels while they are active
const BADGE_MIN = 30 // shorter bars leave out their share
const TIP_GAP = 18 // the tooltip ends 18px above the band's middle (Figma: over the pointer)
const FEATHER = 120 // the soft edge of the bands as they flow in
const FLOW_AT = 450
const FLOW = 1300
const MORPH = 750
const RING = "focus-visible:ring-primary-blue-500/40" // the card's focus rings are blue
// Figma: Background/Disable with a 2px padding, 16px corners, a 1px #ebebeb ring and a soft drop shadow (the same
// card as Cumulative Assets and Liabilities)
const CARD = "gap-0 rounded-2xl bg-surface-disable p-0.5 shadow-[0_1px_2px_rgb(40_40_40/0.08),0_0_0_1px_var(--border-soft)]"

// Each colour: the bar's fill and ring, the legend dot's ring (Figma rings the orange dot in orange-600 and its bar in
// orange-500), and the tints a band fades between: the 50 step of its "from" class to the 300 step of its "to" class.
const COLORS: Record<AssetAllocationColor, { bar: string; ring: string; dot: string; from: string; to: string }> = {
  blue: {
    bar: "bg-primary-blue-500",
    ring: "[--bar-ring:var(--primary-blue-500)]",
    dot: "bg-primary-blue-500 [--dot-ring:var(--primary-blue-500)]",
    from: "var(--primary-blue-50)",
    to: "var(--primary-blue-300)",
  },
  "blue-light": {
    bar: "bg-primary-blue-200",
    ring: "[--bar-ring:var(--primary-blue-200)]",
    dot: "bg-primary-blue-200 [--dot-ring:var(--primary-blue-200)]",
    from: "var(--primary-blue-50)",
    to: "var(--primary-blue-300)",
  },
  orange: {
    bar: "bg-primary-orange-500",
    ring: "[--bar-ring:var(--primary-orange-500)]",
    dot: "bg-primary-orange-500 [--dot-ring:var(--primary-orange-600)]",
    from: "var(--primary-orange-50)",
    to: "var(--primary-orange-300)",
  },
  "orange-light": {
    bar: "bg-primary-orange-200",
    ring: "[--bar-ring:var(--primary-orange-300)]",
    dot: "bg-primary-orange-200 [--dot-ring:var(--primary-orange-300)]",
    from: "var(--primary-orange-50)",
    to: "var(--primary-orange-300)",
  },
  yellow: {
    bar: "bg-primary-yellow-500",
    ring: "[--bar-ring:var(--primary-yellow-500)]",
    dot: "bg-primary-yellow-500 [--dot-ring:var(--primary-yellow-500)]",
    from: "var(--primary-yellow-50)",
    to: "var(--primary-yellow-300)",
  },
  green: {
    bar: "bg-primary-green-500",
    ring: "[--bar-ring:var(--primary-green-500)]",
    dot: "bg-primary-green-500 [--dot-ring:var(--primary-green-500)]",
    from: "var(--primary-green-50)",
    to: "var(--primary-green-300)",
  },
  purple: {
    bar: "bg-primary-purple-500",
    ring: "[--bar-ring:var(--primary-purple-500)]",
    dot: "bg-primary-purple-500 [--dot-ring:var(--primary-purple-500)]",
    from: "var(--primary-purple-50)",
    to: "var(--primary-purple-300)",
  },
}

// The Figma card, in Figma's legend order. Figma's text doesn't match its bands (see FIGMA-GAPS.md): the amounts are
// read from the drawn bands (fitted to their edges, 4px apart, both columns 352px tall) at the top band's $165.7M.
const sampleAssetAllocationClasses: AssetAllocationClass[] = [
  { key: "fixed-income", label: "Fixed Income", color: "blue", side: "to" },
  { key: "real-estate", label: "Real estate", color: "orange", side: "to" },
  { key: "equities", label: "Equities", color: "blue-light", side: "from" },
  { key: "cash-equivalents", label: "Cash Equivalents", color: "orange-light", side: "from" },
  { key: "commodities", label: "Commodities", color: "yellow", side: "to" },
]
const sampleAssetAllocationFlows: AssetAllocationFlow[] = [
  { from: "equities", to: "fixed-income", value: 165_700_000 },
  { from: "cash-equivalents", to: "real-estate", value: 107_700_000 },
  { from: "equities", to: "real-estate", value: 101_500_000 },
  { from: "equities", to: "commodities", value: 64_200_000 },
  { from: "equities", to: "fixed-income", value: 186_400_000 },
  { from: "cash-equivalents", to: "commodities", value: 62_100_000 },
]
const SAMPLE_SELECTED = 2 // Equities → Real estate, under Figma's pointer
const NONE: string[] = []

const round = (n: number) => Math.round(n * 1000) / 1000
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/**
 * Where every band and bar sits. Each column stacks its classes in `classes` order and, inside a class, its bands in
 * `flows` order, 4px apart (also between two classes), so with one scale for both columns they end at the same height.
 * A band is as thick at both ends as its amount; a class is as tall as its bands and the gaps between them. Bands of a
 * class switched off leave the chart, and classes left without bands with them: they keep a spot of no thickness where
 * they would stand, so they can shrink into it and grow out of it.
 */
function layoutAllocation(classes: AssetAllocationClass[], flows: AssetAllocationFlow[], hidden: string[]) {
  const sides = new Map(classes.map((c) => [c.key, c.side]))
  const off = new Set(hidden)
  const shown = flows.map((f) => sides.get(f.from) === "from" && sides.get(f.to) === "to" && !off.has(f.from) && !off.has(f.to) && f.value > 0)
  const count = shown.filter(Boolean).length
  const total = flows.reduce((sum, f, i) => (shown[i] ? sum + f.value : sum), 0)
  const scale = total > 0 ? Math.max(0, PLOT_HEIGHT - GAP * Math.max(0, count - 1)) / total : 0
  const ends = flows.map((f, i) => ({ y0: 0, y1: 0, t: shown[i] ? f.value * scale : 0 }))
  const bars = classes.map(() => ({ y: 0, h: 0, value: 0, shown: false }))
  for (const side of ["from", "to"] as const) {
    let y = 0
    classes.forEach((c, ci) => {
      if (c.side !== side) return
      const mine = flows.map((_, i) => i).filter((i) => (side === "from" ? flows[i].from : flows[i].to) === c.key)
      const visible = mine.filter((i) => shown[i])
      // a class without bands keeps a spot in the middle of the gap it would open
      const spot = visible.length ? y : Math.max(0, y - GAP / 2)
      let at = spot
      mine.forEach((i) => {
        if (shown[i] && at > spot) at += GAP
        if (side === "from") ends[i].y0 = at
        else ends[i].y1 = at
        at += ends[i].t
      })
      bars[ci] = { y: spot, h: at - spot, value: visible.reduce((sum, i) => sum + flows[i].value, 0), shown: visible.length > 0 }
      if (visible.length) y = at + GAP
    })
  }
  // The shares: a bar's of its column, a band's of the class it leaves and of the one it joins, each set in whole
  // percents adding up to 100.
  const barShares = classes.map(() => 0)
  for (const side of ["from", "to"] as const) {
    const mine = classes.map((c, ci) => ci).filter((ci) => classes[ci].side === side && bars[ci].shown)
    wholePercents(mine.map((ci) => bars[ci].value)).forEach((percent, k) => (barShares[mine[k]] = percent / 100))
  }
  const fromShares = flows.map(() => 0)
  const toShares = flows.map(() => 0)
  for (const c of classes) {
    const end = c.side === "from" ? "from" : "to"
    const mine = flows.map((_, i) => i).filter((i) => shown[i] && flows[i][end] === c.key)
    wholePercents(mine.map((i) => flows[i].value)).forEach((percent, k) => ((end === "from" ? fromShares : toShares)[mine[k]] = percent / 100))
  }
  const bands = flows.map((_, i) => ({ ...ends[i], shown: shown[i], fromShare: fromShares[i], toShare: toShares[i] }))
  return { bands, bars: bars.map((b, ci) => ({ ...b, share: barShares[ci] })), total }
}

/** A band from its "from" end (x 0) to its "to" end (x width): two curves with level ends, like Figma's links. */
function bandPath(width: number, { y0, y1, t }: FlowShape) {
  const w = round(width)
  const m = round(width / 2)
  const [a, b, c, d] = [y0, y1, y1 + t, y0 + t].map(round)
  return `M 0 ${a} C ${m} ${a} ${m} ${b} ${w} ${b} L ${w} ${c} C ${m} ${c} ${m} ${d} 0 ${d} Z`
}

/** Where a band's label sits: 10px under its top edge, or centred in a band thinner than 36px. */
const labelTop = (top: number, t: number) => top + Math.min(LABEL_INSET, (t - LABEL_HEIGHT) / 2)

/** The tooltip's 10px swatch: ChartLegendDot's ring and effects on a 10px dot (Figma doesn't scale them down). */
function TooltipDot({ className }: { className?: string }) {
  const gradient = `asset-allocation-tip-dot-${React.useId().replace(/[^\w-]/g, "")}`
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-block size-2.5 shrink-0 overflow-hidden rounded-full [--dot-ring:transparent] transition-[background-color,box-shadow] duration-200",
        "shadow-[0_7.2px_12.96px_-3.6px_rgb(38_45_58/0.2),0_0_0_1px_var(--dot-ring),inset_0_-3.6px_6.48px_-3.6px_rgb(0_0_0/0.05)]",
        className,
      )}
    >
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0.24} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <circle cx="5" cy="5" r="4.5" fill="none" stroke={`url(#${gradient})`} strokeWidth={1} />
      </svg>
    </span>
  )
}

/** A number that counts from its previous value; the entrance counts it up from zero through data-count. */
function Count({ value, format, className, kind }: { value: number; format: (value: number) => string; className?: string; kind: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  useCountUp(ref, value, format, { duration: MORPH })
  return (
    <span ref={ref} data-count={value} data-kind={kind} className={className}>
      {format(value)}
    </span>
  )
}

type Tip = {
  from: AssetAllocationColor
  to: AssetAllocationColor
  reductions: number
  amount: number
  additions: number
}

/** The tooltip's three lines. Rendered twice: visible (its numbers count) and as an invisible copy that is measured. */
function TooltipRows({
  tip,
  reductionsLabel,
  additionsLabel,
  formats,
  live,
}: {
  tip: Tip
  reductionsLabel: string
  additionsLabel: string
  formats: Formats
  live?: boolean
}) {
  const text = (kind: keyof Formats, value: number) =>
    live ? <Count value={value} format={formats[kind]} kind={kind} className="hug-w" /> : formats[kind](value)
  return (
    <>
      <span className="flex items-center gap-1.5 py-0.5">
        <TooltipDot className={COLORS[tip.from].dot} />
        <span className="typo-label-02-regular -my-0.5 w-[100px] truncate py-0.5 text-fg-soft">{reductionsLabel}</span>
        <span className="typo-label-03-medium hug-w whitespace-nowrap text-fg-white">{text("reductions", tip.reductions)}</span>
      </span>
      <span className="flex items-center gap-1.5 py-0.5">
        <ChevronDownIcon className="size-3.5 shrink-0 text-icon-soft" />
        <span className="typo-label-02-regular min-w-[120px] whitespace-nowrap text-fg-soft">{text("amount", tip.amount)}</span>
      </span>
      <span className="flex items-center gap-1.5 py-0.5">
        <TooltipDot className={COLORS[tip.to].dot} />
        <span className="typo-label-02-regular -my-0.5 w-[100px] truncate py-0.5 text-fg-soft">{additionsLabel}</span>
        <span className="typo-label-03-medium hug-w whitespace-nowrap text-fg-white">{text("additions", tip.additions)}</span>
      </span>
    </>
  )
}

type Formats = Record<"money" | "amount" | "share" | "reductions" | "additions", (value: number) => string>

/**
 * "Asset Allocation Chart" from the Keitoto library: how a portfolio moves between asset classes, as a two-column
 * flow chart. The left bars are the classes the money leaves (Equities and Cash Equivalents in Figma), the right bars
 * the classes it goes to, each with its share of the whole; a band joins them for every amount that moves, labelled
 * with the amount where it leaves and its share of the class it joins. The selected band (Equities → Real estate, under
 * Figma's pointer) is raised over the others with a dark tooltip: its share of the class it leaves, the amount and its
 * share of the class it joins. Next to the chart sit the amount allocated and the portfolio's total, over a legend.
 * Hover or focus a band to preview it (the other bands fade back), click or press Enter to select it, use the arrow
 * keys to walk the bands; hover a bar or a legend item to light its bands; click a legend item to take its class out of
 * the chart. Animated with anime.js: the tile pops, the figures count up, the left bars grow, the bands flow in from
 * the left into the right bars while every share counts up, the labels follow and the tooltip pops in; another band
 * slides the tooltip over as its numbers count, and a class switched off or on morphs every band and bar to the new
 * layout while the shares and the figures count.
 */
function AssetAllocationChart({
  title = "Asset allocation",
  unit,
  description = "Strategic asset allocation approach to optimize portfolio distribution",
  icon = <PieChartSegmentsIcon />,
  classes = sampleAssetAllocationClasses,
  flows: flowsProp,
  allocatedLabel = "Allocated",
  totalLabel = "Total value locked",
  total: totalProp,
  hiddenClasses: hiddenProp,
  defaultHiddenClasses,
  onHiddenClassesChange,
  index: indexProp,
  defaultIndex,
  onIndexChange,
  reductionsLabel = "Reductions",
  additionsLabel = "Additions",
  onMoreClick,
  locale = "en-US",
  currency = "USD",
  className,
  ...props
}: AssetAllocationChartProps) {
  const flows = flowsProp ?? sampleAssetAllocationFlows
  const n = flows.length
  const [hidden, setHidden] = useControllableState({ value: hiddenProp, defaultValue: defaultHiddenClasses ?? NONE, onChange: onHiddenClassesChange })
  const [indexValue, setIndex] = useControllableState<number | null>({
    value: indexProp,
    // the sample opens on Figma's band, your data with none selected
    defaultValue: defaultIndex !== undefined ? defaultIndex : flowsProp ? null : SAMPLE_SELECTED,
    onChange: (next) => onIndexChange?.(next, next === null ? null : (flows[next] ?? null)),
  })
  const { bands, bars, total: allocated } = React.useMemo(() => layoutAllocation(classes, flows, hidden), [classes, flows, hidden])
  const portfolio = totalProp ?? flows.reduce((sum, f) => sum + Math.max(0, f.value), 0)
  // Content key: parents may pass new arrays on every render, so layout changes are detected by value.
  const layoutKey = `${bands.map((b) => `${round(b.y0)},${round(b.y1)},${round(b.t)}`).join(";")}|${bars.map((b) => `${round(b.y)},${round(b.h)},${+b.shown}`).join(";")}`
  const classIndex = React.useMemo(() => new Map(classes.map((c, i) => [c.key, i])), [classes])
  const classOf = (key: string): AssetAllocationClass | undefined => classes[classIndex.get(key) ?? -1]
  const label = (key: string) => classOf(key)?.label ?? key

  const [plotRef, plot] = useChartSize<HTMLDivElement>({ width: 436, height: PLOT_HEIGHT })
  const width = plot.width || 436

  const [hovered, setHovered] = React.useState<number | null>(null)
  const [focusClass, setFocusClass] = React.useState<string | null>(null)
  const selected = indexValue !== null && indexValue >= 0 && indexValue < n && bands[indexValue]?.shown ? indexValue : null
  const active = hovered !== null && bands[hovered]?.shown ? hovered : selected
  const engaged = hovered !== null && active !== null
  const activeFlow = active !== null ? flows[active] : undefined

  // The paint order: top to bottom by where the bands leave, the active one last (on top). A band crossing one painted
  // before it casts Figma's drop shadow (0 2 4, black at 16%) on it.
  const order = bands
    .map((band, i) => ({ band, i }))
    .sort((a, b) => a.band.y0 - b.band.y0 || a.i - b.i)
    .map(({ i }) => i)
  if (active !== null) order.push(...order.splice(order.indexOf(active), 1))
  const crosses = (a: number, b: number) => bands[a].y0 < bands[b].y0 !== bands[a].y1 < bands[b].y1
  const shadowed = new Set(order.filter((i, k) => bands[i].shown && order.slice(0, k).some((j) => bands[j].shown && crosses(i, j))))
  // the bands in the order their labels stand, top to bottom (the arrow keys walk them)
  const walk = order.filter((i) => bands[i].shown).sort((a, b) => bands[a].y0 - bands[b].y0)

  // the amounts in the title's unit: the figures with two decimals ("$687.60M"), the bands with one ("$165.7M")
  const formats: Formats = React.useMemo(
    () => ({
      money: (value: number) => formatCompactCurrency(value, { locale, currency, minimumFractionDigits: 2 }),
      amount: (value: number) => formatCompactCurrency(value, { locale, currency, minimumFractionDigits: 1 }),
      share: (value: number) => formatPercent(value * 100, { locale, maximumFractionDigits: 0 }),
      reductions: (value: number) => formatPercent(-value * 100, { locale, maximumFractionDigits: 0 }),
      additions: (value: number) => formatPercent(value * 100, { locale, signDisplay: "always", maximumFractionDigits: 0 }),
    }),
    [locale, currency],
  )
  // the unit after the title: the compact suffix of the largest amount ("$" and "M")
  const unitText = React.useMemo(() => {
    if (unit !== undefined) return unit
    const largest = Math.max(0, ...flows.map((f) => f.value))
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact" }).formatToParts(largest)
    return `${parts.find((p) => p.type === "currency")?.value ?? ""}${parts.find((p) => p.type === "compact")?.value ?? ""}`
  }, [unit, flows, locale, currency])

  const tip: Tip | null =
    active !== null && activeFlow
      ? {
          from: classOf(activeFlow.from)?.color ?? "blue",
          to: classOf(activeFlow.to)?.color ?? "blue",
          reductions: bands[active].fromShare,
          amount: activeFlow.value,
          additions: bands[active].toShare,
        }
      : null

  // The tooltip is centred over the middle of the bands, its bottom 19px above the active band's middle there (under
  // it when there is no room above). Its size is measured on an invisible copy that holds the final text.
  const [sizerRef, sizer] = useChartSize<HTMLSpanElement>({ width: 165, height: 74 })
  const tipWidth = sizer.width + 24
  const tipHeight = sizer.height + 24
  const middle = active !== null ? (bands[active].y0 + bands[active].y1 + bands[active].t) / 2 : 0
  const tipLeft = Math.round(Math.min(Math.max(width / 2 - tipWidth / 2, 0), Math.max(0, width - tipWidth)))
  const above = middle - TIP_GAP - tipHeight
  const tipTop = Math.round(above >= 0 ? above : Math.max(0, Math.min(middle + TIP_GAP, PLOT_HEIGHT - tipHeight)))

  const reduced = useReducedMotion()
  const root = React.useRef<HTMLDivElement>(null)
  const maskRef = React.useRef<SVGRectElement>(null)
  const tipRef = React.useRef<HTMLDivElement>(null)
  const ids = React.useId().replace(/[^\w-]/g, "")
  const all = (selector: string) => Array.from(root.current?.querySelectorAll<HTMLElement>(selector) ?? [])

  // React renders the final layout; the morphs draw the frames on the way there.
  const target: Frame = {
    flows: bands.map((b) => ({ y0: b.y0, y1: b.y1, t: b.t, o: b.shown ? 1 : 0 })),
    bars: bars.map((b) => ({ y: b.y, h: b.h, o: b.shown ? 1 : 0 })),
  }
  const shown = React.useRef<Frame>(target)
  const latest = React.useRef({ width })
  useIsomorphicLayoutEffect(() => {
    latest.current = { width }
  })
  /** Draws a frame: the bands' paths, the bars' boxes and the labels riding on the bands' ends. */
  const draw = React.useCallback((frame: Frame) => {
    shown.current = frame
    const node = root.current
    if (!node) return
    const w = latest.current.width
    frame.flows.forEach((f, i) => {
      const path = node.querySelector<SVGPathElement>(`[data-flow="${i}"]`)
      if (path) {
        path.setAttribute("d", bandPath(w, f))
        path.style.opacity = String(round(f.o))
      }
      const from = node.querySelector<HTMLElement>(`[data-flow-from="${i}"]`)
      const to = node.querySelector<HTMLElement>(`[data-flow-to="${i}"]`)
      if (from) from.style.top = `${round(labelTop(f.y0, f.t))}px`
      if (to) to.style.top = `${round(labelTop(f.y1, f.t))}px`
    })
    frame.bars.forEach((b, i) => {
      const bar = node.querySelector<HTMLElement>(`[data-bar="${i}"]`)
      if (!bar) return
      bar.style.top = `${round(b.y)}px`
      bar.style.height = `${round(b.h)}px`
      bar.style.opacity = String(round(b.o))
    })
  }, [])

  // Entrance, once the card is in view: the tile pops, the heading and the figures come in while they count up, the
  // legend follows, the left bars grow, the bands flow in from the left on a soft edge into the right bars, the shares
  // count up, the labels come in and the tooltip pops in with its numbers counting.
  useChartEntrance(root, (timeline) => {
    const mask = maskRef.current
    const counted = all("[data-count]")
    const counter = { t: 0, tip: 0 }
    const write = (el: HTMLElement, t: number) => {
      const kind = el.dataset.kind as keyof Formats | undefined
      if (kind && formats[kind]) el.textContent = formats[kind](Number(el.dataset.count) * t)
    }
    const inTip = (el: HTMLElement) => !!el.closest('[data-slot="asset-allocation-chart-tooltip"]')
    const count = () => counted.forEach((el) => write(el, inTip(el) ? counter.tip : counter.t))
    count()
    const run = () => latest.current.width + FEATHER
    const reveal = { x: 0 }
    const flow = () => mask?.setAttribute("x", String(round(-run() + reveal.x * run())))
    flow()
    const reach = FLOW_AT + FLOW * 0.8 // about when the soft edge reaches the right bars
    // labels, badges and the tooltip hand their opacity back to their classes (they dim and hide with the chart's state)
    const back = releaseStyles("opacity", "transform")
    timeline
      .add(all('[data-slot="chart-icon-tile"]'), { scale: { from: 0.6 }, opacity: { from: 0 }, duration: 700, ease: "outBack(1.8)" }, 0)
      .add(all('[data-slot="asset-allocation-chart-heading"] > *'), { opacity: { from: 0 }, translateY: { from: 6 }, duration: 600, ease: "outQuad", delay: stagger(80) }, 100)
      .add(all('[data-slot="asset-allocation-chart-stat"]'), { opacity: { from: 0 }, translateY: { from: 8 }, duration: 700, ease: "outExpo", delay: stagger(90) }, 150)
      .add(all('[data-slot="asset-allocation-chart-legend-item"]'), { opacity: { from: 0 }, translateX: { from: -6 }, duration: 600, ease: "outQuad", delay: stagger(60), onComplete: back }, 300)
      .add(counter, { t: [0, 1], duration: 1800, ease: "outExpo", onUpdate: count }, 200)
      .add(all('[data-side="from"] [data-slot="asset-allocation-chart-bar"]'), { scaleY: { from: 0 }, duration: 900, ease: "outExpo", delay: stagger(90) }, 250)
      .add(reveal, { x: [0, 1], duration: FLOW, ease: "inOutSine", onUpdate: flow }, FLOW_AT)
      .add(all('[data-side="to"] [data-slot="asset-allocation-chart-bar"]'), { scaleY: { from: 0 }, duration: 900, ease: "outExpo", delay: stagger(90) }, reach - 250)
      .add(all('[data-slot="asset-allocation-chart-badge"]'), { opacity: { from: 0 }, scale: { from: 0.7 }, duration: 500, ease: "outBack(1.7)", delay: stagger(70), onComplete: back }, 550)
      .add(all('[data-slot="asset-allocation-chart-from-label"]'), { opacity: { from: 0 }, translateX: { from: -6 }, duration: 600, ease: "outQuad", delay: stagger(60), onComplete: back }, FLOW_AT + 300)
      .add(all('[data-slot="asset-allocation-chart-to-label"]'), { opacity: { from: 0 }, translateX: { from: 6 }, duration: 600, ease: "outQuad", delay: stagger(60), onComplete: back }, reach)
    if (tipRef.current) {
      timeline.add(tipRef.current, { opacity: { from: 0 }, translateY: { from: 6 }, scale: { from: 0.94 }, duration: 500, ease: "outBack(1.6)", onComplete: back }, reach + 200)
      timeline.add(counter, { tip: [0, 1], duration: 900, ease: "outExpo", onUpdate: count }, reach + 200)
    }
    return () => {
      mask?.setAttribute("x", "0")
      counted.forEach((el) => write(el, 1))
    }
  })

  // A new layout (a class switched off or on, new data) morphs every band and bar from where it is on screen: bands and
  // bars leaving thin out into their spot as they fade, new ones grow out of theirs. A resize redraws at once.
  const lastLayout = React.useRef(layoutKey)
  const morph = React.useRef<ReturnType<typeof animate> | null>(null)
  useIsomorphicLayoutEffect(() => {
    if (lastLayout.current === layoutKey) {
      if (!morph.current) draw(target)
      return
    }
    lastLayout.current = layoutKey
    morph.current?.cancel()
    morph.current = null
    if (reduced) {
      draw(target)
      return
    }
    const from = shown.current
    const at = (t: number): Frame => ({
      flows: target.flows.map((f, i) => {
        const s = from.flows[i] ?? { ...f, t: 0, o: 0 }
        return { y0: lerp(s.y0, f.y0, t), y1: lerp(s.y1, f.y1, t), t: lerp(s.t, f.t, t), o: lerp(s.o, f.o, t) }
      }),
      bars: target.bars.map((b, i) => {
        const s = from.bars[i] ?? { y: b.y + b.h / 2, h: 0, o: 0 }
        return { y: lerp(s.y, b.y, t), h: lerp(s.h, b.h, t), o: lerp(s.o, b.o, t) }
      }),
    })
    const state = { t: 0 }
    draw(at(0))
    morph.current = animate(state, {
      t: 1,
      duration: MORPH,
      ease: "outExpo",
      onUpdate: () => draw(at(state.t)),
      onComplete: () => {
        morph.current = null
        draw(target)
      },
    })
  })
  React.useEffect(
    () => () => {
      morph.current?.cancel()
    },
    [],
  )

  // Another band slides the tooltip over (from where it is, if it is still sliding); one appearing pops in.
  const lastTip = React.useRef({ active, tipLeft, tipTop })
  useIsomorphicLayoutEffect(() => {
    const before = lastTip.current
    lastTip.current = { active, tipLeft, tipTop }
    const el = tipRef.current
    if (!el || reduced || before.active === active && before.tipLeft === tipLeft && before.tipTop === tipTop) return
    if (before.active === null) {
      animate(el, { opacity: [0, 1], scale: [0.94, 1], translateY: [6, 0], duration: 350, ease: "outBack(1.6)", onComplete: releaseStyles("opacity", "transform") })
      return
    }
    animate(el, {
      translateX: [before.tipLeft - tipLeft + utils.get(el, "translateX", false), 0],
      translateY: [before.tipTop - tipTop + utils.get(el, "translateY", false), 0],
      duration: 550,
      ease: "outExpo",
      onComplete: releaseStyles("transform"),
    })
  }, [active, tipLeft, tipTop, reduced])

  const focusTarget = selected ?? walk[0] ?? -1
  const onFlowKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (event.key === "Escape") {
      // lets go of the selection and of the band's preview (the next key brings it back)
      setIndex(null)
      setHovered(null)
      return
    }
    const at = walk.indexOf(i)
    const next = { ArrowDown: at + 1, ArrowRight: at + 1, ArrowUp: at - 1, ArrowLeft: at - 1, Home: 0, End: walk.length - 1 }[event.key]
    if (next === undefined || !walk.length) return
    event.preventDefault()
    const to = walk[Math.min(Math.max(next, 0), walk.length - 1)]
    setIndex(to)
    root.current?.querySelector<HTMLButtonElement>(`[data-flow-from="${to}"]`)?.focus()
  }
  const toggle = (key: string, event: React.MouseEvent<HTMLButtonElement>) => {
    const c = classOf(key)
    if (!c) return
    const off = hidden.includes(key)
    // a column keeps at least one class: the last one shakes instead
    const others = classes.filter((other) => other.side === c.side && other.key !== key && !hidden.includes(other.key))
    if (!off && !others.length) {
      if (!reduced) animate(event.currentTarget, { translateX: [0, -3, 3, -2, 2, 0], duration: 400, ease: "linear", onComplete: releaseStyles("transform") })
      return
    }
    setFocusClass(null)
    setHidden(off ? hidden.filter((k) => k !== key) : [...hidden, key])
  }
  const describe = (i: number) => {
    const f = flows[i]
    const b = bands[i]
    return `${label(f.from)} to ${label(f.to)}: ${formats.amount(f.value)}, ${formats.share(b.fromShare)} of ${label(f.from)}, ${formats.share(b.toShare)} of ${label(f.to)}`
  }
  // While a band is hovered or focused the others fade back; while a class is hovered, the bands and classes it isn't
  // joined to do.
  const dimFlow = (i: number) => (focusClass ? flows[i].from !== focusClass && flows[i].to !== focusClass : engaged && i !== active)
  const joined = (key: string) =>
    key === focusClass || flows.some((f, i) => bands[i].shown && ((f.from === focusClass && f.to === key) || (f.to === focusClass && f.from === key)))
  const dimBar = (key: string) => (focusClass ? !joined(key) : engaged && !!activeFlow && key !== activeFlow.from && key !== activeFlow.to)

  const renderBar = (c: AssetAllocationClass, ci: number) => {
    const b = bars[ci]
    return (
      <div key={c.key} className={cn("pointer-events-none absolute inset-0 transition-opacity duration-300", dimBar(c.key) ? "opacity-40" : "opacity-100")}>
        <div
          data-slot="asset-allocation-chart-bar"
          data-bar={ci}
          onPointerEnter={() => b.shown && setFocusClass(c.key)}
          onPointerLeave={() => setFocusClass(null)}
          className={cn(
            "absolute w-15 overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--bar-ring)]",
            c.side === "from" ? "left-2.5" : "left-0.5",
            b.shown ? "pointer-events-auto" : "pointer-events-none",
            COLORS[c.color].bar,
            COLORS[c.color].ring,
          )}
          style={{ top: round(b.y), height: round(b.h), opacity: b.shown ? 1 : 0 }}
        >
          {/* Figma "Change Badge": 52px wide, 8px under the top, #171717 at 24% */}
          <span
            data-slot="asset-allocation-chart-badge"
            className={cn(
              "typo-label-03-medium absolute top-2 left-1 w-[52px] rounded bg-surface-loud/24 py-0.5 text-center text-fg-white transition-opacity duration-200",
              b.shown && b.h >= BADGE_MIN ? "opacity-100" : "opacity-0",
            )}
          >
            <Count value={b.share} format={formats.share} kind="share" />
          </span>
          {/* Figma's inner shadows (a white 24% glow along the top, black 16% along the bottom), over the badge */}
          <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_2px_1.8px_rgb(255_255_255/0.24),inset_0_-1px_1.8px_rgb(0_0_0/0.16)]" />
        </div>
      </div>
    )
  }

  return (
    <ChartCard ref={root} role="group" aria-label={title} className={cn("w-full", CARD, className)} {...props}>
      <div className="flex items-center justify-between gap-20 p-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ChartIconTile tone="blue">{icon}</ChartIconTile>
          <div data-slot="asset-allocation-chart-heading" className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
            <p className="typo-heading-01-semibold -my-0.5 w-full truncate py-0.5 text-fg-loud">
              {title}
              {unitText && (
                <>
                  {" / "}
                  <span className="text-fg-soft">{unitText}</span>
                </>
              )}
            </p>
            {description && <p className="typo-label-03-medium hug-w -my-0.5 max-w-full truncate py-0.5 text-fg-soft">{description}</p>}
          </div>
        </div>
        <ChartButton size="icon" corner="rounded" aria-label="More options" onClick={onMoreClick} className={RING}>
          <DotsHorizontalIcon />
        </ChartButton>
      </div>

      {/* on a card too narrow for both, the chart drops under the figures */}
      <div className="flex flex-wrap items-end gap-6 overflow-hidden rounded-[14px] bg-surface-white p-6 shadow-[0_1px_2px_rgb(40_40_40/0.08),0_0_0_1px_var(--border-soft)]">
        <div className="flex w-56 shrink-0 flex-col gap-[60px]">
          <div className="flex flex-col items-start gap-6">
            {[
              { label: allocatedLabel, value: allocated },
              { label: totalLabel, value: portfolio },
            ].map((stat, i) => (
              <div key={i} data-slot="asset-allocation-chart-stat" className="flex max-w-full flex-col items-start gap-2.5">
                <p className="typo-label-03-medium hug-w -my-0.5 max-w-full truncate py-0.5 text-fg-normal">{stat.label}</p>
                <Count value={stat.value} format={formats.money} kind="money" className="typo-heading-04-semibold hug-w whitespace-nowrap text-fg-loud" />
              </div>
            ))}
          </div>
          {/* Figma "Legend": 16px apart. An item switches its class off and on; hovering it lights the class's bands. */}
          <div className="flex flex-col items-start gap-4 py-1">
            {classes.map((c) => {
              const on = !hidden.includes(c.key)
              return (
                <button
                  key={c.key}
                  type="button"
                  aria-pressed={on}
                  data-slot="asset-allocation-chart-legend-item"
                  onClick={(event) => toggle(c.key, event)}
                  onPointerEnter={() => on && setFocusClass(c.key)}
                  onPointerLeave={() => setFocusClass(null)}
                  onFocus={() => on && setFocusClass(c.key)}
                  onBlur={() => setFocusClass(null)}
                  className={cn(
                    "group/legend relative flex max-w-full cursor-pointer items-center gap-1.5 rounded-md outline-none before:absolute before:-inset-x-1.5 before:-inset-y-2 focus-visible:ring-2",
                    RING,
                  )}
                >
                  {/* switched off: a grey dot and a soft label (not drawn in Figma) */}
                  <ChartLegendDot className={on ? COLORS[c.color].dot : "bg-surface-subdued [--dot-ring:var(--surface-subdued)]"} />
                  <span
                    className={cn(
                      "typo-label-03-medium hug-w -my-0.5 truncate py-0.5 transition-colors duration-200",
                      on ? "text-fg-normal group-hover/legend:text-fg-loud" : "text-fg-soft group-hover/legend:text-fg-normal",
                    )}
                  >
                    {c.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 basis-[420px]" style={{ height: PLOT_HEIGHT }}>
          {/* Figma "Value Row": 72px columns, the bars 60px wide, 10px from the card's side and 2px from the bands */}
          <div aria-hidden data-side="from" className="relative w-[72px] shrink-0">
            {classes.map((c, ci) => (c.side === "from" ? renderBar(c, ci) : null))}
          </div>

          <div ref={plotRef} data-slot="asset-allocation-chart-plot" className="relative min-w-0 flex-1" onPointerLeave={() => setHovered(null)}>
            <svg aria-hidden className="absolute inset-0 size-full overflow-visible">
              <defs>
                {flows.map((f, i) => (
                  // each band fades from the 50 step of the class it leaves to the 300 step of the class it joins
                  <linearGradient key={i} id={`${ids}-band-${i}`} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={round(width)} y2={0}>
                    <stop offset="0" style={{ stopColor: COLORS[classOf(f.from)?.color ?? "blue"].from }} />
                    <stop offset="1" style={{ stopColor: COLORS[classOf(f.to)?.color ?? "blue"].to }} />
                  </linearGradient>
                ))}
                <filter id={`${ids}-shadow`} filterUnits="userSpaceOnUse" x={-20} y={-20} width={round(width + 40)} height={PLOT_HEIGHT + 40} colorInterpolationFilters="sRGB">
                  <feDropShadow dx={0} dy={2} stdDeviation={1.8} floodColor="#000" floodOpacity={0.16} />
                </filter>
                {/* the flow's soft edge: white (shown) to black (hidden) over its last FEATHER px */}
                <linearGradient id={`${ids}-feather`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset={round(width / (width + FEATHER))} stopColor="#fff" />
                  <stop offset="1" stopColor="#000" />
                </linearGradient>
                <mask id={`${ids}-flow`} maskUnits="userSpaceOnUse" x={round(-width - FEATHER)} y={-20} width={round(2 * (width + FEATHER))} height={PLOT_HEIGHT + 40}>
                  <rect ref={maskRef} x={0} y={-20} width={round(width + FEATHER)} height={PLOT_HEIGHT + 40} fill={`url(#${ids}-feather)`} />
                </mask>
              </defs>
              <g mask={`url(#${ids}-flow)`}>
                {order.map((i) => (
                  <g key={i} className={cn("transition-opacity duration-300", dimFlow(i) ? "opacity-45" : "opacity-100")}>
                    <path
                      data-slot="asset-allocation-chart-band"
                      data-flow={i}
                      d={bandPath(width, bands[i])}
                      fill={`url(#${ids}-band-${i})`}
                      filter={shadowed.has(i) ? `url(#${ids}-shadow)` : undefined}
                      className={bands[i].shown ? "cursor-pointer" : "pointer-events-none"}
                      style={{ opacity: bands[i].shown ? 1 : 0 }}
                      onPointerEnter={() => bands[i].shown && setHovered(i)}
                      onClick={() => bands[i].shown && setIndex(i)}
                    />
                  </g>
                ))}
              </g>
            </svg>

            {/* Each band's amount where it leaves: a button per band (Tab reaches the selected one, the arrow keys walk them) */}
            <div role="group" aria-label={`${title}: bands`}>
              {flows.map((f, i) => {
                const b = bands[i]
                const visible = b.shown && (b.t >= MIN_LABEL || i === active)
                return (
                  <button
                    key={i}
                    type="button"
                    data-slot="asset-allocation-chart-from-label"
                    data-flow-from={i}
                    aria-label={describe(i)}
                    aria-pressed={i === selected}
                    tabIndex={b.shown && i === focusTarget ? 0 : -1}
                    disabled={!b.shown}
                    onPointerEnter={() => setHovered(i)}
                    onFocus={() => setHovered(i)}
                    onBlur={() => setHovered(null)}
                    onClick={() => setIndex(i)}
                    onKeyDown={(event) => onFlowKeyDown(event, i)}
                    className={cn(
                      "absolute left-[11px] flex cursor-pointer rounded outline-none transition-opacity duration-300 before:absolute before:-inset-1 focus-visible:ring-2",
                      RING,
                      !visible ? "opacity-0" : dimFlow(i) ? "opacity-45" : "opacity-100",
                    )}
                    style={{ top: round(labelTop(b.y0, b.t)) }}
                  >
                    <Count value={f.value} format={formats.amount} kind="amount" className="typo-label-03-medium hug-w whitespace-nowrap text-fg-normal" />
                  </button>
                )
              })}
            </div>
            {/* …and its share of the class it joins, right-aligned 10px from the bands' end */}
            {flows.map((_, i) => {
              const b = bands[i]
              const visible = b.shown && (b.t >= MIN_LABEL || i === active)
              return (
                <span
                  key={i}
                  aria-hidden
                  data-slot="asset-allocation-chart-to-label"
                  data-flow-to={i}
                  className={cn("pointer-events-none absolute right-2.5 transition-opacity duration-300", !visible ? "opacity-0" : dimFlow(i) ? "opacity-45" : "opacity-100")}
                  style={{ top: round(labelTop(b.y1, b.t)) }}
                >
                  <Count value={b.toShare} format={formats.share} kind="share" className="typo-label-03-medium hug-w block whitespace-nowrap text-fg-normal" />
                </span>
              )
            })}

            {tip && (
              <div
                ref={tipRef}
                aria-hidden
                data-slot="asset-allocation-chart-tooltip"
                className={cn(
                  "pointer-events-none absolute flex flex-col items-start gap-2 overflow-hidden rounded-2xl bg-surface-loud p-3 whitespace-nowrap transition-opacity duration-200",
                  // Figma paints later effects on top; CSS paints the first shadow on top
                  "shadow-[0_4px_3.6px_rgb(0_0_0/0.25),0_0_0_1px_#121212,0_2px_3.6px_rgb(0_0_0/0.06),0_4px_14.4px_rgb(0_0_0/0.08)]",
                  focusClass ? "opacity-0" : "opacity-100",
                )}
                style={{ left: tipLeft, top: tipTop }}
              >
                <TooltipRows tip={tip} reductionsLabel={reductionsLabel} additionsLabel={additionsLabel} formats={formats} live />
                {/* Figma's 1px #242323 inside stroke, over the content */}
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] border border-[#242323]" />
              </div>
            )}
            {/* the same lines with their final text, measured to place the tooltip (the visible ones change width while they count) */}
            {tip && (
              <span ref={sizerRef} aria-hidden className="pointer-events-none invisible absolute top-0 left-0 flex flex-col items-start gap-2 whitespace-nowrap">
                <TooltipRows tip={tip} reductionsLabel={reductionsLabel} additionsLabel={additionsLabel} formats={formats} />
              </span>
            )}
          </div>

          <div aria-hidden data-side="to" className="relative w-[72px] shrink-0">
            {classes.map((c, ci) => (c.side === "to" ? renderBar(c, ci) : null))}
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

export {
  AssetAllocationChart,
  sampleAssetAllocationClasses,
  sampleAssetAllocationFlows,
  type AssetAllocationChartProps,
  type AssetAllocationClass,
  type AssetAllocationColor,
  type AssetAllocationFlow,
}
