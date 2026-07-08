"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { FolderOpen, FileText, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { SuggestiveSearch } from "@/components/ui/suggestive-search"

interface SearchProject {
  id: string
  project_number: string
  name: string
  owner_name: string
}

interface SearchContract {
  id: string
  contract_number: string
  project_id: string
  project: { name: string; project_number: string } | null
}

const SUGGESTIONS = [
  "ابحث عن مشروع...",
  "ابحث عن عميل...",
  "ابحث عن رقم عقد...",
  "ابحث عن فاتورة...",
]

export function HeaderSearch() {
  const [query, setQuery] = useState("")
  const [projects, setProjects] = useState<SearchProject[]>([])
  const [contracts, setContracts] = useState<SearchContract[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const term = query.trim()
    if (!term) {
      setProjects([])
      setContracts([])
      setOpen(false)
      setLoading(false)
      return
    }

    setLoading(true)
    setOpen(true)

    const handle = setTimeout(async () => {
      const supabase = createClient()
      // Strip characters that break PostgREST's .or() filter syntax
      const safe = term.replace(/[,()%]/g, "")

      const [projectsRes, contractsRes] = await Promise.all([
        supabase
          .from("projects")
          .select("id, project_number, name, owner_name")
          .or(`project_number.ilike.%${safe}%,name.ilike.%${safe}%,owner_name.ilike.%${safe}%`)
          .limit(5),
        supabase
          .from("contracts")
          .select("id, contract_number, project_id, project:projects(name, project_number)")
          .ilike("contract_number", `%${safe}%`)
          .limit(5),
      ])

      setProjects((projectsRes.data as SearchProject[]) ?? [])
      setContracts((contractsRes.data as unknown as SearchContract[]) ?? [])
      setLoading(false)
    }, 300)

    return () => clearTimeout(handle)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hasQuery = query.trim().length > 0
  const hasResults = projects.length > 0 || contracts.length > 0

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 max-w-[220px] sm:max-w-xs"
      onFocus={() => {
        if (hasQuery) setOpen(true)
      }}
    >
      <SuggestiveSearch onChange={setQuery} suggestions={SUGGESTIONS} className="w-full" />

      {open && hasQuery && (
        <div className="absolute top-full start-0 mt-2 w-full min-w-[260px] bg-surface border border-border rounded-xl shadow-card z-50 max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-text-muted">
              <Loader2 className="w-4 h-4 animate-spin" />
              جاري البحث...
            </div>
          ) : !hasResults ? (
            <div className="py-6 text-center text-sm text-text-muted">لا توجد نتائج</div>
          ) : (
            <div className="py-1.5">
              {projects.length > 0 && (
                <div>
                  <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold text-text-muted tracking-wide">
                    المشاريع
                  </p>
                  {projects.map((p) => (
                    <Link
                      key={p.id}
                      href={`/projects/${p.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-subtle transition-colors"
                    >
                      <FolderOpen className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <span className="truncate">
                        <span className="text-primary font-medium">{p.project_number}</span>
                        {" — "}
                        {p.name}
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {contracts.length > 0 && (
                <div>
                  <p className="px-3 pt-1.5 pb-1 text-[11px] font-semibold text-text-muted tracking-wide">
                    العقود
                  </p>
                  {contracts.map((c) => (
                    <Link
                      key={c.id}
                      href={`/projects/${c.project_id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-surface-subtle transition-colors"
                    >
                      <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <span className="truncate">
                        <span className="text-primary font-medium">{c.contract_number}</span>
                        {c.project && ` — ${c.project.name}`}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
