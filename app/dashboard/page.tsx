'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  LogOut, 
  Package, 
  Users, 
  BarChart3,
  Heart,
  Sun,
  Moon
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

  const getFilterDisplayName = (preset?: string): string => {
    switch (preset) {
      case 'hoje': return 'Hoje'
      case '7dias': return 'Últimos 7 dias'
      case '14dias': return 'Últimos 14 dias'
      case '30dias': return 'Últimos 30 dias'
      case 'mes_passado': return 'Mês passado'
      case 'personalizado': return 'Personalizado'
      default: return 'Hoje'
    }
  }

  // Verificar autenticação e permissão
  useEffect(() => {
    const userData = localStorage.getItem('ballarin_user')
    if (!userData) {
      router.push('/login')
      return
    }
    
    try {
      const user = JSON.parse(userData) as Usuario
      if (user.role !== 'admin') {
        router.push('/estoque')
        return
      }
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
      
      // Carregar produtos para calcular estatísticas
      const produtos = await supabaseApi.getProdutos()
      const movimentacoes = await supabaseApi.getMovimentacoes(100)
      const pacientes = await supabaseApi.getPacientes(1000)
      
      // Calcular estatísticas
      const totalProdutos = produtos.length
      const estoqueTotal = produtos.reduce((sum, produto) => 
        sum + produto.lotes.reduce((loteSum, lote) => loteSum + lote.quantidade_disponivel, 0), 0
      )
      
      // Filtrar movimentações por data se filtro ativo
      let movimentacoesFiltradas = movimentacoes
      if (dateFilter.startDate || dateFilter.endDate) {
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
      const procedimentos = await supabaseApi.getProcedimentos(100)
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
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-clinic-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Image
                src="/justiconecta.png"
                alt="JustiConecta"
                width={85}
                height={85}
                className="rounded-lg"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-clinic-white">Dashboard Geral da Clínica</h1>
              <p className="text-clinic-gray-400 mt-1">
                Visão completa das operações e métricas
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={() => router.push('/estoque')} icon={Package} size="sm">
              Estoque
            </Button>
            <Button variant="secondary" onClick={() => router.push('/pacientes')} icon={Users} size="sm">
              Pacientes
            </Button>
            <Button 
              variant="secondary" 
              onClick={toggleTheme} 
              icon={isDarkTheme ? Sun : Moon} 
              size="sm"
              className="min-w-[44px] px-3"
              title={isDarkTheme ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            />
            <Button variant="secondary" onClick={handleLogout} icon={LogOut} size="sm">
              Sair
            </Button>
          </div>
        </header>

        {/* Navegação por Tabs */}
        <div className="mb-8">
          <div className="border-b border-clinic-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => handleTabClick('jornada')}
                className={`py-3 px-6 border-b-2 font-medium text-base transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'jornada'
                    ? 'border-clinic-cyan text-clinic-cyan'
                    : 'border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  activeTab === 'jornada' ? 'bg-clinic-cyan text-clinic-black' : 'bg-clinic-gray-600'
                }`}>
                  <span className="text-xs font-bold">J</span>
                </div>
                <span>Jornada do Paciente</span>
              </button>
              <button
                onClick={() => handleTabClick('marketing')}
                className="py-3 px-6 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-base transition-all duration-200 flex items-center space-x-2"
              >
                <div className="w-6 h-6 rounded-full bg-clinic-gray-600 flex items-center justify-center">
                  <span className="text-xs font-bold">M</span>
                </div>
                <span>Dashboard Marketing</span>
              </button>
              <button
                onClick={() => handleTabClick('terapeutico')}
                className="py-3 px-6 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-base transition-all duration-200 flex items-center space-x-2"
              >
                <div className="w-6 h-6 rounded-full bg-clinic-gray-600 flex items-center justify-center">
                  <span className="text-xs font-bold">T</span>
                </div>
                <span>Dashboard Terapêutico</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Filtro de Data */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-clinic-white">Métricas Operacionais</h2>
            <div className="relative">
              <Button
                variant="secondary"
                onClick={() => setShowDateFilter(!showDateFilter)}
                size="md"
                className="min-w-[140px]"
              >
                {getFilterDisplayName(dateFilter.preset)}
              </Button>
              
              {showDateFilter && (
                <div className="absolute right-0 mt-2 w-56 bg-clinic-gray-800 rounded-lg shadow-clinic-lg border border-clinic-gray-700 z-10">
                  <div className="py-2">
                    {['hoje', '7dias', '14dias', '30dias', 'mes_passado'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleDatePreset(preset)}
                        className="block w-full text-left px-4 py-2 text-sm text-clinic-white hover:bg-clinic-gray-700"
                      >
                        {getFilterDisplayName(preset)}
                      </button>
                    ))}
                    <button
                      onClick={() => setShowCustomDates(true)}
                      className="block w-full text-left px-4 py-2 text-sm text-clinic-white hover:bg-clinic-gray-700"
                    >
                      Personalizado
                    </button>
                  </div>
                  
                  {showCustomDates && (
                    <div className="border-t border-clinic-gray-700 p-4">
                      <div className="space-y-3">
                        <input
                          type="date"
                          value={dateFilter.startDate}
                          onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-3 py-2 bg-clinic-gray-700 border border-clinic-gray-600 rounded text-clinic-white text-sm"
                        />
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
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-clinic-gray-800 to-clinic-gray-700 border-clinic-gray-600">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-clinic-cyan" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-clinic-gray-400">Total Produtos</p>
                <p className="text-2xl font-bold text-clinic-white">{stats.totalProdutos}</p>
                <p className="text-xs text-clinic-cyan">produtos cadastrados</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-clinic-gray-800 to-clinic-gray-700 border-clinic-gray-600">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className="h-8 w-8 text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-clinic-gray-400">Estoque Total</p>
                <p className="text-2xl font-bold text-clinic-white">{stats.estoqueTotal}</p>
                <p className="text-xs text-green-400">unidades disponíveis</p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-clinic-gray-800 to-clinic-gray-700 border-clinic-gray-600">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-clinic-gray-400">Total Pacientes</p>
                <p className="text-2xl font-bold text-clinic-white">{stats.totalPacientes}</p>
                <p className="text-xs text-blue-400">pacientes cadastrados</p>
              </div>
            </div>
          </Card>

          <Card className={`
            bg-gradient-to-br border 
            ${stats.produtosBaixoEstoque > 0 
              ? 'from-red-500/10 to-red-600/10 border-red-500/20' 
              : 'from-green-500/10 to-green-600/10 border-green-500/20'
            }`}>
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Package className={`h-8 w-8 ${
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
          <Card title="Movimentações Recentes">
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-clinic-white mb-2">
                {stats.movimentacoesHoje}
              </div>
              <p className="text-clinic-gray-400">movimentações no período</p>
            </div>
          </Card>
          
          <Card title="Consultas do Dia">
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-clinic-cyan mb-2">
                {stats.consultasHoje}
              </div>
              <p className="text-clinic-gray-400">procedimentos realizados</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}