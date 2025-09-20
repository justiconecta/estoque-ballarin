// components/ui/HeaderUniversal.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  Home, Package, Users, Building, Sun, Moon, LogOut, 
  LucideIcon
} from 'lucide-react'
import { Button } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface HeaderUniversalProps {
  titulo: string
  descricao: string
  icone: LucideIcon
  showNovaClinicaModal?: () => void // ✅ OPCIONAL - callback para abrir modal Nova Clínica
}

export function HeaderUniversal({ titulo, descricao, icone: IconeCustom, showNovaClinicaModal }: HeaderUniversalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [isAdminGeral, setIsAdminGeral] = useState(false)
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)

  // Detectar página atual para botão ativo (LÓGICA EXATA DO DASHBOARD)
  const isCurrentPage = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
    }
    return pathname === path
  }

  // Função para alternar tema (LÓGICA EXATA DO DASHBOARD)
  const toggleTheme = () => {
    const newTheme = !isDarkTheme
    setIsDarkTheme(newTheme)
    localStorage.setItem('ballarin_theme', newTheme ? 'dark' : 'light')
  }

  // Logout (LÓGICA EXATA DO DASHBOARD)
  const handleLogout = async () => {
    try {
      await supabaseApi.logout()
      router.push('/login')
    } catch (error) {
      console.error('Erro no logout:', error)
      router.push('/login')
    }
  }

  // Carregar tema salvo (LÓGICA EXATA DO DASHBOARD)
  useEffect(() => {
    const savedTheme = localStorage.getItem('ballarin_theme')
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark')
    }
  }, [])

  // Aplicar tema no documento (LÓGICA EXATA DO DASHBOARD)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light')
    }
  }, [isDarkTheme])

  // Verificar autenticação (LÓGICA EXATA DO DASHBOARD)
  useEffect(() => {
    const userData = localStorage.getItem('ballarin_user')
    if (!userData) {
      console.log('❌ HeaderUniversal: Usuário não encontrado, redirecionando...')
      router.push('/login')
      return
    }
    
    try {
      const user = JSON.parse(userData) as Usuario
      setCurrentUser(user)
      console.log('✅ HeaderUniversal: Usuário carregado:', user.usuario)
      
      // Verificar se é admin geral
      checkIfAdminGeral(user.usuario)
    } catch (error) {
      console.error('❌ HeaderUniversal: Erro ao parsear usuário:', error)
      router.push('/login')
    }
  }, [router])

  // Verificar admin geral (FUNÇÃO EXATA DO DASHBOARD COM DEBUG)
  const checkIfAdminGeral = async (usuario: string) => {
    try {
      console.log('🔍 HeaderUniversal: Verificando admin geral para:', usuario)
      const isGeral = await supabaseApi.isAdminGeral(usuario)
      setIsAdminGeral(isGeral)
      
    } catch (error) {
      console.error('❌ HeaderUniversal: Erro ao verificar admin geral:', error)
      setIsAdminGeral(false)
    }
  }

  // ✅ HANDLER DO BOTÃO NOVA CLÍNICA
  const handleNovaClinicaClick = () => {
    console.log('🏥 HeaderUniversal: Botão Nova Clínica clicado')
    if (showNovaClinicaModal) {
      console.log('✅ HeaderUniversal: Chamando callback showNovaClinicaModal')
      showNovaClinicaModal()
    } else {
      console.log('⚠️ HeaderUniversal: Callback showNovaClinicaModal não fornecido')
    }
  }

  return (
    <>
  
      <header className="bg-gradient-to-r from-clinic-gray-800 via-clinic-gray-750 to-clinic-gray-700 rounded-xl p-6 mb-6 border border-clinic-gray-600 shadow-xl backdrop-blur-sm">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Image
                src="/justiconecta.png"
                alt="JustiConecta"  
                width={70}
                height={70}
                className="rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <div className="p-2 bg-clinic-cyan/20 rounded-md backdrop-blur-sm">
                  <IconeCustom className="h-5 w-5 text-clinic-cyan" />
                </div>
                <h1 className="text-xl font-bold text-clinic-white tracking-tight">{titulo}</h1>
                {isAdminGeral && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                    ADMIN GERAL
                  </span>
                )}
              </div>
              <p className="text-clinic-gray-300 text-sm">
                {descricao}
              </p>
            </div>
          </div>
          
          {/* Navegação Universal */}
          <div className="flex items-center space-x-3">
            <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-1 border border-clinic-gray-600">
              <Button 
                variant="secondary" 
                onClick={() => router.push('/dashboard')} 
                icon={Home} 
                size="sm"
                className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                  isCurrentPage('/dashboard')
                    ? 'bg-clinic-cyan text-clinic-black shadow-md' 
                    : 'hover:bg-clinic-cyan hover:text-clinic-black hover:scale-105'
                }`}
              >
                Dashboard
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => router.push('/estoque')} 
                icon={Package} 
                size="sm"
                className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                  isCurrentPage('/estoque')
                    ? 'bg-clinic-cyan text-clinic-black shadow-md' 
                    : 'hover:bg-clinic-cyan hover:text-clinic-black hover:scale-105'
                }`}
              >
                Estoque
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => router.push('/pacientes')} 
                icon={Users} 
                size="sm"
                className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                  isCurrentPage('/pacientes')
                    ? 'bg-clinic-cyan text-clinic-black shadow-md' 
                    : 'hover:bg-clinic-cyan hover:text-clinic-black hover:scale-105'
                }`}
              >
                Pacientes
              </Button>
              
              {/* ✅ BOTÃO NOVA CLÍNICA COM DEBUG DETALHADO */}
              {isAdminGeral && (
                <Button 
                  variant="secondary" 
                  onClick={handleNovaClinicaClick}
                  icon={Building} 
                  size="sm"
                  className="px-4 py-2 transition-all duration-300 rounded-md font-medium bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-500 hover:text-white hover:scale-105"
                  title="Criar nova clínica"
                >
                  Nova Clínica
                </Button>
              )}
            </div>
            
            <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-1 border border-clinic-gray-600">
              <Button 
                variant="secondary" 
                onClick={toggleTheme} 
                icon={isDarkTheme ? Sun : Moon} 
                size="sm"
                className="w-12 h-10 flex items-center justify-center hover:bg-clinic-cyan hover:text-clinic-black transition-all duration-300 hover:scale-105 rounded-md font-medium"
                title={isDarkTheme ? "Modo claro" : "Modo escuro"}
              />
              <Button 
                variant="secondary" 
                onClick={handleLogout} 
                icon={LogOut} 
                size="sm"
                className="w-12 h-10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all duration-300 hover:scale-105 rounded-md font-medium"
                title="Sair do sistema"
              />
            </div>
          </div>
        </div>
      </header>
    </>
  )
}