"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Filter, X } from "lucide-react"

export interface ProjectOption {
  id: string
  name: string
  project_number: string
}

export interface EngineerOption {
  id: string
  full_name: string
  job_title: string | null
}

interface CalendarFiltersProps {
  projects: ProjectOption[]
  engineers: EngineerOption[]
  selectedProjectIds: string[]
  selectedEngineerIds: string[]
  onApply: (projectIds: string[], engineerIds: string[]) => void
}

function toggle(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

export function CalendarFilters({
  projects,
  engineers,
  selectedProjectIds,
  selectedEngineerIds,
  onApply,
}: CalendarFiltersProps) {
  const [open, setOpen] = useState(false)
  const [draftProjects, setDraftProjects] = useState<string[]>(selectedProjectIds)
  const [draftEngineers, setDraftEngineers] = useState<string[]>(selectedEngineerIds)

  useEffect(() => {
    if (open) {
      setDraftProjects(selectedProjectIds)
      setDraftEngineers(selectedEngineerIds)
    }
  }, [open, selectedProjectIds, selectedEngineerIds])

  const activeCount = selectedProjectIds.length + selectedEngineerIds.length

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          الفلاتر
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5">
              {activeCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>المشروع</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {projects.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-text-muted">لا توجد مشاريع</p>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            {projects.map((p) => (
              <DropdownMenuCheckboxItem
                key={p.id}
                checked={draftProjects.includes(p.id)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={() => setDraftProjects((prev) => toggle(prev, p.id))}
              >
                <div className="flex flex-col">
                  <span>{p.name}</span>
                  <span className="text-xs text-text-muted font-mono">{p.project_number}</span>
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuLabel>المهندس</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {engineers.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-text-muted">لا يوجد مهندسون</p>
        ) : (
          <div className="max-h-48 overflow-y-auto">
            {engineers.map((e) => (
              <DropdownMenuCheckboxItem
                key={e.id}
                checked={draftEngineers.includes(e.id)}
                onSelect={(ev) => ev.preventDefault()}
                onCheckedChange={() => setDraftEngineers((prev) => toggle(prev, e.id))}
              >
                <div className="flex flex-col">
                  <span>{e.full_name}</span>
                  {e.job_title && <span className="text-xs text-text-muted">{e.job_title}</span>}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <div className="flex items-center justify-between gap-2 p-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setDraftProjects([])
              setDraftEngineers([])
              onApply([], [])
              setOpen(false)
            }}
          >
            <X className="h-3.5 w-3.5" />
            مسح الفلاتر
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary-dark"
            onClick={() => {
              onApply(draftProjects, draftEngineers)
              setOpen(false)
            }}
          >
            تطبيق
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
