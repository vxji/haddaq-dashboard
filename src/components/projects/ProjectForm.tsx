"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { projectSchema, type ProjectFormData } from "@/lib/validations/project.schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import type { Project, Profile } from "@/types"

interface Props {
  project?: Project
  isAdmin?: boolean
  onSuccess: (project: Project) => void
  onCancel: () => void
}

const STATUS_OPTIONS = [
  { value: "pending", label: "قيد الانتظار" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "completed", label: "منتهي" },
  { value: "cancelled", label: "ملغي" },
  { value: "suspended", label: "موقوف" },
]

export function ProjectForm({ project, isAdmin = false, onSuccess, onCancel }: Props) {
  const [loading, setLoading] = useState(false)
  const [engineers, setEngineers] = useState<Profile[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: project
      ? {
          name: project.name,
          owner_name: project.owner_name,
          owner_id_number: project.owner_id_number,
          owner_phone: project.owner_phone,
          address: project.address,
          description: project.description || "",
          contract_date: project.contract_date || "",
          contract_signed: project.contract_signed,
          total_contract_value: project.total_contract_value,
          status: project.status,
          assigned_engineer_id: project.assigned_engineer_id,
        }
      : {
          status: "pending",
          contract_signed: false,
          total_contract_value: 0,
        },
  })

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("profiles")
      .select("id, full_name, job_title")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setEngineers(data as Profile[])
      })
  }, [])

  async function onSubmit(data: ProjectFormData) {
    setLoading(true)
    const supabase = createClient()

    const payload = {
      ...data,
      project_number: project?.project_number || "",
      contract_date: data.contract_date || null,
      assigned_engineer_id: data.assigned_engineer_id || null,
    }

    let result
    if (project) {
      const { data: updated, error } = await supabase
        .from("projects")
        .update(payload)
        .eq("id", project.id)
        .select()
        .single()
      if (error) { console.error(error.message); setLoading(false); return }
      result = updated

      const {
        data: { user: editor },
      } = await supabase.auth.getUser()
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          title: "تعديل مشروع",
          body: `تم تعديل بيانات مشروع: ${data.name}`,
          excludeUserId: editor?.id,
        }),
      }).catch(() => {})
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: created, error } = await supabase
        .from("projects")
        .insert({ ...payload, created_by: user.id })
        .select()
        .single()
      if (error) { console.error(error.message); setLoading(false); return }
      result = created
    }

    onSuccess(result as Project)
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Section: Project Info */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">
          معلومات المشروع
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="name">اسم المشروع *</Label>
            <Input id="name" {...register("name")} placeholder="مشروع بناء..." />
            {errors.name && (
              <p className="text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="status">حالة المشروع *</Label>
            <Select
              defaultValue={project?.status || "pending"}
              onValueChange={(v) => setValue("status", v as ProjectFormData["status"])}
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assigned_engineer_id">المهندس المسؤول</Label>
            {isAdmin ? (
              <Select
                defaultValue={project?.assigned_engineer_id || ""}
                onValueChange={(v) => setValue("assigned_engineer_id", v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر مهندساً" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-- بدون تعيين --</SelectItem>
                  {engineers.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.full_name}
                      {e.job_title && (
                        <span className="text-text-muted text-xs"> — {e.job_title}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted text-sm text-text-muted">
                {engineers.find((e) => e.id === project?.assigned_engineer_id)?.full_name ||
                  "-- بدون تعيين --"}
                <span className="text-xs ms-auto">(للمدير فقط)</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="address">العنوان *</Label>
            <Input id="address" {...register("address")} placeholder="المدينة، الحي..." />
            {errors.address && (
              <p className="text-xs text-danger">{errors.address.message}</p>
            )}
          </div>

          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="description">وصف المشروع</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="وصف مختصر للمشروع..."
              rows={3}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Section: Owner Info */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">
          بيانات المالك
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="owner_name">اسم المالك *</Label>
            <Input id="owner_name" {...register("owner_name")} placeholder="اسم المالك كاملاً" />
            {errors.owner_name && (
              <p className="text-xs text-danger">{errors.owner_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="owner_id_number">رقم الهوية *</Label>
            <Input
              id="owner_id_number"
              {...register("owner_id_number")}
              placeholder="1234567890"
              dir="ltr"
              maxLength={10}
            />
            {errors.owner_id_number && (
              <p className="text-xs text-danger">{errors.owner_id_number.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="owner_phone">رقم الجوال *</Label>
            <Input
              id="owner_phone"
              {...register("owner_phone")}
              placeholder="0501234567"
              dir="ltr"
            />
            {errors.owner_phone && (
              <p className="text-xs text-danger">{errors.owner_phone.message}</p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Section: Contract */}
      <div>
        <h3 className="text-sm font-semibold text-text-secondary mb-3">
          بيانات العقد
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contract_date">تاريخ العقد</Label>
            <Input
              id="contract_date"
              type="date"
              {...register("contract_date")}
              dir="ltr"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="total_contract_value">قيمة العقد الإجمالية (ريال) *</Label>
            <Input
              id="total_contract_value"
              type="number"
              step="0.01"
              min="0"
              {...register("total_contract_value", { valueAsNumber: true })}
              placeholder="0.00"
              dir="ltr"
            />
            {errors.total_contract_value && (
              <p className="text-xs text-danger">{errors.total_contract_value.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("contract_signed")}
                className="w-4 h-4 accent-primary"
              />
              <span>العقد موقّع</span>
            </Label>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          className="bg-primary hover:bg-primary-dark"
          disabled={loading}
        >
          {loading ? "جاري الحفظ..." : project ? "حفظ التعديلات" : "إضافة المشروع"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  )
}
