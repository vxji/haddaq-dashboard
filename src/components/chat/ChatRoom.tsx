"use client"

import { useState, useEffect, useRef, useId } from "react"
import { Send, Paperclip, Check, CheckCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { ChatMessage, Profile } from "@/types"
import { formatDateTime, sanitizeStorageKey } from "@/lib/utils"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Props {
  projectId: string
  profile: Profile
}

export function ChatRoom({ projectId, profile }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputId = useId()

  const supabase = createClient()

  async function loadMessages() {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, sender:profiles!chat_messages_sent_by_fkey(id, full_name)")
      .eq("project_id", projectId)
      .order("created_at")
      .limit(100)

    if (data) {
      setMessages(data as ChatMessage[])
      // Mark messages as read
      const unread = data.filter(
        (m) => !m.read_by?.includes(profile.id)
      )
      if (unread.length > 0) {
        await Promise.all(
          unread.map((m) =>
            supabase
              .from("chat_messages")
              .update({ read_by: [...(m.read_by || []), profile.id] })
              .eq("id", m.id)
          )
        )
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    loadMessages()

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `project_id=eq.${projectId}`,
        },
        () => loadMessages()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [projectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function sendMessage(content: string, type: "text" | "image" | "file" = "text", fileUrl?: string) {
    if (!content.trim() && !fileUrl) return
    setSending(true)

    const { error } = await supabase.from("chat_messages").insert({
      project_id: projectId,
      content: content || fileUrl || "",
      message_type: type,
      file_url: fileUrl || null,
      sent_by: profile.id,
      read_by: [profile.id],
    })

    if (error) {
      toast.error("فشل الإرسال")
    } else {
      setText("")
      loadMessages()
    }

    setSending(false)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const path = `${projectId}/chat/${sanitizeStorageKey(file.name)}`

    const { error } = await supabase.storage
      .from("project-files")
      .upload(path, file)

    if (error) { toast.error("فشل رفع الملف"); return }

    const { data: urlData } = supabase.storage
      .from("project-files")
      .getPublicUrl(path)

    const type = file.type.startsWith("image/") ? "image" : "file"
    // reset input so same file can be re-selected
    e.target.value = ""
    await sendMessage(file.name, type, urlData.publicUrl)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(text)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border bg-primary">
        <h3 className="text-white font-semibold">دردشة المشروع</h3>
        <p className="text-blue-200 text-xs">{messages.length} رسالة</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-muted/30">
        {messages.length === 0 ? (
          <div className="text-center text-text-muted text-sm py-8">
            لا توجد رسائل بعد. ابدأ المحادثة!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sent_by === profile.id
            const isRead = msg.read_by?.length > 1

            return (
              <div
                key={msg.id}
                className={cn("flex gap-2", isMe ? "flex-row-reverse" : "flex-row")}
              >
                {!isMe && (
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {msg.sender?.full_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("max-w-[70%]", isMe ? "items-end" : "items-start") + " flex flex-col gap-1"}>
                  {!isMe && (
                    <span className="text-xs text-text-muted">
                      {msg.sender?.full_name}
                    </span>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm",
                      isMe
                        ? "bg-primary text-white rounded-te-none"
                        : "bg-surface text-text-primary border border-border rounded-ts-none shadow-sm"
                    )}
                  >
                    {msg.message_type === "image" && msg.file_url ? (
                      <img
                        src={msg.file_url}
                        alt={msg.content}
                        className="max-w-48 rounded-lg"
                      />
                    ) : msg.message_type === "file" && msg.file_url ? (
                      <a
                        href={msg.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline flex items-center gap-1"
                      >
                        <Paperclip className="w-3 h-3" />
                        {msg.content}
                      </a>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  <div className={cn("flex items-center gap-1", isMe ? "flex-row-reverse" : "")}>
                    <span className="text-[10px] text-text-muted">
                      {formatDateTime(msg.created_at)}
                    </span>
                    {isMe && (
                      isRead
                        ? <CheckCheck className="w-3 h-3 text-blue-500" />
                        : <Check className="w-3 h-3 text-text-muted" />
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-surface">
        <div className="flex items-center gap-2">
          <label htmlFor={fileInputId} className="cursor-pointer flex-shrink-0">
            <input
              id={fileInputId}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.zip"
            />
            <span className="inline-flex items-center justify-center h-10 w-10 rounded-md text-text-muted hover:text-primary hover:bg-accent transition-colors">
              <Paperclip className="w-4 h-4" />
            </span>
          </label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالة... (Enter للإرسال)"
            className="flex-1 border-border"
            disabled={sending}
          />
          <Button
            size="icon"
            className="bg-primary hover:bg-primary-dark flex-shrink-0"
            onClick={() => sendMessage(text)}
            disabled={sending || !text.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
