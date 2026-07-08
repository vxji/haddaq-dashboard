"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Eye, EyeOff, ArrowLeft, Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { SmokeyBackground } from "@/components/ui/smokey-background"

const schema = z.object({
  email:    z.email("البريد الإلكتروني غير صحيح"),
  password: z.string().min(6, "كلمة المرور 6 أحرف على الأقل"),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [showPw, setShowPw] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setAuthError(null)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setAuthError("البريد الإلكتروني أو كلمة المرور غير صحيحة")
      setLoading(false)
      return
    }
    router.push("/")
    router.refresh()
  }

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-[#040d1e] via-[#0a1a3e] to-[#0d0530]" dir="rtl">
      {/* WebGL animated background */}
      <SmokeyBackground color="#2554eb" />

      {/* Centered card */}
      <div className="relative z-10 flex items-center justify-center w-full h-full p-4">
        <div className="w-full max-w-sm space-y-6 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-8">

          {/* Logo */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-xl border border-white/30 mb-1">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-display font-bold text-white">مكتب الحداق</h1>
            <p className="text-white/60 text-sm">للاستشارات الهندسية</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

            {/* Auth error */}
            {authError && (
              <div className="rounded-lg bg-red-500/20 border border-red-400/30 px-3 py-2.5 text-sm text-red-300 text-center">
                {authError}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-white/80">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                dir="ltr"
                placeholder="example@haddaq.com"
                className={`
                  dark-input w-full rounded-xl px-4 py-3 text-sm text-right
                  bg-white/10 border text-white placeholder:text-white/30
                  focus:outline-none focus:bg-white/15
                  transition-colors
                  ${errors.email
                    ? "border-red-400/70 focus:border-red-400"
                    : "border-white/20 focus:border-primary"}
                `}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-white/80">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? "text" : "password"}
                  placeholder="••••••••"
                  className={`
                    dark-input w-full rounded-xl px-4 py-3 pe-11 text-sm
                    bg-white/10 border text-white placeholder:text-white/30
                    focus:outline-none focus:bg-white/15
                    transition-colors
                    ${errors.password
                      ? "border-red-400/70 focus:border-red-400"
                      : "border-white/20 focus:border-primary"}
                  `}
                  {...register("password")}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPw(!showPw)}
                  className="absolute inset-y-0 end-0 flex items-center pe-3 text-white/40 hover:text-white/80 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot password */}
            <div className="flex justify-start">
              <Link
                href="/forgot-password"
                className="text-xs text-white/50 hover:text-white transition-colors"
              >
                نسيت كلمة المرور؟
              </Link>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                group w-full flex items-center justify-center gap-2
                py-3 px-4 rounded-xl font-semibold text-sm text-white
                bg-primary hover:bg-primary-dark
                disabled:opacity-60 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-primary/50
                transition-all duration-300
              "
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  جاري الدخول...
                </>
              ) : (
                <>
                  دخول
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs">
            © {new Date().getFullYear()} مكتب الحداق للاستشارات الهندسية
          </p>
        </div>
      </div>
    </main>
  )
}
