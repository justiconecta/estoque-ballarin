'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, ArrowLeft, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui'

export default function NotFound() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Verificar se há usuário logado para redirecionar corretamente
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
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

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
            <AlertCircle className="w-12 h-12 text-red-400" />
          </div>
          <h1 className="text-6xl font-bold text-clinic-white mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-clinic-white mb-4">Página não encontrada</h2>
          <p className="text-clinic-gray-400 mb-8">
            A página que você está procurando não existe ou foi removida.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={handleGoHome} icon={Home}>
              Ir para Início
            </Button>
            <Button variant="secondary" onClick={() => router.back()} icon={ArrowLeft}>
              Voltar
            </Button>
          </div>
          
          <div className="mt-8 p-4 bg-clinic-gray-800 rounded-lg border border-clinic-gray-700">
            <p className="text-clinic-gray-400 text-sm">
              Redirecionando automaticamente em <span className="text-clinic-cyan font-medium">{countdown}</span> segundos...
            </p>
            <div className="w-full bg-clinic-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-clinic-cyan h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-xs text-clinic-gray-500">
          <p>Sistema Clínica Ballarin</p>
          <p>Se o problema persistir, contate o administrador do sistema</p>
        </div>
      </div>
    </div>
  )
}