import { z } from "zod"

export const createUserSchema = z.object({
  full_name: z.string().min(2, "الاسم الكامل مطلوب"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().optional(),
  job_title: z.string().optional(),
  role: z.enum(["admin", "employee"]),
  password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل"),
  is_active: z.boolean(),
})

export const updateUserSchema = createUserSchema
  .omit({ password: true, email: true })
  .extend({
    password: z.string().min(8).optional().or(z.literal("")),
  })

export type CreateUserFormData = z.infer<typeof createUserSchema>
export type UpdateUserFormData = z.infer<typeof updateUserSchema>
