"use client"

import { useCallback, useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { EventManager, type CalEvent } from "@/components/ui/event-manager"
import { CalendarFilters, type ProjectOption, type EngineerOption } from "@/components/calendar/CalendarFilters"
import { toast } from "sonner"
import type { CalendarEvent, Task, Stage, StageType } from "@/types"
import { STAGE_CONFIG } from "@/types"

const EVENT_COLORS = [
  { name: "موعد تسليم",           value: "#dc2626", bg: "bg-red-600" },
  { name: "اجتماع",               value: "#2554eb", bg: "bg-blue-600" },
  { name: "مهمة",                 value: "#d97706", bg: "bg-amber-600" },
  { name: "إنجاز",                value: "#16a34a", bg: "bg-green-600" },
  { name: "مرحلة — معماري",       value: "#2196F3", bg: "bg-blue-500" },
  { name: "مرحلة — إنشائي",       value: "#F44336", bg: "bg-red-500" },
  { name: "مرحلة — كهربائي",      value: "#FF9800", bg: "bg-orange-500" },
  { name: "مرحلة — ميكانيكي",     value: "#4CAF50", bg: "bg-green-500" },
  { name: "مرحلة — اعتماد/تسليم", value: "#9C27B0", bg: "bg-purple-600" },
]

const TASK_STATUS_COLOR: Record<string, string> = {
  pending:    "#d97706",
  in_progress:"#2554eb",
  done:       "#16a34a",
}

const TYPE_TO_COLOR: Record<string, string> = {
  deadline: "#dc2626",
  meeting:  "#2554eb",
  task:     "#d97706",
  milestone:"#16a34a",
}

const TYPE_TO_CATEGORY: Record<string, string> = {
  deadline: "موعد تسليم",
  meeting:  "اجتماع",
  task:     "مهمة",
  milestone:"إنجاز",
}

function toCalEvent(e: CalendarEvent & { creator?: { full_name: string } }): CalEvent {
  const start = new Date(e.start_date)
  const end   = e.end_date ? new Date(e.end_date) : new Date(start.getTime() + 60 * 60 * 1000)
  return {
    id: e.id,
    title: e.title,
    description: e.description ?? undefined,
    startTime: start,
    endTime: end,
    color: TYPE_TO_COLOR[e.event_type] ?? "#2554eb",
    category: TYPE_TO_CATEGORY[e.event_type] ?? e.event_type,
    person: (e.creator as unknown as { full_name: string } | undefined)?.full_name,
    readonly: false,
  }
}

type StageWithProject = Stage & {
  project?: { name: string; project_number: string }
}

function stageToCalEvent(s: StageWithProject): CalEvent | null {
  if (!s.end_date) return null
  const cfg = STAGE_CONFIG[s.stage_type as StageType]
  const end   = new Date(s.end_date)
  const start = s.start_date ? new Date(s.start_date) : end
  return {
    id: `stage-${s.id}`,
    title: `${cfg?.label ?? s.stage_type}${s.project ? ` — ${s.project.name}` : ""}`,
    description: s.notes || s.description || undefined,
    startTime: start,
    endTime: end,
    color: cfg?.color ?? "#9c27b0",
    category: "مرحلة",
    readonly: true,
  }
}

function taskToCalEvent(t: Task & { assigned_user?: { full_name: string }; project?: { name: string } }): CalEvent | null {
  if (!t.due_date) return null
  const start = new Date(t.due_date)
  const end   = new Date(start.getTime() + 60 * 60 * 1000)
  return {
    id: `task-${t.id}`,
    title: t.title,
    description: t.description ?? undefined,
    startTime: start,
    endTime: end,
    color: TASK_STATUS_COLOR[t.status] ?? "#d97706",
    category: "مهمة",
    person: (t.assigned_user as unknown as { full_name: string } | undefined)?.full_name,
    readonly: true,
  }
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [engineers, setEngineers] = useState<EngineerOption[]>([])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
  const [selectedEngineerIds, setSelectedEngineerIds] = useState<string[]>([])
  const supabase = createClient()

  // Filter option lists (all projects, all active profiles — same "engineer" pool as ProjectForm's assignee picker)
  useEffect(() => {
    supabase
      .from("projects")
      .select("id, name, project_number")
      .order("name")
      .then(({ data }) => setProjects((data as ProjectOption[]) ?? []))

    supabase
      .from("profiles")
      .select("id, full_name, job_title")
      .eq("is_active", true)
      .order("full_name")
      .then(({ data }) => setEngineers((data as EngineerOption[]) ?? []))
  }, [])

  const loadAll = useCallback(async (projectIds: string[], engineerIds: string[]) => {
    setLoading(true)

    // Stages/events have no direct engineer column — the engineer filter routes through
    // the related project's assigned_engineer_id, so the join must be `!inner` to be filterable.
    const stagesSelect: string = engineerIds.length
      ? "*, project:projects!stages_project_id_fkey!inner(name, project_number, assigned_engineer_id)"
      : "*, project:projects!stages_project_id_fkey(name, project_number)"
    const eventsSelect: string = engineerIds.length
      ? "*, creator:profiles!calendar_events_created_by_fkey(full_name), project:projects!calendar_events_project_id_fkey!inner(assigned_engineer_id)"
      : "*, creator:profiles!calendar_events_created_by_fkey(full_name)"

    let calEvtsQuery = supabase.from("calendar_events").select<string, any>(eventsSelect).order("start_date")
    let tasksQuery = supabase
      .from("tasks")
      .select("*, assigned_user:profiles!tasks_assigned_to_fkey(full_name)")
      .not("due_date", "is", null)
      .neq("status", "done")
    let stagesQuery = supabase.from("stages").select<string, any>(stagesSelect).not("end_date", "is", null)

    if (projectIds.length) {
      calEvtsQuery = calEvtsQuery.in("project_id", projectIds)
      tasksQuery = tasksQuery.in("project_id", projectIds)
      stagesQuery = stagesQuery.in("project_id", projectIds)
    }
    // tasks link to an engineer directly via assigned_to; stages/events only via their project
    if (engineerIds.length) {
      calEvtsQuery = calEvtsQuery.in("project.assigned_engineer_id", engineerIds)
      tasksQuery = tasksQuery.in("assigned_to", engineerIds)
      stagesQuery = stagesQuery.in("project.assigned_engineer_id", engineerIds)
    }

    const [{ data: calEvts }, { data: tasks }, { data: stages }] = await Promise.all([
      calEvtsQuery,
      tasksQuery,
      stagesQuery,
    ])

    const mapped: CalEvent[] = [
      ...((calEvts ?? []) as (CalendarEvent & { creator?: { full_name: string } })[]).map(toCalEvent),
      ...((tasks ?? []) as (Task & { assigned_user?: { full_name: string } })[])
        .map(taskToCalEvent)
        .filter(Boolean) as CalEvent[],
      ...((stages ?? []) as StageWithProject[])
        .map(stageToCalEvent)
        .filter(Boolean) as CalEvent[],
    ]
    setEvents(mapped)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadAll(selectedProjectIds, selectedEngineerIds)
  }, [loadAll, selectedProjectIds, selectedEngineerIds])

  async function handleCreate(ev: Omit<CalEvent, "id">) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("calendar_events").insert({
      title:       ev.title,
      description: ev.description ?? null,
      event_type:  categoryToType(ev.category),
      start_date:  ev.startTime.toISOString(),
      end_date:    ev.endTime.toISOString(),
      all_day:     false,
      created_by:  user.id,
    })

    if (error) { toast.error("فشل إضافة الحدث"); return }
    toast.success("تم إضافة الحدث")
    loadAll(selectedProjectIds, selectedEngineerIds)
  }

  async function handleUpdate(id: string, ev: Partial<CalEvent>) {
    if (id.startsWith("task-") || id.startsWith("stage-")) {
      toast.info("هذا العنصر يُعدَّل من صفحة المشروع")
      return
    }
    const { error } = await supabase
      .from("calendar_events")
      .update({
        title:      ev.title,
        description:ev.description ?? null,
        start_date: ev.startTime?.toISOString(),
        end_date:   ev.endTime?.toISOString(),
        event_type: categoryToType(ev.category),
      })
      .eq("id", id)

    if (error) toast.error("فشل تحديث الحدث")
    else toast.success("تم تحديث الحدث")
  }

  async function handleDelete(id: string) {
    if (id.startsWith("task-") || id.startsWith("stage-")) {
      toast.info("هذا العنصر يُحذف من صفحة المشروع")
      return
    }
    const { error } = await supabase.from("calendar_events").delete().eq("id", id)
    if (error) toast.error("فشل حذف الحدث")
    else toast.success("تم حذف الحدث")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-text-primary">التقويم</h1>
        <p className="text-text-muted text-sm mt-0.5">مواعيد المشاريع والتسليمات والاجتماعات</p>
      </div>

      <EventManager
        events={events}
        colors={EVENT_COLORS}
        categories={["موعد تسليم", "اجتماع", "مهمة", "إنجاز"]}
        onEventCreate={handleCreate}
        onEventUpdate={handleUpdate}
        onEventDelete={handleDelete}
        filterSlot={
          <CalendarFilters
            projects={projects}
            engineers={engineers}
            selectedProjectIds={selectedProjectIds}
            selectedEngineerIds={selectedEngineerIds}
            onApply={(projectIds, engineerIds) => {
              setSelectedProjectIds(projectIds)
              setSelectedEngineerIds(engineerIds)
            }}
          />
        }
        extraActiveFilters={[
          ...selectedProjectIds.map((id) => ({
            key: `project-${id}`,
            label: projects.find((p) => p.id === id)?.name ?? id,
            onRemove: () =>
              setSelectedProjectIds((prev) => prev.filter((x) => x !== id)),
          })),
          ...selectedEngineerIds.map((id) => ({
            key: `engineer-${id}`,
            label: engineers.find((e) => e.id === id)?.full_name ?? id,
            onRemove: () =>
              setSelectedEngineerIds((prev) => prev.filter((x) => x !== id)),
          })),
        ]}
      />
    </div>
  )
}

function categoryToType(cat?: string): string {
  const map: Record<string, string> = {
    "موعد تسليم": "deadline",
    "اجتماع":     "meeting",
    "مهمة":       "task",
    "إنجاز":      "milestone",
  }
  return map[cat ?? ""] ?? "meeting"
}
