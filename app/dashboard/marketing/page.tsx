'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Package, Users, LogOut, BarChart3, TrendingUp, Sun, Moon } from 'lucide-react'
import { Button, Card, Select } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Usuario } from '@/types/database'

interface OrigemLeadStats {
  origem: string
  total: number
  percentual: number
}

interface DateFilter {
  startDate: string
  endDate: string
  preset?: string
}

export default function DashboardMarketingPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [activeTab, setActiveTab] = useState<'jornada' | 'marketing' | 'terapeutico'>('marketing')
  const [loading, setLoading] = useState(true)
  const [origemLeadStats, setOrigemLeadStats] = useState<OrigemLeadStats[]>([])
  const [topicosMarketing, setTopicosMarketing] = useState<any>(null)
  const [oportunidadesConteudo, setOportunidadesConteudo] = useState<string[]>([])
  const [resumosDisponiveis, setResumosDisponiveis] = useState<string[]>([])
  const [conversaResumo, setConversaResumo] = useState<string>('')
  const [selectedDia, setSelectedDia] = useState<string>('')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [showCustomDates, setShowCustomDates] = useState(false)
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'hoje'
  })
  const [isDarkTheme, setIsDarkTheme] = useState(true)

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
      Promise.all([
        loadOrigemLeadStats(),
        loadTopicosMarketing(),
        loadOportunidadesConteudo(),
        loadResumosSemanaisesDias()
      ]).finally(() => setLoading(false))
    }
  }, [currentUser, dateFilter])

  const loadOrigemLeadStats = async () => {
    try {
      const pacientes = await supabaseApi.getPacientes(1000)
      
      // Contar por origem de lead
      const origemCount = pacientes.reduce((acc, paciente) => {
        const origem = paciente.origem_lead || 'Não informado'
        acc[origem] = (acc[origem] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      const total = pacientes.length
      if (total === 0) {
        setOrigemLeadStats([])
        return
      }
      
      const stats: OrigemLeadStats[] = Object.entries(origemCount).map(([origem, count]) => ({
        origem,
        total: count,
        percentual: Math.round((count / total) * 100)
      })).sort((a, b) => b.total - a.total)
      
      setOrigemLeadStats(stats)
    } catch (error) {
      console.warn('Erro ao carregar estatísticas de origem:', error)
      setOrigemLeadStats([])
    }
  }

  const loadTopicosMarketing = async () => {
    try {
      const dados = await supabaseApi.getDashboardAgregadoByTipo('MARKETING')
      setTopicosMarketing(dados?.dados_agregados || null)
    } catch (error) {
      console.warn('Nenhum dado de marketing encontrado:', error)
      setTopicosMarketing(null)
    }
  }

  const loadOportunidadesConteudo = async () => {
    try {
      const dados = await supabaseApi.getDashboardAgregados('OPORTUNIDADES', 5)
      const oportunidades = dados?.map(item => 
        typeof item.dados_agregados === 'string' 
          ? item.dados_agregados 
          : JSON.stringify(item.dados_agregados)
      ) || []
      
      setOportunidadesConteudo(oportunidades)
    } catch (error) {
      console.warn('Erro ao carregar oportunidades de conteúdo:', error)
      setOportunidadesConteudo([])
    }
  }

  const loadResumosSemanaisesDias = async () => {
    try {
      const dados = await supabaseApi.getDashboardAgregados('RESUMO', 10)
      const diasDisponiveis = dados?.map(item => 
        new Date(item.data_referencia || item.data_geracao).toLocaleDateString('pt-BR')
      ).filter((dia, index, arr) => arr.indexOf(dia) === index) || []
      
      setResumosDisponiveis(diasDisponiveis)
    } catch (error) {
      console.warn('Erro ao carregar resumos disponíveis:', error)
      setResumosDisponiveis([])
    }
  }

  const buscarConversaDoDia = async (dia: string) => {
    try {
      const dataFormatada = new Date(dia.split('/').reverse().join('-')).toISOString().split('T')[0]
      
      const dados = await supabaseApi.getDashboardAgregados('RESUMO')
      const conversaDoDia = dados?.find(item => 
        item.data_referencia?.includes(dataFormatada) || 
        item.data_geracao.includes(dataFormatada)
      )
      
      const conversa = conversaDoDia?.dados_agregados 
        ? typeof conversaDoDia.dados_agregados === 'string' 
          ? conversaDoDia.dados_agregados 
          : JSON.stringify(conversaDoDia.dados_agregados, null, 2)
        : `Nenhum resumo disponível para ${dia}`
      
      setConversaResumo(conversa)
    } catch (error) {
      console.error('Erro ao buscar conversa do dia:', error)
      setConversaResumo(`Erro ao carregar dados para ${dia}`)
    }
  }

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

  const handleTabClick = (tab: 'jornada' | 'marketing' | 'terapeutico') => {
    if (tab === 'jornada') {
      router.push('/dashboard')
    } else if (tab === 'terapeutico') {
      router.push('/dashboard/terapeutico')
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
            <h2 className="text-xl font-semibold text-clinic-white">Análise de Marketing</h2>
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
              <h1 className="text-3xl font-bold text-clinic-white">Dashboard Marketing</h1>
              <p className="text-clinic-gray-400 mt-1">
                Análise de performance e oportunidades de marketing
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
                className={`py-3 px-6 border-b-2 font-medium text-base transition-all duration-200 flex items-center space-x-2 ${
                  activeTab === 'marketing'
                    ? 'border-clinic-cyan text-clinic-cyan'
                    : 'border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  activeTab === 'marketing' ? 'bg-clinic-cyan text-clinic-black' : 'bg-clinic-gray-600'
                }`}>
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
            <h2 className="text-xl font-semibold text-clinic-white">Análise de Marketing</h2>
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
          {/* Fonte de Usuários */}
          <Card title="Fonte de Usuários" className="md:col-span-1">
            <div className="space-y-3">
              {origemLeadStats.length > 0 ? (
                origemLeadStats.map((stat, index) => (
                  <div key={stat.origem} className="flex justify-between items-center p-3 bg-clinic-gray-700 rounded-lg">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        index === 0 ? 'bg-clinic-cyan' :
                        index === 1 ? 'bg-green-400' :
                        index === 2 ? 'bg-blue-400' :
                        index === 3 ? 'bg-yellow-400' :
                        'bg-purple-400'
                      }`} />
                      <span className="text-clinic-white text-sm">{stat.origem}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-clinic-white font-bold">{stat.total}</div>
                      <div className="text-clinic-gray-400 text-xs">{stat.percentual}%</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                  <p className="text-clinic-gray-400">Nenhum dado de origem disponível</p>
                </div>
              )}
            </div>
          </Card>

          {/* Tópicos de Marketing do Mês */}
          <Card title="Tópicos de Marketing do Mês" className="md:col-span-2">
            <div className="space-y-3">
              {topicosMarketing ? (
                <div className="bg-clinic-gray-700 p-4 rounded-lg">
                  <pre className="text-clinic-white text-sm whitespace-pre-wrap">
                    {typeof topicosMarketing === 'string' 
                      ? topicosMarketing 
                      : JSON.stringify(topicosMarketing, null, 2)
                    }
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                  <p className="text-clinic-gray-400">Nenhum tópico de marketing disponível</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Oportunidades de Conteúdo */}
        <div className="mb-8">
          <Card title="Oportunidades de Conteúdo">
            <div className="space-y-3">
              {oportunidadesConteudo.length > 0 ? (
                oportunidadesConteudo.map((oportunidade, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-clinic-cyan/10 to-transparent border-l-4 border-clinic-cyan rounded-lg">
                    <p className="text-clinic-white text-sm">{oportunidade}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-clinic-gray-400">Nenhuma oportunidade de conteúdo identificada</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Resumos Semanais e Diários */}
        <div className="mb-8">
          <Card title="Resumos Semanais e Diários">
            <div className="space-y-4">
              {resumosDisponiveis.length > 0 ? (
                <>
                  <div className="flex items-center space-x-4">
                    <Select
                      value={selectedDia}
                      onChange={(e) => {
                        setSelectedDia(e.target.value)
                        if (e.target.value) {
                          buscarConversaDoDia(e.target.value)
                        }
                      }}
                      className="min-w-[200px]"
                      options={[
                        { value: '', label: 'Selecione um dia...' },
                        ...resumosDisponiveis.map(dia => ({ value: dia, label: dia }))
                      ]}
                    />
                  </div>
                  
                  {conversaResumo && (
                    <div className="bg-clinic-gray-700 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <pre className="text-clinic-white text-sm whitespace-pre-wrap">
                        {conversaResumo}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-clinic-gray-400">Nenhum resumo disponível</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}