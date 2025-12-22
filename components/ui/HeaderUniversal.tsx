// components/ui/HeaderUniversal.tsx
'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { 
  Home, Package, Users, Building, Sun, Moon, LogOut, DollarSign,
  LucideIcon
} from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { Usuario } from '@/types/database'

interface HeaderUniversalProps {
  titulo: string
  descricao: string
  icone: LucideIcon
  showNovaClinicaModal?: () => void 
}

// ✅ FUNÇÃO HELPER: Detectar Admin Geral
function checkIsAdminGeral(user: any): boolean {
  if (!user) return false
  
  // Caso 1: Usuário literal "admin"
  if (user.usuario === 'admin') {
    return true
  }
  
  // Caso 2: Role admin + sem clínica específica
  const isRoleAdmin = user.role === 'admin'
  const isIdClinicaNull = user.id_clinica == null || user.id_clinica === 0
  
  return isRoleAdmin && isIdClinicaNull
}

export function HeaderUniversal({ titulo, descricao, icone: IconeCustom, showNovaClinicaModal }: HeaderUniversalProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, signOut } = useAuth() // ✅ Usar AuthContext
  
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [isAdminGeral, setIsAdminGeral] = useState(false)

  // Detectar página atual para botão ativo
  const isCurrentPage = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/dashboard/')
    }
    return pathname === path
  }

  // Aplica tema no DOM
  const applyTheme = (dark: boolean) => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement
      
      if (dark) {
        html.classList.add('dark')
        html.setAttribute('data-theme', 'dark')
      } else {
        html.classList.remove('dark')
        html.setAttribute('data-theme', 'light')
      }
    }
  }

  // Alternar tema
  const toggleTheme = () => {
    const newTheme = !isDarkTheme
    setIsDarkTheme(newTheme)
    localStorage.setItem('ballarin_theme', newTheme ? 'dark' : 'light')
    applyTheme(newTheme)
  }

  // ✅ Logout usando AuthContext
  const handleLogout = async () => {
    console.log('🚪 HeaderUniversal: Iniciando logout...')
    await signOut()
  }

  // Handler para Nova Clínica
  const handleNovaClinicaClick = () => {
    if (showNovaClinicaModal) {
      showNovaClinicaModal()
    }
  }

  // Carregar tema e detectar admin
  useEffect(() => {
    // Carregar tema
    const savedTheme = localStorage.getItem('ballarin_theme')
    const dark = savedTheme !== 'light'
    setIsDarkTheme(dark)
    applyTheme(dark)

    // Detectar admin geral do profile do AuthContext
    if (profile) {
      const adminGeral = checkIsAdminGeral(profile)
      setIsAdminGeral(adminGeral)
      
      console.log('👤 HeaderUniversal:', {
        usuario: profile.usuario,
        role: profile.role,
        id_clinica: profile.id_clinica,
        isAdminGeral: adminGeral
      })
    }
  }, [profile])

  return (
    <header className="bg-gradient-to-r from-clinic-gray-800 via-clinic-gray-750 to-clinic-gray-700 rounded-xl p-5 mb-6 border border-clinic-gray-600 shadow-xl backdrop-blur-sm">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0 relative">
            <div className="absolute inset-0 bg-clinic-cyan/20 rounded-lg blur-sm"></div>
            <Image
              src="/justiconecta.png"
              alt="JustiConecta"
              width={70}
              height={70}
              className="rounded-lg relative z-10"
            />
          </div>
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <div className="p-1.5 bg-clinic-cyan/20 rounded-md backdrop-blur-sm">
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
              onClick={() => router.push('/financeiro')} 
              icon={DollarSign} 
              size="sm"
              className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                isCurrentPage('/financeiro')
                  ? 'bg-clinic-cyan text-clinic-black shadow-md' 
                  : 'hover:bg-clinic-cyan hover:text-clinic-black hover:scale-105'
              }`}
            >
              Financeiro
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
            
            {isAdminGeral && showNovaClinicaModal && (
              <Button 
                variant="secondary" 
                onClick={handleNovaClinicaClick}
                icon={Building} 
                size="sm"
                className="px-4 py-2 transition-all duration-300 rounded-md font-medium bg-green-600 hover:bg-green-700 text-white hover:scale-105"
              >
                Nova Clínica
              </Button>
            )}
          </div>

          <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-1 border border-clinic-gray-600">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-clinic-gray-700 rounded-md transition-all hover:scale-110"
              title={isDarkTheme ? 'Modo Claro' : 'Modo Escuro'}
            >
              {isDarkTheme ? (
                <Sun className="h-4 w-4 text-yellow-400" />
              ) : (
                <Moon className="h-4 w-4 text-clinic-cyan" />
              )}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-red-500/20 rounded-md transition-all hover:scale-110 group"
              title="Sair"
            >
              <LogOut className="h-4 w-4 text-clinic-gray-400 group-hover:text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}