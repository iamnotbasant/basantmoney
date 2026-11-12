"use client"

import { animate, stagger, utils } from "animejs"
import * as React from "react"

import { ChartButton } from "@/components/ui/chart-button"
import { ChartCard } from "@/components/ui/chart-card"
import { CarIcon, DotsHorizontalIcon, FoodIcon, HomeIcon, ShoppingBagIcon } from "@/components/ui/chart-icons"
import { ChartMenu, ChartMenuContent, ChartMenuRadioGroup, ChartMenuRadioItem, ChartMenuTrigger } from "@/components/ui/chart-menu"
import { ChartSwatch } from "@/components/ui/chart-swatch"
import { ChartTooltipLines } from "@/components/ui/chart-tooltip-lines"
import { releaseStyles, useChartEntrance, useCountUp, useIsomorphicLayoutEffect, useReducedMotion } from "@/hooks/use-chart-motion"
import { useChartSize } from "@/hooks/use-chart-size"
import { useControllableState } from "@/hooks/use-controllable-state"
import { formatCurrency, formatPercent, wholePercents } from "@/lib/chart-format"
import { cn } from "@/lib/utils"

type BudgetOverviewColor = "orange" | "purple" | "blue" | "green" | "yellow"

/** A spending category: a row under the chart, and its share of the spent hexes. */
type BudgetOverviewCategory = {
  /** A unique key: each period's `spent` is keyed by it. */
  id: string
  /** Shown in the row and in the tooltip ("Shopping"). */
  name: string
  /** The 14px glyph in its round tile. */
  icon: React.ReactNode
  /** The tile: its 50 step with a ring in the 100 step and the glyph in the 500 step. Blue by default. */
  color?: BudgetOverviewColor
}

/** A period of the menu ("From last 7 days") and where the money of the accounts stands in it. */
type BudgetOverviewPeriod = {
  value: string
  /** The menu's text and the subtitle's ("From last 7 days"). */
  label: string
  /** What was spent in the period, by category id: Spent is their total. */
  spent: Record<string, number>
  /** What is left to spend. */
  remaining: number
  /** What has been put aside. */
  saved: number
}

type BudgetOverviewChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  title?: string
  /** The soft text before the period ("All accounts"); "" leaves it out. */
  account?: string
  /** The rows under the chart, in this order; the first one fills the middle of the spent hexes. */
  categories?: BudgetOverviewCategory[]
  /** The period menu, each with its spending by category and what is left and saved. */
  periods?: BudgetOverviewPeriod[]
  /** The period shown (a `value` of `periods`); the first one by default. */
  period?: string
  defaultPeriod?: string
  onPeriodChange?: (period: string) => void
  spentLabel?: string
  remainingLabel?: string
  savedLabel?: string
  /** Called by the ⋯ button. */
  onMoreClick?: () => void
  locale?: string
  currency?: string
}

type Part = "spent" | "remaining" | "saved"
/** What is lit: a part, or a category of the spent part. */
type Highlight = { part: Part; category?: string }

// Figma geometry ("Budget Overview Chart" 1473:81900): the "Plot Area" is 440 × 375 and holds 137 hexes, 28 × 32 and
// pointy at the top, 28px apart in a row and 24px from row to row (each row half a hex over from the next), with a few
// strays off the grid at the top and the corners.
const PLOT_WIDTH = 440
const PLOT_HEIGHT = 375
const HEX_WIDTH = 28
const HEX_HEIGHT = 32
// A hex is its 28 × 32 hexagon in white (Figma's 1px white inside stroke) under its colour, the hexagon with every edge
// moved 1px in (its points 1.152px in, its slanted edges' ends 8.58px from the top and bottom). The white between two
// hexes is their two strokes; where a stray overlaps the grid, the hex drawn later covers the other with its stroke.
const HEX_POINT = 1.152
const HEX_SHOULDER = 8.58
// Each row, in Figma's layer order (later rows on top): its top, its first hex's left and a character per 28px step.
// "." has no hex; a digit is an outer hex (one of Figma's blues) and its shade, 0–3; "m" and "M" a middle hex (Figma's
// purples) at shade 2 and 3; "c" and "C" a core hex (Figma's oranges) at shade 2 and 3. The rings only order the fill
// (spent fills the core first, then the middle ring, then the rest, each by its distance from the core's centre); the
// data decides the colours.
const ROWS: [number, number, string][] = [
  [88, 87, "022Mmmm21"],
  [112, 73, "00MMCcCm210"],
  [136, 87, "23mcCcmM21"],
  [160, 73, "01mCcccMM200"],
  [184, 87, "03mcCcCm11"],
  [208, 45, "022MMmMm3210"],
  [232, 59, "0032323m20"],
  [256, 101, "0122322110"],
  [280, 59, "010001010.0"],
  [304, 101, "0010000000"],
  [328, 143, "001010"],
  [64, 73, "00233232100"],
  [40, 115, "01011010"],
  [9, 87, "01"],
  [16, 189, "0000"],
  [8, 20, "0"],
  [334, 16, "0"],
]
const HOVER_REACH = 18 // the pointer picks the nearest hex within 18px of its centre
const DIM = 0.3 // hexes outside what is lit
const TIP_GAP = 6 // the tooltip ends 6px above the hex (below it near the top)
const TIP_PADDING_X = 24 // its 12px side padding, twice
const TIP_PADDING_Y = 16 // and its 8px top and bottom padding
const BLOOM_AT = 120
const BLOOM_STAGGER = 6 // the hexes come in from the core outward, one every 6ms
const WAVE_STAGGER = 3 // a new period recolours them from the core outward, one every 3ms
const RING = "focus-visible:ring-primary-orange-500/40" // the header's focus rings are orange, like Spent

/** Each colour's hex shades (lightest first, by the hexes' shade 0–3), legend swatch, tile and focus ring. */
const palettes: Record<BudgetOverviewColor, { shades: string[]; swatch: string; tile: string; glyph: string; ring: string }> = {
  orange: {
    shades: ["fill-primary-orange-50", "fill-primary-orange-100", "fill-primary-orange-200", "fill-primary-orange-400"],
    swatch: "bg-primary-orange-500",
    tile: "bg-primary-orange-50 shadow-[0_0_0_1px_var(--primary-orange-100)]",
    glyph: "text-primary-orange-500",
    ring: "focus-visible:ring-primary-orange-500/40",
  },
  purple: {
    shades: ["fill-primary-purple-50", "fill-primary-purple-100", "fill-primary-purple-200", "fill-primary-purple-300"],
    swatch: "bg-primary-purple-500",
    tile: "bg-primary-purple-50 shadow-[0_0_0_1px_var(--primary-purple-100)]",
    glyph: "text-primary-purple-500",
    ring: "focus-visible:ring-primary-purple-500/40",
  },
  blue: {
    shades: ["fill-primary-blue-50", "fill-primary-blue-100", "fill-primary-blue-200", "fill-primary-blue-400"],
    swatch: "bg-primary-blue-400",
    tile: "bg-primary-blue-50 shadow-[0_0_0_1px_var(--primary-blue-100)]",
    glyph: "text-primary-blue-500",
    ring: "focus-visible:ring-primary-blue-500/40",
  },
  green: {
    shades: ["fill-primary-green-50", "fill-primary-green-100", "fill-primary-green-200", "fill-primary-green-400"],
    swatch: "bg-primary-green-500",
    tile: "bg-primary-green-50 shadow-[0_0_0_1px_var(--primary-green-100)]",
    glyph: "text-primary-green-500",
    ring: "focus-visible:ring-primary-green-500/40",
  },
  yellow: {
    shades: ["fill-primary-yellow-50", "fill-primary-yellow-100", "fill-primary-yellow-300", "fill-primary-yellow-500"],
    swatch: "bg-primary-yellow-500",
    tile: "bg-primary-yellow-50 shadow-[0_0_0_1px_var(--primary-yellow-100)]",
    glyph: "text-primary-yellow-500",
    ring: "focus-visible:ring-primary-yellow-500/40",
  },
}

// The parts in fill order, from the core out, in Figma's legend colours (Saved's swatch is blue-400)
const PARTS: { key: Part; color: BudgetOverviewColor }[] = [
  { key: "spent", color: "orange" },
  { key: "remaining", color: "purple" },
  { key: "saved", color: "blue" },
]

// The Figma card's four categories (shopping-bag-03, fluent food, car-01, home-line)
const sampleBudgetOverviewCategories: BudgetOverviewCategory[] = [
  { id: "shopping", name: "Shopping", icon: <ShoppingBagIcon />, color: "orange" },
  { id: "dining", name: "Dining", icon: <FoodIcon />, color: "purple" },
  { id: "transport", name: "Transport", icon: <CarIcon />, color: "blue" },
  { id: "bills", name: "Bills & Utilities", icon: <HomeIcon />, color: "blue" },
]

// The Figma card is the last 7 days: its four rows spend $4,450, and with $6,675 left and $32,425 saved the accounts'
// $43,550 fill the 137 hexes as drawn (14 spent, 21 remaining, 102 saved: 10%, 15% and 75%, where Figma writes 68%, 12%
// and 20%). The 30 and 90 days are sample periods; the 90 days come to Figma's percentages.
const sampleBudgetOverviewPeriods: BudgetOverviewPeriod[] = [
  { value: "7d", label: "From last 7 days", spent: { shopping: 2100, dining: 1250, transport: 550, bills: 550 }, remaining: 6675, saved: 32425 },
  { value: "30d", label: "From last 30 days", spent: { shopping: 6180, dining: 3940, transport: 1710, bills: 1670 }, remaining: 4950, saved: 26550 },
  { value: "90d", label: "From last 90 days", spent: { shopping: 14920, dining: 9310, transport: 4630, bills: 3780 }, remaining: 5760, saved: 9600 },
]

/** A hex: where it is, its shade (0–3), its place in Figma's layers and its two shapes. */
type Cell = { x: number; y: number; cx: number; cy: number; level: number; layer: number; outline: string; d: string }

const r3 = (n: number) => Math.round(n * 1000) / 1000

/** The hexagon at (x, y), `inset` px inside its edges, in place (a transform would give way to anime.js's scale). */
function hexPath(x: number, y: number, inset: number) {
  const point = inset && HEX_POINT * inset
  const shoulder = inset ? HEX_SHOULDER : HEX_HEIGHT / 4
  const [l, m, r] = [x + inset, x + HEX_WIDTH / 2, x + HEX_WIDTH - inset].map(r3)
  const [t, s, u, b] = [y + point, y + shoulder, y + HEX_HEIGHT - shoulder, y + HEX_HEIGHT - point].map(r3)
  return `M${m} ${t}L${r} ${s}V${u}L${m} ${b}L${l} ${u}V${s}Z`
}

/** The hexes in fill order: Figma's core, then its middle ring, then the rest, each nearest to the core's centre first. */
const CELLS: Cell[] = (() => {
  const cells: (Omit<Cell, "outline" | "d"> & { ring: number })[] = []
  for (const [y, left, pattern] of ROWS)
    [...pattern].forEach((ch, i) => {
      if (ch === ".") return
      const x = left + i * HEX_WIDTH
      const ring = ch === "c" || ch === "C" ? 0 : ch === "m" || ch === "M" ? 1 : 2
      const level = ch === "C" || ch === "M" ? 3 : ch === "c" || ch === "m" ? 2 : Number(ch)
      cells.push({ x, y, cx: x + HEX_WIDTH / 2, cy: y + HEX_HEIGHT / 2, level, layer: cells.length, ring })
    })
  const core = cells.filter((cell) => cell.ring === 0)
  const ox = core.reduce((sum, cell) => sum + cell.cx, 0) / (core.length || 1)
  const oy = core.reduce((sum, cell) => sum + cell.cy, 0) / (core.length || 1)
  const distance = (cell: { cx: number; cy: number }) => Math.hypot(cell.cx - ox, cell.cy - oy)
  return cells
    .sort((a, b) => a.ring - b.ring || distance(a) - distance(b) || a.y - b.y || a.x - b.x)
    .map(({ ring: _ring, ...cell }) => ({ ...cell, outline: hexPath(cell.x, cell.y, 0), d: hexPath(cell.x, cell.y, 1) }))
})()
/** The hexes (their places in the fill) in the order Figma draws them. */
const DRAW_ORDER = CELLS.map((cell, i) => ({ i, layer: cell.layer }))
  .sort((a, b) => a.layer - b.layer)
  .map(({ i }) => i)

/** `slots` whole slots shared out in proportion to the values (largest remainder first; below zero counts as 0). */
function apportion(values: number[], slots: number) {
  const positive = values.map((value) => Math.max(0, value))
  const sum = positive.reduce((total, value) => total + value, 0)
  if (!(sum > 0)) return values.map(() => 0)
  const exact = positive.map((value) => (value / sum) * slots)
  const whole = exact.map(Math.floor)
  let left = slots - whole.reduce((total, value) => total + value, 0)
  for (const { i } of exact.map((value, i) => ({ i, rest: value - whole[i] })).sort((a, b) => b.rest - a.rest)) {
    if (left-- <= 0) break
    whole[i]++
  }
  return whole
}

/** Which part (and for spent hexes which category) each hex stands for: equal shares, filled from the core outward. */
function assignCells(amounts: number[], categoryAmounts: number[], categoryIds: string[]) {
  const counts = apportion(amounts, CELLS.length)
  const perCategory = apportion(categoryAmounts, counts[0])
  const owners: { part: Part; category?: string }[] = []
  perCategory.forEach((count, k) => {
    for (let j = 0; j < count; j++) owners.push({ part: "spent", category: categoryIds[k] })
  })
  PARTS.forEach((part, p) => {
    const count = p === 0 ? counts[0] - owners.length : counts[p]
    for (let j = 0; j < count; j++) owners.push({ part: part.key })
  })
  return owners
}

const sameHighlight = (a: Highlight | null, b: Highlight | null) => a?.part === b?.part && a?.category === b?.category
const lights = (h: Highlight, owner: { part: Part; category?: string } | undefined) =>
  !!owner && owner.part === h.part && (!h.category || owner.category === h.category)

/** A part under the chart: its swatch and name over its share, which counts from the previous one when it changes. */
function PartStat({
  label,
  color,
  share,
  amount,
  pressed,
  dimmed,
  onToggle,
  onPreview,
  format,
}: {
  label: string
  color: BudgetOverviewColor
  share: number
  amount: string
  pressed: boolean
  dimmed: boolean
  onToggle: () => void
  onPreview: (on: boolean) => void
  format: (value: number) => string
}) {
  const valueRef = React.useRef<HTMLSpanElement>(null)
  useCountUp(valueRef, share, format, { duration: 900 })
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`${label}: ${format(share)}, ${amount}`}
      data-slot="budget-overview-chart-stat"
      onClick={onToggle}
      onPointerEnter={(event) => event.pointerType === "mouse" && onPreview(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && onPreview(false)}
      className={cn(
        "flex min-w-0 flex-1 cursor-pointer flex-col items-center gap-3 rounded-lg outline-none transition-opacity duration-200 focus-visible:ring-2",
        palettes[color].ring,
        dimmed && "opacity-50",
      )}
    >
      {/* Figma "Legend Item": the 16 × 6 swatch 8px before Label/03 Medium */}
      <span className="flex max-w-full items-center gap-2">
        <ChartSwatch className={palettes[color].swatch} />
        {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
        <span className="typo-label-03-medium hug-w -my-0.5 min-w-0 truncate py-0.5 text-fg-normal">{label}</span>
      </span>
      <span ref={valueRef} data-slot="budget-overview-chart-stat-value" data-value={share} className="typo-heading-01-semibold hug-w whitespace-nowrap text-fg-loud">
        {format(share)}
      </span>
    </button>
  )
}

/** A category row: its tile, name and amount; pressing it lights its share of the spent hexes. */
function CategoryRow({
  category,
  amount,
  pressed,
  dimmed,
  onToggle,
  onPreview,
  format,
}: {
  category: BudgetOverviewCategory
  amount: number
  pressed: boolean
  dimmed: boolean
  onToggle: () => void
  onPreview: (on: boolean) => void
  format: (value: number) => string
}) {
  const amountRef = React.useRef<HTMLSpanElement>(null)
  useCountUp(amountRef, amount, format, { duration: 900 })
  const palette = palettes[category.color ?? "blue"]
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`${category.name}: ${format(amount)}`}
      data-slot="budget-overview-chart-category"
      onClick={onToggle}
      onPointerEnter={(event) => event.pointerType === "mouse" && onPreview(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && onPreview(false)}
      className={cn(
        // Figma "Header Cell": Background/Disable inside a 1px Border/Soft ring, 16 × 13px from the outer edge
        "flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-border-soft bg-surface-disable px-3 py-[15px] text-left outline-none",
        "transition-[background-color,box-shadow,opacity] duration-200 hover:bg-surface-base focus-visible:ring-2",
        pressed && "bg-surface-white shadow-[0_1px_2px_rgb(40_40_40/0.08)] hover:bg-surface-white",
        dimmed && "opacity-50",
        palette.ring,
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        {/* Figma "Icon Container": a 28px round tile in the 50 step with a 1px ring in the 100 step */}
        <span
          data-slot="budget-overview-chart-tile"
          className={cn("flex size-7 shrink-0 items-center justify-center rounded-full [&_svg]:size-3.5", palette.tile, palette.glyph)}
        >
          {category.icon}
        </span>
        <span className="typo-label-02-medium -my-0.5 min-w-0 truncate py-0.5 text-fg-normal">{category.name}</span>
      </span>
      <span ref={amountRef} data-slot="budget-overview-chart-amount" data-value={amount} className="typo-label-02-medium hug-w shrink-0 whitespace-nowrap text-fg-loud">
        {format(amount)}
      </span>
    </button>
  )
}

/**
 * "Budget Overview Chart" from the Keitoto library: where the money of the accounts stands over a period, as a honeycomb
 * of 137 hexes, each an equal share: what was spent fills the core in orange, what is left to spend rings it in purple
 * and what was saved fills the rest in blue, each hex in one of its colour's shades. Under it the three parts' shares,
 * and the spending by category. Hover a hex for its category (or part) and amount, a share or a row to light its hexes;
 * click to keep it lit. Animated with anime.js: the hexes bloom from the core outward, the shares count up and the rows
 * rise in with their amounts counting; another period recolours the hexes in a wave from the core while the numbers
 * count to their new values.
 */
function BudgetOverviewChart({
  title = "Budget overview",
  account = "All accounts",
  categories = sampleBudgetOverviewCategories,
  periods = sampleBudgetOverviewPeriods,
  period: periodProp,
  defaultPeriod,
  onPeriodChange,
  spentLabel = "Spent",
  remainingLabel = "Remaining",
  savedLabel = "Saved",
  onMoreClick,
  locale = "en-US",
  currency = "USD",
  className,
  ...props
}: BudgetOverviewChartProps) {
  const [periodValue, setPeriod] = useControllableState<string>({
    value: periodProp,
    defaultValue: defaultPeriod ?? periods[0]?.value ?? "",
    onChange: onPeriodChange,
  })
  const current = periods.find((p) => p.value === periodValue) ?? periods[0]
  const categoryAmounts = categories.map((category) => Math.max(0, current?.spent[category.id] ?? 0))
  const spent = categoryAmounts.reduce((sum, value) => sum + value, 0)
  const amounts = [spent, Math.max(0, current?.remaining ?? 0), Math.max(0, current?.saved ?? 0)]
  const shares = wholePercents(amounts)
  const labels: Record<Part, string> = { spent: spentLabel, remaining: remainingLabel, saved: savedLabel }
  const owners = assignCells(
    amounts,
    categoryAmounts,
    categories.map((c) => c.id),
  )
  // Content key: parents may pass new arrays on every render, so changes are detected by value.
  const ownersKey = owners.map((owner) => `${owner.part}:${owner.category ?? ""}`).join(",")
  const tone = (i: number) => {
    const owner = owners[i]
    if (!owner) return "fill-surface-soft"
    const color = PARTS.find((part) => part.key === owner.part)?.color ?? "blue"
    return palettes[color].shades[CELLS[i].level] ?? palettes[color].shades[0]
  }

  // An amount without cents when it is whole, as in Figma ("$2,100"); the digits follow the final amount, so a count
  // up to it doesn't show cents on the way.
  const amountFormat = React.useCallback(
    (final: number) => (value: number) => formatCurrency(value, { locale, currency, maximumFractionDigits: Number.isInteger(final) ? 0 : undefined }),
    [locale, currency],
  )
  const money = (value: number) => amountFormat(value)(value)
  const percent = React.useCallback((value: number) => formatPercent(value, { locale, maximumFractionDigits: 0 }), [locale])

  // What is lit: the hovered hex's category (or part), else a hovered share or row, else the pressed one.
  const [hoverCell, setHoverCell] = React.useState<number | null>(null)
  const [preview, setPreview] = React.useState<Highlight | null>(null)
  const [pinned, setPinned] = React.useState<Highlight | null>(null)
  const hoverOwner = hoverCell !== null ? owners[hoverCell] : undefined
  const highlight: Highlight | null = hoverOwner ? { part: hoverOwner.part, category: hoverOwner.category } : (preview ?? pinned)
  const toggle = (next: Highlight) => {
    setPreview(null)
    setPinned((now) => (sameHighlight(now, next) ? null : next))
  }

  // The tooltip over the hovered hex: its category (or part) and that one's amount. The last one is kept after the
  // pointer leaves, so the tooltip can fade out with its text.
  const [tipCell, setTipCell] = React.useState<number | null>(null)
  const tipOwner = tipCell !== null ? owners[tipCell] : undefined
  const tipCategory = tipOwner?.category ? categories.findIndex((c) => c.id === tipOwner.category) : -1
  const tooltip = tipOwner
    ? tipCategory >= 0
      ? { label: categories[tipCategory].name, value: categoryAmounts[tipCategory] }
      : { label: labels[tipOwner.part], value: amounts[PARTS.findIndex((part) => part.key === tipOwner.part)] ?? 0 }
    : null
  const [plotRef, plot] = useChartSize<HTMLDivElement>({ width: PLOT_WIDTH, height: PLOT_HEIGHT })
  const scale = (plot.width || PLOT_WIDTH) / PLOT_WIDTH
  const [sizerRef, sizer] = useChartSize<HTMLSpanElement>({ width: 60, height: 38 })
  const tipWidth = sizer.width + TIP_PADDING_X
  const tipHeight = sizer.height + TIP_PADDING_Y
  const tipAt = tipCell !== null ? CELLS[tipCell] : null
  const tipLeft = tipAt ? Math.round(Math.min(Math.max(tipAt.cx * scale - tipWidth / 2, 0), Math.max(0, plot.width - tipWidth))) : 0
  const above = tipAt ? tipAt.y * scale - TIP_GAP - tipHeight : 0
  const tipTop = tipAt ? Math.round(above >= 0 ? above : (tipAt.y + HEX_HEIGHT) * scale + TIP_GAP) : 0
  const tipShown = hoverCell !== null

  const reduced = useReducedMotion()
  const root = React.useRef<HTMLDivElement>(null)
  const tipRef = React.useRef<HTMLDivElement>(null)
  const tipValueRef = React.useRef<HTMLSpanElement>(null)
  const all = (selector: string) => Array.from(root.current?.querySelectorAll<HTMLElement | SVGElement>(selector) ?? [])
  const rank = (el: unknown) => Number((el as SVGElement).dataset.rank)
  // what the entrance's counters need when they run (another period may come in before it is done)
  const latest = React.useRef({ shares, categoryAmounts, percent, amountFormat })
  useIsomorphicLayoutEffect(() => {
    latest.current = { shares, categoryAmounts, percent, amountFormat }
  })

  useCountUp(tipValueRef, tooltip?.value ?? 0, amountFormat(tooltip?.value ?? 0), { duration: 450 })

  // Entrance, once the card is in view: the hexes bloom from the core outward, the shares rise in and count up, and the
  // rows rise in one after another while their amounts count up.
  useChartEntrance(root, (timeline) => {
    const values = all('[data-slot="budget-overview-chart-stat-value"]')
    const rowAmounts = all('[data-slot="budget-overview-chart-amount"]')
    const counter = { stats: 0, rows: 0 }
    const count = () => {
      const now = latest.current
      values.forEach((el, k) => (el.textContent = now.percent((now.shares[k] ?? 0) * counter.stats)))
      rowAmounts.forEach((el, k) => (el.textContent = now.amountFormat(now.categoryAmounts[k] ?? 0)((now.categoryAmounts[k] ?? 0) * counter.rows)))
    }
    count()
    // every element is handed back to its classes when its tween ends (they dim by class)
    const back = releaseStyles("opacity", "transform")
    timeline
      .add(
        all('[data-slot="budget-overview-chart-hex"]'),
        { opacity: { from: 0 }, scale: { from: 0.45 }, duration: 560, ease: "outBack(1.8)", delay: (el: unknown) => rank(el) * BLOOM_STAGGER, onComplete: back },
        BLOOM_AT,
      )
      .add(all('[data-slot="budget-overview-chart-stat"]'), { opacity: { from: 0 }, translateY: { from: 6 }, duration: 600, ease: "outQuad", delay: stagger(90), onComplete: back }, 250)
      .add(counter, { stats: [0, 1], duration: 1300, ease: "outExpo", onUpdate: count }, 350)
      .add(all('[data-slot="budget-overview-chart-category"]'), { opacity: { from: 0 }, translateY: { from: 12 }, duration: 800, ease: "outExpo", delay: stagger(80), onComplete: back }, 450)
      .add(all('[data-slot="budget-overview-chart-tile"]'), { scale: { from: 0.4 }, duration: 600, ease: "outBack(2.2)", delay: stagger(80), onComplete: back }, 550)
      .add(counter, { rows: [0, 1], duration: 1200, ease: "outExpo", onUpdate: count }, 550)
    return () => {
      counter.stats = 1
      counter.rows = 1
      count()
    }
  })

  // Another period recolours the hexes in a wave from the core outward (each hex's fill has a CSS transition delayed by
  // its place in the fill); the hexes that change hands pop as their colour turns.
  const lastOwners = React.useRef({ key: ownersKey, owners })
  useIsomorphicLayoutEffect(() => {
    const before = lastOwners.current
    lastOwners.current = { key: ownersKey, owners }
    if (reduced || before.key === ownersKey) return
    const changed = all('[data-slot="budget-overview-chart-hex"]').filter((el) => {
      const i = rank(el)
      return before.owners[i]?.part !== owners[i]?.part || before.owners[i]?.category !== owners[i]?.category
    })
    if (changed.length)
      animate(changed, { scale: [1, 0.72, 1], duration: 520, ease: "inOutQuad", delay: (el: unknown) => rank(el) * WAVE_STAGGER, onComplete: releaseStyles("transform") })
  }, [ownersKey, reduced])

  // The tooltip fades in over the hovered hex and slides along to the next one.
  const lastTip = React.useRef({ shown: tipShown, left: tipLeft, top: tipTop, width: plot.width })
  useIsomorphicLayoutEffect(() => {
    const before = lastTip.current
    lastTip.current = { shown: tipShown, left: tipLeft, top: tipTop, width: plot.width }
    const tip = tipRef.current
    if (!tip || reduced) return
    if (before.shown !== tipShown) {
      const from = tip.style.opacity === "" ? (tipShown ? 0 : 1) : Number(tip.style.opacity)
      animate(tip, {
        opacity: [from, tipShown ? 1 : 0],
        scale: tipShown ? [0.94, 1] : [1, 0.97],
        translateY: tipShown ? [4, 0] : [0, 2],
        duration: tipShown ? 320 : 180,
        ease: tipShown ? "outBack(1.6)" : "outQuad",
        onComplete: releaseStyles("opacity", "transform"),
      })
      return
    }
    if (tipShown && (before.left !== tipLeft || before.top !== tipTop) && before.width === plot.width)
      animate(tip, {
        translateX: [before.left - tipLeft + utils.get(tip, "translateX", false), 0],
        translateY: [before.top - tipTop + utils.get(tip, "translateY", false), 0],
        duration: 380,
        ease: "outExpo",
        onComplete: releaseStyles("transform"),
      })
  }, [tipShown, tipLeft, tipTop, plot.width, reduced])

  // The pointer picks the nearest hex (in the plot's own units: the plot may be drawn smaller in a narrow card, and the
  // live demo may zoom it).
  const cellAt = (event: React.MouseEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const unit = (box.width || 1) / PLOT_WIDTH
    const x = (event.clientX - box.left) / unit
    const y = (event.clientY - box.top) / unit
    let best: number | null = null
    let reach = HOVER_REACH
    for (let i = 0; i < CELLS.length; i++) {
      const d = Math.hypot(CELLS[i].cx - x, CELLS[i].cy - y)
      if (d < reach) {
        reach = d
        best = i
      }
    }
    return best
  }
  const hover = (i: number | null) => {
    setHoverCell(i)
    if (i !== null) setTipCell(i)
  }

  const changePeriod = (next: string) => {
    if (next === current?.value || !periods.some((p) => p.value === next)) return
    setPeriod(next)
  }

  const summary = PARTS.map((part, p) => `${labels[part.key]} ${percent(shares[p])}`).join(", ")

  return (
    <ChartCard
      ref={root}
      role="group"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === "Escape") setPinned(null)
      }}
      className={cn("w-full", className)}
      {...props}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
          <p className="typo-heading-01-semibold -my-0.5 min-w-0 truncate py-0.5 text-fg-loud">{title}</p>
          <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
            {account && (
              <>
                <span className="typo-label-02-medium hug-w min-w-0 truncate text-fg-normal">{account}</span>
                <span aria-hidden className="h-3 w-px shrink-0 rounded-[2px] bg-border-soft" />
              </>
            )}
            <ChartMenu>
              <ChartMenuTrigger {...{ asChild: true }}>
                <button
                  type="button"
                  aria-label={`Period: ${current?.label ?? ""}`}
                  className={cn(
                    // the padding gives the focus ring room around the text without moving it
                    "typo-label-02-semibold hug-w -mx-1 -my-0.5 cursor-pointer rounded-md px-1 py-0.5 text-fg-loud outline-none transition-colors duration-200",
                    "hover:text-fg-normal focus-visible:ring-2 data-[state=open]:text-fg-normal",
                    RING,
                  )}
                >
                  {current?.label ?? ""}
                </button>
              </ChartMenuTrigger>
              <ChartMenuContent align="start">
                <ChartMenuRadioGroup value={current?.value ?? ""} onValueChange={changePeriod}>
                  {periods.map((p) => (
                    <ChartMenuRadioItem key={p.value} value={p.value}>
                      {p.label}
                    </ChartMenuRadioItem>
                  ))}
                </ChartMenuRadioGroup>
              </ChartMenuContent>
            </ChartMenu>
          </div>
        </div>
        <ChartButton corner="rounded" size="icon" aria-label="More options" onClick={onMoreClick} className={RING}>
          <DotsHorizontalIcon />
        </ChartButton>
      </div>

      {/* Figma "Plot Area": 440 × 375, smaller in a narrower card */}
      <div
        ref={plotRef}
        role="img"
        aria-label={summary}
        data-slot="budget-overview-chart-plot"
        onPointerMove={(event) => event.pointerType !== "touch" && hover(cellAt(event))}
        onPointerLeave={() => hover(null)}
        onClick={(event) => {
          const i = cellAt(event)
          const owner = i !== null ? owners[i] : undefined
          if (owner) toggle({ part: owner.part, category: owner.category })
          else setPinned(null)
        }}
        // focusable by a click (not a tab stop), so Escape lets go of what a click lit
        tabIndex={-1}
        className="relative mx-auto w-full max-w-[440px] cursor-pointer outline-none"
        style={{ aspectRatio: `${PLOT_WIDTH} / ${PLOT_HEIGHT}` }}
      >
        <svg aria-hidden viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`} className="pointer-events-none absolute inset-0 size-full overflow-visible">
          {DRAW_ORDER.map((i) => (
            // what is lit dims the rest (on a wrapper: anime.js animates the hex's own opacity and scale)
            <g
              key={i}
              className="transition-opacity duration-200 motion-reduce:transition-none"
              style={{ opacity: highlight && !lights(highlight, owners[i]) ? DIM : undefined }}
            >
              <g data-slot="budget-overview-chart-hex" data-rank={i} className="origin-center [transform-box:fill-box]">
                <path d={CELLS[i].outline} className="fill-surface-white" />
                <path
                  d={CELLS[i].d}
                  className={tone(i)}
                  // a new period turns the fills in a wave from the core outward
                  style={{ transition: reduced ? "none" : `fill 360ms ease ${i * WAVE_STAGGER}ms` }}
                />
              </g>
            </g>
          ))}
        </svg>

        {tooltip && (
          <div
            ref={tipRef}
            aria-hidden
            data-slot="budget-overview-chart-tooltip"
            className={cn(
              "pointer-events-none absolute z-10 flex flex-col items-start gap-2 overflow-hidden rounded-[10px] bg-surface-loud px-3 py-2 whitespace-nowrap",
              // Figma paints later effects on top; CSS paints the first shadow on top
              "shadow-[inset_0_2px_8px_rgb(255_255_255/0.24),0_0_0_1px_var(--surface-muted),0_2px_4px_rgb(0_0_0/0.06),0_4px_16px_rgb(0_0_0/0.08)]",
              tipShown ? "opacity-100" : "opacity-0",
            )}
            style={{ left: tipLeft, top: tipTop }}
          >
            <ChartTooltipLines label={tooltip.label} value={money(tooltip.value)} valueRef={tipValueRef} />
          </div>
        )}
        {/* the same lines with their final text, measured to place the tooltip (the visible value changes width while it counts) */}
        {tooltip && (
          <span ref={sizerRef} aria-hidden className="pointer-events-none invisible absolute top-0 left-0 flex flex-col items-start gap-2 whitespace-nowrap">
            <ChartTooltipLines label={tooltip.label} value={money(tooltip.value)} />
          </span>
        )}
      </div>

      {/* Figma "Spent Row": three equal columns, 16px either side of the 36px dividers */}
      <div role="group" aria-label="Shares" className="flex items-center gap-4">
        {PARTS.map((part, p) => (
          <React.Fragment key={part.key}>
            {p > 0 && <span aria-hidden className="h-9 w-px shrink-0 rounded-[2px] bg-border-soft" />}
            <PartStat
              label={labels[part.key]}
              color={part.color}
              share={shares[p]}
              amount={money(amounts[p])}
              pressed={sameHighlight(pinned, { part: part.key })}
              dimmed={!!highlight && highlight.part !== part.key}
              onToggle={() => toggle({ part: part.key })}
              onPreview={(on) => setPreview(on ? { part: part.key } : null)}
              format={percent}
            />
          </React.Fragment>
        ))}
      </div>

      {categories.length > 0 && (
        <div role="group" aria-label={`${spentLabel} by category`} className="flex flex-col gap-2">
          {categories.map((category, k) => (
            <CategoryRow
              key={category.id}
              category={category}
              amount={categoryAmounts[k]}
              pressed={sameHighlight(pinned, { part: "spent", category: category.id })}
              dimmed={!!highlight && (highlight.part !== "spent" || (!!highlight.category && highlight.category !== category.id))}
              onToggle={() => toggle({ part: "spent", category: category.id })}
              onPreview={(on) => setPreview(on ? { part: "spent", category: category.id } : null)}
              format={amountFormat(categoryAmounts[k])}
            />
          ))}
        </div>
      )}
    </ChartCard>
  )
}

export {
  BudgetOverviewChart,
  sampleBudgetOverviewCategories,
  sampleBudgetOverviewPeriods,
  type BudgetOverviewCategory,
  type BudgetOverviewChartProps,
  type BudgetOverviewColor,
  type BudgetOverviewPeriod,
}
