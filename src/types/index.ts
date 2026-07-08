export type UserRole = "admin" | "employee"

export type ProjectStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "suspended"

export type StageType =
  | "architectural"
  | "structural"
  | "electrical"
  | "mechanical"
  | "approval_delivery"

export type StageStatus = "not_started" | "in_progress" | "completed"

export type TaskStatus = "pending" | "in_progress" | "done"

export type MessageType = "text" | "image" | "file"

export type NotificationType =
  | "stage_completed"
  | "comment_added"
  | "file_uploaded"
  | "project_updated"
  | "reminder"

export type EventType = "deadline" | "meeting" | "task" | "milestone"

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  job_title: string | null
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  project_number: string
  name: string
  owner_name: string
  owner_id_number: string
  owner_phone: string
  address: string
  description: string | null
  contract_date: string | null
  contract_signed: boolean
  total_contract_value: number
  status: ProjectStatus
  assigned_engineer_id: string | null
  assigned_engineer?: Profile
  created_by: string
  created_at: string
  updated_at: string
  // From view
  amount_paid?: number
  amount_remaining?: number
  // Embedded when the caller selects stages(progress_percentage)
  stages?: { progress_percentage: number }[]
}

export interface Contract {
  id: string
  project_id: string
  contract_number: string
  terms: string | null
  total_value: number
  pdf_url: string | null
  signed_at: string | null
  signed_by: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  project_id: string
  amount: number
  payment_date: string
  description: string | null
  receipt_url: string | null
  created_by: string
  created_at: string
}

export const STAGE_CONFIG: Record<
  StageType,
  { label: string; color: string; order: number }
> = {
  architectural: { label: "معماري", color: "#2196F3", order: 1 },
  structural: { label: "إنشائي", color: "#F44336", order: 2 },
  electrical: { label: "كهربائي", color: "#FF9800", order: 3 },
  mechanical: { label: "ميكانيكي", color: "#4CAF50", order: 4 },
  approval_delivery: { label: "اعتماد وتسليم", color: "#9C27B0", order: 5 },
}

// The job_title string that grants edit access to a given stage type.
// Must match exactly what's stored in profiles.job_title and what the
// enforce_stage_specialty DB trigger checks against — keep in sync.
export const STAGE_ENGINEER_JOB_TITLE: Record<StageType, string> = {
  architectural: "مهندس معماري",
  structural: "مهندس إنشائي",
  electrical: "مهندس كهربائي",
  mechanical: "مهندس ميكانيكي",
  approval_delivery: "مهندس اعتماد وتسليم",
}

export function canEditStage(
  profile: Pick<Profile, "role" | "job_title"> | null | undefined,
  stageType: StageType
): boolean {
  if (!profile) return false
  if (profile.role === "admin") return true
  return profile.job_title === STAGE_ENGINEER_JOB_TITLE[stageType]
}

export interface Stage {
  id: string
  project_id: string
  stage_type: StageType
  start_date: string | null
  end_date: string | null
  completion_date: string | null
  progress_percentage: number
  status: StageStatus
  description: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  stage_id: string | null
  title: string
  description: string | null
  due_date: string | null
  status: TaskStatus
  assigned_to: string | null
  assigned_user?: Profile
  created_by: string
  created_at: string
  updated_at: string
}

export interface ProjectFile {
  id: string
  project_id: string
  stage_id: string | null
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_by: string
  uploader?: Profile
  created_at: string
}

export interface Comment {
  id: string
  project_id: string
  parent_id: string | null
  content: string
  created_by: string
  author?: Profile
  replies?: Comment[]
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  project_id: string
  content: string
  message_type: MessageType
  file_url: string | null
  sent_by: string
  sender?: Profile
  read_by: string[]
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  project_id: string | null
  project?: Pick<Project, "id" | "name" | "project_number">
  title: string
  body: string
  type: NotificationType
  is_read: boolean
  created_at: string
}

export interface CalendarEvent {
  id: string
  project_id: string | null
  project?: Pick<Project, "id" | "name" | "project_number">
  title: string
  description: string | null
  event_type: EventType
  start_date: string
  end_date: string | null
  all_day: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CompanySettings {
  id: number
  office_name: string
  logo_url: string | null
  commercial_register: string | null
  tax_number: string | null
  address: string | null
  phone: string | null
  email: string | null
  website: string | null
  updated_by: string | null
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id: string
  user?: Profile
  project_id: string | null
  project?: Pick<Project, "id" | "name" | "project_number">
  action: string
  entity_type: string
  entity_id: string | null
  description: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export const PROJECT_STATUS_MAP: Record<
  ProjectStatus,
  { label: string; color: string }
> = {
  pending: { label: "قيد الانتظار", color: "#d97706" },
  in_progress: { label: "قيد التنفيذ", color: "#2554eb" },
  completed: { label: "منتهي", color: "#16a34a" },
  cancelled: { label: "ملغي", color: "#dc2626" },
  suspended: { label: "موقوف", color: "#7c3aed" },
}

export const STAGE_STATUS_MAP: Record<
  StageStatus,
  { label: string; color: string }
> = {
  not_started: { label: "لم يبدأ", color: "#8890a4" },
  in_progress: { label: "قيد التنفيذ", color: "#10b981" },
  completed: { label: "مكتمل", color: "#6366f1" },
}
