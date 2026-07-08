"use client"

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { PROJECT_STATUS_MAP, type ProjectStatus } from "@/types"

interface Props {
  data: Record<ProjectStatus, number>
}

export function ProjectsStatusChart({ data }: Props) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({
      name: PROJECT_STATUS_MAP[status as ProjectStatus].label,
      value: count,
      color: PROJECT_STATUS_MAP[status as ProjectStatus].color,
    }))

  if (chartData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-text-muted text-sm">
        لا توجد مشاريع بعد
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [value, name]}
          contentStyle={{
            fontFamily: "Tajawal, Arial, sans-serif",
            fontSize: 13,
            borderRadius: 8,
          }}
        />
        <Legend
          formatter={(value) => value}
          iconType="circle"
          iconSize={10}
          wrapperStyle={{ fontFamily: "Tajawal, Arial, sans-serif", fontSize: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
