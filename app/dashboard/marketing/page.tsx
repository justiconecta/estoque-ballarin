'use client'

import React, { useState, useEffect } from 'react'
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
import { supabaseApi } from '@/lib/supabase'
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

export default function DashboardMarketingTerapeuticoPage() {
  const router = useRouter()
  
  // Estados principais
  const [loading, setLoading] = useState(true)
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)
  
  // Filtros separados
  const [mesSelecionado, setMesSelecionado] = useState<string>('')
  const [anoSelecionado, setAnoSelecionado] = useState<string>('')
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([])
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([])
  
  // Dados do mês selecionado
  const [indicadoresMes, setIndicadoresMes] = useState<ResumoIndicadoresMensal | null>(null)
  const [totalPacientes, setTotalPacientes] = useState(0)
  const [origemLeadStats, setOrigemLeadStats] = useState<OrigemLeadStats[]>([])

  // Carregar dados iniciais
  useEffect(() => {
    loadInitialData()
  }, [])

  // Carregar indicadores quando mudar mês ou ano
  useEffect(() => {
    if (mesSelecionado && anoSelecionado) {
      const mesAno = `${anoSelecionado}-${mesSelecionado.padStart(2, '0')}`
      loadIndicadoresMes(mesAno)
    }
  }, [mesSelecionado, anoSelecionado])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      
      // Carregar todos os indicadores para extrair meses e anos
      const { data: resumos, error } = await supabaseApi.supabase
        .from('resumo_indicadores_mensal')
        .select('mes_ano')
        .order('mes_ano', { ascending: false })
      
      if (error) throw error
      
      // Extrair anos únicos
      const anos = Array.from(new Set(
        resumos?.map(r => r.mes_ano.split('-')[0]) || []
      )).sort((a, b) => b.localeCompare(a))
      
      // Extrair meses únicos
      const meses = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']
      
      setAnosDisponiveis(anos)
      setMesesDisponiveis(meses)
      
      // Selecionar o período mais recente por padrão
      if (resumos && resumos.length > 0) {
        const [ano, mes] = resumos[0].mes_ano.split('-')
        setAnoSelecionado(ano)
        setMesSelecionado(mes)
      }
      
      // Carregar estatísticas de pacientes (não depende do mês)
      await loadPacientesStats()
      
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadIndicadoresMes = async (mesAno: string) => {
    try {
      console.log('🔍 Carregando indicadores para:', mesAno)
      
      const { data, error } = await supabaseApi.supabase
        .from('resumo_indicadores_mensal')
        .select('*')
        .eq('mes_ano', mesAno)
        .order('data_geracao', { ascending: false })
        .limit(1)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        console.log('✅ Indicadores carregados:', data[0])
        setIndicadoresMes(data[0])
      } else {
        console.log('⚠️ Nenhum indicador encontrado para:', mesAno)
        setIndicadoresMes(null)
      }
    } catch (error) {
      console.error('❌ Erro ao carregar indicadores do mês:', error)
      setIndicadoresMes(null)
    }
  }

  const loadPacientesStats = async () => {
    try {
      const pacientes = await supabaseApi.getPacientes(1000)
      
      setTotalPacientes(pacientes.length)
      
      // Calcular estatísticas de origem
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
      
      const stats: OrigemLeadStats[] = Object.entries(origemCount).map(([origem, count]) => {
        const countNumber = Number(count)
        return {
          origem,
          total: countNumber,
          percentual: Math.round((countNumber / total) * 100)
        }
      }).sort((a, b) => b.total - a.total)
      
      setOrigemLeadStats(stats)
    } catch (error) {
      console.error('Erro ao carregar estatísticas de pacientes:', error)
    }
  }

  const handleShowNovaClinicaModal = () => {
    setShowNovaClinicaModal(true)
  }

  const formatMesNome = (mes: string) => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[parseInt(mes) - 1] || mes
  }

  const parseListaNumeros = (texto: string): string[] => {
    if (!texto) return []
    
    // Parse de listas numeradas: "1. Item1 2. Item2 3. Item3"
    const matches = texto.match(/\d+\.\s*([^0-9]+?)(?=\d+\.|$)/g)
    if (matches) {
      return matches.map(item => item.replace(/^\d+\.\s*/, '').trim())
    }
    
    // Fallback: split por ponto
    return texto.split(/\d+\./).filter(item => item.trim()).map(item => item.trim())
  }

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
        
        {/* Header Universal */}
        <HeaderUniversal 
          titulo="Marketing e Terapêutico" 
          descricao="Análise de performance de marketing e interações IA-Paciente"
          icone={BarChart3}
          showNovaClinicaModal={handleShowNovaClinicaModal}
        />

        {/* Navegação por Tabs */}
        <div className="mb-8">
          <div className="border-b border-clinic-gray-700">
            <nav className="flex space-x-8">
              <button
                className="py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 border-clinic-cyan text-clinic-cyan"
              >
                Marketing e Terapêutico
              </button>
              <button
                onClick={() => router.push('/dashboard/terapeutico')}
                className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
              >
                IA - Paciente
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
              {/* Filtro de Mês */}
              <div className="flex items-center space-x-2">
                <label className="text-clinic-gray-400 text-sm">Mês:</label>
                <select
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(e.target.value)}
                  className="px-4 py-2 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg text-clinic-white focus:border-clinic-cyan focus:outline-none min-w-[140px]"
                >
                  {mesesDisponiveis.map(mes => (
                    <option key={mes} value={mes}>
                      {formatMesNome(mes)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Ano */}
              <div className="flex items-center space-x-2">
                <label className="text-clinic-gray-400 text-sm">Ano:</label>
                <select
                  value={anoSelecionado}
                  onChange={(e) => setAnoSelecionado(e.target.value)}
                  className="px-4 py-2 bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg text-clinic-white focus:border-clinic-cyan focus:outline-none min-w-[100px]"
                >
                  {anosDisponiveis.map(ano => (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Total de Pacientes */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Total de Pacientes</p>
                <p className="text-3xl font-bold text-clinic-white mt-1">
                  {totalPacientes}
                </p>
              </div>
              <div className="p-3 bg-clinic-cyan/20 rounded-lg">
                <Users className="h-6 w-6 text-clinic-cyan" />
              </div>
            </div>
          </Card>

          {/* Canais Ativos */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Canais Ativos</p>
                <p className="text-3xl font-bold text-clinic-white mt-1">
                  {origemLeadStats.length}
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </Card>

          {/* FCS (preview) */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-clinic-gray-400 text-sm">Fatores Críticos</p>
                <p className="text-lg font-bold text-clinic-white mt-1">
                  {parseListaNumeros(indicadoresMes?.fcs || '').length} identificados
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
            {!indicadoresMes?.fcs ? (
              <div className="text-center py-6">
                <Target className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhum FCS disponível para este mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseListaNumeros(indicadoresMes.fcs).map((item, index) => (
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
            {!indicadoresMes?.melhorias ? (
              <div className="text-center py-6">
                <AlertCircle className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhuma melhoria disponível para este mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseListaNumeros(indicadoresMes.melhorias).map((item, index) => (
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
            {!indicadoresMes?.supervalorizado ? (
              <div className="text-center py-6">
                <TrendingUp className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhum dado disponível para este mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseListaNumeros(indicadoresMes.supervalorizado).map((item, index) => (
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
            {!indicadoresMes?.temas_marketing ? (
              <div className="text-center py-6">
                <MessageSquare className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhum tema disponível para este mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseListaNumeros(indicadoresMes.temas_marketing).map((item, index) => (
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
            {!indicadoresMes?.oportunidades_marketing ? (
              <div className="text-center py-6">
                <Lightbulb className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhuma oportunidade disponível para este mês</p>
              </div>
            ) : (
              <div className="space-y-2">
                {parseListaNumeros(indicadoresMes.oportunidades_marketing).map((item, index) => (
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

      {/* Modal Nova Clínica */}
      <NovaClinicaModal
        isOpen={showNovaClinicaModal}
        onClose={() => setShowNovaClinicaModal(false)} onSuccess={function (): void {
          throw new Error('Function not implemented.')
        } }      />
    </div>
  )
}