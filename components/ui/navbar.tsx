import React from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Home, Package, Users, Calendar, DollarSign, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'
import { Usuario } from '@/types/database'

interface NavbarProps {
  currentUser: Usuario
  title: string
  showBackButton?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  title,
  showBackButton = false
}) => {
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('ballarin_user')
    router.push('/login')
  }

  return (
    <header className="flex justify-between items-center mb-8 pb-4 border-b border-clinic-gray-700">
      <div className="flex items-center space-x-4">
        {showBackButton && (
          <Button 
            variant="secondary" 
            onClick={() => router.back()} 
            icon={ArrowLeft}
            size="sm"
          >
            Voltar
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-clinic-white">{title}</h1>
          <p className="text-clinic-gray-400 mt-1">
            Usuário: <span className="font-semibold text-clinic-cyan">{currentUser.nome_completo}</span>
            <span className="text-xs ml-2 text-clinic-gray-500">({currentUser.role})</span>
          </p>
        </div>
      </div>
      
      <div className="flex space-x-2">
        {/* Menu de navegação para admin */}
        {currentUser.role === 'admin' && (
          <>
            <Button variant="secondary" onClick={() => router.push('/dashboard')} icon={Home} size="sm">
              Dashboard
            </Button>
            <Button variant="secondary" onClick={() => router.push('/estoque')} icon={Package} size="sm">
              Estoque
            </Button>
            <Button variant="secondary" onClick={() => router.push('/pacientes')} icon={Users} size="sm">
              Pacientes
            </Button>
          </>
        )}
        
        {/* Para staff, apenas dashboard se existir */}
        {currentUser.role === 'staff' && title !== 'Dashboard Administrativo' && (
          <Button variant="secondary" onClick={() => router.push('/dashboard')} icon={Home} size="sm">
            Dashboard
          </Button>
        )}
        
        <Button variant="secondary" onClick={handleLogout} icon={LogOut} size="sm">
          Sair
        </Button>
      </div>
    </header>
  )
}