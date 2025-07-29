'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  LogOut, 
  Package, 
  Users, 
  BarChart3,
  Heart
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

  const handleDatePreset = (preset: string) => {
    const hoje = new Date()
    const endDate = hoje.toISOString().split('T')[0]
    let startDate = endDate

    switch (preset) {
      case 'hoje':
        startDate = endDate // Mesmo dia
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
        const mesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        const ultimoDiaMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
        startDate = mesPassado.toISOString().split('T')[0]
        setDateFilter({
          startDate,
          endDate: ultimoDiaMesPassado.toISOString().split('T')[0],
          preset
        })
        setShowDateFilter(false)
        setShowCustomDates(false)
        return
      case 'personalizado':
        setShowCustomDates(true)
        return
      default:
        startDate = endDate
    }

    setDateFilter({ startDate, endDate, preset })
    setShowDateFilter(false)
    setShowCustomDates(false)
  }

  const handleCustomDateApply = () => {
    setDateFilter(prev => ({ ...prev, preset: 'personalizado' }))
    setShowDateFilter(false)
    setShowCustomDates(false)
  }

  const navigateToMarketing = () => {
    console.log('Navegando para marketing...')
    router.push('/dashboard/marketing')
  }

  const navigateToTerapeutico = () => {
    console.log('Navegando para terapêutico...')
    router.push('/dashboard/terapeutico')
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
          <div>
            <h1 className="text-3xl font-bold text-clinic-white">Dashboard Administrativo</h1>
            <p className="text-clinic-gray-400 mt-1">
              Bem-vindo, <span className="text-clinic-cyan">{currentUser.nome}</span>
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={() => router.push('/estoque')} icon={Package} size="sm">
              Controle de Estoque
            </Button>
            <Button variant="secondary" onClick={() => router.push('/pacientes')} icon={Users} size="sm">
              Pacientes
            </Button>
            <Button variant="secondary" onClick={handleLogout} icon={LogOut} size="sm">
              Sair
            </Button>
          </div>
        </header>

        {/* Filtro por Data - Mostra nome do filtro ativo */}
        <div className="flex justify-end mb-6">
          <div className="relative">
            <Button 
              variant="secondary" 
              onClick={() => setShowDateFilter(!showDateFilter)} 
              size="sm"
              className="px-4 py-2 bg-clinic-gray-700 border border-clinic-gray-600 hover:bg-clinic-gray-600 text-clinic-white"
            >
              {getFilterDisplayName(dateFilter.preset)}
            </Button>
            {showDateFilter && (
              <div className="absolute right-0 top-full mt-2 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg p-4 shadow-clinic-lg z-10 w-64">
                <div className="space-y-2">
                  <button
                    onClick={() => handleDatePreset('hoje')}
                    className={`w-full text-left p-2 hover:bg-clinic-gray-700 rounded text-clinic-white text-sm transition-colors ${
                      dateFilter.preset === 'hoje' ? 'bg-clinic-cyan/20 border border-clinic-cyan/50' : ''
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => handleDatePreset('7dias')}
                    className={`w-full text-left p-2 hover:bg-clinic-gray-700 rounded text-clinic-white text-sm transition-colors ${
                      dateFilter.preset === '7dias' ? 'bg-clinic-cyan/20 border border-clinic-cyan/50' : ''
                    }`}
                  >
                    Últimos 7 dias
                  </button>
                  <button
                    onClick={() => handleDatePreset('14dias')}
                    className={`w-full text-left p-2 hover:bg-clinic-gray-700 rounded text-clinic-white text-sm transition-colors ${
                      dateFilter.preset === '14dias' ? 'bg-clinic-cyan/20 border border-clinic-cyan/50' : ''
                    }`}
                  >
                    Últimos 14 dias
                  </button>
                  <button
                    onClick={() => handleDatePreset('30dias')}
                    className={`w-full text-left p-2 hover:bg-clinic-gray-700 rounded text-clinic-white text-sm transition-colors ${
                      dateFilter.preset === '30dias' ? 'bg-clinic-cyan/20 border border-clinic-cyan/50' : ''
                    }`}
                  >
                    Últimos 30 dias
                  </button>
                  <button
                    onClick={() => handleDatePreset('mes_passado')}
                    className={`w-full text-left p-2 hover:bg-clinic-gray-700 rounded text-clinic-white text-sm transition-colors ${
                      dateFilter.preset === 'mes_passado' ? 'bg-clinic-cyan/20 border border-clinic-cyan/50' : ''
                    }`}
                  >
                    Mês passado
                  </button>
                  <hr className="border-clinic-gray-600 my-2" />
                  <button
                    onClick={() => handleDatePreset('personalizado')}
                    className={`w-full text-left p-2 hover:bg-clinic-gray-700 rounded text-clinic-white text-sm transition-colors ${
                      dateFilter.preset === 'personalizado' ? 'bg-clinic-cyan/20 border border-clinic-cyan/50' : ''
                    }`}
                  >
                    Personalizado
                  </button>
                </div>
                
                {showCustomDates && (
                  <div className="mt-4 pt-4 border-t border-clinic-gray-600 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-clinic-white mb-1">
                        Data Início
                      </label>
                      <input
                        type="date"
                        value={dateFilter.startDate}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-3 py-2 bg-clinic-gray-700 border border-clinic-gray-600 rounded-md text-clinic-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-clinic-white mb-1">
                        Data Fim
                      </label>
                      <input
                        type="date"
                        value={dateFilter.endDate}
                        onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2 bg-clinic-gray-700 border border-clinic-gray-600 rounded-md text-clinic-white text-sm"
                      />
                    </div>
                    <div className="flex space-x-2">
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

        {/* Dashboards Especializados */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-clinic-white mb-6">Dashboards Especializados</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:border-clinic-cyan/50 transition-all duration-200">
              <div className="text-center py-6">
                <div className="mx-auto h-16 w-16 bg-gradient-to-br from-clinic-cyan/20 to-clinic-cyan/10 rounded-full flex items-center justify-center mb-4 transition-all duration-200">
                  <BarChart3 className="h-8 w-8 text-clinic-cyan" />
                </div>
                <h3 className="text-xl font-bold text-clinic-white mb-2">Dashboard Marketing</h3>
                <p className="text-clinic-gray-400 mb-4">
                  Análise de origem de leads, tópicos de marketing e oportunidades de conteúdo
                </p>
                <ul className="text-sm text-clinic-gray-300 space-y-1 mb-4">
                  <li>• Fonte de usuários por canal</li>
                  <li>• Tópicos de marketing do mês</li>
                  <li>• Oportunidades de conteúdo</li>
                  <li>• Resumos semanais e diários</li>
                </ul>
                <Button 
                  onClick={navigateToMarketing}
                  className="w-full"
                  icon={BarChart3}
                >
                  Acessar Dashboard
                </Button>
              </div>
            </Card>

            <Card className="hover:border-green-500/50 transition-all duration-200">
              <div className="text-center py-6">
                <div className="mx-auto h-16 w-16 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-full flex items-center justify-center mb-4 transition-all duration-200">
                  <Heart className="h-8 w-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-clinic-white mb-2">Dashboard Acompanhamento Terapêutico</h3>
                <p className="text-clinic-gray-400 mb-4">
                  Monitoramento da jornada do paciente e experiência terapêutica
                </p>
                <ul className="text-sm text-clinic-gray-300 space-y-1 mb-4">
                  <li>• Pacientes ativos e engajamento</li>
                  <li>• Ranking de pacientes mais ativos</li>
                  <li>• Top 10 efeitos adversos</li>
                  <li>• Dashboard CX completo</li>
                </ul>
                <Button 
                  onClick={navigateToTerapeutico}
                  className="w-full"
                  variant="success"
                  icon={Heart}
                >
                  Acessar Dashboard
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}