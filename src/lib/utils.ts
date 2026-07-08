import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatNumber } from "./format"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return formatNumber(amount, {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
  })
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function generateProjectNumber(year: number, sequence: number): string {
  return `ENG-${year}-${String(sequence).padStart(4, "0")}`
}

// Supabase Storage rejects keys containing non-ASCII characters (e.g. Arabic file names)
export function sanitizeStorageKey(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".")
  const ext = lastDot > -1 ? fileName.slice(lastDot) : ""
  return `${crypto.randomUUID()}${ext}`
}
