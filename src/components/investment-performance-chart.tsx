"use client"

import { animate, stagger, svg, utils, type AnimationParams, type JSAnimation } from "animejs"
import * as React from "react"

import { ChartButton } from "@/components/ui/chart-button"
import { ChartCard } from "@/components/ui/chart-card"
import { ChartChangeBadge } from "@/components/ui/chart-change-badge"
import { CreditCardIcon, DotsHorizontalIcon } from "@/components/ui/chart-icons"
import { ChartMarker } from "@/components/ui/chart-marker"
import { ChartTickLabel } from "@/components/ui/chart-tick-label"
import { releaseStyles, useChartEntrance, useCountUp, useIsomorphicLayoutEffect, useReducedMotion } from "@/hooks/use-chart-motion"
import { useChartSize } from "@/hooks/use-chart-size"
import { useControllableState } from "@/hooks/use-controllable-state"
import { formatCompactCurrency, formatCurrency, formatDay, formatPercent } from "@/lib/chart-format"
import { alignPolylines, fittedDash, niceTicks, reachAt, smoothPath, valueAt } from "@/lib/chart-series"
import { cn } from "@/lib/utils"

type InvestmentPerformanceColor = "purple" | "blue" | "orange" | "green"

/** One portfolio: its line, its legend item and its row in the tooltip. */
type InvestmentPerformanceSeries = {
  /** The key of the portfolio's balance in each point's `values`. */
  key: string
  /** Its name in the legend and the tooltip ("Stock portfolio"). */
  label: string
  /** Figma's three are purple, blue and orange; by position when left out. */
  color?: InvestmentPerformanceColor
}

/** One day of every line. */
type InvestmentPerformancePoint = {
  /** The day, as an ISO date ("2025-04-01"). */
  date: string
  /** The balance per series key (a series without a number here leaves the day out of its line). */
  values: Record<string, number>
}

type InvestmentPerformanceChartProps = Omit<React.ComponentProps<"div">, "children"> & {
  title?: string
  /** The glyph in the purple tile (16px, white). */
  icon?: React.ReactNode
  /** The label over the total. */
  totalLabel?: string
  /** The big number: the shown portfolios' balance on the last day by default. A new value counts from the old one. */
  total?: number
  /**
   * The badge, in percent: by default the shown portfolios' change over the last month (the last day against the same
   * day a month before). Up in green, down in red.
   */
  change?: number
  /** Soft text after the badge ("vs last month"); none by default, as in Figma. */
  changeLabel?: string
  /** The portfolios, back to front: the last one is drawn on top. */
  series?: InvestmentPerformanceSeries[]
  /** The days, oldest first. The x axis gives every month the same width and names each at its first day. */
  data?: InvestmentPerformancePoint[]
  /** The y-axis values, lowest first. Seven round values from $0 that hold the lines shown by default. */
  ticks?: number[]
  /** The selected day (an index into `data`), where the cursor rests. The last day by default for your own data. */
  index?: number
  defaultIndex?: number
  onIndexChange?: (index: number, point: InvestmentPerformancePoint) => void
  /** Keys of the series turned off in the legend. */
  hiddenSeries?: string[]
  defaultHiddenSeries?: string[]
  onHiddenSeriesChange?: (hidden: string[]) => void
  /** Text for a date: a month's first day under the axis ("Apr") or a day in the tooltip ("Tuesday, April 1"). */
  formatDate?: (date: string, context: "axis" | "tooltip") => string
  /** Called by the ⋯ button. */
  onMoreClick?: () => void
  locale?: string
  currency?: string
}

type Point = { x: number; y: number }

// Figma geometry ("Investment Performance Chart" 1473:83433)
const PLOT_WIDTH = 625
const PLOT_HEIGHT = 440
const LEVEL_TOP = -0.5 // the highest tick's value is on the middle of its 1px grid line (over [-1, 0], above the plot)…
const LEVEL_BOTTOM = PLOT_HEIGHT - 0.5 // …and the lowest one's on the middle of the bottom line (over [439, 440])
const TICK_COUNT = 7
const TICK = 8 // the Icon/Normal tick marks: 8px left of the plot at every grid row, 8px under it at every month
const LINE = 2
const CAP = 5 // the cursor's filled triangle caps: 5px long, equilateral, narrowing to the 1px line
const CAP_HALF = CAP / Math.sqrt(3)
const CURSOR_DASH = fittedDash(PLOT_HEIGHT - 2 * CAP + 1) // 4/4 dashes fitted between the caps (431px)
const MARKER = 12
const TIP_GAP = 10 // between the cursor and the tooltip
const TIP_TOP = 50 // the tooltip's top, under the plot's
const LABEL_GAP = 8 // the least space between two month labels
const DRAW_AT = 400
const DRAW_DURATION = 1400
const DRAW_STAGGER = 140
const RIDE = 450
const MORPH = 750
const RING = "focus-visible:ring-primary-purple-500/40" // the card's focus rings are purple, like its tile
const NONE: string[] = []

/**
 * Each colour's line, legend dot (its ring: Figma's blue dot rings in a raw #3a5eff, the others in their own colour)
 * and hover marker.
 */
const colors: Record<InvestmentPerformanceColor, { line: string; dot: string; dotRing: string; marker: string }> = {
  purple: { line: "stroke-primary-purple-500", dot: "bg-primary-purple-500", dotRing: "var(--primary-purple-500)", marker: "[--marker-color:var(--primary-purple-500)]" },
  blue: { line: "stroke-primary-blue-500", dot: "bg-primary-blue-500", dotRing: "#3a5eff", marker: "[--marker-color:var(--primary-blue-500)]" },
  orange: { line: "stroke-primary-orange-500", dot: "bg-primary-orange-500", dotRing: "var(--primary-orange-500)", marker: "[--marker-color:var(--primary-orange-500)]" },
  green: { line: "stroke-primary-green-500", dot: "bg-primary-green-500", dotRing: "var(--primary-green-500)", marker: "[--marker-color:var(--primary-green-500)]" },
}
const ORDER: InvestmentPerformanceColor[] = ["purple", "blue", "orange", "green"]
const colorOf = (series: InvestmentPerformanceSeries, index: number) => series.color ?? ORDER[index % ORDER.length]

const DAY = 86_400_000
const timeOf = (date: string) => Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T00:00:00Z` : date)
const isoDay = (time: number) => new Date(time).toISOString().slice(0, 10)

/** Points for consecutive days from `start`, one per value of every series. */
function daily(start: string, values: Record<string, number[]>): InvestmentPerformancePoint[] {
  const from = timeOf(start)
  const length = Math.max(0, ...Object.values(values).map((list) => list.length))
  return Array.from({ length }, (_, i) => ({
    date: isoDay(from + i * DAY),
    values: Object.fromEntries(Object.entries(values).flatMap(([key, list]) => (i < list.length ? [[key, list[i]]] : []))),
  }))
}

const sampleInvestmentPerformanceSeries: InvestmentPerformanceSeries[] = [
  { key: "stock", label: "Stock portfolio", color: "purple" },
  { key: "bonds", label: "Bonds portfolio", color: "blue" },
  { key: "cash", label: "Cash portfolio", color: "orange" },
]

// The Figma card: 1 January to 1 December 2025, each month an equal twelfth of the axis. Each line is Figma's curve read
// at every day on the $0–$60K axis it sits on; drawn as a monotone curve it stays within 0.01px of Figma's. The cursor
// stands on the April line: 1 April.
const STOCK = [
  28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18,
  28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18,
  28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28568.18, 28572.46,
  28585.52, 28607.74, 28639.46, 28681.03, 28732.75, 28794.88, 28867.63, 28951.16, 29045.5, 29150.61, 29266.32, 29392.3,
  29528.08, 29673.05, 29826.41, 29987.23, 30154.43, 30326.85, 30503.22, 30682.26, 30862.67, 31043.21, 31222.7, 31400.04,
  31574.28, 31744.55, 31910.15, 32057.17, 32203.56, 32349.14, 32493.73, 32637.15, 32779.22, 32919.76, 33058.57,
  33195.47, 33330.28, 33462.8, 33592.86, 33720.27, 33844.85, 33966.41, 34084.78, 34199.78, 34311.25, 34419.02, 34522.92,
  34622.79, 34718.49, 34809.87, 34896.79, 34979.1, 35056.69, 35129.44, 35197.21, 35259.92, 35317.45, 35369.72, 35419.4,
  35466.03, 35509.71, 35550.56, 35588.72, 35624.31, 35657.49, 35688.38, 35717.13, 35743.9, 35768.84, 35792.11, 35813.87,
  35834.28, 35853.5, 35871.71, 35889.08, 35905.76, 35921.93, 35937.76, 35953.42, 35969.07, 35984.87, 36000.99, 36017.6,
  36034.84, 36052.87, 36071.85, 36091.92, 36113.22, 36133.54, 36152.08, 36168.97, 36184.38, 36198.44, 36211.31,
  36223.15, 36234.13, 36244.4, 36254.14, 36263.51, 36272.69, 36281.85, 36291.15, 36300.79, 36310.92, 36321.73, 36333.39,
  36346.06, 36359.93, 36375.15, 36391.9, 36410.33, 36430.6, 36452.88, 36477.31, 36504.03, 36533.2, 36564.95, 36599.41,
  36636.71, 36680.23, 36730.61, 36787.69, 36851.3, 36921.28, 36997.44, 37079.59, 37167.53, 37261.06, 37359.94, 37463.96,
  37572.88, 37686.47, 37804.46, 37926.62, 38052.68, 38182.38, 38315.46, 38451.64, 38590.66, 38732.25, 38876.12,
  39022.02, 39169.66, 39318.78, 39469.11, 39620.39, 39772.35, 39924.74, 40077.31, 40226.93, 40380.19, 40536.59,
  40695.53, 40856.33, 41018.24, 41180.44, 41342.05, 41502.15, 41659.81, 41814.11, 41964.14, 42109.06, 42248.07,
  42380.47, 42505.67, 42623.17, 42732.57, 42833.57, 42925.98, 43009.7, 43084.69, 43151.01, 43208.75, 43258.05, 43299.11,
  43332.15, 43357.39, 43375.09, 43385.51, 43388.93, 43388.69, 43387.94, 43386.67, 43384.85, 43382.47, 43379.52,
  43375.98, 43371.87, 43367.19, 43361.98, 43356.27, 43350.12, 43343.6, 43336.81, 43329.85, 43322.83, 43315.87, 43309.08,
  43302.56, 43296.41, 43290.7, 43285.48, 43280.81, 43276.7, 43273.16, 43270.21, 43267.83, 43266.01, 43264.74, 43263.99,
  43263.75, 43268.54, 43283.06, 43307.5, 43342.03, 43386.78, 43441.79, 43507.08, 43582.56, 43668.04, 43763.24, 43867.75,
  43981, 44102.31, 44230.8, 44365.47, 44505.15, 44648.54, 44794.21, 44940.66, 45086.32, 45229.62, 45369, 45502.98,
  45630.19, 45749.36, 45859.41, 45959.4, 46048.57, 46126.33, 46192.24, 46249.01, 46303.35, 46355.12, 46404.21, 46450.52,
  46493.96, 46534.47, 46572.01, 46606.56, 46638.14, 46666.8, 46692.61, 46715.68, 46736.12, 46754.09, 46769.74, 46783.26,
  46794.82, 46804.6, 46812.78, 46819.54, 46825.05, 46829.47, 46832.94, 46835.6, 46837.58, 46839, 46839.95, 46840.53,
  46840.83, 46840.91, 46836.83, 46825.12, 46806.49, 46781.52, 46750.72, 46714.53, 46673.33, 46627.46, 46577.2, 46522.82,
  46464.53, 46402.56, 46337.07, 46268.24, 46196.19, 46121.07, 46042.99, 45962.04, 45878.31, 45791.87, 45702.79,
  45611.11, 45516.87, 45420.07, 45320.72, 45218.77, 45114.14, 45006.67, 44896.02, 44781.1
]
const BONDS = [
  24968.49, 24868.27, 24771.7, 24677.84, 24586.39, 24497.21, 24410.23, 24325.42, 24242.75, 24162.24, 24083.91, 24007.8,
  23933.95, 23862.42, 23793.28, 23726.59, 23662.46, 23600.97, 23542.23, 23486.38, 23433.55, 23383.89, 23337.57, 23294.8,
  23255.78, 23220.77, 23190.04, 23163.91, 23142.75, 23126.98, 23117.08, 23113.64, 23122.91, 23151.36, 23199.89, 23269.3,
  23360.24, 23473.09, 23607.93, 23764.33, 23941.33, 24137.24, 24349.62, 24575.24, 24810.16, 25049.88, 25289.59,
  25524.51, 25750.13, 25962.51, 26158.42, 26335.42, 26491.83, 26626.66, 26739.52, 26830.45, 26899.86, 26948.39,
  26976.84, 26986.12, 26984.06, 26977.8, 26967.16, 26951.99, 26932.14, 26907.48, 26877.87, 26843.2, 26803.39, 26758.37,
  26708.14, 26652.7, 26592.12, 26526.53, 26456.1, 26381.08, 26301.77, 26218.54, 26131.8, 26042.04, 25949.77, 25855.52,
  25759.87, 25663.37, 25566.58, 25470.01, 25374.17, 25279.5, 25186.41, 25095.26, 25006.34, 24916.29, 24827.55, 24740.39,
  24655.08, 24571.92, 24491.19, 24413.18, 24338.17, 24266.42, 24198.16, 24133.6, 24072.89, 24016.17, 23963.49, 23914.91,
  23870.4, 23829.92, 23793.4, 23760.7, 23731.72, 23706.28, 23684.24, 23665.41, 23649.64, 23636.74, 23626.54, 23618.87,
  23613.58, 23610.52, 23609.53, 23609.79, 23610.63, 23612.07, 23614.19, 23617.02, 23620.65, 23625.12, 23630.5, 23636.87,
  23644.29, 23652.83, 23662.57, 23673.56, 23685.88, 23699.58, 23714.71, 23731.3, 23749.4, 23769.01, 23790.13, 23812.74,
  23836.83, 23862.34, 23889.22, 23917.4, 23946.81, 23977.36, 24008.96, 24041.53, 24074.97, 24109.2, 24145.24, 24181.95,
  24219.42, 24257.78, 24297.14, 24337.62, 24379.34, 24422.41, 24466.95, 24513.07, 24560.9, 24610.55, 24662.14, 24715.77,
  24771.55, 24829.61, 24890.04, 24952.94, 25018.42, 25086.57, 25157.5, 25231.28, 25308, 25387.75, 25470.6, 25556.62,
  25645.89, 25738.47, 25834.41, 25933.77, 26036.37, 26148.25, 26269, 26398.22, 26535.46, 26680.3, 26832.25, 26990.84,
  27155.59, 27326, 27501.55, 27681.71, 27865.97, 28053.78, 28244.61, 28437.89, 28633.09, 28829.65, 29027.02, 29224.65,
  29422, 29618.51, 29813.65, 30006.89, 30197.71, 30385.58, 30570.02, 30750.51, 30926.59, 31097.78, 31263.64, 31430.44,
  31604.29, 31784.47, 31970.23, 32160.78, 32355.36, 32553.14, 32753.32, 32955.06, 33157.52, 33359.83, 33561.16,
  33760.62, 33957.36, 34150.5, 34339.17, 34522.53, 34699.7, 34869.85, 35032.13, 35185.72, 35329.81, 35463.61, 35586.33,
  35697.23, 35795.58, 35880.65, 35951.77, 36008.26, 36049.51, 36074.9, 36091.59, 36106.05, 36118.41, 36128.77, 36137.27,
  36144.01, 36149.13, 36152.76, 36155.04, 36156.11, 36156.1, 36155.17, 36153.45, 36151.09, 36148.25, 36145.06, 36141.69,
  36138.28, 36134.98, 36131.93, 36129.29, 36127.19, 36125.79, 36125.22, 36125.62, 36127.13, 36129.88, 36134, 36139.6,
  36146.82, 36155.85, 36167.34, 36181.29, 36197.69, 36216.53, 36237.81, 36261.5, 36287.59, 36316.06, 36346.89, 36380.06,
  36415.54, 36453.29, 36493.29, 36535.5, 36579.88, 36626.4, 36675.02, 36725.68, 36778.35, 36832.97, 36889.51, 36947.9,
  37008.1, 37070.05, 37133.7, 37199, 37265.88, 37334.3, 37404.19, 37475.5, 37552.45, 37633.8, 37718.77, 37806.76,
  37897.35, 37990.19, 38085.01, 38181.61, 38279.8, 38379.43, 38480.39, 38582.56, 38685.85, 38790.19, 38895.5, 39001.74,
  39108.84, 39216.77, 39325.49, 39434.96, 39545.16, 39656.05, 39767.64, 39879.89, 39992.81, 40106.39, 40220.65,
  40335.63, 40451.39, 40568.18
]
const CASH = [
  20659.18, 20853.19, 21040.14, 21221.86, 21398.9, 21571.54, 21739.92, 21904.12, 22064.16, 22220.01, 22371.65, 22518.99,
  22661.96, 22800.44, 22934.3, 23063.39, 23187.56, 23306.6, 23420.3, 23528.42, 23630.71, 23726.84, 23816.51, 23899.31,
  23974.85, 24042.63, 24102.12, 24152.7, 24193.67, 24224.21, 24243.36, 24250.03, 24249.72, 24248.76, 24247.05, 24244.54,
  24241.12, 24236.71, 24231.2, 24224.49, 24216.48, 24207.04, 24196.08, 24183.47, 24169.11, 24152.9, 24134.76, 24114.62,
  24092.43, 24068.17, 24041.83, 24013.43, 23983.03, 23950.69, 23916.51, 23880.58, 23843.02, 23803.96, 23763.53,
  23721.85, 23682.75, 23641.81, 23599.1, 23554.68, 23508.6, 23460.93, 23411.74, 23361.1, 23309.08, 23255.76, 23201.21,
  23145.52, 23088.76, 23031.01, 22972.37, 22912.91, 22852.71, 22791.88, 22730.49, 22668.62, 22606.38, 22543.83,
  22481.08, 22418.2, 22355.28, 22292.41, 22229.66, 22167.12, 22104.86, 22042.97, 21981.52, 21918.94, 21857.7, 21797.83,
  21739.37, 21682.36, 21626.81, 21572.78, 21520.27, 21469.33, 21419.97, 21372.23, 21326.13, 21281.68, 21238.91,
  21197.84, 21158.48, 21120.86, 21084.97, 21050.84, 21018.46, 20987.86, 20959.03, 20931.97, 20906.7, 20883.2, 20861.47,
  20841.51, 20823.31, 20806.87, 20792.17, 20779.11, 20766.71, 20755, 20744.01, 20733.74, 20724.23, 20715.47, 20707.47,
  20700.22, 20693.71, 20687.92, 20682.81, 20678.36, 20674.52, 20671.25, 20668.49, 20666.21, 20664.36, 20662.87, 20661.7,
  20660.82, 20660.16, 20659.7, 20659.4, 20659.21, 20659.12, 20659.09, 20659.1, 20659.13, 20659.16, 20659.18, 20666.37,
  20688.39, 20725.91, 20779.53, 20849.73, 20936.87, 21041.09, 21162.25, 21299.87, 21453.03, 21620.31, 21799.77,
  21988.94, 22184.88, 22384.31, 22583.74, 22779.68, 22968.85, 23148.31, 23315.58, 23468.74, 23606.36, 23727.53,
  23831.75, 23918.89, 23989.09, 24042.7, 24080.22, 24102.25, 24109.44, 24107.84, 24102.93, 24094.59, 24082.67, 24067.07,
  24047.71, 24024.54, 23997.58, 23966.92, 23932.73, 23895.28, 23854.94, 23812.22, 23767.7, 23722.06, 23676.05, 23630.41,
  23585.89, 23543.16, 23502.83, 23465.38, 23431.18, 23400.52, 23373.57, 23350.4, 23331.03, 23315.43, 23303.52, 23295.17,
  23290.27, 23288.67, 23296.68, 23321.21, 23362.97, 23422.61, 23500.69, 23597.6, 23713.55, 23848.46, 24001.91, 24173.03,
  24360.47, 24562.32, 24776.15, 24998.96, 25227.35, 25457.63, 25686.02, 25908.83, 26122.65, 26324.51, 26511.95,
  26683.07, 26836.51, 26971.42, 27087.37, 27184.29, 27262.36, 27322, 27363.76, 27388.29, 27396.3, 27392.7, 27381.66,
  27362.86, 27336, 27300.82, 27257.15, 27204.93, 27144.21, 27075.25, 26998.5, 26914.68, 26824.75, 26729.96, 26631.77,
  26531.84, 26431.9, 26333.72, 26238.92, 26149, 26065.17, 25988.43, 25919.47, 25858.75, 25806.52, 25762.86, 25727.68,
  25700.82, 25682.01, 25670.98, 25667.37, 25674.6, 25696.5, 25733.4, 25785.57, 25853.21, 25936.46, 26035.39, 26149.94,
  26279.93, 26425.03, 26584.75, 26758.41, 26945.12, 27143.8, 27353.13, 27571.56, 27797.37, 28028.61, 28263.22, 28498.99,
  28733.68, 28965.01, 29190.79, 29408.87, 29617.31, 29814.3, 29998.28, 30167.9, 30322.04, 30459.82, 30580.58, 30692.26,
  30796.79, 30895.47, 30989.23, 31078.8, 31164.7, 31247.38, 31327.2, 31404.43, 31479.32, 31552.06, 31622.84, 31691.8,
  31759.06, 31824.73, 31888.91, 31951.68, 32013.11, 32073.27, 32132.2, 32189.96, 32246.59, 32302.1, 32356.52, 32409.86,
  32462.13, 32513.29, 32563.3, 32612.04, 32659.09
]
const sampleInvestmentPerformanceData = daily("2025-01-01", { stock: STOCK, bonds: BONDS, cash: CASH })
const SAMPLE_SELECTED = 90 // 1 April 2025

const round = (n: number) => Math.round(n * 1000) / 1000

/** A time in months (counted from year 0): the month it falls in plus how far into that month it is. */
function monthsAt(time: number) {
  const d = new Date(time)
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth()
  const from = Date.UTC(year, month, 1)
  return year * 12 + month + (time - from) / (Date.UTC(year, month + 1, 1) - from)
}

const valueOf = (point: InvestmentPerformancePoint | undefined, key: string) => {
  const value = point?.values[key]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

/**
 * Where everything sits at a plot width. Every month of the data is an equal band of the axis and a day sits its share
 * into its month, so the first of each month lands on a grid line: Figma draws those 1px lines over [x, x + 1] (and
 * the rows over [y - 1, y]) while the curves pass through x, so the lines are drawn half a pixel right of x. A value's
 * level runs from the lowest tick on the middle of the bottom line to the highest on the middle of the top one.
 */
function layoutChart(data: InvestmentPerformancePoint[], series: InvestmentPerformanceSeries[], hidden: string[], ticksProp: number[] | undefined, width: number) {
  const shown = series.filter((s) => !hidden.includes(s.key))
  const values = (shown.length ? shown : series).flatMap((s) => data.flatMap((point) => valueOf(point, s.key) ?? []))
  const low = Math.min(0, ...values)
  const high = Math.max(0, ...values)
  const ticks = ticksProp?.length ? [...ticksProp].sort((a, b) => a - b) : niceTicks(low, high > low ? high : low + 1, TICK_COUNT)
  const lo = ticks[0]
  const hi = ticks[ticks.length - 1]
  const level = (value: number) => (hi > lo ? LEVEL_BOTTOM - ((value - lo) / (hi - lo)) * (LEVEL_BOTTOM - LEVEL_TOP) : (LEVEL_TOP + LEVEL_BOTTOM) / 2)
  const times = data.map((point) => timeOf(point.date))
  const first = times.length ? monthsAt(times[0]) : 0
  const last = times.length ? monthsAt(times[times.length - 1]) : 0
  const span = last - first
  const x = (time: number) => (span > 0 ? ((monthsAt(time) - first) / span) * width : width / 2)
  const xs = times.map(x)
  const lines = series.map((s) => data.flatMap((point, i): Point[] => {
    const value = valueOf(point, s.key)
    return value === undefined ? [] : [{ x: xs[i], y: level(value) }]
  }))
  const months: { time: number; x: number }[] = []
  for (let m = Math.ceil(first - 1e-9); times.length && m <= last + 1e-9; m++) {
    const time = Date.UTC(Math.floor(m / 12), m % 12, 1)
    months.push({ time, x: x(time) })
  }
  return { ticks, level, xs, lines, months, band: span > 0 ? width / span : width }
}

/** The index of the x nearest to `x` in an ascending list. */
function nearest(xs: number[], x: number) {
  let lo = 0
  let hi = xs.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (xs[mid] <= x) lo = mid
    else hi = mid
  }
  return Math.abs(xs[hi] - x) < Math.abs(xs[lo] - x) ? hi : lo
}

/** The 10px legend dot: the colour in a 0.7px ring, a soft drop shadow, a faint inner shadow and a white top edge. */
function Dot({ color }: { color: InvestmentPerformanceColor }) {
  const gradient = `investment-performance-dot-${React.useId().replace(/[^\w-]/g, "")}`
  return (
    <span
      aria-hidden
      data-slot="investment-performance-chart-dot"
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

type TooltipRowData = { key: string; label: string; color: InvestmentPerformanceColor; value: number | undefined; hidden: boolean }

/** A tooltip row: the series' dot, its name in Figma's 120px column and the day's balance (counting when it changes). */
function TooltipRow({ row, format, counting }: { row: TooltipRowData; format: (value: number) => string; counting?: boolean }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  useCountUp(ref, row.value ?? 0, format, { duration: 400, enabled: !!counting && row.value !== undefined })
  return (
    <span className={cn("flex items-center gap-1.5 py-0.5 transition-opacity duration-200", row.hidden && "opacity-40")}>
      <Dot color={row.color} />
      {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
      <span className="typo-label-02-regular -my-0.5 w-[120px] truncate py-0.5 text-fg-soft">{row.label}</span>
      <span ref={ref} className="typo-label-03-medium hug-w whitespace-nowrap text-fg-white">
        {row.value !== undefined ? format(row.value) : "–"}
      </span>
    </span>
  )
}

/** The tooltip's day and rows. Rendered twice: visible (its amounts count) and as an invisible copy that is measured. */
function TooltipContent({ date, rows, format, counting }: { date: string; rows: TooltipRowData[]; format: (value: number) => string; counting?: boolean }) {
  return (
    <>
      {/* Figma "Tooltip": #1c1c1c with a 1px #242323 line along its bottom (raw colours), then the rows on
          Background/Popup, 2px under it */}
      <span className="flex bg-surface-popup p-3 shadow-[inset_0_-1px_0_#242323]">
        <span className="typo-label-02-regular hug-w whitespace-nowrap text-fg-disable">{date}</span>
      </span>
      <span className="flex flex-col gap-2 bg-surface-popup p-3">
        {rows.map((row) => (
          <TooltipRow key={row.key} row={row} format={format} counting={counting} />
        ))}
      </span>
    </>
  )
}

/**
 * "Investment Performance Chart" from the Keitoto library: the total balance of three portfolios (stocks, bonds and
 * cash) with its change over the last month in a badge, a legend, and each portfolio's daily balance as a smooth line
 * across a year on a gridded $0–$60K axis with tick marks. The selected day (1 April in the sample) gets a dashed
 * cursor with triangle caps and a dark tooltip with the day's three balances. Hover (or drag on touch) scrubs the days
 * with a marker on each line, click or the arrow keys select one; the legend turns portfolios off (the total and the
 * badge count to the ones shown) and hovering it brings one line forward. Animated with anime.js: the tile pops, the
 * total and the badge count up, the grid draws in, the lines draw themselves left to right, the cursor grows down as
 * they reach it and the tooltip pops in; a new day sends the cursor and the markers riding along the lines while the
 * balances count, and new data or a rescaled axis morphs the lines.
 */
function InvestmentPerformanceChart({
  title = "Investment performance",
  icon = <CreditCardIcon />,
  totalLabel = "Total balance",
  total: totalProp,
  change: changeProp,
  changeLabel,
  series = sampleInvestmentPerformanceSeries,
  data: dataProp,
  ticks: ticksProp,
  index: indexProp,
  defaultIndex,
  onIndexChange,
  hiddenSeries,
  defaultHiddenSeries,
  onHiddenSeriesChange,
  formatDate,
  onMoreClick,
  locale = "en-US",
  currency = "USD",
  className,
  ...props
}: InvestmentPerformanceChartProps) {
  const data = dataProp ?? sampleInvestmentPerformanceData
  const n = data.length
  const [indexValue, setIndex] = useControllableState({
    value: indexProp,
    defaultValue: defaultIndex ?? (dataProp ? n - 1 : SAMPLE_SELECTED),
    onChange: (next: number) => {
      if (data[next]) onIndexChange?.(next, data[next])
    },
  })
  const [hidden, setHidden] = useControllableState({ value: hiddenSeries, defaultValue: defaultHiddenSeries ?? NONE, onChange: onHiddenSeriesChange })
  const [plotRef, plot] = useChartSize<HTMLDivElement>({ width: PLOT_WIDTH, height: PLOT_HEIGHT })
  const width = plot.width || PLOT_WIDTH
  const chart = React.useMemo(() => layoutChart(data, series, hidden, ticksProp, width), [data, series, hidden, ticksProp, width])
  const { ticks, level, xs, lines, months } = chart
  // Content keys: parents may pass new arrays on every render, so changes are detected by value.
  const geometryKey = lines.map((line) => line.map((p) => `${round(p.x)},${round(p.y)}`).join(" ")).join("|")
  const ticksKey = ticks.join(";")

  const money = React.useCallback((value: number) => formatCurrency(value, { locale, currency }), [locale, currency])
  const axisMoney = React.useCallback((value: number) => formatCompactCurrency(value, { locale, currency }), [locale, currency])
  // two fixed decimals, as in Figma ("2.64%"); the arrow gives the sign
  const percent = React.useCallback((value: number) => formatPercent(Math.abs(value), { locale, minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale])
  const dateText = (date: string, context: "axis" | "tooltip") =>
    formatDate ? formatDate(date, context) : formatDay(date, context === "axis" ? { month: "short" } : { weekday: "long", month: "long", day: "numeric" }, locale)

  // The total and the badge read the shown portfolios: the last day's balance, and its change since the last day a
  // month or more before it (the whole span when the data is shorter).
  const shownSeries = series.filter((s) => !hidden.includes(s.key))
  const balanceAt = (i: number) => shownSeries.reduce((sum, s) => sum + (valueOf(data[i], s.key) ?? 0), 0)
  const lastTime = n ? timeOf(data[n - 1].date) : 0
  const monthBefore = (() => {
    const d = new Date(lastTime)
    const days = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0)).getUTCDate()
    const target = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, Math.min(d.getUTCDate(), days))
    let found = 0
    for (let i = 0; i < n; i++) if (timeOf(data[i].date) <= target) found = i
    return found
  })()
  const total = totalProp ?? (n ? balanceAt(n - 1) : 0)
  const base = n ? balanceAt(monthBefore) : 0
  const change = changeProp ?? (base > 0 ? (balanceAt(n - 1) / base - 1) * 100 : 0)

  const [hovered, setHovered] = React.useState<number | null>(null)
  const [focused, setFocused] = React.useState(false)
  const [emphasis, setEmphasis] = React.useState<string | null>(null)
  const selected = n ? Math.min(Math.max(Math.round(indexValue), 0), n - 1) : -1
  const active = hovered !== null && hovered < n ? hovered : selected
  const point = data[active]
  // the markers show while you scrub: the pointer over the plot, or the keyboard on it
  const scrubbing = hovered !== null || focused
  const pointX = xs[active] ?? width / 2
  // the cursor is centred on whole pixels like Figma's (171 on the April line, which covers [170.45, 171.45])
  const cursorX = Math.round(pointX + 0.5)
  const rows: TooltipRowData[] = series.map((s, k) => ({ key: s.key, label: s.label, color: colorOf(s, k), value: valueOf(point, s.key), hidden: hidden.includes(s.key) }))
  const readings = series.flatMap((s, k) => {
    const value = valueOf(point, s.key)
    return value === undefined || hidden.includes(s.key) ? [] : [{ key: s.key, index: k, color: colorOf(s, k), y: level(value) }]
  })

  // The tooltip sits right of the cursor, or left of it when it would run past the plot, 50px under the plot's top.
  // Its size is measured on an invisible copy that holds the final text.
  const [sizerRef, sizer] = useChartSize<HTMLSpanElement>({ width: 251, height: 140 })
  const tipWidth = sizer.width
  const flipped = cursorX + TIP_GAP + tipWidth > width
  const tipLeft = Math.round(flipped ? Math.max(0, cursorX - TIP_GAP - tipWidth) : cursorX + TIP_GAP)

  // The month labels: centred under their lines, but kept inside the plot's right edge. When they would crowd, every
  // second (third…) one is named, and a last label pushed in from the edge hides the one before it when they would
  // touch. The widest label is measured on an invisible copy of them all.
  const [labelsRef, labels] = useChartSize<HTMLSpanElement>({ width: 26, height: 0 })
  const labelWidth = labels.width || 26
  const every = Math.max(1, Math.ceil((labelWidth + LABEL_GAP) / (chart.band || 1)))
  const named = months.map((_, k) => k % every === 0)
  const lastNamed = named.lastIndexOf(true)
  const beforeLast = lastNamed > 0 ? named.lastIndexOf(true, lastNamed - 1) : -1
  if (beforeLast >= 0 && months[beforeLast].x + 0.5 + labelWidth / 2 + LABEL_GAP > Math.min(months[lastNamed].x + 0.5 - labelWidth / 2, width - labelWidth))
    named[beforeLast] = false

  const reduced = useReducedMotion()
  const root = React.useRef<HTMLDivElement>(null)
  const totalRef = React.useRef<HTMLParagraphElement>(null)
  const changeRef = React.useRef<HTMLSpanElement>(null)
  const cursorRef = React.useRef<SVGGElement>(null)
  const tipRef = React.useRef<HTMLDivElement>(null)
  // what the entrance's callbacks need at play time (the card may be resized or get new data before it is in view)
  const latest = React.useRef({ total, change, lines, cursorX })
  useIsomorphicLayoutEffect(() => {
    latest.current = { total, change, lines, cursorX }
  })
  const all = (selector: string) => Array.from(root.current?.querySelectorAll<HTMLElement>(selector) ?? [])

  // New numbers count from the previous ones.
  useCountUp(totalRef, total, money, { duration: 900 })
  useCountUp(changeRef, change, percent, { duration: 900 })

  // Entrance, once the card is in view: the tile pops, the total and the badge count up, the legend rises in, the grid
  // draws across and down, the labels fade in, the three lines draw themselves left to right one after another, then
  // the cursor grows down from its cap once the lines reach it and the tooltip pops in.
  useChartEntrance(root, (timeline) => {
    const add = (targets: Element[], params: AnimationParams, at: number) => {
      if (targets.length) timeline.add(targets, params, at)
    }
    const totalEl = totalRef.current
    const changeEl = changeRef.current
    const paths = all('[data-slot="investment-performance-chart-line"]')
    const cursor = cursorRef.current
    const counter = { t: 0 }
    const count = () => {
      if (totalEl) totalEl.textContent = money(latest.current.total * counter.t)
      if (changeEl) changeEl.textContent = percent(latest.current.change * counter.t)
    }
    count()
    timeline.add(counter, { t: [0, 1], duration: 1400, ease: "outExpo", onUpdate: count }, 0)
    add(all('[data-slot="investment-performance-chart-icon"]'), { scale: { from: 0.4 }, opacity: { from: 0 }, duration: 700, ease: "outBack(1.8)" }, 0)
    add(all('[data-slot="chart-change-badge"]'), { opacity: { from: 0 }, scale: { from: 0.8 }, duration: 600, ease: "outBack(1.7)" }, 300)
    add(all('[data-slot="investment-performance-chart-legend-item"]'), { opacity: { from: 0 }, translateY: { from: 6 }, duration: 600, ease: "outQuad", delay: stagger(80) }, 350)
    add(all('[data-slot="investment-performance-chart-grid-row"]'), { scaleX: { from: 0 }, duration: 900, ease: "outExpo", delay: stagger(50, { from: "last" }) }, 150)
    add(all('[data-slot="investment-performance-chart-grid-column"]'), { y2: { from: 0 }, duration: 800, ease: "outQuad", delay: stagger(35) }, 200)
    add(all('[data-slot="investment-performance-chart-axis"]'), { opacity: { from: 0 }, duration: 600, ease: "outQuad" }, 250)
    add(all('[data-slot="chart-tick-label"]'), { opacity: { from: 0 }, translateX: { from: -4 }, duration: 600, ease: "outQuad", delay: stagger(45, { from: "last" }) }, 250)
    add(all('[data-slot="investment-performance-chart-month"] > span'), { opacity: { from: 0 }, translateY: { from: 4 }, duration: 600, ease: "outQuad", delay: stagger(40) }, 300)
    // the lines are in the DOM back to front: the first series draws first
    paths.forEach((path, i) => {
      timeline.add(svg.createDrawable(path as unknown as SVGPathElement), { draw: ["0 0", "0 1"], duration: DRAW_DURATION, ease: "inOutSine" }, DRAW_AT + i * DRAW_STAGGER)
    })
    // the cursor waits for the last line to reach it
    const reached = Math.max(DRAW_AT, ...latest.current.lines.map((line, i) => DRAW_AT + i * DRAW_STAGGER + reachAt(line, latest.current.cursorX) * DRAW_DURATION))
    if (cursor) {
      timeline
        .add(cursor.querySelectorAll('[data-cap="start"]'), { scale: { from: 0 }, duration: 400, ease: "outBack(2.2)" }, reached - 450)
        .add(cursor.querySelectorAll("line"), { y2: { from: CAP - 0.5 }, duration: 600, ease: "outQuad" }, reached - 400)
        .add(cursor.querySelectorAll('[data-cap="end"]'), { scale: { from: 0 }, duration: 400, ease: "outBack(2.2)" }, reached + 100)
    }
    if (tipRef.current) timeline.add(tipRef.current, { opacity: { from: 0 }, translateY: { from: 6 }, scale: { from: 0.94 }, duration: 500, ease: "outBack(1.6)" }, reached + 120)
    return () => {
      // createDrawable leaves its dash attributes (revert sets them to "hidden"): give the plain lines back
      for (const path of paths) for (const attribute of ["pathLength", "stroke-dasharray", "stroke-dashoffset"]) path.removeAttribute(attribute)
      if (totalEl) totalEl.textContent = money(latest.current.total)
      if (changeEl) changeEl.textContent = percent(latest.current.change)
    }
  })

  // New data, or a line turned on or off that rescales the axis, morphs the lines from what is on screen (each pair
  // resampled on the same x positions when their points differ). A resize redraws at once.
  const drawnLines = React.useRef(lines)
  const morph = React.useRef<JSAnimation | null>(null)
  const lastGeometry = React.useRef({ key: geometryKey, width })
  useIsomorphicLayoutEffect(() => {
    const before = lastGeometry.current
    lastGeometry.current = { key: geometryKey, width }
    const target = lines
    if (before.key === geometryKey) return
    morph.current?.cancel()
    const paths = all('[data-slot="investment-performance-chart-line"]')
    const paint = (frame: Point[][]) => {
      drawnLines.current = frame
      for (const path of paths) {
        const line = frame[Number(path.dataset.index)]
        if (line) path.setAttribute("d", smoothPath(line))
      }
    }
    if (reduced || before.width !== width) {
      paint(target)
      return
    }
    const pairs = target.map((line, i) => {
      const from = drawnLines.current[i]
      if (!from?.length || !line.length) return null
      if (from.length === line.length && from.every((p, k) => Math.abs(p.x - line[k].x) < 1e-6)) return { xs: line.map((p) => p.x), from: from.map((p) => p.y), to: line.map((p) => p.y) }
      return alignPolylines(from, line)
    })
    const state = { t: 0 }
    const frame = () => paint(target.map((line, i) => {
      const pair = pairs[i]
      return pair ? pair.xs.map((x, k) => ({ x, y: pair.from[k] + (pair.to[k] - pair.from[k]) * state.t })) : line
    }))
    frame()
    morph.current = animate(state, { t: 1, duration: MORPH, ease: "outExpo", onUpdate: frame, onComplete: () => paint(target) })
  }, [geometryKey, width, reduced])

  // New ticks fade their labels in again (each also counts to its new value).
  const lastTicks = React.useRef(ticksKey)
  useIsomorphicLayoutEffect(() => {
    const before = lastTicks.current
    lastTicks.current = ticksKey
    const labels = all('[data-slot="chart-tick-label"]')
    if (before === ticksKey || reduced || !labels.length) return
    animate(labels, { opacity: [0.3, 1], duration: 500, delay: stagger(35), ease: "outQuad", onComplete: releaseStyles("opacity") })
  }, [ticksKey, reduced])

  // A new day sends the cursor and the markers riding along the lines to it (the markers follow the lines, not a
  // straight path) and slides the tooltip over; when the tooltip changes sides it pops in again. Markers that come in
  // pop.
  const drawnX = React.useRef(pointX)
  const ride = React.useRef<JSAnimation | null>(null)
  const lastRide = React.useRef({ pointX, tipLeft, flipped, scrubbing, key: geometryKey })
  useIsomorphicLayoutEffect(() => {
    const before = lastRide.current
    lastRide.current = { pointX, tipLeft, flipped, scrubbing, key: geometryKey }
    const cursor = cursorRef.current
    const tip = tipRef.current
    const markers = all('[data-slot="investment-performance-chart-marker"]')
    const settle = () => {
      drawnX.current = pointX
      cursor?.style.removeProperty("transform")
      for (const marker of markers) marker.style.removeProperty("transform")
    }
    const dots = markers.map((marker) => marker.firstElementChild).filter((el): el is Element => !!el)
    if (scrubbing && !before.scrubbing && !reduced && dots.length) animate(dots, { scale: [0.4, 1], duration: 350, ease: "outBack(2)", onComplete: releaseStyles("transform") })
    if (reduced || before.key !== geometryKey) {
      ride.current?.cancel()
      settle()
      return
    }
    if (tip && (before.tipLeft !== tipLeft || before.flipped !== flipped)) {
      if (before.flipped !== flipped) animate(tip, { opacity: [0, 1], scale: [0.94, 1], duration: 300, ease: "outQuad", onComplete: releaseStyles("opacity", "transform") })
      else
        animate(tip, {
          translateX: [before.tipLeft - tipLeft + utils.get(tip, "translateX", false), 0],
          duration: RIDE,
          ease: "outExpo",
          onComplete: releaseStyles("transform"),
        })
    }
    const from = drawnX.current
    if (from === pointX) return
    const state = { x: from }
    const paint = () => {
      drawnX.current = state.x
      const dx = state.x - pointX
      if (cursor) cursor.style.transform = `translateX(${dx}px)`
      for (const marker of markers) {
        const line = latest.current.lines[Number(marker.dataset.index)] ?? []
        marker.style.transform = `translate(${dx}px, ${valueAt(line, state.x) - valueAt(line, pointX)}px)`
      }
    }
    ride.current?.cancel()
    paint()
    ride.current = animate(state, { x: pointX, duration: RIDE, ease: "outExpo", onUpdate: paint, onComplete: settle })
  }, [pointX, tipLeft, flipped, scrubbing, geometryKey, reduced])
  React.useEffect(
    () => () => {
      morph.current?.cancel()
      ride.current?.cancel()
    },
    [],
  )

  const toggle = (key: string) => setHidden(hidden.includes(key) ? hidden.filter((other) => other !== key) : [...hidden, key])
  const select = (next: number) => {
    if (n) setIndex(Math.min(Math.max(next, 0), n - 1))
  }
  // Pointer positions in the plot's own pixels (the live demo may scale the card with CSS zoom).
  const indexAt = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.currentTarget
    const box = target.getBoundingClientRect()
    const zoom = box.width / (target.offsetWidth || box.width || 1) || 1
    return nearest(xs, (event.clientX - box.left) / zoom)
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!n) return
    if (event.key === "Escape") {
      setHovered(null)
      return
    }
    // Page Up / Page Down move a month's worth of days
    const page = Math.max(1, Math.round((n - 1) / Math.max(1, months.length - 1)))
    const next = { ArrowRight: selected + 1, ArrowUp: selected + 1, ArrowLeft: selected - 1, ArrowDown: selected - 1, PageUp: selected + page, PageDown: selected - page, Home: 0, End: n - 1 }[event.key]
    if (next === undefined) return
    event.preventDefault()
    setHovered(null)
    // keys show the markers even when the plot was focused by a click
    setFocused(true)
    select(next)
  }

  const selectedPoint = data[selected]
  const valueText = selectedPoint
    ? `${dateText(selectedPoint.date, "tooltip")}: ${shownSeries
        .flatMap((s) => {
          const value = valueOf(selectedPoint, s.key)
          return value === undefined ? [] : [`${s.label} ${money(value)}`]
        })
        .join(", ")}`
    : undefined
  // a legend item brings its line forward (a line that is turned off brings nothing)
  const faded = (key: string) => emphasis !== null && emphasis !== key && !hidden.includes(emphasis)

  return (
    <ChartCard ref={root} role="group" aria-label={title} className={cn("w-full gap-7", className)} {...props}>
      {/* Figma lays the header out space-between with an 80px gap: a 16px minimum gap is the same at its width */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* Figma "Icon Container" (Keitoto's 28px tile drawn at 32px): purple-500, round, a white sheen from the top, an
              inner shadow along the bottom, a 1.14px purple-400 → purple-500 inside stroke and two drop shadows */}
          <span
            data-slot="investment-performance-chart-icon"
            className={cn(
              "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-purple-500 text-fg-white [&_svg]:size-4",
              // Figma paints later effects on top; CSS paints the first shadow on top
              "shadow-[0_4.571px_4.571px_-3.429px_rgb(0_0_0/0.16),0_2.286px_4.571px_rgb(1_1_1/0.08)]",
            )}
          >
            <span aria-hidden className="absolute inset-x-0 -top-[11.428px] h-[25.143px] bg-linear-to-b from-white/60 to-white/0" />
            <span className="relative flex">{icon}</span>
            {/* Figma paints the frame's inner shadow and stroke over its children */}
            <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_-2.286px_3.429px_rgb(0_0_0/0.08)]" />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[inherit] border-[1.143px] border-transparent [background:linear-gradient(var(--primary-purple-400),var(--primary-purple-500))_border-box] [mask:linear-gradient(#000_0_0)_padding-box_exclude,linear-gradient(#000_0_0)]"
            />
          </span>
          {/* the padding keeps the descenders out of truncate's clip (the text styles have a line height of 1) */}
          <p className="typo-heading-01-semibold -my-0.5 min-w-0 truncate py-0.5 text-fg-loud">{title}</p>
        </div>
        <ChartButton corner="rounded" size="icon" aria-label="More options" onClick={onMoreClick} className={RING}>
          <DotsHorizontalIcon />
        </ChartButton>
      </div>

      {/* the legend wraps under the total when the card is too narrow for both */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-[1_0_auto] flex-col items-start gap-3">
          <p className="typo-label-02-medium -my-0.5 max-w-full truncate py-0.5 text-fg-soft">{totalLabel}</p>
          <p ref={totalRef} data-slot="investment-performance-chart-total" className="typo-heading-04-semibold hug-w whitespace-nowrap text-fg-loud">
            {money(total)}
          </p>
          <div className="flex max-w-full items-center gap-2">
            <ChartChangeBadge value={change} format={percent} valueRef={changeRef} />
            {changeLabel && <span className="typo-label-02-medium -my-0.5 min-w-0 truncate py-0.5 text-fg-soft">{changeLabel}</span>}
          </div>
        </div>

        {series.length > 0 && (
          <div role="group" aria-label="Portfolios" className="ml-auto flex flex-wrap items-center justify-end gap-x-3 gap-y-2 py-1">
            {series.map((s, k) => {
              const off = hidden.includes(s.key)
              return (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={!off}
                  data-slot="investment-performance-chart-legend-item"
                  onClick={() => toggle(s.key)}
                  onPointerEnter={() => setEmphasis(s.key)}
                  onPointerLeave={() => setEmphasis(null)}
                  onFocus={(event) => {
                    if (event.currentTarget.matches(":focus-visible")) setEmphasis(s.key)
                  }}
                  onBlur={() => setEmphasis(null)}
                  className={cn("relative cursor-pointer rounded-md outline-none before:absolute before:-inset-x-1.5 before:-inset-y-2 focus-visible:ring-2", RING)}
                >
                  <span data-off={off || undefined} className="flex items-center gap-1.5 transition-opacity duration-200 data-off:opacity-40">
                    <Dot color={colorOf(s, k)} />
                    <span className="typo-label-02-medium hug-w whitespace-nowrap text-fg-normal">{s.label}</span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-start gap-3">
        {/* Figma "Y Axis Labels": 35px wide (wider labels widen it), spread over the plot's height, left-aligned */}
        <div aria-hidden className="hug-w flex min-w-[35px] shrink-0 flex-col justify-between" style={{ height: PLOT_HEIGHT }}>
          {[...ticks].reverse().map((tick, i) => (
            <ChartTickLabel key={i} value={tick} format={axisMoney} duration={MORPH} />
          ))}
        </div>

        {/* the 8px tick marks run in the padding left of the plot and in the margin under it */}
        <div className="flex min-w-0 flex-1 flex-col gap-4 pl-2">
          <div ref={plotRef} data-slot="investment-performance-chart-plot" className="relative mb-2" style={{ height: PLOT_HEIGHT }}>
            <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
              {/* Figma "Grid Line": 1px Border/Soft over [y - 1, y] at each tick and over [x, x + 1] at each month */}
              {ticks.map((tick, i) => (
                <line
                  key={i}
                  data-slot="investment-performance-chart-grid-row"
                  x1={0}
                  x2={width}
                  y1={round(level(tick))}
                  y2={round(level(tick))}
                  className="origin-left stroke-border-soft [transform-box:fill-box]"
                />
              ))}
              {months.map((month) => (
                <line
                  key={month.time}
                  data-slot="investment-performance-chart-grid-column"
                  x1={round(month.x + 0.5)}
                  x2={round(month.x + 0.5)}
                  y1={0}
                  y2={PLOT_HEIGHT}
                  className="stroke-border-soft"
                />
              ))}
              {/* the axes' tick marks, Icon/Normal */}
              <g data-slot="investment-performance-chart-axis" className="stroke-icon-normal">
                {ticks.map((tick, i) => (
                  <line key={i} x1={-TICK} x2={0} y1={round(level(tick))} y2={round(level(tick))} />
                ))}
                {months.map((month) => (
                  <line key={month.time} x1={round(month.x + 0.5)} x2={round(month.x + 0.5)} y1={PLOT_HEIGHT} y2={PLOT_HEIGHT + TICK} />
                ))}
              </g>
              {series.map((s, k) => (
                <path
                  key={s.key}
                  data-slot="investment-performance-chart-line"
                  data-index={k}
                  d={smoothPath(lines[k])}
                  fill="none"
                  strokeWidth={LINE}
                  className={cn(
                    colors[colorOf(s, k)].line,
                    "transition-opacity duration-300 motion-reduce:transition-none",
                    hidden.includes(s.key) ? "opacity-0" : faded(s.key) && "opacity-25",
                  )}
                />
              ))}
              {point && (
                // Figma's cursor: a 1px #171717 line dashed 4/4 between two filled triangle caps
                <g ref={cursorRef} data-slot="investment-performance-chart-cursor" className="fill-fg-loud">
                  <line x1={cursorX} x2={cursorX} y1={CAP - 0.5} y2={PLOT_HEIGHT - CAP + 0.5} className="stroke-fg-loud" {...CURSOR_DASH} />
                  <polygon
                    data-cap="start"
                    points={`${round(cursorX - CAP_HALF)},0 ${round(cursorX + CAP_HALF)},0 ${cursorX + 0.5},${CAP} ${cursorX - 0.5},${CAP}`}
                    className="origin-top [transform-box:fill-box]"
                  />
                  <polygon
                    data-cap="end"
                    points={`${round(cursorX - CAP_HALF)},${PLOT_HEIGHT} ${round(cursorX + CAP_HALF)},${PLOT_HEIGHT} ${cursorX + 0.5},${PLOT_HEIGHT - CAP} ${cursorX - 0.5},${PLOT_HEIGHT - CAP}`}
                    className="origin-bottom [transform-box:fill-box]"
                  />
                </g>
              )}
            </svg>

            {point && (
              <div aria-hidden className={cn("pointer-events-none absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none", !scrubbing && "opacity-0")}>
                {readings.map((reading) => (
                  <span
                    key={reading.key}
                    data-slot="investment-performance-chart-marker"
                    data-index={reading.index}
                    className="absolute flex"
                    style={{ left: round(pointX - MARKER / 2), top: round(reading.y - MARKER / 2), width: MARKER, height: MARKER }}
                  >
                    <ChartMarker className={cn(colors[reading.color].marker, "transition-opacity duration-300", faded(reading.key) && "opacity-25")} />
                  </span>
                ))}
              </div>
            )}

            <div
              role="slider"
              tabIndex={n ? 0 : -1}
              aria-label={`${title} by day`}
              aria-orientation="horizontal"
              aria-valuemin={0}
              aria-valuemax={Math.max(0, n - 1)}
              aria-valuenow={Math.max(0, selected)}
              aria-valuetext={valueText}
              data-slot="investment-performance-chart-scrubber"
              onPointerMove={(event) => setHovered(indexAt(event))}
              onPointerLeave={() => setHovered(null)}
              onPointerUp={(event) => {
                if (event.button === 0) select(indexAt(event))
              }}
              onFocus={(event) => setFocused(event.currentTarget.matches(":focus-visible"))}
              onBlur={() => setFocused(false)}
              onKeyDown={onKeyDown}
              className={cn("absolute inset-0 cursor-pointer touch-pan-y rounded-lg outline-none focus-visible:ring-2", RING)}
            />

            {point && (
              <div
                ref={tipRef}
                aria-hidden
                data-slot="investment-performance-chart-tooltip"
                className={cn(
                  "pointer-events-none absolute z-10 flex flex-col gap-0.5 overflow-hidden rounded-[10px] bg-surface-loud whitespace-nowrap",
                  // Figma paints later effects on top; CSS paints the first shadow on top
                  "shadow-[0_4px_4px_rgb(0_0_0/0.25),0_0_0_1px_#121212,0_2px_4px_rgb(0_0_0/0.06),0_4px_16px_rgb(0_0_0/0.08)]",
                )}
                style={{ left: tipLeft, top: TIP_TOP }}
              >
                <TooltipContent date={dateText(point.date, "tooltip")} rows={rows} format={money} counting />
                {/* Figma's 1px Border/normal inside stroke, drawn over the content */}
                <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_var(--border-normal)]" />
              </div>
            )}
            {/* the same content with its final text, measured to place the tooltip (the visible amounts change width while they count) */}
            {point && (
              <span ref={sizerRef} aria-hidden className="pointer-events-none invisible absolute top-0 left-0 flex flex-col gap-0.5 whitespace-nowrap">
                <TooltipContent date={dateText(point.date, "tooltip")} rows={rows} format={money} />
              </span>
            )}
          </div>

          {/* Figma lays the months out in uneven columns; each is centred under its line here (see FIGMA-GAPS.md) */}
          <div aria-hidden className="relative h-3.5">
            {months.map((month, k) =>
              named[k] ? (
                <span
                  key={month.time}
                  data-slot="investment-performance-chart-month"
                  className="absolute top-0"
                  // centred on the line, or flush with the plot's right edge when centring would run past it
                  style={{ left: round(month.x + 0.5), translate: `min(-50%, calc(${round(width - month.x - 0.5)}px - 100%))` }}
                >
                  <span className="typo-label-02-regular block whitespace-nowrap text-fg-soft">{dateText(isoDay(month.time), "axis")}</span>
                </span>
              ) : null,
            )}
            {/* every label, one per line, measured for the widest */}
            <span ref={labelsRef} className="pointer-events-none invisible absolute top-0 left-0 flex flex-col">
              {months.map((month) => (
                <span key={month.time} className="typo-label-02-regular whitespace-nowrap">
                  {dateText(isoDay(month.time), "axis")}
                </span>
              ))}
            </span>
          </div>
        </div>
      </div>
    </ChartCard>
  )
}

export {
  InvestmentPerformanceChart,
  sampleInvestmentPerformanceData,
  sampleInvestmentPerformanceSeries,
  type InvestmentPerformanceChartProps,
  type InvestmentPerformanceColor,
  type InvestmentPerformancePoint,
  type InvestmentPerformanceSeries,
}
