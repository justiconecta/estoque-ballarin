'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Package, 
  Users, 
  BarChart3,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { Button, Card, HeaderUniversal } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'
import NovaClinicaModal from '@/components/NovaClinicaModal'

interface DashboardStats {
  totalProdutos: number
  estoqueTotal: number
  movimentacoesHoje: number
  produtosBaixoEstoque: number
  totalPacientes: number
  consultasHoje: number
}

interface DateFilter {
  startDate: string
  endDate: string
  preset?: string
}

export default function DashboardPage() {
  const router = useRouter()
  
  // ✅ ESTADOS ESPECÍFICOS DA DASHBOARD (mantidos)
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'jornada' | 'marketing' | 'terapeutico'>('jornada')
  const [stats, setStats] = useState<DashboardStats>({
    totalProdutos: 0,
    estoqueTotal: 0,
    movimentacoesHoje: 0,
    produtosBaixoEstoque: 0,
    totalPacientes: 0,
    consultasHoje: 0
  })
  const [loading, setLoading] = useState(true)
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [showCustomDates, setShowCustomDates] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'hoje'
  })

  // ✅ CARREGAR DADOS ESPECÍFICOS DA DASHBOARD
  useEffect(() => {
    // Carregar dados apenas se usuário existir (será validado pelo HeaderUniversal)
    const userData = localStorage.getItem('ballarin_user')
    if (userData) {
      loadDashboardData()
    }
  }, [dateFilter])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Carregar dados dos diferentes módulos
      const [produtos, movimentacoes, pacientes, procedimentos] = await Promise.all([
        supabaseApi.getProdutos().catch(() => []),
        supabaseApi.getMovimentacoes(100).catch(() => []),
        supabaseApi.getPacientes(1000).catch(() => []),
        supabaseApi.getProcedimentos(100).catch(() => [])
      ])

      // Calcular estatísticas de produtos
      const totalProdutos = produtos.length
      const estoqueTotal = produtos.reduce((sum, produto) => {
        return sum + produto.lotes.reduce((loteSum: any, lote: { quantidade_disponivel: any }) => loteSum + lote.quantidade_disponivel, 0)
      }, 0)

      // Movimentações filtradas por data
      let movimentacoesFiltradas = movimentacoes
      if (dateFilter.preset !== 'hoje' || dateFilter.startDate !== dateFilter.endDate) {
        movimentacoesFiltradas = movimentacoes.filter(mov => {
          const movDate = new Date(mov.data_movimentacao).toDateString()
          const startDate = dateFilter.startDate ? new Date(dateFilter.startDate).toDateString() : null
          const endDate = dateFilter.endDate ? new Date(dateFilter.endDate).toDateString() : null
          
          if (!startDate || !endDate) return true
          
          const movDateTime = new Date(movDate).getTime()
          const startDateTime = new Date(startDate).getTime()
          const endDateTime = new Date(endDate).getTime()
          
          return movDateTime >= startDateTime && movDateTime <= endDateTime
        })
      }

      const movimentacoesHoje = movimentacoesFiltradas.length

      // Produtos com baixo estoque (menos de 10 unidades)
      const produtosBaixoEstoque = produtos.filter(produto => {
        const estoqueAtual = produto.lotes.reduce((sum: any, lote: { quantidade_disponivel: any }) => sum + lote.quantidade_disponivel, 0)
        return estoqueAtual < 10
      }).length

      // Pacientes
      const totalPacientes = pacientes.length
      
      // Consultas hoje (usando procedimentos como proxy)
      const hoje = new Date().toISOString().split('T')[0]
      const consultasHoje = procedimentos.filter(proc => 
        proc.data_realizacao && proc.data_realizacao.startsWith(hoje)
      ).length

      setStats({
        totalProdutos,
        estoqueTotal,
        movimentacoesHoje,
        produtosBaixoEstoque,
        totalPacientes,
        consultasHoje
      })

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ FUNÇÕES ESPECÍFICAS DA DASHBOARD (mantidas)
  const handleClinicaCriada = async () => {
    // Recarregar dados após criar clínica
    await loadDashboardData()
  }

  // ✅ CALLBACK PARA ABRIR MODAL NOVA CLÍNICA
  const handleShowNovaClinicaModal = () => {
    setShowNovaClinicaModal(true)
  }

  const handleTabClick = (tab: 'jornada' | 'marketing' | 'terapeutico') => {
    setActiveTab(tab)
    if (tab === 'marketing') {
      router.push('/dashboard/marketing')
    } else if (tab === 'terapeutico') {
      router.push('/dashboard/terapeutico')
    }
  }

  const handleDateFilterChange = (preset: string) => {
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    
    switch (preset) {
      case 'hoje':
        setDateFilter({ startDate: todayStr, endDate: todayStr, preset })
        break
      case '7dias':
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        setDateFilter({ 
          startDate: weekAgo.toISOString().split('T')[0], 
          endDate: todayStr, 
          preset 
        })
        break
      case '30dias':
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        setDateFilter({ 
          startDate: monthAgo.toISOString().split('T')[0], 
          endDate: todayStr, 
          preset 
        })
        break
      case 'personalizado':
        setShowCustomDates(true)
        break
    }
    
    if (preset !== 'personalizado') {
      setShowDateFilter(false)
      setShowCustomDates(false)
    }
  }

  const handleCustomDateApply = () => {
    setShowCustomDates(false)
    setShowDateFilter(false)
    setDateFilter(prev => ({ ...prev, preset: 'personalizado' }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner mb-4" />
          <p className="text-clinic-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-clinic-black">
      <div className="container mx-auto px-4 py0">
        
        {/* ✅ HEADER UNIVERSAL - UMA LINHA APENAS! */}
        <HeaderUniversal 
          titulo="Jornada do Paciente" 
          descricao="Visão geral da jornada do paciente e performance da clínica"
          icone={BarChart3}
          showNovaClinicaModal={handleShowNovaClinicaModal}
        />

        {/* ✅ NAVEGAÇÃO POR TABS - MANTIDA */}
        <div className="mb-8">
          <div className="border-b border-clinic-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => handleTabClick('jornada')}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'jornada'
                    ? 'border-clinic-cyan text-clinic-cyan'
                    : 'border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300'
                }`}
              >
                Jornada do Paciente
              </button>
              <button
                onClick={() => handleTabClick('marketing')}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'marketing'
                    ? 'border-clinic-cyan text-clinic-cyan'
                    : 'border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300'
                }`}
              >
                Marketing
              </button>
              <button
                onClick={() => handleTabClick('terapeutico')}
                className={`py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 ${
                  activeTab === 'terapeutico'
                    ? 'border-clinic-cyan text-clinic-cyan'
                    : 'border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300'
                }`}
              >
                Terapêutico
              </button>
            </nav>
          </div>
        </div>

        {/* ✅ CARDS DE MÉTRICAS - MANTIDOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Total de Pacientes</p>
                <p className="text-3xl font-bold text-clinic-white mt-1">
                  {stats.totalPacientes}
                </p>
              </div>
              <div className="p-3 bg-clinic-cyan/20 rounded-lg">
                <Users className="h-6 w-6 text-clinic-cyan" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Produtos em Estoque</p>
                <p className="text-3xl font-bold text-clinic-white mt-1">
                  {stats.totalProdutos}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Package className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Unidades Totais</p>
                <p className="text-3xl font-bold text-clinic-white mt-1">
                  {stats.estoqueTotal}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Movimentações</p>
                <p className="text-3xl font-bold text-clinic-white mt-1">
                  {stats.movimentacoesHoje}
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Consultas Hoje</p>
                <p className="text-3xl font-bold text-clinic-white mt-1">
                  {stats.consultasHoje}
                </p>
              </div>
              <div className="p-3 bg-clinic-cyan/20 rounded-lg">
                <Users className="h-6 w-6 text-clinic-cyan" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Baixo Estoque</p>
                <p className="text-3xl font-bold text-clinic-white mt-1">
                  {stats.produtosBaixoEstoque}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                stats.produtosBaixoEstoque > 0 
                  ? 'bg-red-500/20' 
                  : 'bg-green-500/20'
              }`}>
                <AlertCircle className={`h-6 w-6 ${
                  stats.produtosBaixoEstoque > 0 
                    ? 'text-red-400' 
                    : 'text-green-400'
                }`} />
              </div>
            </div>
          </Card>
        </div>

        {/* ✅ RESUMO DE AÇÕES RÁPIDAS - MANTIDO */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <Card>
            <div className="text-center p-6">
              <div className="p-4 bg-clinic-cyan/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Package className="h-8 w-8 text-clinic-cyan" />
              </div>
              <h3 className="text-lg font-semibold text-clinic-white mb-2">Gerenciar Estoque</h3>
              <p className="text-clinic-gray-400 text-sm mb-4">
                Controle de entrada e saída de produtos
              </p>
              <Button 
                onClick={() => router.push('/estoque')}
                className="w-full"
              >
                Acessar Estoque
              </Button>
            </div>
          </Card>

          <Card>
            <div className="text-center p-6">
              <div className="p-4 bg-green-500/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Users className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-clinic-white mb-2">Cadastro de Pacientes</h3>
              <p className="text-clinic-gray-400 text-sm mb-4">
                Gerenciar informações dos pacientes
              </p>
              <Button 
                onClick={() => router.push('/pacientes')}
                variant="secondary"
                className="w-full"
              >
                Ver Pacientes
              </Button>
            </div>
          </Card>

          <Card>
            <div className="text-center p-6">
              <div className="p-4 bg-purple-500/20 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-clinic-white mb-2">Analytics Avançado</h3>
              <p className="text-clinic-gray-400 text-sm mb-4">
                Relatórios detalhados e insights
              </p>
              <Button 
                onClick={() => handleTabClick('marketing')}
                variant="secondary"
                className="w-full"
              >
                Ver Analytics
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* ✅ MODAL NOVA CLÍNICA - MANTIDO */}
      <NovaClinicaModal 
        isOpen={showNovaClinicaModal}
        onClose={() => setShowNovaClinicaModal(false)}
        onSuccess={handleClinicaCriada}
      />
    </div>
  )
}