import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
})

interface ContractEmailOptions {
  to: string
  contractNumber: string
  projectName: string
  ownerName: string
  pdfBuffer: Buffer
}

export async function sendContractEmail(opts: ContractEmailOptions) {
  const { to, contractNumber, projectName, ownerName, pdfBuffer } = opts

  if (!to) throw new Error("لا يوجد بريد إلكتروني للعميل")

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `عقد خدمات هندسية — ${contractNumber}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">مكتب الحداق للاستشارات الهندسية</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p>السلام عليكم ورحمة الله وبركاته،</p>
          <p>الأستاذ / ${ownerName}</p>
          <p>يسعدنا إرسال عقد الخدمات الهندسية الخاص بمشروع <strong>${projectName}</strong> (رقم العقد: ${contractNumber}).</p>
          <p>يرجى مراجعة العقد المرفق والتوقيع عليه وإعادة إرساله.</p>
          <br/>
          <p>مع خالص التقدير،</p>
          <p><strong>مكتب الحداق للاستشارات الهندسية</strong></p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `عقد-${contractNumber}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  })
}

interface NotificationEmailOptions {
  to: string
  recipientName: string
  title: string
  body: string
}

export async function sendNotificationEmail(opts: NotificationEmailOptions) {
  const { to, recipientName, title, body } = opts

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: title,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">مكتب الحداق للاستشارات الهندسية</h1>
        </div>
        <div style="padding: 24px;">
          <p>الأستاذ / ${recipientName}</p>
          <div style="background: #f0f4f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-weight: bold;">${title}</p>
            <p style="margin: 8px 0 0;">${body}</p>
          </div>
        </div>
      </div>
    `,
  })
}

interface ReminderEmailOptions {
  to: string
  recipientName: string
  projectName: string
  daysUntil: number
  deadlineDate: string
}

export async function sendReminderEmail(opts: ReminderEmailOptions) {
  const { to, recipientName, projectName, daysUntil, deadlineDate } = opts

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: `تذكير: موعد تسليم قريب — ${projectName}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1e3a5f; color: white; padding: 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">مكتب الحداق للاستشارات الهندسية</h1>
        </div>
        <div style="padding: 24px;">
          <p>الأستاذ / ${recipientName}</p>
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-weight: bold;">⏰ تذكير بموعد تسليم</p>
            <p style="margin: 8px 0 0;">يتبقى <strong>${daysUntil} يوم/أيام</strong> على موعد تسليم مشروع <strong>${projectName}</strong></p>
            <p style="margin: 4px 0 0; color: #666;">التاريخ: ${deadlineDate}</p>
          </div>
          <p>نرجو التأكد من الجاهزية في الوقت المحدد.</p>
        </div>
      </div>
    `,
  })
}
