import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateContractPDF } from "@/lib/pdf/contract-generator"

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

  // Fetch contract + project
  const { data: contract, error } = await supabase
    .from("contracts")
    .select("*, project:projects!contracts_project_id_fkey(*)")
    .eq("id", id)
    .single()

  if (error || !contract) {
    return NextResponse.json({ message: "العقد غير موجود" }, { status: 404 })
  }

  try {
    const pdfBytes = await generateContractPDF(contract as any)
    const buffer = Buffer.from(pdfBytes)

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="contract-${contract.contract_number}.pdf"`,
      },
    })
  } catch (err) {
    console.error("PDF generation error:", err)
    return NextResponse.json({ message: "فشل توليد PDF" }, { status: 500 })
  }
}
