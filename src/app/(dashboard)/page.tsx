import { Wallet, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StatsCard } from "@/components/dashboard/StatsCard"
import { RevenueChart } from "@/components/dashboard/RevenueChart"
import { RecentActivityFeed } from "@/components/dashboard/RecentActivityFeed"
import { ProjectsTable, type ProjectRow } from "@/components/dashboard/ProjectsTable"
import { formatCurrency } from "@/lib/utils"
import type { ProjectStatus, ActivityLog } from "@/types"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  const isAdmin = profile?.role === "admin"

  // Projects (role-scoped) for stats + table
  let projectsQuery = supabase
    .from("project_summary")
    .select(
      "id, project_number, owner_name, address, total_contract_value, contract_date, status, amount_remaining, created_at"
    )
    .order("created_at", { ascending: false })

  if (!isAdmin) {
    projectsQuery = projectsQuery.or(
      `assigned_engineer_id.eq.${user.id},created_by.eq.${user.id}`
    )
  }

  const { data: projects } = await projectsQuery

  const statusCounts: Record<ProjectStatus, number> = {
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    suspended: 0,
  }
  let totalContractValue = 0
  let unpaidContracts = 0

  projects?.forEach((p) => {
    statusCounts[p.status as ProjectStatus] =
      (statusCounts[p.status as ProjectStatus] || 0) + 1
    totalContractValue += p.total_contract_value || 0
    if ((p.amount_remaining || 0) > 0) unpaidContracts += 1
  })

  const tableRows: ProjectRow[] = (projects || []).slice(0, 8).map((p) => ({
    id: p.id,
    project_number: p.project_number,
    owner_name: p.owner_name,
    address: p.address,
    total_contract_value: p.total_contract_value,
    contract_date: p.contract_date,
    status: p.status as ProjectStatus,
  }))

  // Monthly payments, last 12 months (backfilled)
  const months: { key: string; label: string }[] = []
  const cursor = new Date()
  cursor.setDate(1)
  for (let i = 11; i >= 0; i--) {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() - i, 1)
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("ar-SA", { month: "short" }),
    })
  }

  const twelveMonthsAgo = new Date(cursor.getFullYear(), cursor.getMonth() - 11, 1)

  const { data: monthlyPay } = await supabase
    .from("payments")
    .select("amount, payment_date")
    .gte("payment_date", twelveMonthsAgo.toISOString().split("T")[0])

  const monthAgg: Record<string, { total: number; count: number }> = {}
  monthlyPay?.forEach((p) => {
    const d = new Date(p.payment_date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (!monthAgg[key]) monthAgg[key] = { total: 0, count: 0 }
    monthAgg[key].total += p.amount
    monthAgg[key].count += 1
  })

  const revenueChartData = months.map((m) => ({
    month: m.label,
    total: monthAgg[m.key]?.total || 0,
    count: monthAgg[m.key]?.count || 0,
  }))

  // Recent activity
  const { data: recentActivity } = await supabase
    .from("activity_logs")
    .select(
      "*, user:profiles!activity_logs_user_id_fkey(full_name), project:projects!activity_logs_project_id_fkey(id, name, project_number)"
    )
    .order("created_at", { ascending: false })
    .limit(8)

  const now = new Date()
  const periodLabel = now.toLocaleDateString("ar-SA", { month: "long", year: "numeric" })

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-text-primary">
            أهلاً بعودتك، {profile?.full_name?.split(" ")[0] || "بك"}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            نظرة عامة على المشاريع والعقود والمدفوعات
          </p>
        </div>
        <div className="flex items-center gap-2 h-9 px-3.5 rounded-lg border border-border bg-surface text-sm text-text-secondary font-medium w-fit">
          <Clock className="w-3.5 h-3.5 text-text-muted" />
          {periodLabel}
        </div>
      </div>

      {/* Chart + stats */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-surface rounded-2xl p-5 shadow-card border border-border">
          <h2 className="font-display font-bold text-text-primary text-base mb-1">
            قيمة العقود المحصّلة
          </h2>
          <p className="text-text-muted text-xs mb-4">آخر 12 شهراً</p>
          <RevenueChart data={revenueChartData} />
        </div>

        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatsCard
            title="إجمالي قيمة العقود"
            value={formatCurrency(totalContractValue)}
            icon={Wallet}
            iconColor="text-primary"
            iconBg="bg-primary-soft"
            href="/contracts"
          />
          <StatsCard
            title="مشاريع مكتملة"
            value={statusCounts.completed}
            subtitle={`من أصل ${projects?.length || 0} مشروع`}
            icon={CheckCircle2}
            iconColor="text-status-completed"
            iconBg="bg-green-50 dark:bg-green-500/10"
            href="/projects?status=completed"
          />
          <StatsCard
            title="مشاريع قيد التنفيذ"
            value={statusCounts.in_progress}
            icon={Clock}
            iconColor="text-primary"
            iconBg="bg-primary-soft"
            href="/projects?status=in_progress"
          />
          <StatsCard
            title="عقود غير مسددة"
            value={unpaidContracts}
            subtitle="تحتاج متابعة تحصيل"
            icon={AlertCircle}
            iconColor="text-danger"
            iconBg="bg-red-50 dark:bg-red-500/10"
            href="/projects?unpaid=1"
          />
        </div>
      </div>

      {/* Projects table */}
      <ProjectsTable projects={tableRows} totalCount={projects?.length || 0} />

      {/* Activity feed */}
      <div className="bg-surface rounded-2xl p-6 shadow-card border border-border">
        <h2 className="font-display font-bold text-text-primary text-base mb-4">
          آخر الأنشطة
        </h2>
        <RecentActivityFeed logs={(recentActivity as ActivityLog[]) || []} />
      </div>
    </div>
  )
}
