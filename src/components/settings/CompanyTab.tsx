"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Image as ImageIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sanitizeStorageKey } from "@/lib/utils"
import {
  companySettingsSchema,
  type CompanySettingsFormData,
} from "@/lib/validations/companySettings.schema"
import type { CompanySettings } from "@/types"
import { toast } from "sonner"

export function CompanyTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const supabase = createClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanySettingsFormData>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: { office_name: "" },
  })

  useEffect(() => {
    supabase
      .from("company_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        const s = data as CompanySettings | null
        if (s) {
          reset({
            office_name: s.office_name || "",
            commercial_register: s.commercial_register || "",
            tax_number: s.tax_number || "",
            address: s.address || "",
            phone: s.phone || "",
            email: s.email || "",
            website: s.website || "",
          })
          setLogoUrl(s.logo_url)
        }
        setLoading(false)
      })
  }, [])

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function onSubmit(data: CompanySettingsFormData) {
    setSaving(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let newLogoUrl = logoUrl
    if (logoFile) {
      const path = `logo/${sanitizeStorageKey(logoFile.name)}`
      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(path, logoFile, { cacheControl: "3600" })

      if (uploadError) {
        console.error("Logo upload error:", uploadError.message)
        const friendly = uploadError.message.includes("row-level security")
          ? "فشل رفع الشعار: ليس لديك صلاحية كافية، أو لم يكتمل إعداد التخزين على قاعدة البيانات بعد."
          : "فشل رفع الشعار. حاول مرة أخرى."
        toast.error(friendly)
        setSaving(false)
        return
      }
      const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path)
      newLogoUrl = urlData.publicUrl
    }

    const { error } = await supabase
      .from("company_settings")
      .update({
        office_name: data.office_name,
        commercial_register: data.commercial_register || null,
        tax_number: data.tax_number || null,
        address: data.address || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        logo_url: newLogoUrl,
        updated_by: user?.id,
      })
      .eq("id", 1)

    if (error) {
      console.error("Company settings save error:", error.message)
      toast.error("فشل حفظ بيانات المنشأة")
    } else {
      toast.success("تم حفظ بيانات المنشأة")
      setLogoUrl(newLogoUrl)
      setLogoFile(null)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h2 className="text-lg font-bold text-text-primary">بيانات المنشأة</h2>
        <p className="text-text-muted text-sm mt-0.5">
          تظهر هذه البيانات في رأس التقارير والعقود المصدّرة مستقبلاً
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-surface rounded-xl border border-border shadow-card p-6 space-y-4"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border border-border bg-surface-subtle flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoPreview || logoUrl ? (
              <img
                src={logoPreview || logoUrl || ""}
                alt="شعار المكتب"
                className="w-full h-full object-contain"
              />
            ) : (
              <ImageIcon className="w-6 h-6 text-text-muted" />
            )}
          </div>
          <div className="space-y-1.5 flex-1">
            <Label>الشعار</Label>
            <Input type="file" accept="image/*" onChange={handleLogoChange} className="max-w-xs" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>اسم المكتب *</Label>
          <Input {...register("office_name")} placeholder="مكتب الحداق للاستشارات الهندسية" />
          {errors.office_name && <p className="text-xs text-danger">{errors.office_name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>السجل التجاري</Label>
            <Input {...register("commercial_register")} dir="ltr" placeholder="1010xxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>الرقم الضريبي</Label>
            <Input {...register("tax_number")} dir="ltr" placeholder="3xxxxxxxxxxxxxx" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>العنوان</Label>
          <Input {...register("address")} placeholder="المدينة، الحي، الشارع" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>رقم الجوال</Label>
            <Input {...register("phone")} dir="ltr" placeholder="0501234567" />
          </div>
          <div className="space-y-1.5">
            <Label>البريد الإلكتروني</Label>
            <Input {...register("email")} type="email" dir="ltr" placeholder="office@example.com" />
            {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>الموقع الإلكتروني (اختياري)</Label>
          <Input {...register("website")} dir="ltr" placeholder="https://example.com" />
          {errors.website && <p className="text-xs text-danger">{errors.website.message}</p>}
        </div>

        <Button type="submit" className="bg-primary hover:bg-primary-dark" disabled={saving}>
          {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
        </Button>
      </form>
    </div>
  )
}
