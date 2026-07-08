"use client"

import { useState, useRef } from "react"
import { Upload, X, FileText, Image, File } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn, sanitizeStorageKey } from "@/lib/utils"

const ACCEPTED_TYPES = [
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".dwg", ".dxf", ".zip", ".rar",
]

const MAX_SIZE_MB = 50

interface UploadedFile {
  id: string
  name: string
  url: string
  type: string
  size: number
}

interface Props {
  projectId: string
  stageId?: string
  onUpload?: (file: UploadedFile) => void
  className?: string
  disabled?: boolean
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image
  if (type.includes("pdf")) return FileText
  return File
}

export function FileUpload({ projectId, stageId, onUpload, className, disabled = false }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (disabled) return
    if (!files || files.length === 0) return
    const file = files[0]

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`حجم الملف يتجاوز ${MAX_SIZE_MB}MB`)
      return
    }

    setError(null)
    setUploading(true)
    setProgress(10)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) { setUploading(false); return }

    const ext = file.name.split(".").pop()
    const path = `${projectId}/${sanitizeStorageKey(file.name)}`

    setProgress(30)

    const { data: storageData, error: storageError } = await supabase.storage
      .from("project-files")
      .upload(path, file, { cacheControl: "3600" })

    if (storageError) {
      console.error("storage upload error:", storageError.message)
      setError(`فشل رفع الملف: ${storageError.message}`)
      setUploading(false)
      return
    }

    setProgress(70)

    const { data: urlData } = supabase.storage
      .from("project-files")
      .getPublicUrl(path)

    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert({
        project_id: projectId,
        stage_id: stageId || null,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type || `application/${ext}`,
        file_size: file.size,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      setError("فشل حفظ بيانات الملف.")
    } else if (fileRecord) {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: "ملف جديد",
          body: `تم رفع ملف جديد: ${file.name}`,
          excludeUserId: user.id,
        }),
      }).catch(() => {})
      onUpload?.(fileRecord as UploadedFile)
    }

    setProgress(100)
    setTimeout(() => {
      setUploading(false)
      setProgress(0)
    }, 500)
  }

  return (
    <div className={className}>
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all",
          disabled
            ? "cursor-not-allowed opacity-50 border-border"
            : cn(
                "cursor-pointer",
                dragging
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-surface-subtle"
              )
        )}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!disabled) handleFiles(e.dataTransfer.files)
        }}
        onClick={() => { if (!disabled) inputRef.current?.click() }}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={ACCEPTED_TYPES.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled}
        />

        <Upload className="w-10 h-10 text-text-muted mx-auto mb-3" />
        <p className="text-sm font-medium text-text-secondary mb-1">
          اسحب وأفلت الملف هنا، أو انقر للاختيار
        </p>
        <p className="text-xs text-text-muted">
          PDF, Word, Excel, صور, AutoCAD, ZIP — حتى {MAX_SIZE_MB}MB
        </p>
      </div>

      {uploading && (
        <div className="mt-3 space-y-1">
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-text-muted text-center">جاري الرفع... {progress}%</p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-danger">{error}</p>
      )}
    </div>
  )
}
