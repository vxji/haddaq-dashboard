"use client"

import Link from "next/link"
import { User, HardHat } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ProjectStatusBadge } from "@/components/projects/StatusBadge"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { Project } from "@/types"

interface Props {
  projects: Project[]
  loading?: boolean
}

function stageProgress(project: Project): number {
  if (!project.stages || project.stages.length === 0) return 0
  const total = project.stages.reduce((sum, s) => sum + s.progress_percentage, 0)
  return Math.round(total / project.stages.length)
}

export function ProjectsCards({ projects, loading }: Props) {
  if (projects.length === 0) {
    return (
      <div className="bg-surface rounded-xl border border-border shadow-card py-16 text-center text-text-muted text-sm">
        لا توجد مشاريع مطابقة
      </div>
    )
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity",
        loading && "opacity-50 pointer-events-none"
      )}
    >
      {projects.map((project) => {
        const progress = stageProgress(project)
        const remaining = project.amount_remaining || 0

        return (
          <Card
            key={project.id}
            className="border-border shadow-card rounded-xl hover:shadow-md transition-shadow flex flex-col"
          >
            <CardHeader className="p-4 pb-0 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/projects/${project.id}`} className="min-w-0 group">
                  <span className="font-mono text-primary text-xs font-medium block group-hover:underline">
                    {project.project_number}
                  </span>
                  <p className="font-display font-bold text-text-primary text-sm truncate">
                    {project.name}
                  </p>
                </Link>
                <ProjectStatusBadge status={project.status} className="flex-shrink-0" />
              </div>
            </CardHeader>

            <CardContent className="p-4 pt-3 flex-1 flex flex-col gap-3">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <User className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  <span className="truncate">{project.owner_name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-text-secondary">
                  <HardHat className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                  <span className="truncate">
                    {project.assigned_engineer?.full_name || "بلا مهندس مسؤول"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>نسبة الإنجاز</span>
                  <span className="ltr-nums font-medium">{progress}%</span>
                </div>
                <Progress value={progress} />
              </div>

              <div className="grid grid-cols-2 gap-2 mt-auto pt-2 border-t border-border">
                <div>
                  <p className="text-[11px] text-text-muted">قيمة العقد</p>
                  <p className="text-sm font-semibold text-text-primary ltr-nums">
                    {formatCurrency(project.total_contract_value)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted">المتبقي</p>
                  <p
                    className={cn(
                      "text-sm font-semibold ltr-nums",
                      remaining > 0 ? "text-danger" : "text-green-600"
                    )}
                  >
                    {formatCurrency(remaining)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
