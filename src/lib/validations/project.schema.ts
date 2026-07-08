import { z } from "zod"

export const projectSchema = z.object({
  name: z.string().min(2, "اسم المشروع مطلوب"),
  owner_name: z.string().min(2, "اسم المالك مطلوب"),
  owner_id_number: z
    .string()
    .min(10, "رقم الهوية يجب أن يكون 10 أرقام")
    .max(10, "رقم الهوية يجب أن يكون 10 أرقام")
    .regex(/^\d+$/, "رقم الهوية يجب أن يحتوي على أرقام فقط"),
  owner_phone: z
    .string()
    .min(10, "رقم الجوال غير صحيح")
    .regex(/^[0-9+\s-]+$/, "رقم الجوال غير صحيح"),
  address: z.string().min(3, "العنوان مطلوب"),
  description: z.string().optional(),
  contract_date: z.string().optional(),
  contract_signed: z.boolean(),
  total_contract_value: z
    .number()
    .min(0, "قيمة العقد لا يمكن أن تكون سالبة"),
  status: z.enum(["pending", "in_progress", "completed", "cancelled", "suspended"]),
  assigned_engineer_id: z.string().nullable().optional(),
})

export type ProjectFormData = z.infer<typeof projectSchema>
