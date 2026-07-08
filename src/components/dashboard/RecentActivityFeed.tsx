import { formatDateTime } from "@/lib/utils"
import type { ActivityLog } from "@/types"
import { Activity } from "lucide-react"

const ACTION_LABELS: Record<string, string> = {
  create: "أنشأ",
  update: "عدّل",
  delete: "حذف",
}

const ENTITY_LABELS: Record<string, string> = {
  projects: "مشروعاً",
  contracts: "عقداً",
  payments: "دفعة",
  stages: "مرحلة",
  files: "ملفاً",
  comments: "ملاحظة",
}

interface Props {
  logs: ActivityLog[]
}

export function RecentActivityFeed({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-text-muted text-sm">
        لا توجد أنشطة حديثة
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-text-primary">
              <span className="font-medium">
                {log.user?.full_name || "المنظومة"}
              </span>{" "}
              {ACTION_LABELS[log.action] || log.action}{" "}
              {ENTITY_LABELS[log.entity_type] || log.entity_type}
              {log.project?.name && (
                <span className="text-text-muted"> في مشروع {log.project.name}</span>
              )}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {formatDateTime(log.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
