import { z } from "zod"

export const companySettingsSchema = z.object({
  office_name: z.string().min(2, "اسم المكتب مطلوب"),
  commercial_register: z.string().optional(),
  tax_number: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("البريد الإلكتروني غير صحيح").optional().or(z.literal("")),
  website: z.string().url("رابط غير صحيح").optional().or(z.literal("")),
})

export type CompanySettingsFormData = z.infer<typeof companySettingsSchema>
