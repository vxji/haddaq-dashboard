"use client"

import { useState, useEffect, useCallback } from "react"
import { MessageCircle, ChevronRight, ArrowRight, X } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ChatRoom } from "@/components/chat/ChatRoom"
import { formatDateTime } from "@/lib/utils"
import { cn } from "@/lib/utils"
import type { Profile } from "@/types"

interface ProjectChat {
  id: string
  name: string
  project_number: string
  last_message: string | null
  last_sender: string | null
  last_time: string | null
  unread: number
}

interface Props {
  profile: Profile
}

export function ChatInbox({ profile }: Props) {
  const [projects, setProjects] = useState<ProjectChat[]>([])
  const [totalUnread, setTotalUnread] = useState(0)
  const [selectedProject, setSelectedProject] = useState<ProjectChat | null>(null)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: projData } = await supabase
      .from("project_summary")
      .select("id, name, project_number")
      .or(`assigned_engineer_id.eq.${profile.id},created_by.eq.${profile.id}`)
      .limit(50)

    if (!projData?.length) return

    const results: ProjectChat[] = await Promise.all(
      projData.map(async (proj) => {
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("id, content, message_type, sent_by, read_by, created_at, sender:profiles!chat_messages_sent_by_fkey(full_name)")
          .eq("project_id", proj.id)
          .order("created_at", { ascending: false })
          .limit(20)

        const last = msgs?.[0]
        const unread = msgs?.filter(
          (m) => !(m.read_by as string[]).includes(profile.id) && m.sent_by !== profile.id
        ).length ?? 0

        let lastMsg = ""
        if (last) {
          if (last.message_type === "image") lastMsg = "📷 صورة"
          else if (last.message_type === "file") lastMsg = "📎 ملف"
          else lastMsg = last.content?.slice(0, 50) ?? ""
        }

        return {
          id: proj.id,
          name: proj.name,
          project_number: proj.project_number,
          last_message: lastMsg || null,
          last_sender: last ? (last.sender as unknown as { full_name: string })?.full_name ?? null : null,
          last_time: last?.created_at ?? null,
          unread,
        }
      })
    )

    results.sort((a, b) => {
      if (!a.last_time) return 1
      if (!b.last_time) return -1
      return b.last_time.localeCompare(a.last_time)
    })

    setProjects(results)
    setTotalUnread(results.reduce((s, p) => s + p.unread, 0))
  }, [profile.id])

  useEffect(() => {
    if (!open) return
    load()

    const supabase = createClient()
    const channel = supabase
      .channel("chat-inbox-" + profile.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, load)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [open, profile.id, load])

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (!v) setSelectedProject(null)
  }

  function handleBackToList() {
    setSelectedProject(null)
    // The conversation just closed may have marked messages read — refresh counts
    load()
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-text-secondary hover:text-primary h-9 w-9"
        >
          <MessageCircle className="w-[18px] h-[18px]" />
          {totalUnread > 0 && (
            <Badge className="absolute -top-0.5 -start-0.5 h-4.5 w-4.5 p-0 flex items-center justify-center text-[10px] bg-primary border-2 border-white">
              {totalUnread > 9 ? "9+" : totalUnread}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-full sm:w-96 p-0 flex flex-col gap-0 [&>button:last-child]:hidden">
        <SheetHeader className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            {selectedProject ? (
              <button
                onClick={handleBackToList}
                className="text-text-secondary hover:text-primary transition-colors flex-shrink-0"
                aria-label="رجوع"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            ) : null}

            <div className="flex-1 min-w-0">
              {selectedProject ? (
                <>
                  <SheetTitle className="text-sm truncate text-start">
                    {selectedProject.name}
                  </SheetTitle>
                  <p className="text-xs text-text-muted text-start">
                    {selectedProject.project_number}
                  </p>
                </>
              ) : (
                <SheetTitle className="text-base text-start">الرسائل</SheetTitle>
              )}
            </div>

            <SheetClose className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <X className="w-5 h-5" />
              <span className="sr-only">إغلاق</span>
            </SheetClose>
          </div>
        </SheetHeader>

        {selectedProject ? (
          <div className="flex-1 overflow-hidden">
            <ChatRoom projectId={selectedProject.id} profile={profile} />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-text-muted text-sm gap-2">
                <MessageCircle className="w-10 h-10 opacity-30" />
                <p>لا توجد محادثات بعد</p>
              </div>
            ) : (
              projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => setSelectedProject(proj)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-surface-muted transition-colors text-start",
                    proj.unread > 0 && "bg-primary-soft/30"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-display font-bold flex-shrink-0">
                    {proj.project_number.slice(-2)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1 mb-0.5">
                      <p className="text-sm font-semibold text-text-primary truncate">{proj.name}</p>
                      {proj.last_time && (
                        <span className="text-[10px] text-text-muted whitespace-nowrap flex-shrink-0">
                          {formatDateTime(proj.last_time)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {proj.last_message
                        ? <>{proj.last_sender && <span className="text-text-secondary">{proj.last_sender}: </span>}{proj.last_message}</>
                        : "لا توجد رسائل بعد"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {proj.unread > 0 && (
                      <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                        {proj.unread}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-text-muted rotate-180" />
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
