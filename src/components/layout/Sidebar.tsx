"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderOpen,
  Calendar,
  Bell,
  FileText,
  Activity,
  X,
  ChevronDown,
  LogOut,
  Settings,
  ChevronsRight,
  ChevronsLeft,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Profile } from "@/types"

const workItems = [
  { href: "/", icon: LayoutDashboard, label: "الرئيسية" },
  { href: "/projects", icon: FolderOpen, label: "المشاريع" },
  { href: "/contracts", icon: FileText, label: "العقود" },
  { href: "/calendar", icon: Calendar, label: "التقويم" },
]

const otherItems = [
  { href: "/notifications", icon: Bell, label: "الإشعارات" },
]

const adminItems = [
  { href: "/activity-log", icon: Activity, label: "سجل النشاط" },
  { href: "/settings", icon: Settings, label: "الإعدادات" },
]

interface SidebarProps {
  profile: Profile
  isOpen: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapsed: () => void
}

export function Sidebar({ profile, isOpen, onClose, collapsed, onToggleCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [officeName, setOfficeName] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("company_settings")
      .select("logo_url, office_name")
      .eq("id", 1)
      .single()
      .then(({ data }) => {
        setLogoUrl(data?.logo_url ?? null)
        setOfficeName(data?.office_name || null)
      })
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  function NavLink({
    href,
    icon: Icon,
    label,
  }: {
    href: string
    icon: typeof LayoutDashboard
    label: string
  }) {
    const path = href.split("?")[0]
    const isActive = path === "/" ? pathname === "/" : pathname.startsWith(path)
    return (
      <Link
        href={href}
        onClick={onClose}
        title={collapsed ? label : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          collapsed && "lg:justify-center lg:px-0",
          isActive
            ? "bg-primary-soft text-primary"
            : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
        )}
      >
        <Icon className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={isActive ? 2.25 : 2} />
        <span className={cn(collapsed && "lg:hidden")}>{label}</span>
      </Link>
    )
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 start-0 h-full w-64 bg-surface border-e border-border z-50 flex flex-col",
          "transition-[transform,width] duration-300 ease-in-out",
          "lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen",
          collapsed && "lg:w-[72px]",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className={cn("flex items-center justify-between gap-2 px-4 pt-5 pb-4", collapsed && "lg:justify-center lg:px-2")}>
          <div className="flex items-center gap-2.5 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="شعار المكتب"
                className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="relative w-9 h-9 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="absolute top-1 start-1 w-1.5 h-1.5 border-t border-s border-white/50" />
                <span className="absolute bottom-1 end-1 w-1.5 h-1.5 border-b border-e border-white/50" />
                <span className="font-display font-bold text-white text-base leading-none">ح</span>
              </div>
            )}
            <p className={cn("font-display font-bold text-text-primary text-sm leading-tight truncate", collapsed && "lg:hidden")}>
              {officeName || "مكتب الحداق"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-text-muted hover:text-text-primary p-1 flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={onToggleCollapsed}
          title={collapsed ? "توسيع القائمة" : "طي القائمة"}
          className={cn(
            "hidden lg:flex items-center gap-2 mx-4 mb-3 px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:bg-surface-subtle hover:text-text-primary transition-colors",
            collapsed && "mx-auto justify-center px-2"
          )}
        >
          {collapsed ? <ChevronsLeft className="w-4 h-4" /> : <ChevronsRight className="w-4 h-4" />}
          <span className={cn(collapsed && "hidden")}>طي القائمة</span>
        </button>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-5">
          <div className="space-y-1">
            <p className={cn("text-text-muted text-[11px] font-semibold px-3 pb-1.5 tracking-wide", collapsed && "lg:hidden")}>
              العمل
            </p>
            {workItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>

          <div className="space-y-1">
            <p className={cn("text-text-muted text-[11px] font-semibold px-3 pb-1.5 tracking-wide", collapsed && "lg:hidden")}>
              أخرى
            </p>
            {otherItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
            {profile.role === "admin" &&
              adminItems.map((item) => <NavLink key={item.href} {...item} />)}
          </div>
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                title={collapsed ? profile.full_name : undefined}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-surface-subtle transition-colors text-start",
                  collapsed && "lg:justify-center lg:px-0"
                )}
              >
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-display font-bold text-xs flex-shrink-0">
                  {profile.full_name.charAt(0)}
                </div>
                <div className={cn("flex-1 min-w-0", collapsed && "lg:hidden")}>
                  <p className="text-sm font-medium text-text-primary truncate">
                    {profile.full_name}
                  </p>
                  <p className="text-xs text-text-muted truncate">{profile.email}</p>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-text-muted flex-shrink-0", collapsed && "lg:hidden")} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-56">
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-danger focus:text-danger flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </>
  )
}
