'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export type DashboardTab = 'marketing' | 'terapeutico' | 'vendas' | 'rankings' | 'retornos'

const TABS: { key: DashboardTab; label: string; href: string }[] = [
  { key: 'marketing', label: 'Marketing e Terapêutico', href: '/dashboard/marketing' },
  { key: 'terapeutico', label: 'IA - Paciente', href: '/dashboard/terapeutico' },
  { key: 'vendas', label: 'Comercial', href: '/dashboard/vendas' },
  { key: 'rankings', label: 'Rankings', href: '/dashboard/rankings' },
  { key: 'retornos', label: 'Retornos', href: '/dashboard/retornos' },
]

const DashboardTabs = React.memo(function DashboardTabs({ activeTab }: { activeTab: DashboardTab }) {
  const router = useRouter()

  return (
    <div className="mb-8">
      <div className="border-b border-clinic-gray-700">
        <nav className="flex space-x-8 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab
            return (
              <button
                key={tab.key}
                onClick={isActive ? undefined : () => router.push(tab.href)}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 whitespace-nowrap ${
                  isActive
                    ? 'border-clinic-cyan text-clinic-cyan'
                    : 'border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
})

export default DashboardTabs
