'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter()

  useEffect(() => {
    // Log do erro para debugging
    console.error('Erro na aplicação:', error)
  }, [error])

  const handleGoHome = () => {
    const userData = localStorage.getItem('ballarin_user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        if (user.role === 'admin') {
          router.replace('/dashboard')
        } else {
          router.replace('/estoque')
        }
      } catch {
        router.replace('/login')
      }
    } else {
      router.replace('/login')
    }
  }

  return (
    <div className="min-h-screen bg-clinic-black flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
          <h1 className="text-3xl font-bold text-clinic-white mb-2">Oops! Algo deu errado</h1>
          <p className="text-clinic-gray-400 mb-8">
            Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema.
          </p>
        </div>

        {/* Detalhes do erro (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-clinic-gray-800 rounded-lg border border-clinic-gray-700 text-left">
            <h3 className="text-sm font-medium text-clinic-white mb-2">Detalhes do Erro (Dev):</h3>
            <p className="text-xs text-red-400 font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs text-clinic-gray-400 mt-2">
                ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={reset} icon={RefreshCw}>
              Tentar Novamente
            </Button>
            <Button variant="secondary" onClick={handleGoHome} icon={Home}>
              Ir para Início
            </Button>
          </div>
          
          <div className="mt-8 text-xs text-clinic-gray-500">
            <p>Sistema Clínica Ballarin</p>
            <p>Se o problema persistir, contate o suporte técnico</p>
          </div>
        </div>
      </div>
    </div>
  )
}