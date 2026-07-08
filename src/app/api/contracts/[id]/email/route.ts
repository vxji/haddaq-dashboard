import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateContractPDF } from "@/lib/pdf/contract-generator"
import { sendContractEmail } from "@/lib/email/mailer"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ message: "غير مصرّح" }, { status: 401 })

  const { data: contract } = await supabase
    .from("contracts")
    .select("*, project:projects!contracts_project_id_fkey(*)")
    .eq("id", id)
    .single()

  if (!contract) {
    return NextResponse.json({ message: "العقد غير موجود" }, { status: 404 })
  }

  try {
    const pdfBytes = await generateContractPDF(contract as any)
    await sendContractEmail({
      to: contract.project.owner_email || "",
      contractNumber: contract.contract_number,
      projectName: contract.project.name,
      ownerName: contract.project.owner_name,
      pdfBuffer: Buffer.from(pdfBytes),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Email error:", err)
    return NextResponse.json({ message: "فشل الإرسال" }, { status: 500 })
  }
}
