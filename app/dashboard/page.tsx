'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  LogOut, 
  Package, 
  Users, 
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Sun,
  Moon,
  Home
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

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
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
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
  const [isDarkTheme, setIsDarkTheme] = useState(true)

  // Detectar página atual para botão ativo
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard'
  const isCurrentPage = (path: string) => currentPath === path

  // Verificar autenticação
  useEffect(() => {
    const userData = localStorage.getItem('ballarin_user')
    if (!userData) {
      router.push('/login')
      return
    }
    
    try {
      const user = JSON.parse(userData) as Usuario
      setCurrentUser(user)
    } catch {
      router.push('/login')
    }
  }, [router])

  // Carregar dados do dashboard
  useEffect(() => {
    if (currentUser) {
      loadDashboardData()
    }
  }, [currentUser, dateFilter])

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
        return sum + produto.lotes.reduce((loteSum, lote) => loteSum + lote.quantidade_disponivel, 0)
      }, 0)

      // Movimentações filtradas por data
      let movimentacoesFiltradas = movimentacoes
      if (dateFilter.preset !== 'hoje' || dateFilter.startDate !== dateFilter.endDate) {
        movimentacoesFiltradas = movimentacoes.filter(mov => {
          const movDate = new Date(mov.data_movimentacao).toDateString()
          const startDate = dateFilter.startDate ? new Date(dateFilter.startDate).toDateString() : null
          const endDate = dateFilter.endDate ? new Date(dateFilter.endDate).toDateString() : null
          
          if (startDate && endDate) {
            return movDate >= startDate && movDate <= endDate
          } else if (startDate) {
            return movDate >= startDate
          } else if (endDate) {
            return movDate <= endDate
          }
          return true
        })
      }
      
      const movimentacoesHoje = movimentacoesFiltradas.length
      
      // Produtos com baixo estoque (menos de 10 unidades)
      const produtosBaixoEstoque = produtos.filter(produto => {
        const estoqueProduto = produto.lotes.reduce((sum, lote) => sum + lote.quantidade_disponivel, 0)
        return estoqueProduto < 10
      }).length

      // Estatísticas de pacientes
      const totalPacientes = pacientes.length
      
      // Consultas baseadas em dados reais
      const consultasHoje = procedimentos.filter(proc => {
        const procDate = new Date(proc.data_realizacao || '').toDateString()
        const hoje = new Date().toDateString()
        return procDate === hoje
      }).length

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

  const getFilterDisplayName = (preset?: string) => {
    switch (preset) {
      case 'hoje': return 'Hoje'
      case '7dias': return 'Últimos 7 dias'
      case '14dias': return 'Últimos 14 dias'
      case '30dias': return 'Últimos 30 dias'
      case 'mes_passado': return 'Mês Passado'
      case 'personalizado': return 'Personalizado'
      default: return 'Hoje'
    }
  }

  const handleDatePreset = (preset: string) => {
    const hoje = new Date()
    const endDate = hoje.toISOString().split('T')[0]
    let startDate = endDate

    switch (preset) {
      case 'hoje':
        startDate = endDate
        break
      case '7dias':
        const date7 = new Date(hoje)
        date7.setDate(hoje.getDate() - 7)
        startDate = date7.toISOString().split('T')[0]
        break
      case '14dias':
        const date14 = new Date(hoje)
        date14.setDate(hoje.getDate() - 14)
        startDate = date14.toISOString().split('T')[0]
        break
      case '30dias':
        const date30 = new Date(hoje)
        date30.setDate(hoje.getDate() - 30)
        startDate = date30.toISOString().split('T')[0]
        break
      case 'mes_passado':
        const lastMonth = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        const lastMonthEnd = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
        startDate = lastMonth.toISOString().split('T')[0]
        break
    }

    setDateFilter({ startDate, endDate, preset })
    setShowDateFilter(false)
    setShowCustomDates(false)
  }

  const handleCustomDateApply = () => {
    setDateFilter(prev => ({ ...prev, preset: 'personalizado' }))
    setShowCustomDates(false)
    setShowDateFilter(false)
  }

  const handleTabClick = (tab: 'jornada' | 'marketing' | 'terapeutico') => {
    setActiveTab(tab)
    
    if (tab === 'marketing') {
      router.push('/dashboard/marketing')
    } else if (tab === 'terapeutico') {
      router.push('/dashboard/terapeutico')
    }
    // Para 'jornada', mantém na mesma página
  }

  if (!currentUser || loading) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-clinic-black">
      <div className="max-w-7xl mx-auto">
        {/* Header Universal */}
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
                    <Home className="h-5 w-5 text-clinic-cyan" />
                  </div>
                  <h1 className="text-xl font-bold text-clinic-white tracking-tight">Dashboard Geral</h1>
                </div>
                <p className="text-clinic-gray-300 text-sm">
                  Visão completa das operações e métricas da clínica
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
              </div>
              
              <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-1 border border-clinic-gray-600">
                <Button 
                  variant="secondary" 
                  onClick={toggleTheme} 
                  icon={isDarkTheme ? Sun : Moon} 
                  size="sm"
                  className="w-12 h-10 flex items-center justify-center hover:bg-clinic-cyan hover:text-clinic-black transition-all duration-300 hover:scale-105 rounded-md font-medium"
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

        {/* Navegação por Tabs - Simplificada */}
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
                Jornada do Cliente
              </button>
              <button
                onClick={() => handleTabClick('marketing')}
                className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
              >
                Marketing
              </button>
              <button
                onClick={() => handleTabClick('terapeutico')}
                className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
              >
                Terapêutico
              </button>
            </nav>
          </div>
        </div>

        {/* Filtro de Data */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-clinic-white">Jornada do Cliente</h2>
            <div className="relative">
              <Button
                variant="secondary"
                onClick={() => setShowDateFilter(!showDateFilter)}
                size="md"
                className="min-w-[160px] justify-center"
              >
                {getFilterDisplayName(dateFilter.preset)}
              </Button>
              
              {showDateFilter && (
                <div className="absolute right-0 top-full mt-2 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg shadow-clinic-lg z-50 min-w-[200px]">
                  <div className="p-3">
                    <div className="space-y-2">
                      {[
                        { key: 'hoje', label: 'Hoje' },
                        { key: '7dias', label: 'Últimos 7 dias' },
                        { key: '14dias', label: 'Últimos 14 dias' },
                        { key: '30dias', label: 'Últimos 30 dias' },
                        { key: 'mes_passado', label: 'Mês Passado' }
                      ].map((preset) => (
                        <button
                          key={preset.key}
                          onClick={() => handleDatePreset(preset.key)}
                          className="block w-full text-left px-3 py-2 text-sm text-clinic-white hover:bg-clinic-gray-700 rounded transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                      <button
                        onClick={() => setShowCustomDates(!showCustomDates)}
                        className="block w-full text-left px-3 py-2 text-sm text-clinic-cyan hover:bg-clinic-gray-700 rounded transition-colors"
                      >
                        Personalizado
                      </button>
                    </div>
                    
                    {showCustomDates && (
                      <div className="mt-3 pt-3 border-t border-clinic-gray-600">
                        <div className="space-y-2">
                          <div>
                            <label className="block text-xs text-clinic-gray-400 mb-1">De:</label>
                            <input
                              type="date"
                              value={dateFilter.startDate}
                              onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                              className="w-full px-3 py-2 bg-clinic-gray-700 border border-clinic-gray-600 rounded text-clinic-white text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-clinic-gray-400 mb-1">Até:</label>
                            <input
                              type="date"
                              value={dateFilter.endDate}
                              onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                              className="w-full px-3 py-2 bg-clinic-gray-700 border border-clinic-gray-600 rounded text-clinic-white text-sm"
                            />
                          </div>
                          <div className="flex space-x-2 mt-3">
                            <Button size="sm" onClick={handleCustomDateApply}>
                              Aplicar
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => {
                              setShowCustomDates(false)
                              setShowDateFilter(false)
                            }}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-clinic-cyan/20 rounded-lg">
                <Package className={`h-6 w-6 ${
                  stats.totalProdutos > 0 ? 'text-clinic-cyan' : 'text-gray-400'
                }`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-clinic-gray-400">Total Produtos</p>
                <p className="text-2xl font-bold text-clinic-white">{stats.totalProdutos}</p>
                <p className="text-xs text-clinic-gray-400">produtos ativos</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-clinic-gray-400">Estoque Total</p>
                <p className="text-2xl font-bold text-clinic-white">{stats.estoqueTotal}</p>
                <p className="text-xs text-green-400">unidades disponíveis</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-clinic-gray-400">Movimentações</p>
                <p className="text-2xl font-bold text-clinic-white">{stats.movimentacoesHoje}</p>
                <p className="text-xs text-blue-400">no período selecionado</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertCircle className={`h-6 w-6 ${
                  stats.produtosBaixoEstoque > 0 ? 'text-red-400' : 'text-green-400'
                }`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-clinic-gray-400">Baixo Estoque</p>
                <p className="text-2xl font-bold text-clinic-white">{stats.produtosBaixoEstoque}</p>
                <p className={`text-xs ${
                  stats.produtosBaixoEstoque > 0 ? 'text-red-400' : 'text-green-400'
                }`}>
                  {stats.produtosBaixoEstoque > 0 ? 'produtos críticos' : 'tudo OK'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Conteúdo da Jornada do Paciente */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Pacientes Cadastrados">
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-clinic-cyan mb-2">
                {stats.totalPacientes}
              </div>
              <p className="text-clinic-gray-400">pacientes no sistema</p>
            </div>
          </Card>
          
          <Card title="Consultas do Dia">
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-green-400 mb-2">
                {stats.consultasHoje}
              </div>
              <p className="text-clinic-gray-400">procedimentos realizados hoje</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}