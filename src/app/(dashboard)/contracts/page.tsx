"use client"

import { useState, useEffect } from "react"
import { FileText, Download, Eye, Mail, Printer } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Contract, Project } from "@/types"
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "sonner"
import Link from "next/link"

interface ContractWithProject extends Contract {
  project: Project
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<ContractWithProject[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [previewContract, setPreviewContract] = useState<ContractWithProject | null>(null)

  const supabase = createClient()

  async function loadContracts() {
    const { data } = await supabase
      .from("contracts")
      .select("*, project:projects!contracts_project_id_fkey(*)")
      .order("created_at", { ascending: false })

    setContracts((data as ContractWithProject[]) || [])
    setLoading(false)
  }

  useEffect(() => { loadContracts() }, [])

  async function generatePDF(contract: ContractWithProject) {
    setGenerating(contract.id)
    try {
      const res = await fetch(`/api/contracts/${contract.id}/pdf`, {
        method: "POST",
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `عقد-${contract.project.project_number}.pdf`
        a.click()
        URL.revokeObjectURL(url)
        toast.success("تم توليد العقد PDF")
      } else {
        toast.error("فشل توليد العقد")
      }
    } catch {
      toast.error("حدث خطأ")
    }
    setGenerating(null)
  }

  async function sendByEmail(contract: ContractWithProject) {
    try {
      const res = await fetch(`/api/contracts/${contract.id}/email`, {
        method: "POST",
      })
      if (res.ok) {
        toast.success("تم إرسال العقد بالبريد الإلكتروني")
      } else {
        toast.error("فشل الإرسال")
      }
    } catch {
      toast.error("حدث خطأ")
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">العقود</h1>
        <p className="text-text-muted text-sm mt-0.5">
          إدارة وتوليد عقود المشاريع الهندسية
        </p>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-40" />
            <p className="text-text-muted text-sm">لا توجد عقود بعد</p>
            <p className="text-text-muted text-xs mt-1">
              العقود تُنشأ تلقائياً عند إضافة مشروع جديد
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-subtle border-b border-border">
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">رقم العقد</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">المشروع</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">المالك</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">القيمة الإجمالية</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">حالة التوقيع</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">تاريخ الإنشاء</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-surface-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-primary font-medium">
                      {contract.contract_number}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/projects/${contract.project_id}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {contract.project.project_number}
                      </Link>
                      <p className="text-xs text-text-muted">{contract.project.name}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {contract.project.owner_name}
                    </td>
                    <td className="px-4 py-3 font-medium ltr-nums">
                      {formatCurrency(contract.total_value)}
                    </td>
                    <td className="px-4 py-3">
                      {contract.signed_at ? (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full">
                          موقّع — {formatDate(contract.signed_at)}
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full">
                          غير موقّع
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-muted text-xs whitespace-nowrap">
                      {formatDate(contract.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-primary"
                          onClick={() => setPreviewContract(contract)}
                          title="معاينة"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-text-secondary"
                          onClick={() => generatePDF(contract)}
                          disabled={generating === contract.id}
                          title="تحميل PDF"
                        >
                          {generating === contract.id ? (
                            <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-text-secondary"
                          onClick={() => sendByEmail(contract)}
                          title="إرسال بالبريد"
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contract Preview Dialog */}
      {previewContract && (
        <Dialog open={!!previewContract} onOpenChange={() => setPreviewContract(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>معاينة العقد — {previewContract.contract_number}</DialogTitle>
            </DialogHeader>
            <ContractPreview contract={previewContract} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

function ContractPreview({ contract }: { contract: ContractWithProject }) {
  const { project } = contract

  return (
    <div className="bg-white p-8 font-arabic space-y-6 text-sm leading-relaxed" id="contract-preview">
      {/* Header */}
      <div className="text-center border-b-2 border-primary pb-6">
        <h1 className="text-2xl font-bold text-primary">مكتب الحداق للاستشارات الهندسية</h1>
        <p className="text-text-muted text-sm mt-1">عقد خدمات هندسية</p>
        <p className="text-xs text-text-muted mt-1">{contract.contract_number}</p>
      </div>

      {/* Parties */}
      <div className="space-y-3">
        <h2 className="font-bold text-text-primary">أطراف العقد</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-surface-subtle p-3 rounded-lg">
            <p className="text-xs text-text-muted font-medium mb-1">الطرف الأول (المكتب)</p>
            <p className="font-medium">مكتب الحداق للاستشارات الهندسية</p>
          </div>
          <div className="bg-surface-subtle p-3 rounded-lg">
            <p className="text-xs text-text-muted font-medium mb-1">الطرف الثاني (العميل)</p>
            <p className="font-medium">{project.owner_name}</p>
            <p className="text-xs text-text-muted">هوية: {project.owner_id_number}</p>
            <p className="text-xs text-text-muted">جوال: {project.owner_phone}</p>
          </div>
        </div>
      </div>

      {/* Project */}
      <div className="space-y-2">
        <h2 className="font-bold text-text-primary">موضوع العقد</h2>
        <p>
          تقديم خدمات هندسية متكاملة لمشروع: <strong>{project.name}</strong>
          {project.address && ` — ${project.address}`}
        </p>
      </div>

      {/* Value */}
      <div className="space-y-2">
        <h2 className="font-bold text-text-primary">القيمة المالية</h2>
        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
          <p className="text-lg font-bold text-primary">
            {formatCurrency(contract.total_value)}
          </p>
          <p className="text-xs text-text-muted mt-1">إجمالي قيمة الخدمات الهندسية</p>
        </div>
      </div>

      {/* Terms */}
      {contract.terms && (
        <div className="space-y-2">
          <h2 className="font-bold text-text-primary">الشروط والأحكام</h2>
          <p className="text-text-secondary whitespace-pre-wrap">{contract.terms}</p>
        </div>
      )}

      {/* Signature */}
      <div className="grid grid-cols-2 gap-8 pt-8 border-t border-border">
        <div className="text-center">
          <p className="text-xs text-text-muted mb-6">توقيع الطرف الأول</p>
          <div className="h-12 border-b border-border mx-4" />
          <p className="text-xs mt-2">مكتب الحداق للاستشارات الهندسية</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted mb-6">توقيع الطرف الثاني</p>
          <div className="h-12 border-b border-border mx-4" />
          <p className="text-xs mt-2">{project.owner_name}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 no-print">
        <Button
          onClick={() => window.print()}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Printer className="w-4 h-4" />
          طباعة
        </Button>
      </div>
    </div>
  )
}
