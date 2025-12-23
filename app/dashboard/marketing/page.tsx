'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart3,
  Users,
  TrendingUp,
  AlertCircle,
  Lightbulb,
  Target,
  MessageSquare
} from 'lucide-react'
import { Button, Card, HeaderUniversal } from '@/components/ui'
import { useData } from '@/contexts/DataContext'
import NovaClinicaModal from '@/components/NovaClinicaModal'

interface ResumoIndicadoresMensal {
  id_resumo_mensal: number
  mes_ano: string
  fcs: string
  melhorias: string
  supervalorizado: string
  efeitos_adversos: string
  temas_marketing: string
  oportunidades_marketing: string
  data_geracao: string
  id_clinica: number
}

interface OrigemLeadStats {
  origem: string
  total: number
  percentual: number
}

const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const MESES_OPCOES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

export default function DashboardMarketingTerapeuticoPage() {
  const router = useRouter()
  
  // ✅ DADOS DO CACHE GLOBAL
  const { 
    pacientes, 
    loading: dataLoading, 
    initialized,
    getResumoIndicadoresMensal,
    getAnosDisponiveis
  } = useData()
  
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)
  
  // Filtros
  const [mesSelecionado, setMesSelecionado] = useState<string>('')
  const [anoSelecionado, setAnoSelecionado] = useState<string>('')
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([])
  
  // Dados do mês selecionado
  const [indicadoresMes, setIndicadoresMes] = useState<ResumoIndicadoresMensal | null>(null)
  const [loadingIndicadores, setLoadingIndicadores] = useState(false)
  
  // Refs para controle
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const lastPeriodRef = useRef<string>('')

  // ✅ ESTATÍSTICAS DE ORIGEM (calculadas dos pacientes do cache)
  const origemLeadStats = useMemo((): OrigemLeadStats[] => {
    if (pacientes.length === 0) return []
    
    const origemCount = pacientes.reduce((acc, paciente) => {
      const origem = paciente.origem_lead || 'Não informado'
      acc[origem] = (acc[origem] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const total = pacientes.length
    
    return Object.entries(origemCount)
      .map(([origem, count]) => ({
        origem,
        total: Number(count),
        percentual: Math.round((Number(count) / total) * 100)
      }))
      .sort((a, b) => b.total - a.total)
  }, [pacientes])

  // Carregar anos disponíveis
  useEffect(() => {
    if (!initialized) return
    
    const loadAnos = async () => {
      const anos = await getAnosDisponiveis()
      setAnosDisponiveis(anos)
      
      // Selecionar período mais recente
      if (anos.length > 0 && !anoSelecionado) {
        setAnoSelecionado(anos[0])
        setMesSelecionado(String(new Date().getMonth() + 1).padStart(2, '0'))
      }
    }
    
    loadAnos()
  }, [initialized, getAnosDisponiveis, anoSelecionado])

  // ✅ CARREGAR INDICADORES COM DEBOUNCE
  useEffect(() => {
    if (!mesSelecionado || !anoSelecionado) return
    
    const mesAno = `${anoSelecionado}-${mesSelecionado.padStart(2, '0')}`
    
    // Evitar recarregar mesmo período
    if (mesAno === lastPeriodRef.current) return
    
    // Debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)
    
    debounceRef.current = setTimeout(async () => {
      console.log(`🔄 Marketing: Carregando indicadores (${mesAno})`)
      setLoadingIndicadores(true)
      
      try {
        const data = await getResumoIndicadoresMensal(mesAno)
        setIndicadoresMes(data)
        lastPeriodRef.current = mesAno
      } catch (error) {
        console.error('❌ Erro ao carregar indicadores:', error)
        setIndicadoresMes(null)
      } finally {
        setLoadingIndicadores(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [mesSelecionado, anoSelecionado, getResumoIndicadoresMensal])

  const formatMesNome = (mes: string) => MESES_NOMES[parseInt(mes) - 1] || mes

  const parseListaNumeros = useCallback((texto: string): string[] => {
    if (!texto) return []
    return texto
      .split(/\d+\.\s*/)
      .filter(item => item.trim())
      .map(item => item.trim())
  }, [])

  // ✅ Mostrar loading enquanto NÃO inicializou OU está carregando
  const loading = !initialized || dataLoading

  if (loading) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent mx-auto mb-4"></div>
          <p className="text-clinic-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-clinic-black">
      <div className="container mx-auto px-4 py-6">
        
        <HeaderUniversal 
          titulo="Marketing e Terapêutico" 
          descricao="Análise de performance de marketing e interações IA-Paciente"
          icone={BarChart3}
          showNovaClinicaModal={() => setShowNovaClinicaModal(true)}
        />

        {/* Navegação por Tabs */}
        <div className="mb-8">
          <div className="border-b border-clinic-gray-700">
            <nav className="flex space-x-8">
              <button className="py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 border-clinic-cyan text-clinic-cyan">
                Marketing e Terapêutico
              </button>
              <button
                onClick={() => router.push('/dashboard/terapeutico')}
                className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
              >
                IA - Paciente
              </button>
              <button
                onClick={() => router.push('/dashboard/vendas')}
                className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
              >
                Comercial
              </button>
            </nav>
          </div>
        </div>

        {/* Filtros Mês e Ano */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-clinic-white">
              Análise de Marketing
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-clinic-gray-400 text-sm">Mês:</label>
                <select
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  className="px-4 py-2 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg text-clinic-white focus:border-clinic-cyan focus:outline-none min-w-[140px]"
                >
                  {MESES_OPCOES.map(mes => (
                    <option key={mes} value={mes}>{formatMesNome(mes)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-clinic-gray-400 text-sm">Ano:</label>
                <select
                  value={anoSelecionado}
                  onChange={(e) => setAnoSelecionado(e.target.value)}
                  className="px-4 py-2 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg text-clinic-white focus:border-clinic-cyan focus:outline-none min-w-[100px]"
                >
                  {anosDisponiveis.map(ano => (
                    <option key={ano} value={ano}>{ano}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Total de Pacientes</p>
                <p className="text-3xl font-bold text-clinic-white mt-1">{pacientes.length}</p>
              </div>
              <div className="p-3 bg-clinic-cyan/20 rounded-lg">
                <Users className="h-6 w-6 text-clinic-cyan" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Canais Ativos</p>
                <p className="text-3xl font-bold text-clinic-white mt-1">{origemLeadStats.length}</p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Fatores Críticos</p>
                <p className="text-lg font-bold text-clinic-white mt-1">
                  {loadingIndicadores ? '...' : `${parseListaNumeros(indicadoresMes?.fcs || '').length} identificados`}
                </p>
              </div>
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Target className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Grid de Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Origem de Leads */}
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

          {/* FCS - Fatores Críticos de Sucesso */}
          <Card title="Fatores Críticos de Sucesso">
            {loadingIndicadores ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-clinic-cyan border-t-transparent mx-auto mb-2"></div>
                <p className="text-clinic-gray-400">Carregando...</p>
              </div>
            ) : !indicadoresMes?.fcs ? (
              <div className="text-center py-6">
                <Target className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhum FCS disponível para este mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseListaNumeros(indicadoresMes.fcs).slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-green-400 font-bold">{index + 1}.</span>
                    <p className="text-clinic-white text-sm flex-1">{item}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Melhorias */}
          <Card title="Melhorias Sugeridas">
            {loadingIndicadores ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-clinic-cyan border-t-transparent mx-auto mb-2"></div>
              </div>
            ) : !indicadoresMes?.melhorias ? (
              <div className="text-center py-6">
                <AlertCircle className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhuma melhoria disponível para este mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseListaNumeros(indicadoresMes.melhorias).slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-yellow-400 font-bold">{index + 1}.</span>
                    <p className="text-clinic-white text-sm flex-1">{item}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Supervalorizado */}
          <Card title="Aspectos Supervalorizados">
            {loadingIndicadores ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-clinic-cyan border-t-transparent mx-auto mb-2"></div>
              </div>
            ) : !indicadoresMes?.supervalorizado ? (
              <div className="text-center py-6">
                <TrendingUp className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhum dado disponível para este mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseListaNumeros(indicadoresMes.supervalorizado).slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-purple-400 font-bold">{index + 1}.</span>
                    <p className="text-clinic-white text-sm flex-1">{item}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Temas Marketing */}
          <Card title="Temas de Marketing">
            {loadingIndicadores ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-clinic-cyan border-t-transparent mx-auto mb-2"></div>
              </div>
            ) : !indicadoresMes?.temas_marketing ? (
              <div className="text-center py-6">
                <MessageSquare className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhum tema disponível para este mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseListaNumeros(indicadoresMes.temas_marketing).slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-cyan-400 font-bold">{index + 1}.</span>
                    <p className="text-clinic-white text-sm flex-1">{item}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Oportunidades Marketing */}
          <Card title="Oportunidades de Marketing">
            {loadingIndicadores ? (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-clinic-cyan border-t-transparent mx-auto mb-2"></div>
              </div>
            ) : !indicadoresMes?.oportunidades_marketing ? (
              <div className="text-center py-6">
                <Lightbulb className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhuma oportunidade disponível para este mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseListaNumeros(indicadoresMes.oportunidades_marketing).slice(0, 5).map((item, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-orange-400 font-bold">{index + 1}.</span>
                    <p className="text-clinic-white text-sm flex-1">{item}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

      </div>

      <NovaClinicaModal
        isOpen={showNovaClinicaModal}
        onClose={() => setShowNovaClinicaModal(false)}
        onSuccess={() => setShowNovaClinicaModal(false)}
      />
    </div>
  )
}