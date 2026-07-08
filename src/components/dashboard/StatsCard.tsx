import Link from "next/link"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
  href?: string
  className?: string
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary-soft",
  trend,
  href,
  className,
}: StatsCardProps) {
  const cardClassName = cn(
    "bg-surface rounded-2xl p-5 shadow-card border border-border hover:shadow-md transition-shadow",
    href && "cursor-pointer hover:border-primary/40 active:scale-[0.99]",
    className
  )

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-text-muted font-medium mb-1.5">{title}</p>
          <p className="font-display text-[26px] leading-none font-bold text-text-primary tabular-nums">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-text-muted mt-2">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  "text-xs font-medium",
                  trend.value >= 0 ? "text-status-completed" : "text-danger"
                )}
              >
                {trend.value >= 0 ? "▲" : "▼"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-text-muted">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className={cn(
            "relative w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0",
            iconBg
          )}
        >
          <span
            className={cn(
              "absolute top-1 start-1 w-1.5 h-1.5 border-t border-s opacity-40",
              iconColor
            )}
          />
          <span
            className={cn(
              "absolute bottom-1 end-1 w-1.5 h-1.5 border-b border-e opacity-40",
              iconColor
            )}
          />
          <Icon className={cn("w-5 h-5", iconColor)} strokeWidth={2} />
        </div>
      </div>
    </>
  )

  if (href) {
    return (
      <Link href={href} className={cardClassName}>
        {content}
      </Link>
    )
  }

  return <div className={cardClassName}>{content}</div>
}
