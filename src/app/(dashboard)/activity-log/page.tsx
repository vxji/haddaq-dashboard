"use client"

import { useEffect, useState } from "react"
import { Activity, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { formatDateTime } from "@/lib/utils"
import { ActivityLogDetails } from "@/components/activity/ActivityLogDetails"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { ActivityLog } from "@/types"

const ACTION_LABELS: Record<string, string> = {
  create: "أنشأ",
  update: "عدّل",
  delete: "حذف",
}

const ENTITY_LABELS: Record<string, string> = {
  projects: "مشروع",
  contracts: "عقد",
  payments: "دفعة مالية",
  stages: "مرحلة",
  files: "ملف",
  comments: "ملاحظة",
}

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState("")
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      let query = supabase
        .from("activity_logs")
        .select(
          "*, user:profiles!activity_logs_user_id_fkey(full_name), project:projects!activity_logs_project_id_fkey(id, name, project_number)"
        )
        .order("created_at", { ascending: false })
        .limit(200)

      if (dateFilter) {
        query = query
          .gte("created_at", `${dateFilter}T00:00:00`)
          .lte("created_at", `${dateFilter}T23:59:59.999`)
      }

      const { data } = await query
      setLogs((data as ActivityLog[]) ?? [])
      setLoading(false)
    }
    load()
  }, [dateFilter, supabase])

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">سجل النشاط</h1>
          <p className="text-text-muted text-sm mt-0.5">
            سجل شامل لجميع العمليات في النظام — للقراءة فقط
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            dir="ltr"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-auto h-9 text-sm"
          />
          {dateFilter && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5"
              onClick={() => setDateFilter("")}
            >
              <X className="h-4 w-4" />
              مسح الفلتر
            </Button>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center">
            <Activity className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-text-muted text-sm">
              {dateFilter ? "لا توجد أنشطة في هذا التاريخ" : "لا توجد أنشطة مسجّلة بعد"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-subtle border-b border-border">
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">التاريخ والوقت</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">المستخدم</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">الإجراء</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">النوع</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">المشروع</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary whitespace-nowrap">
                      {log.user?.full_name || "النظام"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ACTION_COLORS[log.action] || "bg-surface-subtle text-text-secondary"
                        }`}
                      >
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {ENTITY_LABELS[log.entity_type] || log.entity_type}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.project ? (
                        <span className="text-primary font-medium">
                          {log.project.project_number} — {log.project.name}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ActivityLogDetails
                        log={log}
                        title={`${ACTION_LABELS[log.action] || log.action} ${ENTITY_LABELS[log.entity_type] || log.entity_type}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
