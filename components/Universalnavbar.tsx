'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Package, Users, LogOut, Sun, Moon, Home } from 'lucide-react'
import { Button } from '@/components/ui'
import { Usuario } from '@/types/database'

interface NavbarProps {
  title: string
  subtitle: string
  icon: React.ComponentType<{ className?: string }>
  currentUser?: Usuario | null
}

export const UniversalNavbar: React.FC<NavbarProps> = ({ 
  title, 
  subtitle, 
  icon: IconComponent,
  currentUser 
}) => {
  const router = useRouter()
  const [isDarkTheme, setIsDarkTheme] = useState(true)

  // Detectar página atual para botão ativo
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
  const isCurrentPage = (path: string) => currentPath === path

  const handleLogout = () => {
    localStorage.removeItem('ballarin_user')
    router.push('/login')
  }

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme)
    localStorage.setItem('ballarin_theme', !isDarkTheme ? 'dark' : 'light')
  }

  // Carregar tema salvo
  useEffect(() => {
    const savedTheme = localStorage.getItem('ballarin_theme')
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark')
    }
  }, [])

  // Aplicar tema no documento
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light')
    }
  }, [isDarkTheme])

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
                <IconComponent className="h-5 w-5 text-clinic-cyan" />
              </div>
              <h1 className="text-xl font-bold text-clinic-white tracking-tight">{title}</h1>
            </div>
            <p className="text-clinic-gray-300 text-sm">{subtitle}</p>
          </div>
        </div>
        
        {/* Navegação Universal */}
        <div className="flex items-center space-x-3">
          <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-1.5 flex items-center space-x-1 border border-clinic-gray-600">
            <Button 
              variant="secondary" 
              onClick={() => router.push('/dashboard')} 
              icon={Home} 
              size="sm"
              className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                isCurrentPage('/dashboard') || isCurrentPage('/dashboard/marketing') || isCurrentPage('/dashboard/terapeutico')
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
          </div>
          
          <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-1.5 flex items-center space-x-1 border border-clinic-gray-600">
            <Button 
              variant="secondary" 
              onClick={toggleTheme} 
              icon={isDarkTheme ? Sun : Moon} 
              size="sm"
              className="px-3 py-2 hover:bg-clinic-cyan hover:text-clinic-black transition-all duration-300 hover:scale-105 rounded-md font-medium"
              title={isDarkTheme ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            />
            
            <Button 
              variant="secondary" 
              onClick={handleLogout} 
              icon={LogOut} 
              size="sm"
              className="px-4 py-2 hover:bg-red-500 hover:text-white transition-all duration-300 hover:scale-105 rounded-md font-medium"
            >
              Sair
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}