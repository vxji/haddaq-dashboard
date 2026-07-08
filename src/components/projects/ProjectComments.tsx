"use client"

import { useState, useEffect } from "react"
import { Send, Reply, ChevronDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { Comment, Profile } from "@/types"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Props {
  projectId: string
  profile: Profile | null
}

export function ProjectComments({ projectId, profile }: Props) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [sending, setSending] = useState(false)

  const supabase = createClient()

  async function loadComments() {
    const { data } = await supabase
      .from("comments")
      .select("*, author:profiles!comments_created_by_fkey(id, full_name)")
      .eq("project_id", projectId)
      .is("parent_id", null)
      .order("created_at", { ascending: false })

    if (data) {
      // Load replies
      const withReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await supabase
            .from("comments")
            .select("*, author:profiles!comments_created_by_fkey(id, full_name)")
            .eq("parent_id", comment.id)
            .order("created_at")
          return { ...comment, replies: replies || [] }
        })
      )
      setComments(withReplies as Comment[])
    }
    setLoading(false)
  }

  useEffect(() => { loadComments() }, [projectId])

  async function sendComment() {
    if (!newComment.trim() || !profile) return
    setSending(true)

    const { error } = await supabase.from("comments").insert({
      project_id: projectId,
      parent_id: replyTo?.id || null,
      content: newComment.trim(),
      created_by: profile.id,
    })

    if (error) {
      toast.error("فشل الإرسال")
    } else {
      fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: "ملاحظة جديدة",
          body: `تمت إضافة ملاحظة: "${newComment.trim().slice(0, 80)}"`,
          excludeUserId: profile?.id,
        }),
      }).catch(() => {})
      setNewComment("")
      setReplyTo(null)
      loadComments()
    }
    setSending(false)
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
      {/* New comment form */}
      <div className="bg-surface rounded-xl p-5 border border-border shadow-card">
        {replyTo && (
          <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 mb-3">
            <p className="text-xs text-primary">
              رداً على: {replyTo.author?.full_name} — &quot;{replyTo.content.slice(0, 60)}...&quot;
            </p>
            <button
              onClick={() => setReplyTo(null)}
              className="text-text-muted hover:text-text-primary text-xs"
            >
              ✕
            </button>
          </div>
        )}
        <Textarea
          placeholder={replyTo ? "اكتب ردك..." : "اكتب ملاحظة جديدة..."}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="resize-none mb-3"
        />
        <div className="flex justify-end">
          <Button
            onClick={sendComment}
            disabled={sending || !newComment.trim()}
            className="bg-primary hover:bg-primary-dark gap-2"
            size="sm"
          >
            <Send className="w-4 h-4" />
            {replyTo ? "إرسال الرد" : "إضافة ملاحظة"}
          </Button>
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="bg-surface rounded-xl p-10 text-center text-text-muted text-sm border border-border shadow-card">
          لا توجد ملاحظات بعد. كن أول من يضيف ملاحظة!
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              profile={profile}
              onReply={() => setReplyTo(comment)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CommentItem({
  comment,
  profile,
  onReply,
  isReply = false,
}: {
  comment: Comment
  profile: Profile | null
  onReply: () => void
  isReply?: boolean
}) {
  const initials = comment.author?.full_name?.charAt(0) || "?"
  const isOwn = comment.author?.id === profile?.id

  return (
    <div className={cn("bg-surface rounded-xl border border-border shadow-card overflow-hidden", isReply && "ms-8 border-s-4 border-s-primary/30 rounded-s-none")}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback className="bg-primary text-white text-sm font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-text-primary">
                {comment.author?.full_name || "مجهول"}
              </span>
              {isOwn && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  أنت
                </span>
              )}
              <span className="text-xs text-text-muted ms-auto">
                {formatDateTime(comment.created_at)}
              </span>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
              {comment.content}
            </p>
            {!isReply && (
              <button
                onClick={onReply}
                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Reply className="w-3 h-3" />
                رد
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="border-t border-border bg-surface-muted/30 p-3 space-y-3">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              profile={profile}
              onReply={onReply}
              isReply
            />
          ))}
        </div>
      )}
    </div>
  )
}
