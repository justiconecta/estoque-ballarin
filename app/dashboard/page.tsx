'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  LogOut, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  DollarSign,
  AlertTriangle,
  BarChart3,
  PackageOpen,
  Heart,
  Target,
  MessageCircle
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
  }, [currentUser])

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
      
      // Movimentações de hoje
      const hoje = new Date().toDateString()
      const movimentacoesHoje = movimentacoes.filter(mov => 
        new Date(mov.data_movimentacao).toDateString() === hoje
      ).length
      
      // Produtos com baixo estoque (menos de 10 unidades)
      const produtosBaixoEstoque = produtos.filter(produto => {
        const estoqueProduto = produto.lotes.reduce((sum, lote) => sum + lote.quantidade_disponivel, 0)
        return estoqueProduto < 10
      }).length

      // Estatísticas de pacientes
      const totalPacientes = pacientes.length
      const consultasHoje = Math.floor(Math.random() * 15) + 5 // Simulado

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

  if (!currentUser) {
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
              Bem-vindo, <span className="font-semibold text-clinic-cyan">{currentUser.nome_completo}</span>
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={() => router.push('/estoque')} icon={Package}>
              Controle de Estoque
            </Button>
            <Button variant="secondary" onClick={() => router.push('/pacientes')} icon={Users}>
              Pacientes
            </Button>
            <Button variant="secondary" onClick={handleLogout} icon={LogOut}>
              Sair
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="loading-spinner" />
          </div>
        ) : (
          <>
            {/* Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-clinic-cyan/10 to-clinic-cyan/5 border-clinic-cyan/20">
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

              <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-500/20">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <PackageOpen className="h-8 w-8 text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-clinic-gray-400">Estoque Total</p>
                    <p className="text-2xl font-bold text-clinic-white">{stats.estoqueTotal}</p>
                    <p className="text-xs text-green-400">unidades disponíveis</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
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

              <Card className={`bg-gradient-to-br ${
                stats.produtosBaixoEstoque > 0 
                  ? 'from-red-500/10 to-red-600/10 border-red-500/20' 
                  : 'from-green-500/10 to-green-600/10 border-green-500/20'
              }`}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className={`h-8 w-8 ${
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
                <Card className="hover:border-clinic-cyan/50 transition-all duration-200 cursor-pointer group"
                      onClick={() => router.push('/dashboard/marketing')}>
                  <div className="text-center py-6">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-br from-clinic-cyan/20 to-clinic-cyan/10 rounded-full flex items-center justify-center mb-4 group-hover:from-clinic-cyan/30 group-hover:to-clinic-cyan/20 transition-all duration-200">
                      <BarChart3 className="h-8 w-8 text-clinic-cyan" />
                    </div>
                    <h3 className="text-xl font-bold text-clinic-white mb-2">Dashboard Marketing</h3>
                    <p className="text-clinic-gray-400 mb-4">
                      Análise de origem de leads, tópicos de marketing e oportunidades de conteúdo
                    </p>
                    <ul className="text-sm text-clinic-gray-300 space-y-1">
                      <li>• Fonte de usuários por canal</li>
                      <li>• Tópicos de marketing do mês</li>
                      <li>• Oportunidades de conteúdo</li>
                      <li>• Resumos semanais e diários</li>
                    </ul>
                  </div>
                </Card>

                <Card className="hover:border-green-500/50 transition-all duration-200 cursor-pointer group"
                      onClick={() => router.push('/dashboard/terapeutico')}>
                  <div className="text-center py-6">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-br from-green-500/20 to-green-500/10 rounded-full flex items-center justify-center mb-4 group-hover:from-green-500/30 group-hover:to-green-500/20 transition-all duration-200">
                      <Heart className="h-8 w-8 text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-clinic-white mb-2">Dashboard Acompanhamento Terapêutico</h3>
                    <p className="text-clinic-gray-400 mb-4">
                      Monitoramento da jornada do paciente e experiência terapêutica
                    </p>
                    <ul className="text-sm text-clinic-gray-300 space-y-1">
                      <li>• Pacientes ativos e engajamento</li>
                      <li>• Ranking de pacientes mais ativos</li>
                      <li>• Top 10 efeitos adversos</li>
                      <li>• Dashboard CX completo</li>
                    </ul>
                  </div>
                </Card>
              </div>
            </div>

            {/* Grid de Ações Rápidas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card title="Módulos do Sistema">
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="primary"
                    onClick={() => router.push('/estoque')}
                    icon={Package}
                  >
                    Controle de Estoque
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="primary"
                    onClick={() => router.push('/pacientes')}
                    icon={Users}
                  >
                    Gestão de Pacientes
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="secondary"
                    disabled
                    icon={Calendar}
                  >
                    Agendamentos
                    <span className="ml-auto text-xs text-clinic-gray-500">Em breve</span>
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="secondary"
                    disabled
                    icon={DollarSign}
                  >
                    Relatórios Financeiros
                    <span className="ml-auto text-xs text-clinic-gray-500">Em breve</span>
                  </Button>
                </div>
              </Card>

              <Card title="Alertas do Sistema">
                <div className="space-y-3">
                  {stats.produtosBaixoEstoque > 0 ? (
                    <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                        <span className="text-red-400 font-medium">Estoque Crítico</span>
                      </div>
                      <p className="text-clinic-gray-300 text-sm">
                        {stats.produtosBaixoEstoque} produtos com baixo estoque precisam de reposição
                      </p>
                      <Button 
                        size="sm" 
                        variant="danger" 
                        className="mt-2"
                        onClick={() => router.push('/estoque')}
                      >
                        Verificar Estoque
                      </Button>
                    </div>
                  ) : (
                    <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                      <div className="flex items-center mb-2">
                        <TrendingUp className="h-5 w-5 text-green-400 mr-2" />
                        <span className="text-green-400 font-medium">Sistema OK</span>
                      </div>
                      <p className="text-clinic-gray-300 text-sm">
                        Todos os produtos estão com estoque adequado
                      </p>
                    </div>
                  )}

                  <div className="p-3 bg-clinic-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-clinic-white font-medium">Movimentações Hoje</span>
                      <span className="text-clinic-cyan font-bold">{stats.movimentacoesHoje}</span>
                    </div>
                    <p className="text-clinic-gray-400 text-sm">Registros de entrada e saída</p>
                  </div>

                  <div className="p-3 bg-clinic-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-clinic-white font-medium">Consultas Hoje</span>
                      <span className="text-green-400 font-bold">{stats.consultasHoje}</span>
                    </div>
                    <p className="text-clinic-gray-400 text-sm">Atendimentos realizados</p>
                  </div>
                </div>
              </Card>

              <Card title="Acesso Rápido">
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="secondary"
                    onClick={() => router.push('/dashboard/marketing')}
                    icon={BarChart3}
                  >
                    Dashboard Marketing
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="secondary"
                    onClick={() => router.push('/dashboard/terapeutico')}
                    icon={Heart}
                  >
                    Dashboard Terapêutico
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="secondary"
                    onClick={() => router.push('/estoque')}
                    icon={Package}
                  >
                    Visualizar Estoque
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="secondary"
                    onClick={() => router.push('/pacientes')}
                    icon={Users}
                  >
                    Listar Pacientes
                  </Button>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}