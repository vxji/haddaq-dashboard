"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UsersTab } from "@/components/settings/UsersTab"
import { CompanyTab } from "@/components/settings/CompanyTab"
import type { Profile } from "@/types"

function SettingsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "users" ? "users" : "company"
  const [profile, setProfile] = useState<Profile | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push("/login"); return }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (!data || data.role !== "admin") {
        router.push("/")
        return
      }
      setProfile(data as Profile)
      setChecking(false)
    })
  }, [router])

  if (checking || !profile) return null

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">الإعدادات</h1>
          <p className="text-text-muted text-sm mt-0.5">إدارة المستخدمين وبيانات المنشأة</p>
        </div>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList className="bg-surface border border-border rounded-xl p-1 h-auto flex-wrap gap-1">
          <TabsTrigger
            value="company"
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            بيانات المنشأة
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="data-[state=active]:bg-primary data-[state=active]:text-white"
          >
            إدارة المستخدمين
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-5">
          <CompanyTab />
        </TabsContent>
        <TabsContent value="users" className="mt-5">
          <UsersTab currentProfile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPageContent />
    </Suspense>
  )
}
