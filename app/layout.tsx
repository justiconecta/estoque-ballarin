import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JustiConecta',
  description: 'Sistema completo para clínica de estética',
  keywords: ['clínica', 'estoque', 'estética', 'controle'],
  authors: [{ name: 'JustiConecta' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'noindex, nofollow', // Sistema interno
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased`}>
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  )
}