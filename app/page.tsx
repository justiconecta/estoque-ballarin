'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Verificar se usuário já está logado
    const userData = localStorage.getItem('ballarin_user')
    
    if (userData) {
      try {
        const user = JSON.parse(userData)
        
        if (user.role === 'admin') {
          // Admin sempre vai para dashboard (não importa se geral ou clínica)
          router.replace('/dashboard')
        } else {
          // Staff vai para estoque
          router.replace('/estoque')
        }
      } catch {
        router.replace('/login')
      }
    } else {
      router.replace('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-clinic-black flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner mb-4" />
        <p className="text-clinic-gray-400">Redirecionando...</p>
      </div>
    </div>
  )
}