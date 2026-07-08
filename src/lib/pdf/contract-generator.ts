import { PDFDocument, rgb, StandardFonts, type PDFFont } from "pdf-lib"
import fontkit from "@pdf-lib/fontkit"
import path from "path"
import fs from "fs"
import { formatNumber } from "@/lib/format"

interface ContractData {
  contract_number: string
  total_value: number
  terms: string | null
  signed_at: string | null
  project: {
    name: string
    project_number: string
    owner_name: string
    owner_id_number: string
    owner_phone: string
    address: string
    contract_date: string | null
  }
}

function formatArabicDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Intl.DateTimeFormat("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(dateStr))
}

function formatCurrency(amount: number): string {
  return formatNumber(amount, {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
  })
}

export async function generateContractPDF(contract: ContractData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)

  // Try to load Arabic font from public directory
  // Fall back to Helvetica if font file not found
  let font: PDFFont
  let boldFont: PDFFont

  const fontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf")
  const boldFontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Bold.ttf")

  if (fs.existsSync(fontPath)) {
    const fontBytes = fs.readFileSync(fontPath)
    const boldFontBytes = fs.existsSync(boldFontPath)
      ? fs.readFileSync(boldFontPath)
      : fontBytes
    font = await pdfDoc.embedFont(fontBytes)
    boldFont = await pdfDoc.embedFont(boldFontBytes)
  } else {
    // Fallback: use Helvetica (no Arabic support, but won't crash)
    font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  }

  const page = pdfDoc.addPage([595, 842]) // A4
  const { width, height } = page.getSize()

  const primaryColor = rgb(0.118, 0.227, 0.373) // #1e3a5f
  const textColor = rgb(0.102, 0.102, 0.173)
  const mutedColor = rgb(0.533, 0.541, 0.643)

  let y = height - 60

  // Header
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: primaryColor,
  })

  page.drawText("مكتب الحداق للاستشارات الهندسية", {
    x: width / 2 - 120,
    y: height - 55,
    size: 18,
    font: boldFont,
    color: rgb(1, 1, 1),
  })

  page.drawText("عقد خدمات هندسية", {
    x: width / 2 - 60,
    y: height - 80,
    size: 12,
    font,
    color: rgb(0.7, 0.8, 0.9),
  })

  page.drawText(contract.contract_number, {
    x: width / 2 - 40,
    y: height - 100,
    size: 10,
    font,
    color: rgb(0.6, 0.7, 0.85),
  })

  y = height - 150

  // Helper: draw label-value pair
  function drawRow(label: string, value: string, yPos: number) {
    page.drawText(label + ":", {
      x: width - 80,
      y: yPos,
      size: 10,
      font: boldFont,
      color: mutedColor,
    })
    page.drawText(value, {
      x: width - 200,
      y: yPos,
      size: 10,
      font,
      color: textColor,
    })
    return yPos - 20
  }

  // Contract info
  y = drawRow("رقم العقد", contract.contract_number, y)
  y = drawRow("تاريخ العقد", formatArabicDate(contract.project.contract_date), y)
  y -= 10

  // Section: project
  page.drawText("بيانات المشروع", {
    x: width - 80,
    y,
    size: 12,
    font: boldFont,
    color: primaryColor,
  })
  y -= 25

  y = drawRow("اسم المشروع", contract.project.name, y)
  y = drawRow("رقم المشروع", contract.project.project_number, y)
  y = drawRow("الموقع", contract.project.address, y)
  y -= 15

  // Section: parties
  page.drawText("أطراف العقد", {
    x: width - 80,
    y,
    size: 12,
    font: boldFont,
    color: primaryColor,
  })
  y -= 25

  page.drawText("الطرف الأول:", { x: width - 80, y, size: 10, font: boldFont, color: mutedColor })
  page.drawText("مكتب الحداق للاستشارات الهندسية", { x: width - 250, y, size: 10, font, color: textColor })
  y -= 20

  page.drawText("الطرف الثاني:", { x: width - 80, y, size: 10, font: boldFont, color: mutedColor })
  page.drawText(contract.project.owner_name, { x: width - 250, y, size: 10, font, color: textColor })
  y -= 20

  y = drawRow("رقم الهوية", contract.project.owner_id_number, y)
  y = drawRow("رقم الجوال", contract.project.owner_phone, y)
  y -= 15

  // Value box
  page.drawRectangle({
    x: 50,
    y: y - 40,
    width: width - 100,
    height: 50,
    color: rgb(0.93, 0.96, 0.98),
    borderColor: primaryColor,
    borderWidth: 1,
  })

  page.drawText("القيمة الإجمالية للعقد:", {
    x: width - 180,
    y: y - 15,
    size: 12,
    font: boldFont,
    color: primaryColor,
  })

  page.drawText(formatCurrency(contract.total_value), {
    x: 120,
    y: y - 20,
    size: 14,
    font: boldFont,
    color: primaryColor,
  })

  y -= 70

  // Terms
  if (contract.terms) {
    page.drawText("الشروط والأحكام", {
      x: width - 80,
      y,
      size: 12,
      font: boldFont,
      color: primaryColor,
    })
    y -= 25

    // Wrap terms text (simple approach)
    const terms = contract.terms.slice(0, 400) // limit for space
    const lines = terms.split("\n").slice(0, 10)
    for (const line of lines) {
      page.drawText(line.slice(0, 80), {
        x: width - 80,
        y,
        size: 9,
        font,
        color: textColor,
      })
      y -= 16
    }
    y -= 10
  }

  // Signature area
  y = 150
  page.drawLine({
    start: { x: 80, y },
    end: { x: 220, y },
    color: mutedColor,
    thickness: 0.5,
  })
  page.drawLine({
    start: { x: width - 220, y },
    end: { x: width - 80, y },
    color: mutedColor,
    thickness: 0.5,
  })

  page.drawText("توقيع الطرف الثاني", {
    x: 110,
    y: y - 20,
    size: 9,
    font,
    color: mutedColor,
  })
  page.drawText("توقيع الطرف الأول", {
    x: width - 190,
    y: y - 20,
    size: 9,
    font,
    color: mutedColor,
  })

  // Footer
  page.drawText("مكتب الحداق للاستشارات الهندسية — جميع الحقوق محفوظة", {
    x: 100,
    y: 30,
    size: 8,
    font,
    color: mutedColor,
  })

  return await pdfDoc.save()
}
