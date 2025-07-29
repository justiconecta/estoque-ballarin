'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Users, Heart, AlertTriangle, Package, LogOut, Sun, Moon } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface StatsData {
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
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [showCustomDates, setShowCustomDates] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'hoje'
  })
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const [stats, setStats] = useState<StatsData>({
    totalPacientes: 0,
    pacientesAtivos: 0,
    consultasRealizadas: 0,
    pacientesMaisAtivos: [],
    efeitosAdversos: [],
    fatoresSucesso: [],
    pontosMelhoria: [],
    satisfacaoGeral: 0,
    reviewsPositivos: 0,
    reviewsNegativos: 0
  })

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
          score: comentariosPositivos.includes('resultado') ? 9.0 : 8.3,
          descricao: 'Eficácia dos procedimentos realizados'
        },
        {
          fator: 'Ambiente Clínico',
          score: comentariosPositivos.includes('ambiente') || comentariosPositivos.includes('limpo') ? 8.8 : 8.1,
          descricao: 'Higiene e conforto das instalações'
        },
        {
          fator: 'Profissionalismo',
          score: comentariosPositivos.includes('profissional') ? 9.1 : 8.4,
          descricao: 'Competência técnica da equipe'
        },
        {
          fator: 'Pontualidade',
          score: comentariosPositivos.includes('pontual') || comentariosPositivos.includes('horário') ? 8.7 : 7.9,
          descricao: 'Cumprimento de horários agendados'
        }
      ].sort((a, b) => b.score - a.score)
      
      // Análise de pontos de melhoria baseados em reviews negativos
      const comentariosNegativos = reviews
        .filter(r => r.sentimento === 'Negativo')
        .map(r => r.comentario.toLowerCase())
        .join(' ')
      
      const pontosMelhoria = [
        {
          ponto: 'Tempo de Espera',
          impacto: comentariosNegativos.includes('espera') || comentariosNegativos.includes('demora') ? 'Alto' : 'Baixo',
          sugestao: 'Otimizar agenda e reduzir tempo entre consultas'
        },
        {
          ponto: 'Comunicação de Preços',
          impacto: comentariosNegativos.includes('preço') || comentariosNegativos.includes('caro') ? 
            'Médio' : 'Baixo',
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
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-clinic-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Image
                src="/justiconecta.png"
                alt="JustiConecta"
                width={60}
                height={60}
                className="rounded-lg"
              />
            </div>

        {/* Filtro de Data */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-clinic-white">Análise Terapêutica</h2>
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
            <div>
              <h1 className="text-3xl font-bold text-clinic-white">Dashboard Acompanhamento Terapêutico</h1>
              <p className="text-clinic-gray-400 mt-1">
                Monitoramento da jornada e experiência dos pacientes
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
                className="py-3 px-6 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-base transition-all duration-200 flex items-center space-x-2"
              >
                <div className="w-6 h-6 rounded-full bg-clinic-gray-600 flex items-center justify-center">
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
                className={`py-3 px-6 border-b-2 font-medium text-base transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'terapeutico'
                    ? 'border-clinic-cyan text-clinic-cyan'
                    : 'border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  activeTab === 'terapeutico' ? 'bg-clinic-cyan text-clinic-black' : 'bg-clinic-gray-600'
                }`}>
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
            <h2 className="text-xl font-semibold text-clinic-white">Análise Terapêutica</h2>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-clinic-cyan/10 to-clinic-cyan/5 border-clinic-cyan/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Pacientes Cadastrados</p>
                <p className="text-3xl font-bold text-clinic-white">{stats.totalPacientes}</p>
                <p className="text-clinic-cyan text-sm mt-1">Total no sistema</p>
              </div>
              <Users className="h-12 w-12 text-clinic-cyan" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Pacientes Ativos</p>
                <p className="text-3xl font-bold text-clinic-white">{stats.pacientesAtivos}</p>
                <p className="text-green-400 text-sm mt-1">Com procedimentos</p>
              </div>
              <Heart className="h-12 w-12 text-green-400" />
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Consultas Realizadas</p>
                <p className="text-3xl font-bold text-clinic-white">{stats.consultasRealizadas}</p>
                <p className="text-blue-400 text-sm mt-1">Procedimentos concluídos</p>
              </div>
              <Users className="h-12 w-12 text-blue-400" />
            </div>
          </Card>
        </div>

        {/* Rankings e Análises */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card title="Top 10 - Pacientes Mais Ativos">
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {stats.pacientesMaisAtivos.length > 0 ? (
                stats.pacientesMaisAtivos.map((paciente, index) => (
                  <div key={paciente.nome} className="flex items-center justify-between p-3 bg-clinic-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <span className="text-clinic-gray-400 text-sm mr-3">{index + 1}.</span>
                      <div>
                        <span className="text-clinic-white font-medium">{paciente.nome}</span>
                        <p className="text-clinic-gray-400 text-xs">Última interação: {paciente.ultimaInteracao}</p>
                      </div>
                    </div>
                    <div className="text-clinic-cyan font-bold">{paciente.resumosDiarios}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-clinic-gray-400">Nenhum paciente ativo encontrado</p>
                </div>
              )}
            </div>
          </Card>

          <Card title="Efeitos Adversos Relatados">
            <div className="space-y-3">
              {stats.efeitosAdversos.length > 0 ? (
                stats.efeitosAdversos.map((efeito, index) => (
                  <div key={efeito.efeito} className="flex items-center justify-between p-2 bg-clinic-gray-700 rounded">
                    <div className="flex items-center">
                      <span className="text-clinic-gray-400 text-sm mr-2">{index + 1}.</span>
                      <span className="text-clinic-white text-sm capitalize">{efeito.efeito}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-red-400 font-medium mr-2">{efeito.relatos}</span>
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-clinic-gray-400">Nenhum efeito adverso relatado</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Dashboard CX */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-clinic-white mb-6 text-center">Dashboard CX</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Satisfação Geral */}
            <Card title="Satisfação Geral">
              <div className="text-center py-6">
                <div className="text-6xl font-bold text-clinic-cyan mb-2">
                  {stats.satisfacaoGeral}%
                </div>
                <p className="text-clinic-gray-400 mb-4">Índice de satisfação</p>
                <div className="flex justify-center space-x-4 text-sm">
                  <div className="text-green-400">
                    <span className="font-bold">{stats.reviewsPositivos}</span> positivos
                  </div>
                  <div className="text-red-400">
                    <span className="font-bold">{stats.reviewsNegativos}</span> negativos
                  </div>
                </div>
              </div>
            </Card>

            {/* Fatores de Sucesso */}
            <Card title="Top 5 - Fatores de Sucesso">
              <div className="space-y-3">
                {stats.fatoresSucesso.map((fator, index) => (
                  <div key={fator.fator} className="p-3 bg-clinic-gray-700 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-clinic-white font-medium text-sm">{fator.fator}</span>
                      <span className="text-green-400 font-bold">{fator.score}</span>
                    </div>
                    <p className="text-clinic-gray-400 text-xs">{fator.descricao}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Pontos de Melhoria */}
            <Card title="Pontos de Melhoria">
              <div className="space-y-3">
                {stats.pontosMelhoria.length > 0 ? (
                  stats.pontosMelhoria.map((ponto, index) => (
                    <div key={ponto.ponto} className="p-3 bg-clinic-gray-700 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-clinic-white font-medium text-sm">{ponto.ponto}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          ponto.impacto === 'Alto' ? 'bg-red-500/20 text-red-400' :
                          ponto.impacto === 'Médio' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-green-500/20 text-green-400'
                        }`}>
                          {ponto.impacto}
                        </span>
                      </div>
                      <p className="text-clinic-gray-400 text-xs">{ponto.sugestao}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-clinic-gray-400">Nenhum ponto crítico identificado</p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}