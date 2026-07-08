import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

// POST /api/users — create new user (admin only)
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ message: "غير مصرّح" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ message: "صلاحية مدير مطلوبة" }, { status: 403 })
  }

  const body = await req.json()
  const { email, password, full_name, phone, job_title, role, is_active } = body

  const admin = createAdminClient()

  // Create auth user
  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    })

  if (authError) {
    return NextResponse.json(
      { message: authError.message || "فشل إنشاء الحساب" },
      { status: 400 }
    )
  }

  // Update profile (trigger already created it)
  await admin
    .from("profiles")
    .update({ full_name, phone, job_title, role, is_active })
    .eq("id", authData.user.id)

  return NextResponse.json({ success: true })
}

// PUT /api/users — update existing user (admin only)
export async function PUT(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ message: "غير مصرّح" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ message: "صلاحية مدير مطلوبة" }, { status: 403 })
  }

  const body = await req.json()
  const { id, full_name, phone, job_title, role, is_active, password } = body

  const admin = createAdminClient()

  // Update profile
  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name, phone, job_title, role, is_active })
    .eq("id", id)

  if (profileError) {
    return NextResponse.json({ message: "فشل التحديث" }, { status: 400 })
  }

  // Update password if provided
  if (password && password.trim().length >= 8) {
    await admin.auth.admin.updateUserById(id, { password })
  }

  return NextResponse.json({ success: true })
}
