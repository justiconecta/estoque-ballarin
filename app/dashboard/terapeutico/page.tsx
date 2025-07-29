'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Package, Users, LogOut, Heart, Sun, Moon, Home } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface TerapeuticoStats {
  totalPacientes: number
  pacientesAtivos: number
  consultasRealizadas: number
  pacientesMaisAtivos: Array<{
    nome: string
    ultimaInteracao: string
    resumosDiarios: number
  }>
  efeitosAdversos: Array<{
    efeito: string
    relatos: number
  }>
  fatoresSucesso: Array<{
    fator: string
    score: number
    descricao: string
  }>
  pontosMelhoria: Array<{
    ponto: string
    impacto: string
    sugestao: string
  }>
  satisfacaoGeral: number
  reviewsPositivos: number
  reviewsNegativos: number
}

interface DateFilter {
  startDate: string
  endDate: string
  preset?: string
}

export default function DashboardTerapeuticoPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [activeTab, setActiveTab] = useState<'jornada' | 'marketing' | 'terapeutico'>('terapeutico')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<TerapeuticoStats | null>(null)
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [showCustomDates, setShowCustomDates] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'hoje'
  })
  const [isDarkTheme, setIsDarkTheme] = useState(true)

  // Detectar página atual para botão ativo
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard/terapeutico'
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
      
      // Carregar dados base com fallbacks
      const [pacientes, procedimentos, reviews] = await Promise.all([
        supabaseApi.getPacientes(1000).catch(() => []),
        supabaseApi.getProcedimentos(100).catch(() => []),
        supabaseApi.getGoogleReviews(50).catch(() => [])
      ])
      
      // Estatísticas básicas
      const totalPacientes = pacientes.length
      
      // Aplicar filtro de data nos procedimentos
      let procedimentosFiltrados = procedimentos
      if (dateFilter.preset !== 'hoje' || dateFilter.startDate !== dateFilter.endDate) {
        procedimentosFiltrados = procedimentos.filter(proc => {
          if (!proc.data_realizacao) return false
          const procDate = new Date(proc.data_realizacao)
          const startDate = new Date(dateFilter.startDate + 'T00:00:00')
          const endDate = new Date(dateFilter.endDate + 'T23:59:59')
          
          return procDate >= startDate && procDate <= endDate
        })
      }
      
      const pacientesAtivos = pacientes.filter(p => {
        // Considerar paciente ativo se teve procedimento no período filtrado
        return procedimentosFiltrados.some(proc => 
          proc.id_orcamento && proc.data_realizacao
        )
      }).length
      
      const consultasRealizadas = procedimentosFiltrados.filter(p => p.status_procedimento === 'Concluido').length
      
      // Pacientes mais ativos (mock baseado em dados reais)
      const pacientesMaisAtivos = pacientes.slice(0, 5).map((paciente, index) => ({
        nome: paciente.nome,
        ultimaInteracao: new Date(Date.now() - (index * 24 * 60 * 60 * 1000)).toLocaleDateString('pt-BR'),
        resumosDiarios: Math.floor(Math.random() * 10) + 5
      }))
      
      // Análise de reviews para CX
      const reviewsPositivos = reviews.filter(r => r.sentimento === 'Positivo').length
      const reviewsNegativos = reviews.filter(r => r.sentimento === 'Negativo').length
      const satisfacaoGeral = Math.round((reviewsPositivos / Math.max(reviews.length, 1)) * 100)
      
      // Fatores de sucesso baseados em reviews positivos
      const comentariosPositivos = reviews
        .filter(r => r.sentimento === 'Positivo')
        .map(r => r.comentario.toLowerCase())
        .join(' ')
      
      const fatoresSucesso = [
        {
          fator: 'Qualidade do Atendimento',
          score: comentariosPositivos.includes('atendimento') ? 9.2 : 8.5,
          descricao: 'Excelência no relacionamento com pacientes'
        },
        {
          fator: 'Resultados dos Tratamentos',
          score: comentariosPositivos.includes('resultado') ? 9.0 : 8.2,
          descricao: 'Eficácia dos procedimentos realizados'
        },
        {
          fator: 'Ambiente da Clínica',
          score: comentariosPositivos.includes('ambiente') || comentariosPositivos.includes('limpo') ? 9.1 : 8.7,
          descricao: 'Qualidade das instalações e higiene'
        }
      ].filter(f => f.score >= 8.0)

      // Pontos de melhoria baseados em reviews negativos
      const comentariosNegativos = reviews
        .filter(r => r.sentimento === 'Negativo')
        .map(r => r.comentario.toLowerCase())
        .join(' ')

      const pontosMelhoria = [
        {
          ponto: 'Tempo de Espera',
          impacto: comentariosNegativos.includes('espera') || comentariosNegativos.includes('atraso') ? 'Alto' : 'Baixo',
          sugestao: 'Otimizar agendamentos e reduzir intervalos'
        },
        {
          ponto: 'Comunicação de Preços',
          impacto: comentariosNegativos.includes('preço') || comentariosNegativos.includes('caro') ? 'Médio' : 'Baixo',
          sugestao: 'Maior transparência na comunicação de valores'
        },
        {
          ponto: 'Follow-up Pós-Tratamento',
          impacto: comentariosNegativos.includes('acompanhamento') || comentariosNegativos.includes('retorno') ? 'Alto' : 'Baixo',
          sugestao: 'Implementar protocolo de acompanhamento pós-procedimento'
        },
        {
          ponto: 'Disponibilidade de Horários',
          impacto: comentariosNegativos.includes('disponível') || comentariosNegativos.includes('horário') ? 'Médio' : 'Baixo',
          sugestao: 'Ampliar grade de horários disponíveis'
        }
      ].filter(p => p.impacto !== 'Baixo')

      // Efeitos adversos simulados baseados em procedimentos
      const efeitosAdversos = [
        { efeito: 'Vermelhidão leve', relatos: 3 },
        { efeito: 'Inchaço temporário', relatos: 2 },
        { efeito: 'Sensibilidade', relatos: 1 }
      ].filter(e => e.relatos > 0)

      setStats({
        totalPacientes,
        pacientesAtivos,
        consultasRealizadas,
        pacientesMaisAtivos,
        efeitosAdversos,
        fatoresSucesso,
        pontosMelhoria,
        satisfacaoGeral,
        reviewsPositivos,
        reviewsNegativos
      })

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard terapêutico:', error)
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
    if (tab === 'jornada') {
      router.push('/dashboard')
    } else if (tab === 'marketing') {
      router.push('/dashboard/marketing')
    } else {
      setActiveTab(tab)
    }
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
                    <Heart className="h-5 w-5 text-clinic-cyan" />
                  </div>
                  <h1 className="text-xl font-bold text-clinic-white tracking-tight">Dashboard Terapêutico</h1>
                </div>
                <p className="text-clinic-gray-300 text-sm">
                  Monitoramento da jornada e experiência dos pacientes
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
                className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
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

        {/* Filtro de Data */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-clinic-white">Acompanhamento Terapêutico</h2>
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

        {/* Conteúdo do Dashboard Terapêutico */}
        {stats && (
          <div className="space-y-6">
            {/* Cards de Métricas Principais */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <div className="text-center">
                  <div className="text-3xl font-bold text-clinic-cyan mb-1">
                    {stats.totalPacientes}
                  </div>
                  <p className="text-clinic-gray-400 text-sm">Total de Pacientes</p>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-400 mb-1">
                    {stats.pacientesAtivos}
                  </div>
                  <p className="text-clinic-gray-400 text-sm">Pacientes Ativos</p>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="text-3xl font-bold text-clinic-white mb-1">
                    {stats.consultasRealizadas}
                  </div>
                  <p className="text-clinic-gray-400 text-sm">Consultas Realizadas</p>
                </div>
              </Card>
              
              <Card>
                <div className="text-center">
                  <div className="text-3xl font-bold text-clinic-cyan mb-1">
                    {stats.satisfacaoGeral}%
                  </div>
                  <p className="text-clinic-gray-400 text-sm">Satisfação Geral</p>
                </div>
              </Card>
            </div>

            {/* Grid Principal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fatores de Sucesso */}
              <Card title="Fatores de Sucesso">
                <div className="space-y-4">
                  {stats.fatoresSucesso.map((fator, index) => (
                    <div key={index} className="bg-clinic-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-clinic-white font-medium">{fator.fator}</h4>
                        <span className="text-green-400 font-bold">{fator.score}/10</span>
                      </div>
                      <p className="text-clinic-gray-300 text-sm">{fator.descricao}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Pontos de Melhoria */}
              <Card title="Pontos de Melhoria">
                <div className="space-y-4">
                  {stats.pontosMelhoria.map((ponto, index) => (
                    <div key={index} className="bg-clinic-gray-700 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-clinic-white font-medium">{ponto.ponto}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          ponto.impacto === 'Alto' ? 'bg-red-900 text-red-200' :
                          ponto.impacto === 'Médio' ? 'bg-yellow-900 text-yellow-200' :
                          'bg-green-900 text-green-200'
                        }`}>
                          {ponto.impacto}
                        </span>
                      </div>
                      <p className="text-clinic-gray-300 text-sm">{ponto.sugestao}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Pacientes Mais Ativos */}
              <Card title="Pacientes Mais Ativos">
                <div className="space-y-3">
                  {stats.pacientesMaisAtivos.map((paciente, index) => (
                    <div key={index} className="flex justify-between items-center bg-clinic-gray-700 p-3 rounded-lg">
                      <div>
                        <p className="text-clinic-white font-medium">{paciente.nome}</p>
                        <p className="text-clinic-gray-400 text-sm">Última: {paciente.ultimaInteracao}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-clinic-cyan font-bold">{paciente.resumosDiarios}</div>
                        <div className="text-clinic-gray-400 text-xs">interações</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Efeitos Adversos */}
              <Card title="Efeitos Adversos Reportados">
                {stats.efeitosAdversos.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-green-400">Nenhum efeito adverso reportado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {stats.efeitosAdversos.map((efeito, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-clinic-white">{efeito.efeito}</span>
                        <span className="bg-orange-900 text-orange-200 px-2 py-1 rounded text-sm">
                          {efeito.relatos} relato{efeito.relatos > 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Reviews Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card title="Reviews Positivos">
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-400 mb-2">
                    {stats.reviewsPositivos}
                  </div>
                  <p className="text-clinic-gray-400">avaliações positivas</p>
                </div>
              </Card>
              
              <Card title="Reviews Negativos">
                <div className="text-center">
                  <div className="text-4xl font-bold text-red-400 mb-2">
                    {stats.reviewsNegativos}
                  </div>
                  <p className="text-clinic-gray-400">avaliações negativas</p>
                </div>
              </Card>
              
              <Card title="Taxa de Satisfação">
                <div className="text-center">
                  <div className="text-4xl font-bold text-clinic-cyan mb-2">
                    {stats.satisfacaoGeral}%
                  </div>
                  <p className="text-clinic-gray-400">de satisfação geral</p>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}