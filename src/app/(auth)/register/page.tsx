"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, ArrowRight } from "lucide-react"
import { createUserSchema, type CreateUserFormData } from "@/lib/validations/user.schema"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { STAGE_ENGINEER_JOB_TITLE } from "@/types"

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Only admins can access this page
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      if (profile?.role !== "admin") {
        router.push("/")
        return
      }
      setChecking(false)
    })
  }, [router])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "employee", is_active: true },
  })

  async function onSubmit(data: CreateUserFormData) {
    setLoading(true)
    setError(null)

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      router.push("/settings?tab=users&created=1")
    } else {
      const err = await res.json()
      setError(err.message || "فشل إنشاء الحساب")
    }
    setLoading(false)
  }

  if (checking) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">إنشاء حساب جديد</h1>
          <p className="text-blue-200 text-sm">مكتب الحداق — للمدير فقط</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label>الاسم الكامل *</Label>
                <Input {...register("full_name")} placeholder="الاسم الكامل" />
                {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>البريد الإلكتروني *</Label>
                <Input {...register("email")} type="email" dir="ltr" placeholder="email@example.com" />
                {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>كلمة المرور *</Label>
                <Input {...register("password")} type="password" placeholder="8 أحرف على الأقل" />
                {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>الجوال</Label>
                  <Input {...register("phone")} dir="ltr" placeholder="0501234567" />
                </div>
                <div className="space-y-1.5">
                  <Label>المسمى الوظيفي</Label>
                  <Select
                    onValueChange={(v) => setValue("job_title", v === "none" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر مسمى وظيفياً" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- بدون تخصص --</SelectItem>
                      {Object.values(STAGE_ENGINEER_JOB_TITLE).map((title) => (
                        <SelectItem key={title} value={title}>
                          {title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark"
                disabled={loading}
              >
                {loading ? "جاري الإنشاء..." : "إنشاء الحساب"}
              </Button>

              <Link
                href="/settings?tab=users"
                className="flex items-center justify-center gap-1 text-sm text-text-muted hover:text-primary"
              >
                <ArrowRight className="w-4 h-4 rotate-180" />
                العودة لإدارة المستخدمين
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
