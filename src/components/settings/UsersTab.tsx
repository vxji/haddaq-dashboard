"use client"

import { useState, useEffect } from "react"
import { Plus, Pencil, UserX, UserCheck } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createUserSchema, type CreateUserFormData } from "@/lib/validations/user.schema"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { STAGE_ENGINEER_JOB_TITLE, type Profile } from "@/types"
import { formatDate } from "@/lib/utils"
import { toast } from "sonner"

interface Props {
  currentProfile: Profile
}

export function UsersTab({ currentProfile }: Props) {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [toggleUser, setToggleUser] = useState<Profile | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  const supabase = createClient()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "employee", is_active: true },
  })

  async function loadData() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    setUsers((data as Profile[]) || [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function onSubmit(data: CreateUserFormData) {
    setFormLoading(true)

    const res = await fetch("/api/users", {
      method: editUser ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, id: editUser?.id }),
    })

    if (res.ok) {
      toast.success(editUser ? "تم تحديث المستخدم" : "تم إنشاء المستخدم")
      setShowForm(false)
      setEditUser(null)
      reset()
      loadData()
    } else {
      const err = await res.json()
      toast.error(err.message || "حدث خطأ")
    }

    setFormLoading(false)
  }

  async function toggleActive() {
    if (!toggleUser) return

    const { error } = await supabase
      .from("profiles")
      .update({ is_active: !toggleUser.is_active })
      .eq("id", toggleUser.id)

    if (error) {
      toast.error("فشل التحديث")
    } else {
      toast.success(toggleUser.is_active ? "تم تعطيل الحساب" : "تم تفعيل الحساب")
      setToggleUser(null)
      loadData()
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">المستخدمون</h2>
          <p className="text-text-muted text-sm mt-0.5">{users.length} مستخدم مسجّل</p>
        </div>
        <Button
          onClick={() => { reset({ role: "employee", is_active: true }); setEditUser(null); setShowForm(true) }}
          className="bg-primary hover:bg-primary-dark gap-2"
        >
          <Plus className="w-4 h-4" />
          مستخدم جديد
        </Button>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-subtle border-b border-border">
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">الاسم</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">البريد</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">الجوال</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">المسمى الوظيفي</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">الصلاحية</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">الحالة</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">تاريخ الإنشاء</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-text-primary">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {user.full_name.charAt(0)}
                        </div>
                        {user.full_name}
                        {user.id === currentProfile.id && (
                          <span className="text-xs text-primary">(أنت)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-secondary ltr-nums">{user.email}</td>
                    <td className="px-4 py-3 text-text-secondary ltr-nums">{user.phone || "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">{user.job_title || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          user.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-surface-subtle text-text-secondary"
                        }`}
                      >
                        {user.role === "admin" ? "مدير النظام" : "موظف"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full">
                          نشط
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted font-medium bg-surface-subtle px-2 py-0.5 rounded-full">
                          معطّل
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {user.id !== currentProfile.id && (
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditUser(user)
                              reset({
                                full_name: user.full_name,
                                email: user.email,
                                phone: user.phone || "",
                                job_title: user.job_title || "",
                                role: user.role,
                                is_active: user.is_active,
                                password: "",
                              })
                              setShowForm(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className={`h-8 w-8 ${user.is_active ? "text-danger" : "text-green-600"}`}
                            onClick={() => setToggleUser(user)}
                          >
                            {user.is_active ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditUser(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUser ? "تعديل المستخدم" : "إضافة مستخدم جديد"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>الاسم الكامل *</Label>
              <Input {...register("full_name")} placeholder="الاسم الكامل" />
              {errors.full_name && <p className="text-xs text-danger">{errors.full_name.message}</p>}
            </div>

            {!editUser && (
              <div className="space-y-1.5">
                <Label>البريد الإلكتروني *</Label>
                <Input {...register("email")} type="email" dir="ltr" placeholder="email@example.com" />
                {errors.email && <p className="text-xs text-danger">{errors.email.message}</p>}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>{editUser ? "كلمة مرور جديدة (اتركها فارغة للإبقاء)" : "كلمة المرور *"}</Label>
              <Input
                {...register("password")}
                type="password"
                placeholder={editUser ? "••••••••" : "كلمة المرور (8 أحرف على الأقل)"}
              />
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>رقم الجوال</Label>
                <Input {...register("phone")} dir="ltr" placeholder="0501234567" />
              </div>
              <div className="space-y-1.5">
                <Label>المسمى الوظيفي</Label>
                <Select
                  defaultValue={editUser?.job_title || "none"}
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
                <p className="text-[11px] text-text-muted">
                  يحدد أي مرحلة مشروع يمكن لهذا المستخدم تعديلها
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>الصلاحية *</Label>
              <Select
                defaultValue={editUser?.role || "employee"}
                onValueChange={(v) => setValue("role", v as "admin" | "employee")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">موظف</SelectItem>
                  <SelectItem value="admin">مدير النظام</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="bg-primary hover:bg-primary-dark"
                disabled={formLoading}
              >
                {formLoading ? "جاري الحفظ..." : editUser ? "حفظ" : "إنشاء الحساب"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setShowForm(false); setEditUser(null) }}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Toggle active dialog */}
      <ConfirmDialog
        open={!!toggleUser}
        onClose={() => setToggleUser(null)}
        onConfirm={toggleActive}
        title={toggleUser?.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}
        description={`هل أنت متأكد من ${toggleUser?.is_active ? "تعطيل" : "تفعيل"} حساب "${toggleUser?.full_name}"؟`}
        confirmLabel={toggleUser?.is_active ? "تعطيل" : "تفعيل"}
        variant={toggleUser?.is_active ? "danger" : "warning"}
      />
    </div>
  )
}
