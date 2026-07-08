"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { PROJECT_STATUS_MAP, type Project, type ProjectStatus } from "@/types"
import { cn } from "@/lib/utils"

interface Props {
  projects: Project[]
  onStatusChange: (projectId: string, newStatus: ProjectStatus) => void
  loading?: boolean
}

export function ProjectsKanban({ projects, onStatusChange, loading }: Props) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverStatus, setDragOverStatus] = useState<ProjectStatus | null>(null)

  function handleDrop(status: ProjectStatus) {
    setDragOverStatus(null)
    if (!draggedId) return
    const project = projects.find((p) => p.id === draggedId)
    if (project && project.status !== status) {
      onStatusChange(draggedId, status)
    }
    setDraggedId(null)
  }

  return (
    <div
      className={cn(
        "flex gap-4 overflow-x-auto pb-2 transition-opacity",
        loading && "opacity-50 pointer-events-none"
      )}
    >
      {(Object.entries(PROJECT_STATUS_MAP) as [ProjectStatus, (typeof PROJECT_STATUS_MAP)[ProjectStatus]][]).map(
        ([statusKey, config]) => {
          const columnProjects = projects.filter((p) => p.status === statusKey)
          return (
            <div
              key={statusKey}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverStatus(statusKey)
              }}
              onDragLeave={() => setDragOverStatus((s) => (s === statusKey ? null : s))}
              onDrop={() => handleDrop(statusKey)}
              className={cn(
                "flex-shrink-0 w-72 sm:w-80 rounded-xl border border-border bg-surface-muted transition-colors",
                dragOverStatus === statusKey && "bg-primary-soft/40 border-primary/40"
              )}
            >
              <div className="flex items-center gap-2 px-3 py-3">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <h3 className="font-display font-bold text-text-primary text-sm flex-1 truncate">
                  {config.label}
                </h3>
                <Badge variant="secondary" className="rounded-full">
                  {columnProjects.length}
                </Badge>
              </div>

              <div className="px-2 pb-3 space-y-2 min-h-24 max-h-[65vh] overflow-y-auto">
                {columnProjects.length === 0 ? (
                  <p className="text-center text-xs text-text-muted py-6">لا توجد مشاريع</p>
                ) : (
                  columnProjects.map((project) => (
                    <div
                      key={project.id}
                      draggable
                      onDragStart={() => setDraggedId(project.id)}
                      onDragEnd={() => {
                        setDraggedId(null)
                        setDragOverStatus(null)
                      }}
                      className={cn(
                        "bg-surface border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition-shadow",
                        draggedId === project.id && "opacity-40"
                      )}
                    >
                      <Link
                        href={`/projects/${project.id}`}
                        className="block mb-1.5"
                        onClick={(e) => {
                          // A quick drag shouldn't also register as a navigation click
                          if (draggedId) e.preventDefault()
                        }}
                      >
                        <span className="font-mono text-primary text-xs font-medium">
                          {project.project_number}
                        </span>
                        <p className="font-medium text-text-primary text-sm truncate">{project.name}</p>
                      </Link>

                      <p className="text-xs text-text-secondary truncate mb-2">{project.owner_name}</p>

                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-text-muted">قيمة العقد</span>
                        <span className="text-text-secondary ltr-nums font-medium">
                          {formatCurrency(project.total_contract_value)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-text-muted">المتبقي</span>
                        <span
                          className={cn(
                            "ltr-nums font-medium",
                            (project.amount_remaining || 0) > 0 ? "text-danger" : "text-green-600"
                          )}
                        >
                          {formatCurrency(project.amount_remaining || 0)}
                        </span>
                      </div>

                      <p className="text-xs text-text-muted truncate border-t border-border pt-1.5">
                        {project.assigned_engineer?.full_name || "بلا مهندس مسؤول"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        }
      )}
    </div>
  )
}
