"use client"

import { useState, useEffect } from "react"
import {
  Download,
  Trash2,
  FileText,
  Image,
  File,
  ExternalLink,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { FileUpload } from "@/components/shared/FileUpload"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { STAGE_CONFIG } from "@/types"
import type { ProjectFile, Profile, StageType } from "@/types"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"

interface Props {
  projectId: string
  profile: Profile | null
}

function getFileIcon(type: string) {
  if (type.startsWith("image/")) return Image
  if (type.includes("pdf")) return FileText
  return File
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ProjectFiles({ projectId, profile }: Props) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteFile, setDeleteFile] = useState<ProjectFile | null>(null)
  const [deleting, setDeleting] = useState(false)

  const supabase = createClient()

  async function loadFiles() {
    const { data } = await supabase
      .from("files")
      .select("*, uploader:profiles!files_uploaded_by_fkey(full_name)")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })

    setFiles((data as ProjectFile[]) || [])
    setLoading(false)
  }

  useEffect(() => { loadFiles() }, [projectId])

  async function handleDelete() {
    if (!deleteFile) return
    setDeleting(true)

    // Delete from storage
    const url = deleteFile.file_url
    const path = url.split("/project-files/")[1]
    if (path) {
      await supabase.storage.from("project-files").remove([path])
    }

    const { error } = await supabase
      .from("files")
      .delete()
      .eq("id", deleteFile.id)

    if (error) {
      toast.error("فشل الحذف")
    } else {
      toast.success("تم حذف الملف")
      setDeleteFile(null)
      loadFiles()
    }
    setDeleting(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload section */}
      <div className="bg-surface rounded-xl p-6 border border-border shadow-card">
        <h3 className="font-semibold text-text-primary mb-3">رفع ملف جديد</h3>
        <FileUpload
          projectId={projectId}
          onUpload={() => { toast.success("تم رفع الملف"); loadFiles() }}
        />
      </div>

      {/* Files list */}
      <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">
            الملفات المرفوعة ({files.length})
          </h3>
        </div>

        {files.length === 0 ? (
          <div className="py-10 text-center text-text-muted text-sm">
            لا توجد ملفات بعد
          </div>
        ) : (
          <div className="divide-y divide-border">
            {files.map((file) => {
              const Icon = getFileIcon(file.file_type)
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 hover:bg-surface-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {file.file_name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatSize(file.file_size)} •{" "}
                      {file.uploader?.full_name || "—"} •{" "}
                      {formatDateTime(file.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <a
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button size="icon" variant="ghost" className="h-8 w-8">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                    {(profile?.role === "admin" ||
                      file.uploaded_by === profile?.id) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-danger"
                        onClick={() => setDeleteFile(file)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteFile}
        onClose={() => setDeleteFile(null)}
        onConfirm={handleDelete}
        title="حذف الملف"
        description={`هل أنت متأكد من حذف "${deleteFile?.file_name}"؟`}
        confirmLabel="حذف"
        loading={deleting}
      />
    </div>
  )
}
