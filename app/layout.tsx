import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { DataProvider } from '@/contexts/DataContext'

const inter = Inter({ subsets: ['latin'] })

// ✅ METADATA (sem viewport)
export const metadata: Metadata = {
  title: 'JustiConecta',
  description: 'Sistema completo para clínica de estética',
  keywords: ['clínica', 'estoque', 'estética', 'controle'],
  authors: [{ name: 'JustiConecta' }],
  robots: 'noindex, nofollow',
}

// ✅ VIEWPORT SEPARADO (Next.js 14 requirement)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <DataProvider>
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}