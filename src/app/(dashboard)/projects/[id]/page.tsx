"use client"

import { useState, useEffect, use } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowRight,
  Info,
  GitBranch,
  Paperclip,
  MessageSquare,
  MessageCircle,
  FileText,
  Pencil,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { ProjectForm } from "@/components/projects/ProjectForm"
import { ProjectStatusBadge } from "@/components/projects/StatusBadge"
import { StagesTimeline } from "@/components/stages/StagesTimeline"
import { ProjectFiles } from "@/components/projects/ProjectFiles"
import { ProjectComments } from "@/components/projects/ProjectComments"
import { ChatRoom } from "@/components/chat/ChatRoom"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import type { Project, Stage, Profile } from "@/types"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") ?? "info"
  const [project, setProject] = useState<Project | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)

  const supabase = createClient()

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: prof }, { data: proj }, { data: stgs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("project_summary")
        .select("*, assigned_engineer:profiles!projects_assigned_engineer_id_fkey(full_name, job_title)")
        .eq("id", id)
        .single(),
      supabase.from("stages").select("*").eq("project_id", id).order("stage_type"),
    ])

    if (prof) setProfile(prof as Profile)
    if (proj) setProject(proj as Project)
    if (stgs) setStages(stgs as Stage[])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">المشروع غير موجود</p>
        <Link href="/projects">
          <Button variant="outline" className="mt-4">
            العودة للمشاريع
          </Button>
        </Link>
      </div>
    )
  }

  const completedStages = stages.filter((s) => s.status === "completed").length

  return (
    <div className="space-y-5">
      {/* Breadcrumb + Title */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-text-muted mb-1">
            <Link href="/projects" className="hover:text-primary transition-colors">
              المشاريع
            </Link>
            <ArrowRight className="w-3 h-3 rotate-180" />
            <span className="text-text-secondary">{project.project_number}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">{project.name}</h1>
            <ProjectStatusBadge status={project.status} />
            {!project.contract_signed && (
              <span className="text-xs bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                عقد غير موقّع
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={() => setEditOpen(true)}
          variant="outline"
          size="sm"
          className="gap-2 self-start"
        >
          <Pencil className="w-4 h-4" />
          تعديل
        </Button>
      </div>

      {/* Quick stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
          <p className="text-xs text-text-muted mb-1">قيمة العقد</p>
          <p className="font-bold text-text-primary">
            {formatCurrency(project.total_contract_value)}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
          <p className="text-xs text-text-muted mb-1">المدفوع</p>
          <p className="font-bold text-green-600">
            {formatCurrency(project.amount_paid || 0)}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
          <p className="text-xs text-text-muted mb-1">المتبقي</p>
          <p className="font-bold text-danger">
            {formatCurrency(project.amount_remaining || 0)}
          </p>
        </div>
        <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
          <p className="text-xs text-text-muted mb-1">المراحل المكتملة</p>
          <p className="font-bold text-text-primary">
            {completedStages} / {stages.length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={initialTab}>
        <TabsList className="bg-surface border border-border rounded-xl p-1 h-auto flex-wrap gap-1">
          <TabsTrigger value="info" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Info className="w-4 h-4" />
            المعلومات
          </TabsTrigger>
          <TabsTrigger value="stages" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <GitBranch className="w-4 h-4" />
            المراحل
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <Paperclip className="w-4 h-4" />
            الملفات
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <MessageSquare className="w-4 h-4" />
            الملاحظات
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
            <MessageCircle className="w-4 h-4" />
            الدردشة
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-xl p-6 border border-border shadow-card space-y-4">
              <h2 className="font-bold text-text-primary border-b border-border pb-2">
                بيانات المشروع
              </h2>
              <InfoRow label="رقم المشروع" value={project.project_number} mono />
              <InfoRow label="اسم المشروع" value={project.name} />
              <InfoRow label="العنوان" value={project.address} />
              {project.description && (
                <InfoRow label="الوصف" value={project.description} />
              )}
              <InfoRow
                label="المهندس المسؤول"
                value={project.assigned_engineer?.full_name || "—"}
              />
              <InfoRow
                label="تاريخ العقد"
                value={project.contract_date ? formatDate(project.contract_date) : "—"}
              />
            </div>

            <div className="bg-surface rounded-xl p-6 border border-border shadow-card space-y-4">
              <h2 className="font-bold text-text-primary border-b border-border pb-2">
                بيانات المالك
              </h2>
              <InfoRow label="اسم المالك" value={project.owner_name} />
              <InfoRow label="رقم الهوية" value={project.owner_id_number} mono />
              <InfoRow label="رقم الجوال" value={project.owner_phone} mono />
            </div>
          </div>
        </TabsContent>

        {/* Stages Tab */}
        <TabsContent value="stages" className="mt-4">
          <StagesTimeline
            stages={stages}
            projectId={id}
            onUpdate={loadData}
            profile={profile}
          />
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-4">
          <ProjectFiles projectId={id} profile={profile} />
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="mt-4">
          <ProjectComments projectId={id} profile={profile} />
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="mt-4">
          {profile && <ChatRoom projectId={id} profile={profile} />}
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل المشروع</DialogTitle>
          </DialogHeader>
          <ProjectForm
            project={project}
            isAdmin={profile?.role === "admin"}
            onSuccess={(p) => {
              toast.success("تم تحديث المشروع")
              setEditOpen(false)
              loadData()
            }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-text-muted flex-shrink-0">{label}</span>
      <span
        className={`text-sm text-text-primary font-medium text-left ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  )
}
