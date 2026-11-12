import { animate, stagger, type AnimationParams, type JSAnimation } from "animejs"
import * as React from "react"

import { ChartButton } from "@/components/ui/chart-button"
import { ChartCard } from "@/components/ui/chart-card"
import { DotsHorizontalIcon } from "@/components/ui/chart-icons"
import { releaseStyles, useChartEntrance, useCountUp, useIsomorphicLayoutEffect, useReducedMotion } from "@/hooks/use-chart-motion"
import { useControllableState } from "@/hooks/use-controllable-state"
import { sectorPath } from "@/lib/chart-arcs"
import { formatCurrency, formatDay } from "@/lib/chart-format"
import { cn } from "@/lib/utils"

type AssetOverviewRadialColor = "blue" | "orange" | "purple" | "green" | "yellow"

/** A figure at the top of the card ("Mutual Funds $12,350"). */
type AssetOverviewStat = { label: string; value: number }

/** A row under the chart: a location (or any other group) whose share of every day the chart can show on its own. */
type AssetOverviewRadialLocation = {
  /** The key of the location's amount in each day's `values`. */
  key: string
  label: string
  color?: AssetOverviewRadialColor
}

type AssetOverviewRadialPoint = {
  /** The day, as an ISO date ("2026-10-07"). */
  date: string
  /** The day's amount per location key (a missing key counts as 0; amounts below zero count as 0). */
  values: Record<string, number>
  /** Highlighted days glow (a campaign, a launch…). */
  highlight?: boolean
}

type AssetOverviewRadialChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  title?: string
  /** The figures at the top of the card. */
  stats?: AssetOverviewStat[]
  /** What the bars measure, in the middle of the ring with the total ("Revenue"). */
  metricLabel?: string
  locations?: AssetOverviewRadialLocation[]
  /** One bar per day, clockwise from 12 o'clock. */
  data?: AssetOverviewRadialPoint[]
  /** The amount at the outer end of the tracks; one and a half times the highest bar shown by default. */
  max?: number
  /** The location shown on its own (its share of each day, in its colour), or null for all of them together. */
  location?: string | null
  defaultLocation?: string | null
  onLocationChange?: (location: string | null) => void
  /** Text for a day in the middle of the ring ("Oct 7"). */
  formatDate?: (date: string) => string
  /** Called by the ⋯ button. */
  onMoreClick?: () => void
  locale?: string
  currency?: string
}

// Figma geometry ("Asset Overview Radial Chart" 1473:81824): a 320px ring around its centre
const SIZE = 320
const CENTER = SIZE / 2
const INNER = 70 // every bar and track starts 70px out
const OUTER = 160 // the tracks end at the ring's edge
const GAP_SHARE = 0.2 // a day's slot (18° for 20 days) starts with a 3.6° gap
const CORNER = 4 // Figma's corner radius, measured along each edge from the corner
const FULL_SHARE = 1.5 // by default the tracks reach one and a half times the highest bar (it ends two thirds out)
const HOVER_MIN = INNER - 12 // the pointer picks a day from just inside the bars to the ring's edge
const TRACKS_AT = 0
const TRACK_STAGGER = 22
const BARS_AT = 280
const BAR_STAGGER = 38
const GROW = 900
const MORPH = 700
const MORPH_STAGGER = 14
const ALL: AssetOverviewRadialColor = "blue" // all locations together: Figma's blue

/**
 * A colour's bars (the 500 step), track (the 50 step, the 100 step under the active day), glow and legend dot. Figma
 * draws Brooklyn's dot with an orange-600 ring; orange keeps it.
 */
const colors: Record<AssetOverviewRadialColor, { fill: string; track: string; trackActive: string; glow: string; dot: string; dotRing: string }> = {
  blue: {
    fill: "fill-primary-blue-500",
    track: "fill-primary-blue-50",
    trackActive: "fill-primary-blue-100",
    glow: "var(--primary-blue-500)",
    dot: "bg-primary-blue-500",
    dotRing: "var(--primary-blue-500)",
  },
  orange: {
    fill: "fill-primary-orange-500",
    track: "fill-primary-orange-50",
    trackActive: "fill-primary-orange-100",
    glow: "var(--primary-orange-500)",
    dot: "bg-primary-orange-500",
    dotRing: "var(--primary-orange-600)",
  },
  purple: {
    fill: "fill-primary-purple-500",
    track: "fill-primary-purple-50",
    trackActive: "fill-primary-purple-100",
    glow: "var(--primary-purple-500)",
    dot: "bg-primary-purple-500",
    dotRing: "var(--primary-purple-500)",
  },
  green: {
    fill: "fill-primary-green-500",
    track: "fill-primary-green-50",
    trackActive: "fill-primary-green-100",
    glow: "var(--primary-green-500)",
    dot: "bg-primary-green-500",
    dotRing: "var(--primary-green-500)",
  },
  yellow: {
    fill: "fill-primary-yellow-500",
    track: "fill-primary-yellow-50",
    trackActive: "fill-primary-yellow-100",
    glow: "var(--primary-yellow-500)",
    dot: "bg-primary-yellow-500",
    dotRing: "var(--primary-yellow-500)",
  },
}

const sampleAssetOverviewStats: AssetOverviewStat[] = [
  { label: "Mutual Funds", value: 12350 },
  { label: "Stocks", value: 1820 },
]

const sampleAssetOverviewLocations: AssetOverviewRadialLocation[] = [
  { key: "la", label: "Los Angeles", color: "blue" },
  { key: "brooklyn", label: "Brooklyn", color: "orange" },
  { key: "ny", label: "New York", color: "purple" },
]

// The Figma ring: 20 days (5 to 24 October 2026), clockwise from 12 o'clock. The days' totals are the drawn bar lengths
// (60px is $759.75) and add up to the three locations' $2,100 + $1,250 + $550; the highlighted days are the bars that
// glow (a Los Angeles, a New York and a Brooklyn event).
const FIGMA_DAYS: [number, number, number][] = [
  [129.28, 76.32, 47.66], [56.92, 50.3, 19.4], [192.19, 49.08, 11.99], [419.64, 64.04, 22.82], [580.39, 146.52, 32.84],
  [54.47, 46.77, 25.38], [37.51, 23.5, 14.96], [31.68, 34.02, 10.27], [65.15, 41.16, 20.31], [43.01, 20.84, 12.12],
  [40.06, 24.04, 11.87], [41.14, 29.61, 55.87], [90.32, 63.11, 99.82], [44, 32.58, 50.04], [39.92, 27.41, 8.64],
  [36.91, 25.15, 13.91], [19.7, 46.44, 9.83], [100.29, 347.28, 58.93], [15.59, 55.45, 4.93], [61.83, 46.38, 18.41],
]
const FIGMA_HIGHLIGHTS = [2, 3, 4, 11, 12, 13, 16, 17, 18]

const sampleAssetOverviewRadialData: AssetOverviewRadialPoint[] = FIGMA_DAYS.map(([la, brooklyn, ny], i) => ({
  date: new Date(Date.UTC(2026, 9, 5 + i)).toISOString().slice(0, 10),
  values: { la, brooklyn, ny },
  ...(FIGMA_HIGHLIGHTS.includes(i) ? { highlight: true } : {}),
}))

const fixed = (n: number) => Math.round(n * 1000) / 1000
const outExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))

/**
 * Figma's 1px ring around a bar (a drop shadow with a spread of 1) grows the arc 1px outward but not sideways (the
 * spread scales the ellipse): the bar's own colour from its end to 1px past it, behind the bar.
 */
function rimPath(r: number, a0: number, a1: number) {
  return r - INNER > 0.01 ? sectorPath(INNER, r + 1, a0, a1, { center: CENTER, corner: CORNER }) : ""
}

/** Day i's slot of n: the angles its bar and track span, after the slot's leading gap. */
function slotAngles(i: number, n: number): [number, number] {
  const slot = (2 * Math.PI) / Math.max(1, n)
  return [i * slot + GAP_SHARE * slot, (i + 1) * slot]
}

/** The 10px legend dot: the colour in a 0.7px ring, a soft drop shadow, a faint inner shadow and a white top edge. */
function Dot({ color }: { color: AssetOverviewRadialColor }) {
  const gradient = `asset-overview-dot-${React.useId().replace(/[^\w-]/g, "")}`
  return (
    <span
      aria-hidden
      data-slot="asset-overview-radial-chart-dot"
      className={cn("relative size-2.5 shrink-0 rounded-full", colors[color].dot)}
      // Figma paints later effects on top; CSS paints the first shadow on top
      style={{ boxShadow: `0 5.142px 10.284px -2.571px rgb(38 45 58 / 0.2), 0 0 0 0.714px ${colors[color].dotRing}, inset 0 -2.571px 5.142px -2.571px rgb(0 0 0 / 0.05)` }}
    >
      {/* Figma: a 0.71px inside stroke, white at 24% fading out toward the bottom */}
      <svg className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity={0.24} />
            <stop offset="1" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <circle cx="5" cy="5" r="4.643" fill="none" stroke={`url(#${gradient})`} strokeWidth={0.714} />
      </svg>
    </span>
  )
}

/** A figure at the top of the card; a new value counts from the previous one. */
function Stat({ stat, format }: { stat: AssetOverviewStat; format: (value: number) => string }) {
  const valueRef = React.useRef<HTMLSpanElement>(null)
  useCountUp(valueRef, stat.value, format, { duration: 900 })
  return (
    <div className="flex min-w-0 flex-col items-start gap-2">
      {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
      <span className="typo-label-02-medium -my-0.5 max-w-full truncate py-0.5 text-fg-normal">{stat.label}</span>
      <span ref={valueRef} data-slot="asset-overview-radial-chart-stat-value" className="typo-heading-03-semibold hug-w whitespace-nowrap text-fg-loud">
        {format(stat.value)}
      </span>
    </div>
  )
}

/** A location row: its dot, name and total; pressing it shows the location on its own. */
function LocationRow({
  location,
  total,
  pressed,
  dimmed,
  onToggle,
  onPreview,
  format,
}: {
  location: AssetOverviewRadialLocation
  total: number
  pressed: boolean
  dimmed: boolean
  onToggle: () => void
  onPreview: (on: boolean) => void
  format: (value: number) => string
}) {
  const totalRef = React.useRef<HTMLSpanElement>(null)
  useCountUp(totalRef, total, format, { duration: 900 })
  return (
    <button
      type="button"
      aria-pressed={pressed}
      data-slot="asset-overview-radial-chart-location"
      onClick={onToggle}
      onPointerEnter={(event) => event.pointerType === "mouse" && onPreview(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && onPreview(false)}
      className={cn(
        // Figma "Header Cell": Background/Disable inside a 1px Border/Soft ring, 16 × 13px from the outer edge
        "flex w-full cursor-pointer items-center justify-between gap-2.5 rounded-xl border border-border-soft bg-surface-disable px-3 py-[15px] text-left outline-none",
        "transition-[background-color,box-shadow,opacity] duration-200 hover:bg-surface-base focus-visible:ring-2",
        pressed && "bg-surface-white shadow-[0_1px_2px_rgb(40_40_40/0.08)] hover:bg-surface-white",
        dimmed && "opacity-50",
        location.color === "orange" ? "focus-visible:ring-primary-orange-500/40" : location.color === "purple" ? "focus-visible:ring-primary-purple-500/40" : "focus-visible:ring-primary-blue-500/40",
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Dot color={location.color ?? "blue"} />
        <span className="typo-label-02-medium -my-0.5 min-w-0 truncate py-0.5 text-fg-normal">{location.label}</span>
      </span>
      <span ref={totalRef} className="typo-label-02-medium hug-w shrink-0 whitespace-nowrap text-fg-loud">
        {format(total)}
      </span>
    </button>
  )
}

/**
 * "Asset Overview Radial Chart" from the Keitoto library: two figures (Mutual Funds, Stocks), a ring of radial bars
 * with the period's revenue in the middle, one bar per day from 12 o'clock on a light track (highlighted days glow), and
 * a row per location with its total. Hover, touch or the arrow keys pick a day: the others dim and the middle shows the
 * day's amount; pressing a location shows its share of each day in its colour (hovering one previews it). Animated with
 * anime.js: the figures count up, the tracks sweep round, the bars grow out of the ring one after another, the glows
 * light up and the rows rise in; a location morphs the bars to its share while the colours change and the numbers count.
 */
function AssetOverviewRadialChart({
  title = "Asset Overview",
  stats = sampleAssetOverviewStats,
  metricLabel = "Revenue",
  locations = sampleAssetOverviewLocations,
  data = sampleAssetOverviewRadialData,
  max: maxProp,
  location: locationProp,
  defaultLocation = null,
  onLocationChange,
  formatDate,
  onMoreClick,
  locale = "en-US",
  currency = "USD",
  className,
  ...props
}: AssetOverviewRadialChartProps) {
  const [focused, setFocused] = useControllableState<string | null>({ value: locationProp, defaultValue: defaultLocation, onChange: onLocationChange })
  const [preview, setPreview] = React.useState<string | null>(null)
  const shownKey = preview ?? focused
  const shown = locations.find((l) => l.key === shownKey) ?? null
  const color = shown?.color ?? ALL
  const n = data.length

  // all locations together: the day's amounts under the locations' keys (every amount when there are no locations)
  const amount = (point: AssetOverviewRadialPoint, key: string | null) =>
    key
      ? Math.max(0, point.values[key] ?? 0)
      : (locations.length ? locations.map((l) => point.values[l.key] ?? 0) : Object.values(point.values)).reduce((sum, value) => sum + Math.max(0, value), 0)
  const values = data.map((point) => amount(point, shown?.key ?? null))
  const highest = Math.max(0, ...values)
  const full = maxProp && maxProp > 0 ? maxProp : highest * FULL_SHARE
  const radii = values.map((value) => (full > 0 ? INNER + (Math.min(value, full) / full) * (OUTER - INNER) : INNER))
  // Content key: parents may pass new arrays on every render, so changes are detected by value.
  const radiiKey = radii.map(fixed).join(",")

  const totals = locations.map((l) => data.reduce((sum, point) => sum + Math.max(0, point.values[l.key] ?? 0), 0))
  const grandTotal = data.reduce((sum, point) => sum + amount(point, null), 0)

  const [hovered, setHovered] = React.useState<number | null>(null)
  const active = hovered !== null && hovered < n ? hovered : null

  const money = React.useCallback((value: number) => formatCurrency(value, { locale, currency }), [locale, currency])
  // the figures and the rows are whole amounts, as in Figma ("$12,350", "+$2,100")
  const whole = React.useCallback((value: number) => formatCurrency(value, { locale, currency, maximumFractionDigits: 0 }), [locale, currency])
  const signed = React.useCallback((value: number) => formatCurrency(value, { locale, currency, signDisplay: "exceptZero", maximumFractionDigits: 0 }), [locale, currency])
  const dayText = (date: string) => (formatDate ? formatDate(date) : formatDay(date, { month: "short", day: "numeric" }, locale))

  // The middle of the ring: the active day, else the location shown, else the total.
  const centerLabel = active !== null ? dayText(data[active].date) : (shown?.label ?? metricLabel)
  const centerValue = active !== null ? values[active] : shown ? (totals[locations.indexOf(shown)] ?? 0) : grandTotal

  const reduced = useReducedMotion()
  const root = React.useRef<HTMLDivElement>(null)
  const centerRef = React.useRef<HTMLSpanElement>(null)
  const centerLabelRef = React.useRef<HTMLSpanElement>(null)
  const glowsRef = React.useRef<SVGGElement>(null)
  const ids = React.useId().replace(/[^\w-]/g, "")
  useCountUp(centerRef, centerValue, money, { duration: active !== null ? 450 : 700 })
  const latest = React.useRef({ radii, centerValue, stats })
  useIsomorphicLayoutEffect(() => {
    latest.current = { radii, centerValue, stats }
  })

  const all = (selector: string) => Array.from(root.current?.querySelectorAll<Element>(selector) ?? [])
  const paths = () => {
    const pick = (slot: string) => {
      const found: (SVGPathElement | undefined)[] = []
      for (const el of all(`[data-slot="${slot}"]`)) found[Number((el as SVGElement).dataset.index)] = el as SVGPathElement
      return found
    }
    return {
      tracks: pick("asset-overview-radial-chart-track"),
      rims: pick("asset-overview-radial-chart-rim"),
      fills: pick("asset-overview-radial-chart-fill"),
      glows: pick("asset-overview-radial-chart-glow"),
    }
  }
  /** Draws day i's bar (its rim, fill and glow) out to radius r. */
  const drawBar = (els: ReturnType<typeof paths>, i: number, r: number) => {
    const [a0, a1] = slotAngles(i, n)
    const d = sectorPath(INNER, r, a0, a1, { center: CENTER, corner: CORNER })
    els.rims[i]?.setAttribute("d", rimPath(r, a0, a1))
    els.fills[i]?.setAttribute("d", d)
    els.glows[i]?.setAttribute("d", d)
  }
  // The radii on screen, so a morph starts from them (and a redraw during the entrance keeps its progress).
  const drawn = React.useRef<number[]>(radii)
  const growing = React.useRef<{ t: number }[] | null>(null)

  // Entrance, once the card is in view: the figures count up, the tracks sweep round clockwise, the bars grow out of the
  // ring one after another while the total counts up, the glows light up, and the rows rise in with their dots popping.
  useChartEntrance(root, (timeline) => {
    const add = (targets: Element[], params: AnimationParams, at: number) => {
      if (targets.length) timeline.add(targets, params, at)
    }
    const els = paths()
    const tracks = els.tracks.map(() => ({ t: 0 }))
    const growth = data.map(() => ({ t: 0 }))
    growing.current = growth
    const drawTrack = (i: number) => {
      const [a0, a1] = slotAngles(i, n)
      els.tracks[i]?.setAttribute("d", sectorPath(INNER, INNER + (OUTER - INNER) * outExpo(tracks[i].t), a0, a1, { center: CENTER, corner: CORNER }))
    }
    const grow = (i: number) => drawBar(els, i, INNER + ((latest.current.radii[i] ?? INNER) - INNER) * outExpo(growth[i].t))
    tracks.forEach((_, i) => drawTrack(i))
    growth.forEach((_, i) => grow(i))
    const statValues = all('[data-slot="asset-overview-radial-chart-stat-value"]')
    const counters = { stats: 0, center: 0 }
    const count = () => {
      statValues.forEach((el, k) => (el.textContent = whole((latest.current.stats[k]?.value ?? 0) * counters.stats)))
      if (centerRef.current) centerRef.current.textContent = money(latest.current.centerValue * counters.center)
    }
    count()
    timeline.add(counters, { stats: [0, 1], duration: 1400, ease: "outExpo", onUpdate: count }, 0)
    tracks.forEach((state, i) => timeline.add(state, { t: [0, 1], duration: 800, ease: "linear", onUpdate: () => drawTrack(i) }, TRACKS_AT + i * TRACK_STAGGER))
    growth.forEach((state, i) => timeline.add(state, { t: [0, 1], duration: GROW, ease: "linear", onUpdate: () => grow(i) }, BARS_AT + i * BAR_STAGGER))
    timeline.add(counters, { center: [0, 1], duration: 1600, ease: "outExpo", onUpdate: count }, BARS_AT)
    // every element is handed back to its classes when its tween ends (the rows and the glows dim by class)
    const back = releaseStyles("opacity", "transform")
    add(all('[data-slot="asset-overview-radial-chart-center"] > *'), { opacity: { from: 0 }, translateY: { from: 6 }, duration: 700, ease: "outExpo", delay: stagger(90), onComplete: back }, BARS_AT)
    const lit = BARS_AT + n * BAR_STAGGER * 0.5 + GROW * 0.5
    add(all('[data-slot="asset-overview-radial-chart-glow"]'), { opacity: { from: 0 }, duration: 900, ease: "outQuad", delay: stagger(60), onComplete: back }, lit)
    add(all('[data-slot="asset-overview-radial-chart-location"]'), { opacity: { from: 0 }, translateY: { from: 12 }, duration: 800, ease: "outExpo", delay: stagger(90), onComplete: back }, 450)
    add(all('[data-slot="asset-overview-radial-chart-location"] [data-slot="asset-overview-radial-chart-dot"]'), { scale: { from: 0 }, duration: 600, ease: "outBack(2.4)", delay: stagger(90), onComplete: back }, 600)
    return () => {
      if (growing.current === growth) growing.current = null
      const { radii, centerValue, stats } = latest.current
      els.tracks.forEach((track, i) => {
        const [a0, a1] = slotAngles(i, n)
        track?.setAttribute("d", sectorPath(INNER, OUTER, a0, a1, { center: CENTER, corner: CORNER }))
      })
      radii.forEach((r, i) => drawBar(els, i, r))
      drawn.current = radii
      statValues.forEach((el, k) => (el.textContent = whole(stats[k]?.value ?? 0)))
      if (centerRef.current) centerRef.current.textContent = money(centerValue)
    }
  })

  // Another location (or new data) morphs every bar from its length on screen to the new one, clockwise; the colours
  // follow with CSS transitions and the glows light up again. During the entrance the bars carry on growing towards the
  // new lengths.
  const morph = React.useRef<JSAnimation | null>(null)
  const lastRadii = React.useRef(radiiKey)
  useIsomorphicLayoutEffect(() => {
    const before = lastRadii.current
    lastRadii.current = radiiKey
    if (before === radiiKey) return
    morph.current?.cancel()
    morph.current = null
    const els = paths()
    const entrance = growing.current
    if (entrance?.some((bar) => bar.t < 1)) {
      radii.forEach((r, i) => drawBar(els, i, INNER + (r - INNER) * outExpo(entrance[i]?.t ?? 1)))
      drawn.current = radii
      return
    }
    const draw = (frame: number[]) => {
      drawn.current = frame
      frame.forEach((r, i) => drawBar(els, i, r))
    }
    if (reduced) {
      draw(radii)
      return
    }
    const from = drawn.current
    const state = { t: 0 }
    const total = MORPH + MORPH_STAGGER * n
    const frame = () => draw(radii.map((r, i) => (from[i] ?? INNER) + (r - (from[i] ?? INNER)) * outExpo(Math.min(1, Math.max(0, (state.t * total - i * MORPH_STAGGER) / MORPH)))))
    frame()
    morph.current = animate(state, {
      t: 1,
      duration: total,
      ease: "linear",
      onUpdate: frame,
      onComplete: () => {
        morph.current = null
        draw(radii)
      },
    })
  }, [radiiKey, reduced])
  React.useEffect(
    () => () => {
      morph.current?.cancel()
    },
    [],
  )

  // A new colour lights the glows up again; a new label in the middle comes in from below.
  const lastColor = React.useRef(color)
  useIsomorphicLayoutEffect(() => {
    const before = lastColor.current
    lastColor.current = color
    if (before === color || reduced || !glowsRef.current) return
    animate(glowsRef.current, { opacity: [0, 1], duration: 700, ease: "outQuad", onComplete: releaseStyles("opacity") })
  }, [color, reduced])
  const lastLabel = React.useRef(centerLabel)
  useIsomorphicLayoutEffect(() => {
    const before = lastLabel.current
    lastLabel.current = centerLabel
    if (before === centerLabel || reduced || !centerLabelRef.current) return
    animate(centerLabelRef.current, { opacity: [0, 1], translateY: [4, 0], duration: 300, ease: "outQuad", onComplete: releaseStyles("opacity", "transform") })
  }, [centerLabel, reduced])

  const toggle = (key: string) => {
    setPreview(null)
    setFocused(focused === key ? null : key)
  }

  // Pointer positions in the ring's own pixels (the live demo may scale the card with CSS zoom; the ring may be drawn
  // smaller than 320px in a narrow card).
  const dayAt = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.currentTarget
    const box = target.getBoundingClientRect()
    const scale = (box.width || 1) / SIZE
    const x = (event.clientX - box.left) / scale - CENTER
    const y = (event.clientY - box.top) / scale - CENTER
    const r = Math.hypot(x, y)
    if (!n || r < HOVER_MIN || r > OUTER + 4) return null
    const angle = (Math.atan2(x, -y) + 2 * Math.PI) % (2 * Math.PI)
    return Math.min(n - 1, Math.floor(angle / ((2 * Math.PI) / n)))
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!n) return
    if (event.key === "Escape") {
      setHovered(null)
      return
    }
    const at = active ?? n - 1
    const next = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: n - 1 }[event.key]
    if (next === undefined) return
    event.preventDefault()
    setHovered((next + n) % n)
  }
  const sliderValue = active ?? Math.max(0, n - 1)

  return (
    <ChartCard ref={root} role="group" aria-label={title} className={cn("w-full items-center", className)} {...props}>
      <div className="flex w-full items-center justify-between gap-20">
        {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
        <p className="typo-heading-01-semibold -my-0.5 min-w-0 flex-1 truncate py-0.5 text-fg-loud">{title}</p>
        <ChartButton corner="rounded" size="icon" aria-label="More options" onClick={onMoreClick}>
          <DotsHorizontalIcon />
        </ChartButton>
      </div>

      {stats.length > 0 && (
        // Figma: two equal columns 24px apart
        <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(120px,1fr))] items-start gap-x-6 gap-y-4">
          {stats.map((stat, k) => (
            <Stat key={`${k}-${stat.label}`} stat={stat} format={whole} />
          ))}
        </div>
      )}

      <div className="relative aspect-square w-full max-w-[320px]">
        <svg aria-hidden viewBox={`0 0 ${SIZE} ${SIZE}`} className="pointer-events-none absolute inset-0 size-full overflow-visible">
          <defs>
            {/* Figma's glow: a 60% drop shadow of the bar 4px to the right, blur 16 (its -2 spread doesn't apply to arcs) */}
            <filter id={`${ids}-glow`} filterUnits="userSpaceOnUse" x={-80} y={-80} width={SIZE + 160} height={SIZE + 160} colorInterpolationFilters="sRGB">
              <feOffset in="SourceAlpha" dx={4} result="moved" />
              <feGaussianBlur in="moved" stdDeviation={7.2} result="blurred" />
              <feFlood floodOpacity={0.6} style={{ floodColor: colors[color].glow, transition: "flood-color 300ms" }} />
              <feComposite in2="blurred" operator="in" />
            </filter>
            {/* Figma's inner shadows: black at 16% 1px up (along the bottom edge) and white at 24% 2px down (along the
                top edge), blur 2 */}
            <filter id={`${ids}-bevel`} filterUnits="userSpaceOnUse" x={-20} y={-20} width={SIZE + 40} height={SIZE + 40} colorInterpolationFilters="sRGB">
              <feOffset in="SourceAlpha" dy={-1} />
              <feGaussianBlur stdDeviation={0.9} result="up" />
              <feComposite in="SourceAlpha" in2="up" operator="arithmetic" k2={1} k3={-1} result="bottom-edge" />
              <feFlood floodColor="#000" floodOpacity={0.16} />
              <feComposite in2="bottom-edge" operator="in" result="shade" />
              <feOffset in="SourceAlpha" dy={2} />
              <feGaussianBlur stdDeviation={0.9} result="down" />
              <feComposite in="SourceAlpha" in2="down" operator="arithmetic" k2={1} k3={-1} result="top-edge" />
              <feFlood floodColor="#fff" floodOpacity={0.24} />
              <feComposite in2="top-edge" operator="in" result="light" />
              <feMerge>
                <feMergeNode in="SourceGraphic" />
                <feMergeNode in="shade" />
                <feMergeNode in="light" />
              </feMerge>
            </filter>
          </defs>
          {data.map((point, i) => {
            const [a0, a1] = slotAngles(i, n)
            return (
              <path
                key={`track-${i}`}
                data-slot="asset-overview-radial-chart-track"
                data-index={i}
                d={sectorPath(INNER, OUTER, a0, a1, { center: CENTER, corner: CORNER })}
                className={cn("transition-[fill] duration-300 motion-reduce:transition-none", i === active ? colors[color].trackActive : colors[color].track)}
              />
            )
          })}
          <g ref={glowsRef}>
            {data.map((point, i) => {
              if (!point.highlight) return null
              const [a0, a1] = slotAngles(i, n)
              return (
                <path
                  key={`glow-${i}`}
                  data-slot="asset-overview-radial-chart-glow"
                  data-index={i}
                  d={sectorPath(INNER, radii[i], a0, a1, { center: CENTER, corner: CORNER })}
                  filter={`url(#${ids}-glow)`}
                  className={cn("transition-opacity duration-200 motion-reduce:transition-none", active !== null && i !== active && "opacity-35")}
                />
              )
            })}
          </g>
          {data.map((point, i) => {
            const [a0, a1] = slotAngles(i, n)
            const d = sectorPath(INNER, radii[i], a0, a1, { center: CENTER, corner: CORNER })
            return (
              <g key={`bar-${i}`} className={cn("transition-opacity duration-200 motion-reduce:transition-none", active !== null && i !== active && "opacity-35")}>
                <path
                  data-slot="asset-overview-radial-chart-rim"
                  data-index={i}
                  d={rimPath(radii[i], a0, a1)}
                  className={cn("transition-[fill] duration-300 motion-reduce:transition-none", colors[color].fill)}
                />
                <path
                  data-slot="asset-overview-radial-chart-fill"
                  data-index={i}
                  d={d}
                  filter={`url(#${ids}-bevel)`}
                  className={cn("transition-[fill] duration-300 motion-reduce:transition-none", colors[color].fill)}
                />
              </g>
            )
          })}
        </svg>

        <div
          role="slider"
          tabIndex={n ? 0 : -1}
          aria-label={`${shown?.label ?? metricLabel} by day`}
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={Math.max(0, n - 1)}
          aria-valuenow={sliderValue}
          aria-valuetext={data[sliderValue] ? `${dayText(data[sliderValue].date)}: ${money(values[sliderValue] ?? 0)}` : undefined}
          data-slot="asset-overview-radial-chart-scrubber"
          onPointerMove={(event) => setHovered(dayAt(event))}
          onPointerDown={(event) => setHovered(dayAt(event))}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setHovered(null)
          }}
          onFocus={(event) => {
            if (event.currentTarget.matches(":focus-visible") && hovered === null) setHovered(sliderValue)
          }}
          onBlur={() => setHovered(null)}
          onKeyDown={onKeyDown}
          className="absolute inset-0 cursor-pointer touch-pan-y rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary-blue-500/40"
        />

        {/* Figma "Revenue Stat": the label and the amount 6px apart, centred in the ring */}
        <div aria-hidden data-slot="asset-overview-radial-chart-center" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1.5">
          <span ref={centerLabelRef} className="typo-label-02-medium hug-w whitespace-nowrap text-fg-normal">
            {centerLabel}
          </span>
          <span ref={centerRef} className="typo-heading-01-semibold hug-w whitespace-nowrap text-fg-loud">
            {money(centerValue)}
          </span>
        </div>
      </div>

      {locations.length > 0 && (
        <div role="group" aria-label="Locations" className="flex w-full flex-col gap-3">
          {locations.map((l, k) => (
            <LocationRow
              key={l.key}
              location={l}
              total={totals[k]}
              pressed={focused === l.key}
              dimmed={shownKey !== null && shownKey !== l.key}
              onToggle={() => toggle(l.key)}
              onPreview={(on) => setPreview(on ? l.key : null)}
              format={signed}
            />
          ))}
        </div>
      )}
    </ChartCard>
  )
}

export {
  AssetOverviewRadialChart,
  sampleAssetOverviewLocations,
  sampleAssetOverviewRadialData,
  sampleAssetOverviewStats,
  type AssetOverviewRadialChartProps,
  type AssetOverviewRadialColor,
  type AssetOverviewRadialLocation,
  type AssetOverviewRadialPoint,
  type AssetOverviewStat,
}
