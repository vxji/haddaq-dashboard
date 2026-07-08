"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Grid3x3,
  List,
  Search,
  Filter,
  X,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface CalEvent {
  id: string
  title: string
  description?: string
  startTime: Date
  endTime: Date
  color: string
  category?: string
  person?: string
  readonly?: boolean
}

export interface EventManagerProps {
  events?: CalEvent[]
  onEventCreate?: (event: Omit<CalEvent, "id">) => void
  onEventUpdate?: (id: string, event: Partial<CalEvent>) => void
  onEventDelete?: (id: string) => void
  categories?: string[]
  colors?: { name: string; value: string; bg: string }[]
  defaultView?: "month" | "week" | "day" | "list"
  className?: string
  /** Extra filter control rendered next to the built-in category filter (e.g. project/engineer filters). */
  filterSlot?: React.ReactNode
  /** Extra removable filter badges shown alongside the category badges in the "active filters" row. */
  extraActiveFilters?: { key: string; label: string; onRemove: () => void }[]
}

const defaultColors = [
  { name: "أحمر", value: "#dc2626", bg: "bg-red-600" },
  { name: "أزرق", value: "#2554eb", bg: "bg-blue-600" },
  { name: "برتقالي", value: "#d97706", bg: "bg-amber-600" },
  { name: "أخضر", value: "#16a34a", bg: "bg-green-600" },
  { name: "بنفسجي", value: "#7c3aed", bg: "bg-violet-600" },
  { name: "وردي", value: "#db2777", bg: "bg-pink-600" },
]

const DAYS_AR = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"]
const DAYS_AR_SHORT = ["أح", "إث", "ثل", "أر", "خم", "جم", "سب"]

function formatDateAR(date: Date) {
  return date.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
}

function formatTimeAR(date: Date) {
  return date.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
}

export function EventManager({
  events: initialEvents = [],
  onEventCreate,
  onEventUpdate,
  onEventDelete,
  categories = ["اجتماع", "مهمة", "موعد تسليم", "إنجاز"],
  colors = defaultColors,
  defaultView = "month",
  className,
  filterSlot,
  extraActiveFilters = [],
}: EventManagerProps) {
  const [events, setEvents] = useState<CalEvent[]>(initialEvents)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"month" | "week" | "day" | "list">(defaultView)
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [draggedEvent, setDraggedEvent] = useState<CalEvent | null>(null)
  const [newEvent, setNewEvent] = useState<Partial<CalEvent>>({
    title: "",
    description: "",
    color: colors[0].value,
    category: categories[0],
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  const filteredEvents = useMemo(
    () =>
      events.filter((e) => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          if (
            !e.title.toLowerCase().includes(q) &&
            !e.description?.toLowerCase().includes(q) &&
            !e.person?.toLowerCase().includes(q)
          )
            return false
        }
        if (selectedCategories.length && e.category && !selectedCategories.includes(e.category))
          return false
        return true
      }),
    [events, searchQuery, selectedCategories]
  )

  const handleCreateEvent = useCallback(() => {
    if (!newEvent.title || !newEvent.startTime || !newEvent.endTime) return
    const ev: CalEvent = {
      id: Math.random().toString(36).slice(2),
      title: newEvent.title,
      description: newEvent.description,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      color: newEvent.color || colors[0].value,
      category: newEvent.category,
    }
    setEvents((p) => [...p, ev])
    onEventCreate?.(ev)
    setIsDialogOpen(false)
    setIsCreating(false)
    setNewEvent({ title: "", description: "", color: colors[0].value, category: categories[0] })
  }, [newEvent, colors, categories, onEventCreate])

  const handleUpdateEvent = useCallback(() => {
    if (!selectedEvent) return
    setEvents((p) => p.map((e) => (e.id === selectedEvent.id ? selectedEvent : e)))
    onEventUpdate?.(selectedEvent.id, selectedEvent)
    setIsDialogOpen(false)
    setSelectedEvent(null)
  }, [selectedEvent, onEventUpdate])

  const handleDeleteEvent = useCallback(
    (id: string) => {
      setEvents((p) => p.filter((e) => e.id !== id))
      onEventDelete?.(id)
      setIsDialogOpen(false)
      setSelectedEvent(null)
    },
    [onEventDelete]
  )

  const handleDragStart = useCallback((e: CalEvent) => setDraggedEvent(e), [])
  const handleDragEnd = useCallback(() => setDraggedEvent(null), [])

  const handleDrop = useCallback(
    (date: Date, hour?: number) => {
      if (!draggedEvent) return
      const dur = draggedEvent.endTime.getTime() - draggedEvent.startTime.getTime()
      const start = new Date(date)
      if (hour !== undefined) start.setHours(hour, 0, 0, 0)
      const updated = { ...draggedEvent, startTime: start, endTime: new Date(start.getTime() + dur) }
      setEvents((p) => p.map((e) => (e.id === draggedEvent.id ? updated : e)))
      onEventUpdate?.(draggedEvent.id, updated)
      setDraggedEvent(null)
    },
    [draggedEvent, onEventUpdate]
  )

  const navigate = useCallback(
    (dir: "prev" | "next") => {
      setCurrentDate((prev) => {
        const d = new Date(prev)
        const delta = dir === "next" ? 1 : -1
        if (view === "month") d.setMonth(d.getMonth() + delta)
        else if (view === "week") d.setDate(d.getDate() + delta * 7)
        else d.setDate(d.getDate() + delta)
        return d
      })
    },
    [view]
  )

  function headerTitle() {
    if (view === "month")
      return currentDate.toLocaleDateString("ar-SA", { month: "long", year: "numeric" })
    if (view === "week") {
      const start = new Date(currentDate)
      start.setDate(currentDate.getDate() - currentDate.getDay())
      return `أسبوع ${start.toLocaleDateString("ar-SA", { month: "short", day: "numeric" })}`
    }
    if (view === "day")
      return currentDate.toLocaleDateString("ar-SA", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    return "جميع الأحداث"
  }

  const viewBtns = [
    { key: "month", icon: Calendar, label: "شهر" },
    { key: "week",  icon: Grid3x3, label: "أسبوع" },
    { key: "day",   icon: Clock,   label: "يوم" },
    { key: "list",  icon: List,    label: "قائمة" },
  ] as const

  const sharedViewProps = {
    events: filteredEvents,
    onEventClick: (e: CalEvent) => { setSelectedEvent(e); setIsDialogOpen(true) },
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDrop: handleDrop,
  }

  return (
    <div className={cn("flex flex-col gap-4", className)} dir="rtl">
      {/* ─── Header ─── */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          {/* Fixed-width title so nav buttons never shift */}
          <h2 className="font-display text-xl font-bold text-text-primary sm:text-2xl min-w-[9rem] sm:min-w-[11.5rem] whitespace-nowrap">
            {headerTitle()}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="icon" onClick={() => navigate("prev")} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              اليوم
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate("next")} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Mobile select */}
          <div className="sm:hidden">
            <Select value={view} onValueChange={(v: typeof view) => setView(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {viewBtns.map(({ key, label }) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Desktop tabs */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border bg-background p-1">
            {viewBtns.map(({ key, icon: Icon, label }) => (
              <Button
                key={key}
                variant={view === key ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setView(key)}
                className="h-8 gap-1.5"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>

          <Button
            onClick={() => { setIsCreating(true); setIsDialogOpen(true) }}
            className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary-dark"
          >
            <Plus className="h-4 w-4" />
            حدث جديد
          </Button>
        </div>
      </div>

      {/* ─── Search & filter ─── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="بحث في الأحداث..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pe-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute start-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              الفئات
              {selectedCategories.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5">
                  {selectedCategories.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>تصفية حسب الفئة</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {categories.map((cat) => (
              <DropdownMenuCheckboxItem
                key={cat}
                checked={selectedCategories.includes(cat)}
                onCheckedChange={(c) =>
                  setSelectedCategories((p) =>
                    c ? [...p, cat] : p.filter((x) => x !== cat)
                  )
                }
              >
                {cat}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {filterSlot}

        {selectedCategories.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setSelectedCategories([])} className="gap-1.5">
            <X className="h-4 w-4" />
            مسح الفلاتر
          </Button>
        )}
      </div>

      {/* ─── Active filters ─── */}
      {(selectedCategories.length > 0 || extraActiveFilters.length > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-text-muted">الفلاتر النشطة:</span>
          {selectedCategories.map((cat) => (
            <Badge key={cat} variant="secondary" className="gap-1">
              {cat}
              <button onClick={() => setSelectedCategories((p) => p.filter((c) => c !== cat))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {extraActiveFilters.map((f) => (
            <Badge key={f.key} variant="secondary" className="gap-1">
              {f.label}
              <button onClick={f.onRemove}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* ─── Views ─── */}
      {view === "month" && <MonthView currentDate={currentDate} {...sharedViewProps} />}
      {view === "week"  && <WeekView  currentDate={currentDate} {...sharedViewProps} />}
      {view === "day"   && <DayView   currentDate={currentDate} {...sharedViewProps} />}
      {view === "list"  && <ListView  {...sharedViewProps} />}

      {/* ─── Event detail / create dialog ─── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? "إضافة حدث" : "تفاصيل الحدث"}</DialogTitle>
            <DialogDescription>
              {isCreating ? "أضف حدثاً جديداً إلى التقويم" : "عرض وتعديل الحدث"}
            </DialogDescription>
          </DialogHeader>

          {/* Readonly task notice */}
          {!isCreating && selectedEvent?.readonly && (
            <div className="rounded-lg bg-primary-soft border border-primary/20 px-3 py-2 text-sm text-primary">
              هذه مهمة من المشروع — تُدار من صفحة المشروع مباشرة.
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>العنوان</Label>
              <Input
                value={isCreating ? newEvent.title : selectedEvent?.title}
                disabled={!isCreating && selectedEvent?.readonly}
                onChange={(e) =>
                  isCreating
                    ? setNewEvent((p) => ({ ...p, title: e.target.value }))
                    : setSelectedEvent((p) => p ? { ...p, title: e.target.value } : null)
                }
                placeholder="عنوان الحدث"
              />
            </div>

            <div className="space-y-1.5">
              <Label>الوصف</Label>
              <Textarea
                rows={2}
                value={isCreating ? newEvent.description : selectedEvent?.description}
                disabled={!isCreating && selectedEvent?.readonly}
                onChange={(e) =>
                  isCreating
                    ? setNewEvent((p) => ({ ...p, description: e.target.value }))
                    : setSelectedEvent((p) => p ? { ...p, description: e.target.value } : null)
                }
                placeholder="تفاصيل إضافية..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>تاريخ البداية</Label>
                <Input
                  type="datetime-local"
                  dir="ltr"
                  disabled={!isCreating && selectedEvent?.readonly}
                  value={toLocalInput(isCreating ? newEvent.startTime : selectedEvent?.startTime)}
                  onChange={(e) => {
                    const d = new Date(e.target.value)
                    isCreating
                      ? setNewEvent((p) => ({ ...p, startTime: d }))
                      : setSelectedEvent((p) => p ? { ...p, startTime: d } : null)
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="datetime-local"
                  dir="ltr"
                  disabled={!isCreating && selectedEvent?.readonly}
                  value={toLocalInput(isCreating ? newEvent.endTime : selectedEvent?.endTime)}
                  onChange={(e) => {
                    const d = new Date(e.target.value)
                    isCreating
                      ? setNewEvent((p) => ({ ...p, endTime: d }))
                      : setSelectedEvent((p) => p ? { ...p, endTime: d } : null)
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>الفئة</Label>
                <Select
                  disabled={!isCreating && selectedEvent?.readonly}
                  value={isCreating ? newEvent.category : selectedEvent?.category}
                  onValueChange={(v) =>
                    isCreating
                      ? setNewEvent((p) => ({ ...p, category: v }))
                      : setSelectedEvent((p) => p ? { ...p, category: v } : null)
                  }
                >
                  <SelectTrigger><SelectValue placeholder="اختر فئة" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>اللون</Label>
                <Select
                  disabled={!isCreating && selectedEvent?.readonly}
                  value={isCreating ? newEvent.color : selectedEvent?.color}
                  onValueChange={(v) =>
                    isCreating
                      ? setNewEvent((p) => ({ ...p, color: v }))
                      : setSelectedEvent((p) => p ? { ...p, color: v } : null)
                  }
                >
                  <SelectTrigger><SelectValue placeholder="اختر لوناً" /></SelectTrigger>
                  <SelectContent>
                    {colors.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className="flex items-center gap-2">
                          <span className={cn("h-3.5 w-3.5 rounded-full", c.bg)} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Person info (readonly) */}
            {(isCreating ? false : selectedEvent?.person) && (
              <div className="flex items-center gap-2 text-sm text-text-secondary rounded-lg border border-border px-3 py-2">
                <User className="w-4 h-4 text-text-muted flex-shrink-0" />
                <span>{selectedEvent!.readonly ? "المسؤول: " : "أضافه: "}</span>
                <span className="font-medium">{selectedEvent!.person}</span>
              </div>
            )}
          </div>

          <DialogFooter>
            {!isCreating && !selectedEvent?.readonly && (
              <Button
                variant="destructive"
                onClick={() => selectedEvent && handleDeleteEvent(selectedEvent.id)}
              >
                حذف
              </Button>
            )}
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); setIsCreating(false); setSelectedEvent(null) }}>
              إغلاق
            </Button>
            {(!selectedEvent?.readonly) && (
              <Button
                className="bg-primary hover:bg-primary-dark"
                onClick={isCreating ? handleCreateEvent : handleUpdateEvent}
              >
                {isCreating ? "إضافة" : "حفظ"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function toLocalInput(d?: Date): string {
  if (!d) return ""
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function eventsForDay(events: CalEvent[], date: Date) {
  return events.filter((e) => {
    const s = new Date(e.startTime)
    return s.getDate() === date.getDate() && s.getMonth() === date.getMonth() && s.getFullYear() === date.getFullYear()
  })
}

function eventsForHour(events: CalEvent[], date: Date, hour: number) {
  return eventsForDay(events, date).filter((e) => new Date(e.startTime).getHours() === hour)
}

// ─── EventPill ────────────────────────────────────────────────────────────────

function EventPill({
  event,
  onEventClick,
  onDragStart,
  onDragEnd,
  compact = false,
}: {
  event: CalEvent
  onEventClick: (e: CalEvent) => void
  onDragStart: (e: CalEvent) => void
  onDragEnd: () => void
  compact?: boolean
}) {
  return (
    <div
      draggable={!event.readonly}
      onDragStart={() => onDragStart(event)}
      onDragEnd={onDragEnd}
      onClick={() => onEventClick(event)}
      className={cn(
        "cursor-pointer rounded px-1.5 py-0.5 text-white transition-all hover:brightness-90 hover:shadow-md",
        compact ? "text-[11px]" : "text-xs"
      )}
      style={{ backgroundColor: event.color }}
    >
      <p className="font-medium truncate leading-tight">{event.title}</p>
      {event.person && (
        <p className="text-white/80 text-[10px] leading-tight truncate">👤 {event.person}</p>
      )}
    </div>
  )
}

// ─── Shared props type ────────────────────────────────────────────────────────

type ViewProps = {
  events: CalEvent[]
  onEventClick: (e: CalEvent) => void
  onDragStart: (e: CalEvent) => void
  onDragEnd: () => void
  onDrop: (date: Date, hour?: number) => void
}

// ─── Month View ───────────────────────────────────────────────────────────────

function MonthView({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop }: ViewProps & { currentDate: Date }) {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const days: Date[] = []
  const cur = new Date(startDate)
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }

  const today = new Date()

  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="grid grid-cols-7 border-b bg-surface-subtle">
        {DAYS_AR.map((d) => (
          <div key={d} className="border-s px-2 py-2 text-center text-xs font-semibold text-text-secondary first:border-s-0">
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d.charAt(0)}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const dayEvts = eventsForDay(events, day)
          const isCurrentMonth = day.getMonth() === currentDate.getMonth()
          const isToday = day.toDateString() === today.toDateString()

          return (
            <div
              key={i}
              className={cn(
                "min-h-20 border-b border-s p-1 sm:min-h-24 sm:p-2 transition-colors first-in-row:border-s-0",
                !isCurrentMonth && "bg-surface-muted/50 text-text-muted",
                "hover:bg-surface-subtle cursor-pointer"
              )}
              style={{ borderInlineStartWidth: i % 7 === 0 ? 0 : undefined }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(day)}
            >
              <div className={cn(
                "mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:text-sm",
                isToday && "bg-primary text-white font-bold",
                !isToday && isCurrentMonth && "text-text-primary",
                !isCurrentMonth && "text-text-muted"
              )}>
                {day.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvts.slice(0, 3).map((e) => (
                  <EventPill key={e.id} event={e} onEventClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} compact />
                ))}
                {dayEvts.length > 3 && (
                  <p className="text-[10px] text-text-muted ps-1">+{dayEvts.length - 3} أخرى</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Week View ────────────────────────────────────────────────────────────────

function WeekView({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop }: ViewProps & { currentDate: Date }) {
  const start = new Date(currentDate)
  start.setDate(currentDate.getDate() - currentDate.getDay())

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const hours = Array.from({ length: 24 }, (_, i) => i)
  const today = new Date()

  return (
    <Card className="overflow-auto rounded-2xl">
      <div className="grid border-b bg-surface-subtle" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        <div className="border-s p-2 text-xs text-text-muted" />
        {weekDays.map((day) => {
          const isToday = day.toDateString() === today.toDateString()
          return (
            <div key={day.toISOString()} className={cn("border-s p-2 text-center text-xs font-semibold", isToday && "text-primary")}>
              <div>{DAYS_AR_SHORT[day.getDay()]}</div>
              <div className={cn("mx-auto mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs",
                isToday && "bg-primary text-white font-bold"
              )}>
                {day.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
        {hours.map((hour) => (
          <>
            <div key={`t-${hour}`} className="border-b border-s p-1 text-[10px] text-text-muted text-center">
              {`${hour.toString().padStart(2,"0")}:00`}
            </div>
            {weekDays.map((day) => (
              <div
                key={`${day.toISOString()}-${hour}`}
                className="min-h-12 border-b border-s p-0.5 transition-colors hover:bg-surface-subtle"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(day, hour)}
              >
                {eventsForHour(events, day, hour).map((e) => (
                  <EventPill key={e.id} event={e} onEventClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                ))}
              </div>
            ))}
          </>
        ))}
      </div>
    </Card>
  )
}

// ─── Day View ─────────────────────────────────────────────────────────────────

function DayView({ currentDate, events, onEventClick, onDragStart, onDragEnd, onDrop }: ViewProps & { currentDate: Date }) {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <Card className="overflow-auto rounded-2xl">
      {hours.map((hour) => {
        const hourEvts = eventsForHour(events, currentDate, hour)
        return (
          <div
            key={hour}
            className="flex border-b last:border-b-0 hover:bg-surface-subtle transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(currentDate, hour)}
          >
            <div className="w-14 flex-shrink-0 border-s p-2 text-xs text-text-muted text-center">
              {`${hour.toString().padStart(2,"0")}:00`}
            </div>
            <div className="min-h-16 flex-1 p-1.5 space-y-1">
              {hourEvts.map((e) => (
                <EventPill key={e.id} event={e} onEventClick={onEventClick} onDragStart={onDragStart} onDragEnd={onDragEnd} />
              ))}
            </div>
          </div>
        )
      })}
    </Card>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({ events, onEventClick, onDragStart, onDragEnd }: Omit<ViewProps, "onDrop">) {
  const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  if (!sorted.length) {
    return (
      <Card className="rounded-2xl">
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
          <Calendar className="w-10 h-10 opacity-30" />
          <p className="text-sm">لا توجد أحداث</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl overflow-hidden">
      <div className="divide-y divide-border">
        {sorted.map((event) => (
          <div
            key={event.id}
            onClick={() => onEventClick(event)}
            className="flex items-start gap-3 px-4 py-3 hover:bg-surface-subtle cursor-pointer transition-colors"
          >
            <div className="w-1.5 h-full min-h-10 rounded-full flex-shrink-0 self-stretch" style={{ backgroundColor: event.color }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-text-primary">{event.title}</p>
                {event.category && (
                  <Badge variant="secondary" className="text-[11px] flex-shrink-0">{event.category}</Badge>
                )}
              </div>
              {event.description && (
                <p className="text-xs text-text-muted mt-0.5 truncate">{event.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-text-secondary flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDateAR(event.startTime)}
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTimeAR(event.startTime)}
                </span>
                {event.person && (
                  <span className="text-xs text-text-secondary flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {event.person}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
