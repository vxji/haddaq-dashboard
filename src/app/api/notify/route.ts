import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendNotificationEmail } from "@/lib/email/mailer"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"

export async function POST(req: NextRequest) {
  const { projectId, title, body, excludeUserId } = await req.json()

  if (!projectId || !title || !body) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from("projects")
    .select("assigned_engineer_id")
    .eq("id", projectId)
    .single()

  const { data: recipients } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("is_active", true)
    .or(`role.eq.admin,id.eq.${project?.assigned_engineer_id || NIL_UUID}`)

  const targets = (recipients || []).filter((r) => r.id !== excludeUserId)

  await Promise.allSettled(
    targets.map((r) =>
      sendNotificationEmail({
        to: r.email,
        recipientName: r.full_name,
        title,
        body,
      })
    )
  )

  return NextResponse.json({ ok: true, notified: targets.length })
}
