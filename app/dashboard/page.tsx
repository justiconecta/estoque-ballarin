'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect automático para dashboard/marketing
    router.replace('/dashboard/marketing')
  }, [router])

  // Loading state enquanto faz o redirect
  return (
    <div className="min-h-screen bg-clinic-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent mx-auto mb-4"></div>
        <p className="text-clinic-gray-400">Redirecionando...</p>
      </div>
    </div>
  )
}