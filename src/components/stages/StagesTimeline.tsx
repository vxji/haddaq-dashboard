"use client"

import { useState } from "react"
import { Check, ChevronDown, ChevronUp, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FileUpload } from "@/components/shared/FileUpload"
import { StageStatusBadge } from "@/components/projects/StatusBadge"
import { STAGE_CONFIG, STAGE_STATUS_MAP, STAGE_ENGINEER_JOB_TITLE, canEditStage } from "@/types"
import type { Stage, StageType, StageStatus, Profile } from "@/types"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Props {
  stages: Stage[]
  projectId: string
  onUpdate: () => void
  profile: Profile | null
}

export function StagesTimeline({ stages, projectId, onUpdate, profile }: Props) {
  const [expanded, setExpanded] = useState<StageType | null>(null)
  const [saving, setSaving] = useState<StageType | null>(null)
  const [edits, setEdits] = useState<Partial<Record<StageType, Partial<Stage>>>>({})

  const orderedStages: StageType[] = [
    "architectural",
    "structural",
    "electrical",
    "mechanical",
    "approval_delivery",
  ]

  function getStage(type: StageType): Stage | undefined {
    return stages.find((s) => s.stage_type === type)
  }

  function updateEdit(type: StageType, field: keyof Stage, value: unknown) {
    setEdits((prev) => ({
      ...prev,
      [type]: { ...(prev[type] || {}), [field]: value },
    }))
  }

  async function saveStage(type: StageType) {
    const stage = getStage(type)
    if (!stage) return

    setSaving(type)
    const edit = edits[type] || {}

    const supabase = createClient()
    const { error } = await supabase
      .from("stages")
      .update({
        ...edit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", stage.id)

    if (error) {
      toast.error("فشل الحفظ")
    } else {
      toast.success("تم الحفظ")
      setEdits((prev) => ({ ...prev, [type]: {} }))
      onUpdate()
    }
    setSaving(null)
  }

  async function markCompleted(type: StageType) {
    const stage = getStage(type)
    if (!stage) return

    setSaving(type)
    const supabase = createClient()
    const { error } = await supabase
      .from("stages")
      .update({
        status: "completed",
        progress_percentage: 100,
        completion_date: new Date().toISOString().split("T")[0],
      })
      .eq("id", stage.id)

    if (error) {
      toast.error("فشل التحديث")
    } else {
      toast.success("تم وضع المرحلة كمكتملة")
      const config = STAGE_CONFIG[type]
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: "اكتملت مرحلة في مشروع",
          body: `تم إكمال ${config.label}`,
          excludeUserId: profile?.id,
        }),
      }).catch(() => {})
      onUpdate()
    }
    setSaving(null)
  }

  return (
    <div className="space-y-4">
      {orderedStages.map((type, index) => {
        const config = STAGE_CONFIG[type]
        const stage = getStage(type)
        const edit = edits[type] || {}
        const isExpanded = expanded === type
        const progress = stage
          ? (edit.progress_percentage ?? stage.progress_percentage)
          : 0
        const status = stage
          ? ((edit.status as StageStatus) ?? stage.status)
          : "not_started"
        const isCompleted = status === "completed"
        const canEdit = canEditStage(profile, type)

        return (
          <div
            key={type}
            className={cn(
              "bg-surface rounded-xl border-2 shadow-card overflow-hidden transition-all",
              isCompleted ? "border-green-200" : "border-border"
            )}
          >
            {/* Stage header */}
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-surface-muted/50 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : type)}
            >
              {/* Step indicator */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md"
                style={{ backgroundColor: config.color }}
              >
                {isCompleted ? <Check className="w-5 h-5" /> : index + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-text-primary">{config.label}</h3>
                  <StageStatusBadge status={status} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Progress
                      value={progress}
                      className="h-2"
                      style={
                        {
                          "--progress-foreground": config.color,
                        } as React.CSSProperties
                      }
                    />
                  </div>
                  <span className="text-xs text-text-muted font-medium min-w-[3rem] text-left">
                    {progress}%
                  </span>
                </div>
              </div>

              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-text-muted flex-shrink-0" />
              ) : (
                <ChevronDown className="w-5 h-5 text-text-muted flex-shrink-0" />
              )}
            </div>

            {/* Expanded content */}
            {isExpanded && stage && (
              <div className="border-t border-border p-4 space-y-4 bg-surface-muted/30">
                {!canEdit && (
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    هذه المرحلة للقراءة فقط — تعديلها يتطلب المسمى الوظيفي &quot;{STAGE_ENGINEER_JOB_TITLE[type]}&quot;
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Progress */}
                  <div className="space-y-1.5">
                    <Label>نسبة الإنجاز ({progress}%)</Label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={progress}
                      onChange={(e) =>
                        updateEdit(type, "progress_percentage", +e.target.value)
                      }
                      className="w-full accent-primary disabled:opacity-50"
                      disabled={!canEdit}
                    />
                  </div>

                  {/* Status */}
                  <div className="space-y-1.5">
                    <Label>الحالة</Label>
                    <select
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
                      value={status}
                      onChange={(e) =>
                        updateEdit(type, "status", e.target.value as StageStatus)
                      }
                      disabled={!canEdit}
                    >
                      <option value="not_started">لم يبدأ</option>
                      <option value="in_progress">قيد التنفيذ</option>
                      <option value="completed">مكتمل</option>
                    </select>
                  </div>

                  {/* Dates */}
                  <div className="space-y-1.5">
                    <Label>تاريخ البداية</Label>
                    <Input
                      type="date"
                      dir="ltr"
                      defaultValue={stage.start_date || ""}
                      onChange={(e) => updateEdit(type, "start_date", e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>تاريخ الانتهاء المتوقع</Label>
                    <Input
                      type="date"
                      dir="ltr"
                      defaultValue={stage.end_date || ""}
                      onChange={(e) => updateEdit(type, "end_date", e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>الوصف</Label>
                    <Textarea
                      rows={2}
                      defaultValue={stage.description || ""}
                      onChange={(e) =>
                        updateEdit(type, "description", e.target.value)
                      }
                      placeholder="وصف تفاصيل المرحلة..."
                      disabled={!canEdit}
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5 md:col-span-2">
                    <Label>ملاحظات</Label>
                    <Textarea
                      rows={2}
                      defaultValue={stage.notes || ""}
                      onChange={(e) => updateEdit(type, "notes", e.target.value)}
                      placeholder="ملاحظات إضافية..."
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                {/* File upload */}
                <div>
                  <Label className="mb-2 block">رفع ملفات للمرحلة</Label>
                  <FileUpload
                    projectId={projectId}
                    stageId={stage.id}
                    onUpload={() => toast.success("تم رفع الملف")}
                    disabled={!canEdit}
                  />
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => saveStage(type)}
                      className="bg-primary hover:bg-primary-dark"
                      disabled={saving === type}
                      size="sm"
                    >
                      {saving === type ? "جاري الحفظ..." : "حفظ التعديلات"}
                    </Button>
                    {!isCompleted && (
                      <Button
                        onClick={() => markCompleted(type)}
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-700 hover:bg-green-50 gap-2"
                        disabled={saving === type}
                      >
                        <Check className="w-4 h-4" />
                        وضع كمكتملة
                      </Button>
                    )}
                  </div>
                )}

                {/* Completion info */}
                {isCompleted && stage.completion_date && (
                  <p className="text-xs text-green-600">
                    ✓ اكتملت في {formatDate(stage.completion_date)}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
