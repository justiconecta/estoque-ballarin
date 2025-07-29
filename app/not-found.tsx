'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    // Verificar se usuário está logado para redirecionar corretamente
    const userData = localStorage.getItem('ballarin_user')
    
    if (!userData) {
      // Se não está logado, redirecionar para login
      const timer = setTimeout(() => {
        router.push('/login')
      }, 5000)
      
      const countdownTimer = setInterval(() => {
        setCountdown(prev => prev - 1)
      }, 1000)
      
      return () => {
        clearTimeout(timer)
        clearInterval(countdownTimer)
      }
    } else {
      // Se está logado, redirecionar para dashboard apropriado
      try {
        const user = JSON.parse(userData)
        setUserRole(user.role)
        
        const timer = setTimeout(() => {
          if (user.role === 'admin') {
            router.push('/dashboard')
          } else {
            router.push('/estoque')
          }
        }, 5000)
        
        const countdownTimer = setInterval(() => {
          setCountdown(prev => prev - 1)
        }, 1000)
        
        return () => {
          clearTimeout(timer)
          clearInterval(countdownTimer)
        }
      } catch {
        router.push('/login')
      }
    }
  }, [router])

  const handleGoHome = () => {
    const userData = localStorage.getItem('ballarin_user')
    if (userData) {
      try {
        const user = JSON.parse(userData)
        if (user.role === 'admin') {
          router.push('/dashboard')
        } else {
          router.push('/estoque')
        }
      } catch {
        router.push('/login')
      }
    } else {
      router.push('/login')
    }
  }

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      handleGoHome()
    }
  }

  return (
    <div className="min-h-screen bg-clinic-black flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        {/* Ícone de erro */}
        <div className="mb-8">
          <div className="w-24 h-24 mx-auto rounded-full border-4 border-red-500/20 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-red-400 flex items-center justify-center">
              <span className="text-red-400 font-bold text-lg">!</span>
            </div>
          </div>
        </div>

        {/* Título e mensagem */}
        <h1 className="text-6xl font-bold text-clinic-white mb-4">404</h1>
        <h2 className="text-xl font-semibold text-clinic-white mb-4">Página não encontrada</h2>
        <p className="text-clinic-gray-400 mb-8">
          A página que você está procurando não existe ou foi removida.
        </p>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button 
            onClick={handleGoHome}
            icon={Home}
            className="min-w-[140px]"
          >
            {userRole === 'admin' ? 'Ir para Dashboard' : 'Ir para Estoque'}
          </Button>
          <Button 
            onClick={handleGoBack}
            variant="secondary"
            icon={ArrowLeft}
            className="min-w-[140px]"
          >
            Voltar
          </Button>
        </div>

        {/* Contador de redirecionamento */}
        <div className="bg-clinic-gray-800 rounded-lg p-4 border border-clinic-gray-700">
          <p className="text-clinic-gray-400 text-sm mb-2">
            Redirecionando automaticamente em {countdown} segundos...
          </p>
          <div className="w-full bg-clinic-gray-700 rounded-full h-2">
            <div 
              className="bg-clinic-cyan h-2 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-clinic-gray-700">
          <p className="text-clinic-gray-500 text-sm">Sistema Clínica Ballarin</p>
          <p className="text-clinic-gray-600 text-xs">
            Se o problema persistir, contate o administrador do sistema
          </p>
        </div>
      </div>
    </div>
  )
}