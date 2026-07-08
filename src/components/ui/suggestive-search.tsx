"use client"

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Search } from "lucide-react"

export interface EffectRendererProps {
  text: string
  isActive: boolean
  allowDelete?: boolean
  typeDurationMs: number
  deleteDurationMs: number
  pauseAfterTypeMs: number
  prefersReducedMotion?: boolean
  onDeleteComplete?: () => void
  containerRef?: RefObject<HTMLElement | null>
}

export type BuiltinEffect = "typewriter" | "slide" | "fade" | "none"

export interface SuggestiveSearchProps {
  onChange?: (val: string) => void
  suggestions?: string[]
  className?: string
  Leading?: () => React.JSX.Element
  showLeading?: boolean
  Trailing?: () => React.JSX.Element
  showTrailing?: boolean
  effect?: BuiltinEffect
  EffectComponent?: React.ComponentType<EffectRendererProps>
  typeDurationMs?: number
  deleteDurationMs?: number
  pauseAfterTypeMs?: number
  animateMode?: "infinite" | "once"
}

export const TypewriterEffect: React.FC<EffectRendererProps> = ({
  text,
  isActive,
  allowDelete = true,
  typeDurationMs,
  deleteDurationMs,
  pauseAfterTypeMs,
  prefersReducedMotion,
  onDeleteComplete,
  containerRef,
}) => {
  const [phase, setPhase] = useState<"typing" | "paused" | "deleting">("typing")
  const timers = useRef<number[]>([])

  useEffect(() => {
    setPhase("typing")
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    return () => {
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    }
  }, [text, isActive, allowDelete])

  useEffect(() => {
    if (!isActive) {
      setPhase("typing")
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive || !prefersReducedMotion || !allowDelete) return
    const t = window.setTimeout(() => onDeleteComplete?.(), Math.max(200, pauseAfterTypeMs))
    timers.current.push(t)
    return () => window.clearTimeout(t)
  }, [isActive, prefersReducedMotion, allowDelete, pauseAfterTypeMs, onDeleteComplete])

  if (!isActive) return null

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement> | undefined}
      style={{ display: "inline-block", overflow: "hidden", whiteSpace: "nowrap", alignItems: "center" }}
    >
      {prefersReducedMotion ? (
        <span className="text-sm text-muted-foreground select-none">{text}</span>
      ) : (
        <motion.div
          key={text}
          initial={{ width: "0%" }}
          animate={
            phase === "typing" ? { width: "100%" } : phase === "deleting" ? { width: "0%" } : { width: "100%" }
          }
          transition={
            phase === "typing"
              ? { duration: typeDurationMs / 1000, ease: "linear" }
              : phase === "deleting"
              ? { duration: deleteDurationMs / 1000, ease: "linear" }
              : {}
          }
          onAnimationComplete={() => {
            if (phase === "typing") {
              setPhase("paused")
              if (allowDelete) {
                const t = window.setTimeout(() => setPhase("deleting"), pauseAfterTypeMs)
                timers.current.push(t)
              }
            } else if (phase === "deleting") {
              onDeleteComplete?.()
            }
          }}
          style={{ display: "inline-flex", alignItems: "center", overflow: "hidden", whiteSpace: "nowrap" }}
        >
          <span className="text-sm text-muted-foreground select-none">{text}</span>

          <motion.span
            aria-hidden
            style={{ display: "inline-block", width: 1, marginLeft: 4, height: "1.1em", verticalAlign: "middle" }}
            className="bg-muted-foreground"
            animate={phase === "typing" || phase === "paused" ? { opacity: [0, 1, 0] } : { opacity: 0 }}
            transition={
              phase === "typing" || phase === "paused"
                ? { repeat: Infinity, duration: 0.9, ease: "linear" }
                : { duration: 0.1 }
            }
          />
        </motion.div>
      )}
    </div>
  )
}

export const SlideEffect: React.FC<EffectRendererProps> = ({
  text,
  isActive,
  allowDelete = true,
  typeDurationMs,
  deleteDurationMs,
  pauseAfterTypeMs,
  prefersReducedMotion,
  onDeleteComplete,
  containerRef,
}) => {
  const [phase, setPhase] = useState<"enter" | "pause" | "exit">("enter")
  const timers = useRef<number[]>([])

  useEffect(() => {
    setPhase("enter")
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    return () => {
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    }
  }, [text, isActive, allowDelete])

  useEffect(() => {
    if (!isActive) {
      setPhase("enter")
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive || !prefersReducedMotion || !allowDelete) return
    const t = window.setTimeout(() => onDeleteComplete?.(), Math.max(200, pauseAfterTypeMs))
    timers.current.push(t)
    return () => window.clearTimeout(t)
  }, [isActive, prefersReducedMotion, allowDelete, pauseAfterTypeMs, onDeleteComplete])

  if (!isActive) return null

  if (prefersReducedMotion) {
    return <span className="text-sm text-muted-foreground select-none">{text}</span>
  }

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement> | undefined}
      style={{ overflow: "hidden", display: "inline-block", whiteSpace: "nowrap", alignItems: "center" }}
    >
      <motion.div
        key={text}
        initial={{ y: "-100%" }}
        animate={phase === "enter" ? { y: "0%" } : phase === "exit" ? { y: "100%" } : { y: "0%" }}
        transition={
          phase === "enter"
            ? { duration: typeDurationMs / 1000, ease: "easeOut" }
            : { duration: deleteDurationMs / 1000, ease: "easeIn" }
        }
        onAnimationComplete={() => {
          if (phase === "enter") {
            setPhase("pause")
            if (allowDelete) {
              const t = window.setTimeout(() => setPhase("exit"), pauseAfterTypeMs)
              timers.current.push(t)
            }
          } else if (phase === "exit") {
            onDeleteComplete?.()
          }
        }}
        style={{ display: "inline-block" }}
      >
        <span className="text-sm text-muted-foreground select-none">{text}</span>
      </motion.div>
    </div>
  )
}

export const FadeEffect: React.FC<EffectRendererProps> = ({
  text,
  isActive,
  allowDelete = true,
  typeDurationMs,
  deleteDurationMs,
  pauseAfterTypeMs,
  prefersReducedMotion,
  onDeleteComplete,
  containerRef,
}) => {
  const [phase, setPhase] = useState<"fadeIn" | "hold" | "fadeOut">("fadeIn")
  const timers = useRef<number[]>([])

  useEffect(() => {
    setPhase("fadeIn")
    timers.current.forEach(window.clearTimeout)
    timers.current = []
    return () => {
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    }
  }, [text, isActive, allowDelete])

  useEffect(() => {
    if (!isActive) {
      setPhase("fadeIn")
      timers.current.forEach(window.clearTimeout)
      timers.current = []
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive || !prefersReducedMotion || !allowDelete) return
    const t = window.setTimeout(() => onDeleteComplete?.(), Math.max(200, pauseAfterTypeMs))
    timers.current.push(t)
    return () => window.clearTimeout(t)
  }, [isActive, prefersReducedMotion, allowDelete, pauseAfterTypeMs, onDeleteComplete])

  if (!isActive) return null

  if (prefersReducedMotion) {
    return <span className="text-sm text-muted-foreground select-none">{text}</span>
  }

  return (
    <div
      ref={containerRef as RefObject<HTMLDivElement> | undefined}
      style={{ overflow: "hidden", display: "inline-block", whiteSpace: "nowrap" }}
    >
      <motion.div
        key={text}
        initial={{ opacity: 0 }}
        animate={phase === "fadeIn" ? { opacity: 1 } : phase === "fadeOut" ? { opacity: 0 } : { opacity: 1 }}
        transition={phase === "fadeIn" ? { duration: typeDurationMs / 1000 } : { duration: deleteDurationMs / 1000 }}
        onAnimationComplete={() => {
          if (phase === "fadeIn") {
            setPhase("hold")
            if (allowDelete) {
              const t = window.setTimeout(() => setPhase("fadeOut"), pauseAfterTypeMs)
              timers.current.push(t)
            }
          } else if (phase === "fadeOut") {
            onDeleteComplete?.()
          }
        }}
        style={{ display: "inline-block" }}
      >
        <span className="text-sm text-muted-foreground select-none">{text}</span>
      </motion.div>
    </div>
  )
}

const DEFAULT_SUGGESTIONS = [
  "ابحث عن مشروع...",
  "ابحث عن عميل...",
  "ابحث عن رقم عقد...",
  "ابحث عن فاتورة...",
]

export const SuggestiveSearch: React.FC<SuggestiveSearchProps> = ({
  onChange,
  suggestions = DEFAULT_SUGGESTIONS,
  className,
  Leading = () => <Search className="size-4 text-muted-foreground" />,
  showLeading = true,
  Trailing = () => <Search className="size-4 text-muted-foreground" />,
  showTrailing = false,
  effect = "typewriter",
  EffectComponent,
  typeDurationMs = 500,
  deleteDurationMs = 300,
  pauseAfterTypeMs = 1500,
  animateMode = "infinite",
}) => {
  const [search, setSearch] = useState<string>("")
  const [isFocused, setIsFocused] = useState(false)

  const [index, setIndex] = useState<number>(0)
  const current = useMemo(() => suggestions[index] ?? "", [suggestions, index])

  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const leadingRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const trailingRef = useRef<HTMLDivElement | null>(null)

  const [leadOffsetPx, setLeadOffsetPx] = useState<number | null>(null)
  const [trailOffsetPx, setTrailOffsetPx] = useState<number | null>(null)

  const [measuredLongestTextPx, setMeasuredLongestTextPx] = useState<number | null>(null)
  const [availableTextAreaPx, setAvailableTextAreaPx] = useState<number | null>(null)

  const longestSuggestion = useMemo(
    () => suggestions.reduce((a, b) => (a.length > b.length ? a : b), ""),
    [suggestions]
  )

  // Measure padding & leading/trailing icon widths so the animated overlay
  // never renders text underneath them.
  useEffect(() => {
    const wrapper = wrapperRef.current
    const lead = leadingRef.current
    const trail = trailingRef.current
    if (!wrapper) return

    const update = () => {
      const cs = getComputedStyle(wrapper)
      const padStart = parseFloat(cs.paddingInlineStart || cs.paddingRight || "0")
      const padEnd = parseFloat(cs.paddingInlineEnd || cs.paddingLeft || "0")
      const leadW = showLeading ? lead?.getBoundingClientRect().width ?? 0 : 0
      const trailW = showTrailing ? trail?.getBoundingClientRect().width ?? 0 : 0
      const lead_ = padStart + leadW + 8
      setLeadOffsetPx(lead_)
      const trail_ = padEnd + trailW
      setTrailOffsetPx(trail_)

      const wrapperW = wrapper.getBoundingClientRect().width
      const avail = Math.max(0, wrapperW - lead_ - trail_)
      setAvailableTextAreaPx(avail)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(wrapper)
    if (lead) ro.observe(lead)
    if (trail) ro.observe(trail)
    return () => ro.disconnect()
  }, [showLeading, showTrailing])

  useEffect(() => {
    const input = inputRef.current
    if (!longestSuggestion) {
      setMeasuredLongestTextPx(null)
      return
    }

    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      setMeasuredLongestTextPx(null)
      return
    }

    const elForFont = input ?? wrapperRef.current
    if (!elForFont) {
      // Inherit the app's actual font stack rather than defaulting to system-ui.
      ctx.font = `14px ${getComputedStyle(document.body).fontFamily}`
    } else {
      const cs = getComputedStyle(elForFont)
      ctx.font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize} / ${cs.lineHeight} ${cs.fontFamily}`
    }

    const metrics = ctx.measureText(longestSuggestion)
    setMeasuredLongestTextPx(Math.ceil(metrics.width) + 8)
  }, [longestSuggestion])

  const builtinMap: Record<BuiltinEffect, React.ComponentType<any>> = {
    typewriter: TypewriterEffect,
    slide: SlideEffect,
    fade: FadeEffect,
    none: () => null,
  }
  const ChosenEffect = EffectComponent ?? builtinMap[effect]

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  function handleEffectDeleteComplete() {
    setIndex((i) => (i + 1) % suggestions.length)
  }

  const handleInputChange = (val: string) => {
    setSearch(val)
    onChange?.(val)
  }

  const minWidthPx =
    measuredLongestTextPx != null && availableTextAreaPx != null
      ? Math.min(measuredLongestTextPx, availableTextAreaPx)
      : measuredLongestTextPx != null
      ? measuredLongestTextPx
      : undefined

  const overlayActive = !search && !isFocused

  const isLast = index === suggestions.length - 1
  const allowDelete = animateMode === "infinite" ? true : !isLast

  return (
    <div
      ref={wrapperRef}
      dir="rtl"
      className={cn(
        "relative flex items-center gap-x-2 py-2 px-4 border border-border bg-surface-muted rounded-full",
        className
      )}
      style={{ maxWidth: "100%" }}
    >
      {/* Under dir="rtl" a plain `flex` row is mirrored by the browser, so the
          first child (Leading) lands on the visual right — matching RTL search
          box convention — without needing flex-row-reverse. */}
      <div ref={leadingRef} className="flex-shrink-0">
        {showLeading && <Leading />}
      </div>

      <input
        ref={inputRef}
        type="text"
        value={search}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onChange={(e) => handleInputChange(e.target.value)}
        className="bg-transparent outline-none text-sm text-foreground placeholder:text-transparent w-full"
        placeholder=""
        aria-label="بحث"
        style={minWidthPx != null ? { minWidth: `${minWidthPx}px` } : { minWidth: undefined }}
      />

      <div ref={trailingRef} className="flex-shrink-0">
        {showTrailing && Trailing && <Trailing />}
      </div>

      {overlayActive && (
        <div
          ref={overlayRef}
          aria-hidden
          style={{
            position: "absolute",
            // Reserve space on the right for the Leading icon (RTL-mirrored)
            // and on the left for the Trailing icon/padding — the inverse of
            // the original LTR layout.
            right: leadOffsetPx != null ? `${leadOffsetPx}px` : "calc(0.5rem + 1.5rem + 8px)",
            left: trailOffsetPx != null ? `${trailOffsetPx}px` : "0.5rem",
            top: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
            overflow: "hidden",
            whiteSpace: "nowrap",
          }}
        >
          <ChosenEffect
            text={current}
            isActive={overlayActive}
            allowDelete={allowDelete}
            typeDurationMs={typeDurationMs ?? 500}
            deleteDurationMs={deleteDurationMs ?? 300}
            pauseAfterTypeMs={pauseAfterTypeMs ?? 1500}
            prefersReducedMotion={prefersReduced}
            onDeleteComplete={handleEffectDeleteComplete}
            containerRef={overlayRef}
          />
        </div>
      )}
    </div>
  )
}

export default SuggestiveSearch
