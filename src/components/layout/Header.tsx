"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, Bell, ChevronLeft, ChevronRight } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ChatInbox } from "@/components/layout/ChatInbox"
import { HeaderSearch } from "@/components/layout/HeaderSearch"
import { Button } from "@/components/ui/button"
import { AnimatedThemeToggle } from "@/components/ui/animated-theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import type { Profile, Notification } from "@/types"

const PAGE_TITLES: { href: string; label: string }[] = [
  { href: "/projects", label: "المشاريع" },
  { href: "/contracts", label: "العقود" },
  { href: "/calendar", label: "التقويم" },
  { href: "/notifications", label: "الإشعارات" },
  { href: "/activity-log", label: "سجل النشاط" },
  { href: "/settings", label: "الإعدادات" },
]

function usePageTitle() {
  const pathname = usePathname()
  if (pathname === "/") return "الرئيسية"
  return PAGE_TITLES.find((p) => pathname.startsWith(p.href))?.label ?? ""
}

interface HeaderProps {
  profile: Profile
  onMenuClick: () => void
}

export function Header({ profile, onMenuClick }: HeaderProps) {
  const title = usePageTitle()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const supabase = createClient()

    async function loadNotifications() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", profile.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(5)

      if (data) {
        setNotifications(data as Notification[])
        setUnreadCount(data.length)
      }
    }

    loadNotifications()

    const channel = supabase
      .channel("notifications-" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${profile.id}`,
        },
        () => loadNotifications()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [profile.id])

  async function handleNotificationClick(n: Notification) {
    setNotifications((prev) => prev.filter((item) => item.id !== n.id))
    setUnreadCount((prev) => Math.max(0, prev - 1))

    const supabase = createClient()
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id)

    router.push(n.project_id ? `/projects/${n.project_id}` : "/notifications")
  }

  return (
    <header className="sticky top-0 z-30 bg-surface border-b border-border h-14 flex items-center px-4 md:px-6 gap-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ms-2 rounded-lg hover:bg-surface-subtle text-text-secondary"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Back / Forward nav — dir="ltr" so arrows stay in natural left=back right=forward order */}
      <div
        className="hidden sm:flex items-center rounded-lg border border-border bg-surface-muted p-0.5 gap-0.5 flex-shrink-0"
        dir="ltr"
      >
        <button
          onClick={() => window.history.back()}
          title="رجوع"
          className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:bg-surface hover:text-primary hover:shadow-sm transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.history.forward()}
          title="تقدم"
          className="h-7 w-7 rounded-md flex items-center justify-center text-text-muted hover:bg-surface hover:text-primary hover:shadow-sm transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <p className="text-sm font-semibold text-text-primary flex-shrink-0 hidden sm:block truncate max-w-[10rem]">
        {title}
      </p>

      <HeaderSearch />

      <AnimatedThemeToggle />

      <ChatInbox profile={profile} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-text-secondary hover:text-primary h-9 w-9"
          >
            <Bell className="w-[18px] h-[18px]" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-0.5 -start-0.5 h-4.5 w-4.5 p-0 flex items-center justify-center text-[10px] bg-danger border-2 border-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="px-3 py-2 border-b">
            <p className="font-semibold text-sm">الإشعارات</p>
          </div>
          {notifications.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-text-muted">
              لا توجد إشعارات جديدة
            </div>
          ) : (
            notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className="flex flex-col items-start gap-1 py-3 cursor-pointer"
              >
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-text-muted">{n.body}</p>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href="/notifications"
              className="text-center text-sm text-primary justify-center"
            >
              عرض كل الإشعارات
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
