"use client"

import { useState } from "react"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  PROJECT_STATUS_MAP,
  STAGE_STATUS_MAP,
  STAGE_CONFIG,
  type ActivityLog,
  type ProjectStatus,
  type StageStatus,
  type StageType,
} from "@/types"

const IGNORED_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "created_by",
  "project_id",
  "stage_id",
  "uploaded_by",
  "sent_by",
  "read_by",
  "parent_id",
  "user_id",
  "message_type",
  "file_url",
  "file_size",
  "file_type",
])

const FIELD_LABELS: Record<string, string> = {
  name: "اسم المشروع",
  status: "الحالة",
  address: "العنوان",
  description: "الوصف",
  notes: "ملاحظات",
  total_contract_value: "قيمة العقد",
  contract_date: "تاريخ العقد",
  contract_signed: "توقيع العقد",
  assigned_engineer_id: "المهندس المسؤول",
  owner_name: "اسم المالك",
  owner_phone: "جوال المالك",
  owner_id_number: "رقم هوية المالك",
  progress_percentage: "نسبة الإنجاز",
  stage_type: "نوع المرحلة",
  start_date: "تاريخ البداية",
  end_date: "تاريخ الانتهاء المتوقع",
  completion_date: "تاريخ الإكمال",
  amount: "المبلغ",
  payment_date: "تاريخ الدفعة",
  content: "المحتوى",
  file_name: "اسم الملف",
  terms: "شروط العقد",
  total_value: "قيمة العقد",
  signed_at: "تاريخ التوقيع",
  is_active: "نشط",
  job_title: "المسمى الوظيفي",
  phone: "الجوال",
  role: "الصلاحية",
  full_name: "الاسم",
  title: "العنوان",
  due_date: "تاريخ الاستحقاق",
  project_number: "رقم المشروع",
}

function formatValue(entityType: string, field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"

  if (field === "status") {
    if (entityType === "projects")
      return PROJECT_STATUS_MAP[value as ProjectStatus]?.label ?? String(value)
    if (entityType === "stages")
      return STAGE_STATUS_MAP[value as StageStatus]?.label ?? String(value)
  }
  if (field === "stage_type") return STAGE_CONFIG[value as StageType]?.label ?? String(value)
  if (typeof value === "boolean") return value ? "نعم" : "لا"
  if (field === "total_contract_value" || field === "total_value" || field === "amount") {
    return formatCurrency(Number(value))
  }
  if (field.endsWith("_date") || field === "signed_at") {
    const d = String(value)
    return /^\d{4}-\d{2}-\d{2}/.test(d) ? formatDate(d) : d
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

interface FieldChange {
  field: string
  oldValue: unknown
  newValue: unknown
}

function getChanges(log: ActivityLog): FieldChange[] {
  const meta = log.metadata as {
    old?: Record<string, unknown> | null
    new?: Record<string, unknown>
  } | null

  if (log.action === "delete") {
    const row = (log.metadata as Record<string, unknown>) || {}
    return Object.keys(row)
      .filter((f) => !IGNORED_FIELDS.has(f))
      .map((f) => ({ field: f, oldValue: row[f], newValue: undefined }))
  }

  if (!meta?.new) return []
  const newRow = meta.new
  const oldRow = meta.old || {}

  return Object.keys(newRow)
    .filter((f) => !IGNORED_FIELDS.has(f))
    .filter(
      (f) =>
        log.action === "create" ||
        JSON.stringify(oldRow[f]) !== JSON.stringify(newRow[f])
    )
    .map((f) => ({ field: f, oldValue: oldRow[f], newValue: newRow[f] }))
}

export function ActivityLogDetails({ log, title }: { log: ActivityLog; title?: string }) {
  const [open, setOpen] = useState(false)
  const changes = getChanges(log)

  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 text-text-muted hover:text-primary"
        onClick={() => setOpen(true)}
        title="عرض التفاصيل"
      >
        <Eye className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title || log.description}</DialogTitle>
          </DialogHeader>

          {changes.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">
              لا توجد تفاصيل إضافية لهذا الإجراء
            </p>
          ) : (
            <div className="divide-y divide-border">
              {changes.map(({ field, oldValue, newValue }) => (
                <div key={field} className="py-2.5 flex items-start justify-between gap-3">
                  <span className="text-xs font-medium text-text-secondary flex-shrink-0 pt-0.5">
                    {FIELD_LABELS[field] || field}
                  </span>
                  <div className="text-xs text-left flex-1 min-w-0">
                    {log.action === "update" ? (
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        <span className="text-text-muted line-through">
                          {formatValue(log.entity_type, field, oldValue)}
                        </span>
                        <span className="text-text-muted">←</span>
                        <span className="text-text-primary font-medium">
                          {formatValue(log.entity_type, field, newValue)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-text-primary font-medium">
                        {formatValue(log.entity_type, field, oldValue ?? newValue)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
