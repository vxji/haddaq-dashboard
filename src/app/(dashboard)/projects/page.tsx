"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  FileText,
  Phone,
  User,
  Hash,
  X,
  Table as TableIcon,
  KanbanSquare,
  LayoutGrid,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ProjectForm } from "@/components/projects/ProjectForm"
import { ProjectStatusBadge } from "@/components/projects/StatusBadge"
import { ProjectsKanban } from "@/components/projects/ProjectsKanban"
import { ProjectsCards } from "@/components/projects/ProjectsCards"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import { PROJECT_STATUS_MAP, type ProjectStatus, type Project, type Profile } from "@/types"

type ProjectsView = "table" | "kanban" | "cards"
const VIEW_STORAGE_KEY = "projects-view"

const VIEW_BTNS = [
  { key: "table" as const, icon: TableIcon, label: "جدول" },
  { key: "kanban" as const, icon: KanbanSquare, label: "كانبان" },
  { key: "cards" as const, icon: LayoutGrid, label: "بطاقات" },
]

function ProjectsPageContent() {
  const searchParams = useSearchParams()

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ProjectStatus | "all">(
    (searchParams.get("status") as ProjectStatus | null) || "all"
  )
  const [unpaidOnly, setUnpaidOnly] = useState(searchParams.get("unpaid") === "1")
  const [profile, setProfile] = useState<Profile | null>(null)
  const [view, setView] = useState<ProjectsView>("table")

  // Dialogs
  const [showForm, setShowForm] = useState(false)
  const [editProject, setEditProject] = useState<Project | null>(null)
  const [deleteProject, setDeleteProject] = useState<Project | null>(null)
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  const loadProjects = useCallback(async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (prof) setProfile(prof as Profile)

    let query = supabase
      .from("project_summary")
      .select(
        "*, assigned_engineer:profiles!projects_assigned_engineer_id_fkey(full_name, job_title), stages(progress_percentage)"
      )
      .order("created_at", { ascending: false })

    if (prof?.role !== "admin") {
      query = query.or(`assigned_engineer_id.eq.${user.id},created_by.eq.${user.id}`)
    }

    if (search.trim()) {
      query = query.or(
        `owner_name.ilike.%${search}%,owner_id_number.ilike.%${search}%,owner_phone.ilike.%${search}%,project_number.ilike.%${search}%,name.ilike.%${search}%`
      )
    }

    if (status !== "all") {
      query = query.eq("status", status)
    }

    if (unpaidOnly) {
      query = query.gt("amount_remaining", 0)
    }

    const { data } = await query
    setProjects((data as Project[]) || [])
    setLoading(false)
  }, [search, status, unpaidOnly])

  useEffect(() => {
    const timer = setTimeout(loadProjects, 300)
    return () => clearTimeout(timer)
  }, [loadProjects])

  const [viewHydrated, setViewHydrated] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY)
    if (saved === "table" || saved === "kanban" || saved === "cards") {
      setView(saved)
    }
    setViewHydrated(true)
  }, [])

  useEffect(() => {
    // Skip the initial mount so this doesn't clobber the saved value with
    // the default "table" state before the restore effect above lands.
    if (!viewHydrated) return
    localStorage.setItem(VIEW_STORAGE_KEY, view)
  }, [view, viewHydrated])

  async function handleStatusChange(projectId: string, newStatus: ProjectStatus) {
    const previous = projects
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: newStatus } : p))
    )

    const { error } = await supabase
      .from("projects")
      .update({ status: newStatus })
      .eq("id", projectId)

    if (error) {
      toast.error("فشل تحديث حالة المشروع")
      setProjects(previous)
    } else {
      toast.success("تم تحديث حالة المشروع")
    }
  }

  async function handleDelete() {
    if (!deleteProject) return
    setDeleting(true)
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", deleteProject.id)

    if (error) {
      toast.error("فشل حذف المشروع")
    } else {
      toast.success("تم حذف المشروع")
      setDeleteProject(null)
      loadProjects()
    }
    setDeleting(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-text-primary">المشاريع</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {projects.length} مشروع مسجّل
          </p>
        </div>
        <Button
          onClick={() => { setEditProject(null); setShowForm(true) }}
          className="bg-primary hover:bg-primary-dark gap-2"
        >
          <Plus className="w-4 h-4" />
          مشروع جديد
        </Button>
      </div>

      {/* Search + filters */}
      <div className="bg-surface rounded-xl p-4 shadow-card border border-border space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              placeholder="بحث باسم المالك، رقم الهوية، رقم الجوال، رقم المشروع..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pe-10"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => setStatus(v as ProjectStatus | "all")}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="كل الحالات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              {Object.entries(PROJECT_STATUS_MAP).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {unpaidOnly && (
          <button
            onClick={() => setUnpaidOnly(false)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-red-50 dark:bg-red-500/10 text-danger text-xs font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
          >
            عقود غير مسددة فقط
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* View switcher */}
      <div className="flex justify-end">
        <div className="sm:hidden w-full">
          <Select value={view} onValueChange={(v: ProjectsView) => setView(v)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VIEW_BTNS.map(({ key, label }) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {VIEW_BTNS.map(({ key, icon: Icon, label }) => (
            <Button
              key={key}
              variant={view === key ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView(key)}
              className="h-8 gap-1.5"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {view === "kanban" && (
        <ProjectsKanban projects={projects} onStatusChange={handleStatusChange} loading={loading} />
      )}

      {view === "cards" && <ProjectsCards projects={projects} loading={loading} />}

      {/* Table */}
      {view === "table" && (
      <div className="bg-surface rounded-xl shadow-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-subtle border-b border-border">
                <th className="text-right px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">
                  رقم المشروع
                </th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">
                  اسم المشروع
                </th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">
                  المالك
                </th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">
                  رقم الهوية
                </th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">
                  الجوال
                </th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">
                  قيمة العقد
                </th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">
                  المتبقي
                </th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">
                  الحالة
                </th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">
                  العقد
                </th>
                <th className="text-right px-4 py-3 font-semibold text-text-secondary whitespace-nowrap">
                  المهندس
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 11 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-surface-subtle rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : projects.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-12 text-center text-text-muted text-sm"
                  >
                    {search ? "لا توجد نتائج مطابقة للبحث" : "لا توجد مشاريع بعد"}
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <tr
                    key={project.id}
                    className="hover:bg-surface-muted transition-colors"
                  >
                    <td className="px-4 py-3 font-mono whitespace-nowrap">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-primary font-medium hover:underline hover:text-primary-dark"
                      >
                        {project.project_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary max-w-48 truncate">
                      {project.name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                      {project.owner_name}
                    </td>
                    <td className="px-4 py-3 text-text-secondary ltr-nums">
                      {project.owner_id_number}
                    </td>
                    <td className="px-4 py-3 text-text-secondary ltr-nums">
                      {project.owner_phone}
                    </td>
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap ltr-nums">
                      {formatCurrency(project.total_contract_value)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap ltr-nums">
                      <span
                        className={
                          (project.amount_remaining || 0) > 0
                            ? "text-danger font-medium"
                            : "text-green-600 font-medium"
                        }
                      >
                        {formatCurrency(project.amount_remaining || 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ProjectStatusBadge status={project.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {project.contract_signed ? (
                        <span className="text-green-600 text-xs font-medium">✓ موقّع</span>
                      ) : (
                        <span className="text-amber-600 text-xs font-medium">غير موقّع</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">
                      {project.assigned_engineer?.full_name || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Link href={`/projects/${project.id}`}>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-primary">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-text-secondary"
                          onClick={() => { setEditProject(project); setShowForm(true) }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {profile?.role === "admin" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-danger"
                            onClick={() => setDeleteProject(project)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Project Form Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) { setShowForm(false); setEditProject(null) }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editProject ? "تعديل المشروع" : "إضافة مشروع جديد"}
            </DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={editProject || undefined}
            isAdmin={profile?.role === "admin"}
            onSuccess={(p) => {
              toast.success(editProject ? "تم تحديث المشروع" : "تم إضافة المشروع")
              setShowForm(false)
              setEditProject(null)
              loadProjects()
            }}
            onCancel={() => { setShowForm(false); setEditProject(null) }}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteProject}
        onClose={() => setDeleteProject(null)}
        onConfirm={handleDelete}
        title="حذف المشروع"
        description={`هل أنت متأكد من حذف مشروع "${deleteProject?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف"
        loading={deleting}
      />
    </div>
  )
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageContent />
    </Suspense>
  )
}
