import React from 'react'
import { useRouter } from 'next/navigation'
import { Home, Package, Users, LogOut, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui'

interface NavbarProps {
  currentUser?: {
    nome: string
    role: string
  } | null
  onLogout?: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser, onLogout }) => {
  const router = useRouter()

  const handleLogout = () => {
    if (onLogout) {
      onLogout()
    } else {
      localStorage.removeItem('ballarin_user')
      router.push('/login')
    }
  }

  const navItems = [
    {
      label: 'Dashboard',
      icon: Home,
      path: '/dashboard',
      adminOnly: true
    },
    {
      label: 'Estoque',
      icon: Package,
      path: '/estoque',
      adminOnly: false
    },
    {
      label: 'Pacientes',
      icon: Users,
      path: '/pacientes',
      adminOnly: false
    }
  ]

  const visibleItems = navItems.filter(item => 
    !item.adminOnly || (currentUser?.role === 'admin')
  )

  return (
    <nav className="bg-clinic-gray-800 border-b border-clinic-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo/Title */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 bg-clinic-cyan rounded-full flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-clinic-black" />
            </div>
            <span className="text-xl font-bold text-clinic-white">
              Clínica Ballarin
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex items-center space-x-2">
          {visibleItems.map((item) => (
            <Button
              key={item.path}
              variant="secondary"
              size="sm"
              icon={item.icon}
              onClick={() => router.push(item.path)}
              className="hover:bg-clinic-gray-600"
            >
              {item.label}
            </Button>
          ))}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center space-x-3">
          {currentUser && (
            <div className="text-right">
              <p className="text-clinic-white text-sm font-medium">
                {currentUser.nome}
              </p>
              <p className="text-clinic-gray-400 text-xs capitalize">
                {currentUser.role}
              </p>
            </div>
          )}
          <Button
            variant="secondary"
            size="sm"
            icon={LogOut}
            onClick={handleLogout}
            className="hover:bg-red-600"
          >
            Sair
          </Button>
        </div>
      </div>
    </nav>
  )
}