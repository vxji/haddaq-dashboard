import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendReminderEmail } from "@/lib/email/mailer"

const NIL_UUID = "00000000-0000-0000-0000-000000000000"
const REMINDER_DAYS = [1, 3, 7]

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()

  // In-app notifications (existing SQL function)
  await supabase.rpc("send_deadline_reminders")

  // Email reminders
  const { data: events } = await supabase
    .from("calendar_events")
    .select("id, project_id, title, start_date, project:projects(name, assigned_engineer_id)")
    .eq("event_type", "deadline")
    .gt("start_date", new Date().toISOString())

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const due = (events || []).filter((evt) => {
    const days = Math.round(
      (new Date(evt.start_date).getTime() - today.getTime()) / 86400000
    )
    return REMINDER_DAYS.includes(days)
  })

  let emailsSent = 0

  for (const evt of due) {
    const days = Math.round(
      (new Date(evt.start_date).getTime() - today.getTime()) / 86400000
    )
    const project = Array.isArray(evt.project) ? evt.project[0] : evt.project

    const { data: recipients } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("is_active", true)
      .or(`role.eq.admin,id.eq.${project?.assigned_engineer_id || NIL_UUID}`)

    const results = await Promise.allSettled(
      (recipients || []).map((r) =>
        sendReminderEmail({
          to: r.email,
          recipientName: r.full_name,
          projectName: project?.name || evt.title,
          daysUntil: days,
          deadlineDate: new Date(evt.start_date).toLocaleDateString("ar-SA"),
        })
      )
    )
    emailsSent += results.filter((r) => r.status === "fulfilled").length
  }

  return NextResponse.json({ ok: true, eventsDue: due.length, emailsSent })
}
