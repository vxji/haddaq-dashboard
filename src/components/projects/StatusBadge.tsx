import { Badge } from "@/components/ui/badge"
import { PROJECT_STATUS_MAP, STAGE_STATUS_MAP } from "@/types"
import type { ProjectStatus, StageStatus } from "@/types"
import { cn } from "@/lib/utils"

interface ProjectStatusBadgeProps {
  status: ProjectStatus
  className?: string
}

export function ProjectStatusBadge({ status, className }: ProjectStatusBadgeProps) {
  const config = PROJECT_STATUS_MAP[status]
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: config.color + "20",
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      {config.label}
    </span>
  )
}

interface StageStatusBadgeProps {
  status: StageStatus
  className?: string
}

export function StageStatusBadge({ status, className }: StageStatusBadgeProps) {
  const config = STAGE_STATUS_MAP[status]
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        className
      )}
      style={{
        backgroundColor: config.color + "20",
        color: config.color,
        border: `1px solid ${config.color}40`,
      }}
    >
      {config.label}
    </span>
  )
}
