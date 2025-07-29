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
  PackageOpen
} from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface DashboardStats {
  totalProdutos: number
  estoqueTotal: number
  movimentacoesHoje: number
  produtosBaixoEstoque: number
  faturamentoMes?: number
  consultasHoje?: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalProdutos: 0,
    estoqueTotal: 0,
    movimentacoesHoje: 0,
    produtosBaixoEstoque: 0
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

      setStats({
        totalProdutos,
        estoqueTotal,
        movimentacoesHoje,
        produtosBaixoEstoque
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
            <Button variant="secondary" onClick={handleLogout} icon={LogOut}>
              Sair
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="loading-spinner" />
            <span className="ml-2 text-clinic-gray-400">Carregando dados...</span>
          </div>
        ) : (
          <>
            {/* Grid de Estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-clinic-cyan/10 to-clinic-cyan-dark/10 border-clinic-cyan/20">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Package className="h-8 w-8 text-clinic-cyan" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-clinic-gray-400">Total de Produtos</p>
                    <p className="text-2xl font-bold text-clinic-white">{stats.totalProdutos}</p>
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
                    <p className="text-xs text-green-400">unidades</p>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-8 w-8 text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-clinic-gray-400">Movimentações Hoje</p>
                    <p className="text-2xl font-bold text-clinic-white">{stats.movimentacoesHoje}</p>
                  </div>
                </div>
              </Card>

              <Card className={`bg-gradient-to-br border ${
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
                    <div className="flex items-start space-x-3 p-3 bg-red-900/20 border border-red-700 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-red-400">Estoque Baixo</p>
                        <p className="text-xs text-red-300 mt-1">
                          {stats.produtosBaixoEstoque} produto(s) com estoque crítico
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start space-x-3 p-3 bg-green-900/20 border border-green-700 rounded-lg">
                      <Package className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-400">Estoque Saudável</p>
                        <p className="text-xs text-green-300 mt-1">
                          Todos os produtos com estoque adequado
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="text-center py-4">
                    <p className="text-xs text-clinic-gray-500">
                      Sistema funcionando normalmente
                    </p>
                  </div>
                </div>
              </Card>

              <Card title="Resumo de Atividades">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-clinic-gray-400">Produtos cadastrados</span>
                    <span className="text-sm font-medium text-clinic-white">{stats.totalProdutos}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-clinic-gray-400">Unidades em estoque</span>
                    <span className="text-sm font-medium text-clinic-white">{stats.estoqueTotal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-clinic-gray-400">Movimentações hoje</span>
                    <span className="text-sm font-medium text-clinic-white">{stats.movimentacoesHoje}</span>
                  </div>
                  
                  <div className="pt-4 border-t border-clinic-gray-700">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-clinic-cyan rounded-full animate-pulse"></div>
                      <span className="text-xs text-clinic-gray-400">Sistema online</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}