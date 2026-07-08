"use client"

import { useState } from "react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Mail, ArrowRight, Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

const schema = z.object({
  email: z.string().email("البريد الإلكتروني غير صحيح"),
})

type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      data.email,
      { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password` }
    )

    if (resetError) {
      setError("حدث خطأ. تأكد من البريد الإلكتروني وحاول مرة أخرى.")
    } else {
      setSent(true)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-2xl shadow-xl mb-4">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">مكتب الحداق</h1>
          <p className="text-blue-200 text-sm">للاستشارات الهندسية</p>
        </div>

        <Card className="shadow-2xl border-0">
          <CardHeader className="pb-2 pt-6 px-6">
            <h2 className="text-xl font-bold text-text-primary text-center">
              استعادة كلمة المرور
            </h2>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-text-primary">
                    تم إرسال رابط الاستعادة!
                  </p>
                  <p className="text-sm text-text-muted mt-1">
                    تفقد بريدك الإلكتروني واتبع التعليمات لإعادة تعيين كلمة
                    المرور.
                  </p>
                </div>
                <Link href="/login">
                  <Button variant="outline" className="w-full mt-2">
                    العودة لتسجيل الدخول
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <p className="text-sm text-text-secondary">
                  أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة
                  المرور.
                </p>

                <div className="space-y-1.5">
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@haddaq.com"
                    dir="ltr"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p className="text-xs text-danger">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary-dark"
                  disabled={loading}
                >
                  {loading ? (
                    "جاري الإرسال..."
                  ) : (
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      إرسال رابط الاستعادة
                    </span>
                  )}
                </Button>

                <Link
                  href="/login"
                  className="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
                >
                  <ArrowRight className="w-4 h-4" />
                  العودة لتسجيل الدخول
                </Link>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
