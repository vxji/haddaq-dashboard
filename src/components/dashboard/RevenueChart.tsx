"use client"

import { useMemo, useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  type TooltipContentProps,
} from "recharts"
import { cn, formatCurrency } from "@/lib/utils"

interface MonthlyData {
  month: string
  total: number
  count: number
}

interface Props {
  data: MonthlyData[]
}

const FONT = "var(--font-arabic), Tajawal, Arial, sans-serif"

function ChartTooltip({ active, payload }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload as MonthlyData & { displayValue: number }
  return (
    <div
      className="rounded-lg bg-text-primary text-white px-3 py-2 shadow-modal"
      style={{ fontFamily: FONT }}
    >
      <p className="text-[11px] text-white/60 mb-0.5">{point.month}</p>
      <p className="text-sm font-semibold tabular-nums">
        {formatCurrency(point.displayValue)}
      </p>
    </div>
  )
}

export function RevenueChart({ data }: Props) {
  const [mode, setMode] = useState<"total" | "average">("total")

  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        displayValue: mode === "total" ? d.total : d.count > 0 ? d.total / d.count : 0,
      })),
    [data, mode]
  )

  const hasPayments = data.some((d) => d.total > 0)
  if (!hasPayments) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted text-sm">
        لا توجد مدفوعات بعد
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-1 bg-surface-muted rounded-lg p-1 w-fit mb-4">
        <button
          onClick={() => setMode("total")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            mode === "total"
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          الإجمالي
        </button>
        <button
          onClick={() => setMode("average")}
          className={cn(
            "px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            mode === "average"
              ? "bg-surface text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          )}
        >
          المتوسط
        </button>
      </div>

      <ResponsiveContainer width="100%" height={232}>
        <BarChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="month"
            tick={{ fontFamily: FONT, fontSize: 11, fill: "var(--color-text-muted)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
            tick={{ fontFamily: FONT, fontSize: 11, fill: "var(--color-text-muted)" }}
            tickLine={false}
            axisLine={false}
            orientation="right"
            width={40}
          />
          <Tooltip cursor={{ fill: "var(--color-surface-muted)" }} content={<ChartTooltip />} />
          <Bar dataKey="displayValue" radius={[6, 6, 6, 6]} maxBarSize={28}>
            {chartData.map((_, index) => (
              <Cell
                key={index}
                fill={index === chartData.length - 1 ? "var(--color-primary)" : "#dbe4fc"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
