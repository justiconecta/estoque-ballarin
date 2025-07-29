'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Package, Users, LogOut, BarChart3, TrendingUp, Sun, Moon, Home } from 'lucide-react'
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

  // Detectar página atual para botão ativo
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/dashboard/marketing'
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
                    <BarChart3 className="h-5 w-5 text-clinic-cyan" />
                  </div>
                  <h1 className="text-xl font-bold text-clinic-white tracking-tight">Dashboard Marketing</h1>
                </div>
                <p className="text-clinic-gray-300 text-sm">
                  Análise de performance e oportunidades de marketing
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
            <h2 className="text-xl font-semibold text-clinic-white">Análise de Marketing</h2>
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

        {/* Conteúdo do Dashboard Marketing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estatísticas de Origem de Leads */}
          <Card title="Origem de Leads">
            {origemLeadStats.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-clinic-gray-400">Nenhum dado de origem encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {origemLeadStats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        stat.origem === 'Instagram' ? 'bg-pink-500' :
                        stat.origem === 'Google' ? 'bg-blue-500' :
                        stat.origem === 'Indicação' ? 'bg-green-500' :
                        'bg-clinic-gray-400'
                      }`} />
                      <span className="text-clinic-white font-medium">{stat.origem}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-clinic-white font-bold">{stat.total}</div>
                      <div className="text-clinic-gray-400 text-sm">{stat.percentual}%</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Tópicos de Marketing */}
          <Card title="Insights de Marketing">
            {topicosMarketing ? (
              <div className="space-y-3">
                <div className="text-clinic-white">
                  {typeof topicosMarketing === 'string' 
                    ? topicosMarketing 
                    : JSON.stringify(topicosMarketing, null, 2)
                  }
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-clinic-gray-400">Nenhum insight disponível</p>
              </div>
            )}
          </Card>

          {/* Oportunidades de Conteúdo */}
          <Card title="Oportunidades de Conteúdo">
            {oportunidadesConteudo.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-clinic-gray-400">Nenhuma oportunidade identificada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {oportunidadesConteudo.slice(0, 3).map((oportunidade, index) => (
                  <div key={index} className="bg-clinic-gray-700 p-3 rounded-lg">
                    <p className="text-clinic-white text-sm">{oportunidade}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Resumos de Interação */}
          <Card title="Resumos de Interação">
            <div className="space-y-4">
              {resumosDisponiveis.length > 0 && (
                <Select
                  label="Selecionar dia"
                  value={selectedDia}
                  onChange={(e) => {
                    setSelectedDia(e.target.value)
                    if (e.target.value) {
                      buscarConversaDoDia(e.target.value)
                    }
                  }}
                  options={[
                    { value: '', label: 'Selecione um dia...' },
                    ...resumosDisponiveis.map(dia => ({ value: dia, label: dia }))
                  ]}
                />
              )}
              
              {conversaResumo && (
                <div className="bg-clinic-gray-700 p-4 rounded-lg max-h-60 overflow-y-auto">
                  <pre className="text-clinic-white text-sm whitespace-pre-wrap">
                    {conversaResumo}
                  </pre>
                </div>
              )}
              
              {resumosDisponiveis.length === 0 && (
                <div className="text-center py-6">
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