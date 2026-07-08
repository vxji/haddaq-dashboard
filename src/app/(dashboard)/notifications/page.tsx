"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import type { Notification } from "@/types"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const TYPE_ICONS: Record<string, string> = {
  stage_completed: "✅",
  comment_added: "💬",
  file_uploaded: "📎",
  project_updated: "📝",
  reminder: "⏰",
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  async function loadNotifications() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("notifications")
      .select("*, project:projects!notifications_project_id_fkey(id, name, project_number)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)

    setNotifications((data as Notification[]) || [])
    setLoading(false)
  }

  useEffect(() => { loadNotifications() }, [])

  async function markAllRead() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)

    loadNotifications()
    toast.success("تم تحديد الكل كمقروء")
  }

  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    )
  }

  async function deleteNotification(id: string) {
    await supabase.from("notifications").delete().eq("id", id)
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  function handleRowClick(n: Notification) {
    if (!n.is_read) markRead(n.id)
    if (n.project) router.push(`/projects/${n.project.id}`)
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">الإشعارات</h1>
          {unreadCount > 0 && (
            <p className="text-text-muted text-sm mt-0.5">{unreadCount} غير مقروء</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllRead} variant="outline" size="sm" className="gap-2">
            <Check className="w-4 h-4" />
            تحديد الكل كمقروء
          </Button>
        )}
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <Bell className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-text-muted text-sm">لا توجد إشعارات</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleRowClick(n)}
                className={cn(
                  "flex items-start gap-4 p-4 hover:bg-surface-muted/50 transition-colors",
                  n.project && "cursor-pointer",
                  !n.is_read && "bg-primary/3"
                )}
              >
                <div className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center text-xl flex-shrink-0">
                  {TYPE_ICONS[n.type] || "🔔"}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm", !n.is_read ? "font-semibold text-text-primary" : "text-text-secondary")}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">{n.body}</p>
                  {n.project && (
                    <Link
                      href={`/projects/${n.project.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-primary hover:underline mt-1 block"
                    >
                      {n.project.project_number} — {n.project.name}
                    </Link>
                  )}
                  <p className="text-xs text-text-muted mt-1">
                    {formatDateTime(n.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.is_read && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-primary"
                      onClick={(e) => { e.stopPropagation(); markRead(n.id) }}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-danger"
                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id) }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
