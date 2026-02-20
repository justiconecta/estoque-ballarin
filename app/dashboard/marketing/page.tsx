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

// ============ INTERFACES ============
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

// ============ CONSTANTES (fora do componente - nunca recria) ============
const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const MESES_OPCOES = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

// ============ HELPERS (fora do componente) ============
const formatMesNome = (mes: string) => MESES_NOMES[parseInt(mes) - 1] || mes

const parseListaNumeros = (texto: string): string[] => {
  if (!texto) return []
  return texto
    .split(/\d+\.\s*/)
    .filter(item => item.trim())
    .map(item => item.trim())
}

const getOrigemColor = (origem: string): string => {
  switch (origem) {
    case 'Instagram': return 'bg-pink-500'
    case 'Google': return 'bg-blue-500'
    case 'Indicação': return 'bg-green-500'
    default: return 'bg-clinic-gray-400'
  }
}

// ============ COMPONENTES MEMOIZADOS ============

// ✅ MetricCard memoizado
const MetricCard = React.memo(function MetricCard({
  label,
  value,
  icon: Icon,
  iconBgClass,
  iconClass
}: {
  label: string
  value: string | number
  icon: React.ElementType
  iconBgClass: string
  iconClass: string
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-clinic-gray-400 text-sm">{label}</p>
          <p className="text-3xl font-bold text-clinic-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${iconBgClass}`}>
          <Icon className={`h-6 w-6 ${iconClass}`} />
        </div>
      </div>
    </Card>
  )
})

// ✅ MetricCardSmall memoizado (para Fatores Críticos)
const MetricCardSmall = React.memo(function MetricCardSmall({
  label,
  value,
  icon: Icon,
  iconBgClass,
  iconClass,
  loading
}: {
  label: string
  value: string
  icon: React.ElementType
  iconBgClass: string
  iconClass: string
  loading?: boolean
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-clinic-gray-400 text-sm">{label}</p>
          <p className="text-lg font-bold text-clinic-white mt-1">
            {loading ? '...' : value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${iconBgClass}`}>
          <Icon className={`h-6 w-6 ${iconClass}`} />
        </div>
      </div>
    </Card>
  )
})

// ✅ OrigemLeadRow memoizado
const OrigemLeadRow = React.memo(function OrigemLeadRow({
  stat
}: {
  stat: OrigemLeadStats
}) {
  const colorClass = useMemo(() => getOrigemColor(stat.origem), [stat.origem])
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`w-3 h-3 rounded-full ${colorClass}`} />
        <span className="text-clinic-white font-medium">{stat.origem}</span>
      </div>
      <div className="text-right">
        <div className="text-clinic-white font-bold">{stat.total}</div>
        <div className="text-clinic-gray-400 text-sm">{stat.percentual}%</div>
      </div>
    </div>
  )
})

// ✅ ListaItem memoizado
const ListaItem = React.memo(function ListaItem({
  index,
  texto,
  colorClass
}: {
  index: number
  texto: string
  colorClass: string
}) {
  return (
    <div className="flex items-start space-x-2">
      <span className={`font-bold ${colorClass}`}>{index + 1}.</span>
      <p className="text-clinic-white text-sm flex-1">{texto}</p>
    </div>
  )
})

// ✅ CardIndicador memoizado
const CardIndicador = React.memo(function CardIndicador({
  title,
  items,
  loading,
  emptyIcon: EmptyIcon,
  emptyMessage,
  itemColorClass
}: {
  title: string
  items: string[]
  loading: boolean
  emptyIcon: React.ElementType
  emptyMessage: string
  itemColorClass: string
}) {
  if (loading) {
    return (
      <Card title={title}>
        <div className="text-center py-6">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-clinic-cyan border-t-transparent mx-auto mb-2"></div>
          <p className="text-clinic-gray-400">Carregando...</p>
        </div>
      </Card>
    )
  }

  if (items.length === 0) {
    return (
      <Card title={title}>
        <div className="text-center py-6">
          <EmptyIcon className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
          <p className="text-clinic-gray-400">{emptyMessage}</p>
        </div>
      </Card>
    )
  }

  return (
    <Card title={title}>
      <div className="space-y-2">
        {items.slice(0, 5).map((item, index) => (
          <ListaItem 
            key={index} 
            index={index} 
            texto={item} 
            colorClass={itemColorClass} 
          />
        ))}
      </div>
    </Card>
  )
})

// ✅ CardOrigemLeads memoizado
const CardOrigemLeads = React.memo(function CardOrigemLeads({
  stats
}: {
  stats: OrigemLeadStats[]
}) {
  if (stats.length === 0) {
    return (
      <Card title="Origem de Leads">
        <div className="text-center py-6">
          <p className="text-clinic-gray-400">Nenhum dado de origem encontrado</p>
        </div>
      </Card>
    )
  }

  return (
    <Card title="Origem de Leads">
      <div className="space-y-4">
        {stats.map((stat, index) => (
          <OrigemLeadRow key={index} stat={stat} />
        ))}
      </div>
    </Card>
  )
})

// ✅ FiltrosPeriodo memoizado
const FiltrosPeriodo = React.memo(function FiltrosPeriodo({
  mesSelecionado,
  anoSelecionado,
  anosDisponiveis,
  onMesChange,
  onAnoChange
}: {
  mesSelecionado: string
  anoSelecionado: string
  anosDisponiveis: string[]
  onMesChange: (mes: string) => void
  onAnoChange: (ano: string) => void
}) {
  const handleMesChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onMesChange(e.target.value)
  }, [onMesChange])

  const handleAnoChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onAnoChange(e.target.value)
  }, [onAnoChange])

  return (
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
              onChange={handleMesChange}
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
              onChange={handleAnoChange}
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
  )
})

// ✅ NavTabs memoizado
const NavTabs = React.memo(function NavTabs({
  onNavigate
}: {
  onNavigate: (path: string) => void
}) {
  const handleTerapeutico = useCallback(() => onNavigate('/dashboard/terapeutico'), [onNavigate])
  const handleVendas = useCallback(() => onNavigate('/dashboard/vendas'), [onNavigate])
  const handleRankings = useCallback(() => onNavigate('/dashboard/rankings'), [onNavigate])

  return (
    <div className="mb-8">
      <div className="border-b border-clinic-gray-700">
        <nav className="flex space-x-8">
          <button className="py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 border-clinic-cyan text-clinic-cyan">
            Marketing e Terapêutico
          </button>
          <button
            onClick={handleTerapeutico}
            className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
          >
            IA - Paciente
          </button>
          <button
            onClick={handleVendas}
            className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
          >
            Comercial
          </button>
          <button
            onClick={handleRankings}
            className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
          >
            Rankings
          </button>
        </nav>
      </div>
    </div>
  )
})

// ============ COMPONENTE PRINCIPAL ============
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

  // ============ HANDLERS MEMOIZADOS ============
  const handleOpenModal = useCallback(() => setShowNovaClinicaModal(true), [])
  const handleCloseModal = useCallback(() => setShowNovaClinicaModal(false), [])
  const handleMesChange = useCallback((mes: string) => setMesSelecionado(mes), [])
  const handleAnoChange = useCallback((ano: string) => setAnoSelecionado(ano), [])
  const handleNavigate = useCallback((path: string) => router.push(path), [router])

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

  // ✅ LISTAS PARSEADAS (memoizadas)
  const fcsList = useMemo(() => 
    parseListaNumeros(indicadoresMes?.fcs || ''), 
    [indicadoresMes?.fcs]
  )
  
  const melhoriasList = useMemo(() => 
    parseListaNumeros(indicadoresMes?.melhorias || ''), 
    [indicadoresMes?.melhorias]
  )
  
  const supervaloList = useMemo(() => 
    parseListaNumeros(indicadoresMes?.supervalorizado || ''), 
    [indicadoresMes?.supervalorizado]
  )
  
  const temasMarketingList = useMemo(() => 
    parseListaNumeros(indicadoresMes?.temas_marketing || ''), 
    [indicadoresMes?.temas_marketing]
  )
  
  const oportunidadesList = useMemo(() => 
    parseListaNumeros(indicadoresMes?.oportunidades_marketing || ''), 
    [indicadoresMes?.oportunidades_marketing]
  )

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
          showNovaClinicaModal={handleOpenModal}
        />

        {/* Navegação por Tabs */}
        <NavTabs onNavigate={handleNavigate} />

        {/* Filtros Mês e Ano */}
        <FiltrosPeriodo
          mesSelecionado={mesSelecionado}
          anoSelecionado={anoSelecionado}
          anosDisponiveis={anosDisponiveis}
          onMesChange={handleMesChange}
          onAnoChange={handleAnoChange}
        />

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <MetricCard
            label="Total de Pacientes"
            value={pacientes.length}
            icon={Users}
            iconBgClass="bg-clinic-cyan/20"
            iconClass="text-clinic-cyan"
          />

          <MetricCard
            label="Canais Ativos"
            value={origemLeadStats.length}
            icon={TrendingUp}
            iconBgClass="bg-blue-500/20"
            iconClass="text-blue-400"
          />

          <MetricCardSmall
            label="Fatores Críticos"
            value={`${fcsList.length} identificados`}
            icon={Target}
            iconBgClass="bg-green-500/20"
            iconClass="text-green-400"
            loading={loadingIndicadores}
          />
        </div>

        {/* Grid de Conteúdo Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Origem de Leads */}
          <CardOrigemLeads stats={origemLeadStats} />

          {/* FCS - Fatores Críticos de Sucesso */}
          <CardIndicador
            title="Fatores Críticos de Sucesso"
            items={fcsList}
            loading={loadingIndicadores}
            emptyIcon={Target}
            emptyMessage="Nenhum FCS disponível para este mês"
            itemColorClass="text-green-400"
          />

          {/* Melhorias */}
          <CardIndicador
            title="Melhorias Sugeridas"
            items={melhoriasList}
            loading={loadingIndicadores}
            emptyIcon={AlertCircle}
            emptyMessage="Nenhuma melhoria disponível para este mês"
            itemColorClass="text-yellow-400"
          />

          {/* Supervalorizado */}
          <CardIndicador
            title="Aspectos Supervalorizados"
            items={supervaloList}
            loading={loadingIndicadores}
            emptyIcon={TrendingUp}
            emptyMessage="Nenhum dado disponível para este mês"
            itemColorClass="text-purple-400"
          />

          {/* Temas Marketing */}
          <CardIndicador
            title="Temas de Marketing"
            items={temasMarketingList}
            loading={loadingIndicadores}
            emptyIcon={MessageSquare}
            emptyMessage="Nenhum tema disponível para este mês"
            itemColorClass="text-cyan-400"
          />

          {/* Oportunidades Marketing */}
          <CardIndicador
            title="Oportunidades de Marketing"
            items={oportunidadesList}
            loading={loadingIndicadores}
            emptyIcon={Lightbulb}
            emptyMessage="Nenhuma oportunidade disponível para este mês"
            itemColorClass="text-orange-400"
          />
        </div>

      </div>

      <NovaClinicaModal
        isOpen={showNovaClinicaModal}
        onClose={handleCloseModal}
        onSuccess={handleCloseModal}
      />
    </div>
  )
}