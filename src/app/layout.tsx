import type { Metadata } from "next"
import { Cairo, IBM_Plex_Sans_Arabic } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["600", "700", "800"],
  variable: "--font-cairo",
  display: "swap",
})

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-arabic",
  display: "swap",
})

export const metadata: Metadata = {
  title: "مكتب الحداق للاستشارات الهندسية",
  description: "نظام إدارة المشاريع الهندسية والعقود والمتابعة الميدانية",
  keywords: ["استشارات هندسية", "إدارة مشاريع", "الحداق"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} ${ibmPlexSansArabic.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-surface-muted font-arabic antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
