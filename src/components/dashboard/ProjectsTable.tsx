"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, Plus, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ProjectStatusBadge } from "@/components/projects/StatusBadge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { PROJECT_STATUS_MAP, type ProjectStatus } from "@/types"

export interface ProjectRow {
  id: string
  project_number: string
  owner_name: string
  address: string
  total_contract_value: number
  contract_date: string | null
  status: ProjectStatus
}

interface Props {
  projects: ProjectRow[]
  totalCount: number
}

export function ProjectsTable({ projects, totalCount }: Props) {
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<ProjectStatus | "all">("all")

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      if (status !== "all" && p.status !== status) return false
      if (!search.trim()) return true
      const q = search.trim().toLowerCase()
      return (
        p.project_number.toLowerCase().includes(q) ||
        p.owner_name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q)
      )
    })
  }, [projects, search, status])

  return (
    <div className="bg-surface rounded-2xl shadow-card border border-border overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-border">
        <h2 className="font-display font-bold text-text-primary text-base flex-1">
          المشاريع
        </h2>

        <div className="relative w-full sm:w-56">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <Input
            placeholder="بحث..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pe-9 text-sm"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus | "all")}>
          <SelectTrigger className="h-9 w-full sm:w-40 text-sm gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-text-muted" />
            <SelectValue placeholder="تصفية" />
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

        <Button asChild className="h-9 gap-1.5 w-full sm:w-auto">
          <Link href="/projects/new">
            <Plus className="w-4 h-4" />
            مشروع جديد
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-start px-4 py-2.5 font-medium text-text-muted text-xs whitespace-nowrap">
                رقم المشروع
              </th>
              <th className="text-start px-4 py-2.5 font-medium text-text-muted text-xs whitespace-nowrap">
                المالك
              </th>
              <th className="text-start px-4 py-2.5 font-medium text-text-muted text-xs whitespace-nowrap">
                العنوان
              </th>
              <th className="text-start px-4 py-2.5 font-medium text-text-muted text-xs whitespace-nowrap">
                قيمة العقد
              </th>
              <th className="text-start px-4 py-2.5 font-medium text-text-muted text-xs whitespace-nowrap">
                تاريخ العقد
              </th>
              <th className="text-start px-4 py-2.5 font-medium text-text-muted text-xs whitespace-nowrap">
                الحالة
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-text-muted text-sm">
                  {search || status !== "all"
                    ? "لا توجد نتائج مطابقة"
                    : "لا توجد مشاريع بعد"}
                </td>
              </tr>
            ) : (
              filtered.map((project) => (
                <tr key={project.id} className="hover:bg-surface-muted transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-mono text-primary font-medium whitespace-nowrap hover:underline"
                    >
                      {project.project_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-primary font-medium whitespace-nowrap">
                    {project.owner_name}
                  </td>
                  <td className="px-4 py-3 text-text-secondary max-w-56 truncate">
                    {project.address}
                  </td>
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap tabular-nums">
                    {formatCurrency(project.total_contract_value)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap tabular-nums">
                    {project.contract_date ? formatDate(project.contract_date) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ProjectStatusBadge status={project.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <p className="text-xs text-text-muted">
          عرض {filtered.length} من {totalCount} مشروع
        </p>
        <Link href="/projects" className="text-xs font-medium text-primary hover:underline">
          عرض جميع المشاريع
        </Link>
      </div>
    </div>
  )
}
