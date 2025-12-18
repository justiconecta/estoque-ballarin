'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp, Target, DollarSign, Calendar, BarChart3, Info, AlertTriangle } from 'lucide-react'
import { HeaderUniversal } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area, Line } from 'recharts'
import NovaClinicaModal from '@/components/NovaClinicaModal'

// ============ CONSTANTES ============
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const ANOS_DISPONIVEIS = [2025, 2026, 2027, 2028, 2029, 2030]

// Feriados 2025 (formato YYYY-MM-DD)
const FERIADOS_2025: Record<string, string[]> = {
  '2025': ['2025-01-01', '2025-03-03', '2025-03-04', '2025-04-18', '2025-04-21', '2025-05-01', '2025-06-19', '2025-09-07', '2025-10-12', '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25']
}

const formatCurrency = (value: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0)

const formatPercent = (value: number) => `${(value || 0).toFixed(1)}%`

// ============ FUNÇÕES AUXILIARES ============

function isBusinessDay(ano: number, mes: number, dia: number): boolean {
  const data = new Date(ano, mes - 1, dia)
  const diaSemana = data.getDay()
  
  // Fim de semana
  if (diaSemana === 0 || diaSemana === 6) return false
  
  // Feriado
  const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  const feriados = FERIADOS_2025[String(ano)] || []
  if (feriados.includes(dataStr)) return false
  
  return true
}

function calcularDiasUteis(ano: number, mes: number): number {
  const ultimoDia = new Date(ano, mes, 0).getDate()
  let diasUteis = 0
  for (let dia = 1; dia <= ultimoDia; dia++) {
    if (isBusinessDay(ano, mes, dia)) diasUteis++
  }
  return diasUteis
}

function calcularDiaUtilAtual(ano: number, mes: number): number {
  const hoje = new Date()
  if (hoje.getFullYear() !== ano || hoje.getMonth() + 1 !== mes) {
    return hoje > new Date(ano, mes, 0) ? calcularDiasUteis(ano, mes) : 0
  }

  let diaUtilAtual = 0
  for (let dia = 1; dia <= hoje.getDate(); dia++) {
    if (isBusinessDay(ano, mes, dia)) diaUtilAtual++
  }
  return diaUtilAtual
}

// ============ COMPONENTES DE KPI ============

const KpiCard = ({ 
  label, 
  value, 
  subtitle, 
  variant = 'default',
  progress,
  borderColor
}: { 
  label: string
  value: string | number
  subtitle?: string
  variant?: 'default' | 'cyan' | 'green' | 'warning' | 'danger'
  progress?: number
  borderColor?: string
}) => {
  const variantColors = {
    default: 'text-white',
    cyan: 'text-cyan-400',
    green: 'text-green-400',
    warning: 'text-amber-400',
    danger: 'text-red-400'
  }

  const progressColor = progress !== undefined
    ? progress >= 90 ? 'bg-green-500' : progress >= 50 ? 'bg-amber-500' : 'bg-red-500'
    : ''

  return (
    <div 
      className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 rounded-2xl p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-all hover:-translate-y-0.5"
      style={{ borderBottomColor: borderColor, borderBottomWidth: borderColor ? '2px' : undefined }}
    >
      <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      <span className={`block text-2xl font-bold mt-2 ${variantColors[variant]}`}>{value}</span>
      {subtitle && <span className="text-xs text-slate-500 mt-1 block">{subtitle}</span>}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${progressColor} transition-all duration-1000`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ============ COMPONENTE PRINCIPAL ============

export default function DashboardVendasPage() {
  const router = useRouter()
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1)
  const [mesesMix, setMesesMix] = useState([new Date().getMonth() + 1])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily')
  const [showFormulas, setShowFormulas] = useState(false)

  // Dados
  const [vendasPorDia, setVendasPorDia] = useState<Record<number, number>>({})
  const [vendasPorCategoria, setVendasPorCategoria] = useState({ toxina: 0, preenchedor: 0, biotech: 0, total: 0 })
  const [parametros, setParametros] = useState<any>(null)
  const [despesas, setDespesas] = useState<any[]>([])
  const [vendas, setVendas] = useState<any[]>([])

  // Carregar dados
  useEffect(() => {
    loadData()
  }, [anoSelecionado, mesSelecionado])

  useEffect(() => {
    loadMixData()
  }, [anoSelecionado, mesesMix])

  const loadData = async () => {
    setLoading(true)
    try {
      const [vendasDia, params, despesasData, vendasData] = await Promise.all([
        supabaseApi.getVendasPorDia(anoSelecionado, mesSelecionado),
        supabaseApi.getParametros(),
        supabaseApi.getDespesas(),
        supabaseApi.getVendas(anoSelecionado, [mesSelecionado])
      ])

      setVendasPorDia(vendasDia)
      setParametros(params)
      setDespesas(despesasData)
      setVendas(vendasData)
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMixData = async () => {
    try {
      const categorias = await supabaseApi.getVendasPorCategoria(anoSelecionado, mesesMix)
      setVendasPorCategoria(categorias)
    } catch (error) {
      console.error('Erro ao carregar mix:', error)
    }
  }

  // Toggle mês do mix
  const handleMixMesToggle = useCallback((mes: number) => {
    setMesesMix(prev => {
      if (prev.includes(mes)) {
        return prev.length === 1 ? prev : prev.filter(m => m !== mes)
      }
      return [...prev, mes].sort((a, b) => a - b)
    })
  }, [])

  // ============ CÁLCULOS DO DRE (ENGENHARIA REVERSA) ============

  const dreCalculado = useMemo(() => {
    if (!parametros) return null

    // Totais das vendas
    const receitaBruta = vendas.reduce((sum, v) => sum + (v.preco_final || v.preco_total || 0), 0)
    const custoInsumos = vendas.reduce((sum, v) => sum + (v.custo_total || 0), 0)

    // Deduções
    const impostos = receitaBruta * (parametros.aliquota_impostos_pct / 100)
    const vendasCredito = vendas.filter(v => v.metodo_pagamento === 'Crédito')
    const totalCredito = vendasCredito.reduce((sum, v) => sum + (v.preco_final || v.preco_total || 0), 0)
    const taxasFinanceiras = totalCredito * (parametros.taxa_cartao_pct / 100)
    const totalDeducoes = impostos + taxasFinanceiras

    // Receita Líquida
    const receitaLiquida = receitaBruta - totalDeducoes

    // Margem de Contribuição
    const margemContribuicao = receitaLiquida - custoInsumos
    const margemContribuicaoPct = receitaBruta > 0 ? (margemContribuicao / receitaBruta) * 100 : 30

    // Despesas Fixas
    const despesasFixas = despesas
      .filter(d => d.tipo === 'Despesa Fixa' || d.tipo === 'Custo Fixo' || d.tipo === null)
      .reduce((sum, d) => sum + d.valor_mensal, 0)

    // Reservas/Inovação (% da Margem de Contribuição)
    const modernInova = parametros.modern_inova || 10
    const reservasInovacao = margemContribuicao > 0 ? margemContribuicao * (modernInova / 100) : 0

    // EBITDA = Margem - Despesas Fixas - Reservas
    const ebitda = margemContribuicao - despesasFixas - reservasInovacao

    // Lucro Líquido = EBITDA
    const lucroLiquido = ebitda

    // ============ ENGENHARIA REVERSA ============
    // Meta do usuário (lucro líquido desejado)
    const metaLucroLiquido = parametros.meta_resultado_liquido_mensal || 0

    // Calcular Faturamento Bruto Necessário
    // Considerando: Lucro = Margem*(1 - modernInova%) - DespesasFixas
    // Então: Margem = (Lucro + DespesasFixas) / (1 - modernInova%)
    // E: Faturamento = Margem / margemPct
    const alvoMargem = (metaLucroLiquido + despesasFixas) / (1 - (modernInova / 100))
    const margemAtualPct = margemContribuicaoPct > 0 ? margemContribuicaoPct / 100 : 0.3
    const faturamentoNecessario = margemAtualPct > 0 ? alvoMargem / margemAtualPct : 0

    return {
      receitaBruta,
      custoInsumos,
      impostos,
      taxasFinanceiras,
      totalDeducoes,
      receitaLiquida,
      margemContribuicao,
      margemContribuicaoPct,
      despesasFixas,
      ebitda,
      modernInova,
      reservasInovacao,
      lucroLiquido,
      metaLucroLiquido,
      faturamentoNecessario, // ESSA É A META MENSAL!
      alvoMargem
    }
  }, [parametros, vendas, despesas])

  // ============ CÁLCULOS DO GRÁFICO ============

  const diasNoMes = new Date(anoSelecionado, mesSelecionado, 0).getDate()
  const diasUteisTotais = calcularDiasUteis(anoSelecionado, mesSelecionado)
  const diaUtilAtual = calcularDiaUtilAtual(anoSelecionado, mesSelecionado)

  const metaMensal = dreCalculado?.faturamentoNecessario || 0
  const realizadoAcumulado = Object.values(vendasPorDia).reduce((a, b) => a + b, 0)
  const gap = metaMensal - realizadoAcumulado
  const percentRealizado = metaMensal > 0 ? (realizadoAcumulado / metaMensal) * 100 : 0

  // Projeção de fechamento
  const projecaoFechamento = diaUtilAtual > 0 
    ? (realizadoAcumulado * diasUteisTotais) / diaUtilAtual 
    : 0
  const projecaoPercent = metaMensal > 0 ? (projecaoFechamento / metaMensal) * 100 : 0

  // Dados do gráfico
  const chartData = useMemo(() => {
    const data = []
    let acumuladoReal = 0
    let acumuladoMeta = 0
    const metaDiaria = diasUteisTotais > 0 ? metaMensal / diasUteisTotais : 0
    const hoje = new Date()
    const diaAtual = hoje.getFullYear() === anoSelecionado && hoje.getMonth() + 1 === mesSelecionado 
      ? hoje.getDate() 
      : diasNoMes

    for (let dia = 1; dia <= diasNoMes; dia++) {
      const isBizDay = isBusinessDay(anoSelecionado, mesSelecionado, dia)
      const vendaDia = vendasPorDia[dia] || 0
      
      // Meta dinâmica: recalcula baseado no que falta
      const diasUteisRestantes = Array.from({ length: diasNoMes - dia + 1 }, (_, i) => dia + i)
        .filter(d => isBusinessDay(anoSelecionado, mesSelecionado, d)).length
      const metaDinamica = diasUteisRestantes > 0 && isBizDay
        ? Math.max(0, metaMensal - acumuladoReal) / diasUteisRestantes
        : 0

      if (isBizDay) {
        acumuladoMeta += metaDiaria
      }

      if (dia <= diaAtual) {
        acumuladoReal += vendaDia
      }

      data.push({
        dia,
        vendaRealizada: dia <= diaAtual ? vendaDia : null,
        metaDinamica: isBizDay ? metaDinamica : 0,
        acumuladoReal: dia <= diaAtual ? acumuladoReal : null,
        acumuladoMeta: Math.min(acumuladoMeta, metaMensal),
        isBizDay
      })
    }

    return data
  }, [vendasPorDia, diasNoMes, diasUteisTotais, metaMensal, anoSelecionado, mesSelecionado])

  // ============ CÁLCULO DO MIX (PROPORÇÃO) ============

  const mixRatio = useMemo(() => {
    const { toxina, preenchedor, biotech } = vendasPorCategoria
    const values = [toxina, preenchedor, biotech].filter(v => v > 0)
    if (values.length === 0) return { toxina: 0, preenchedor: 0, biotech: 0, formatted: '0 : 0 : 0' }
    
    const minVal = Math.min(...values)
    const ratioT = minVal > 0 ? (toxina / minVal).toFixed(1) : '0'
    const ratioP = minVal > 0 ? (preenchedor / minVal).toFixed(1) : '0'
    const ratioB = minVal > 0 ? (biotech / minVal).toFixed(1) : '0'

    // Remover .0 se for número inteiro
    const format = (r: string) => r.endsWith('.0') ? r.slice(0, -2) : r

    return {
      toxina,
      preenchedor,
      biotech,
      formatted: `${format(ratioT)} : ${format(ratioP)} : ${format(ratioB)}`
    }
  }, [vendasPorCategoria])

  // ============ ANÁLISE DE CATEGORIA DEFASADA ============

  const categoriaDefasada = useMemo(() => {
    const { toxina, preenchedor, biotech } = vendasPorCategoria
    
    // Se não tem dados, sem definição
    if (toxina === 0 && preenchedor === 0 && biotech === 0) {
      return { categoria: 'Sem definição', color: 'gray' }
    }

    const CATEGORIES = [
      { nome: 'Toxina Botulínica', color: 'cyan' },
      { nome: 'Preenchedor', color: 'green' },
      { nome: 'Bio/Tech', color: 'purple' }
    ]

    // Padrões de referência (da doc)
    const PATTERNS = [
      [1, 3, 1], // Standard
      [1, 4, 1],
      [1, 4, 2],
      [2, 4, 1], // Premium
      [2, 5, 2], // Ultra
    ]

    const TIE_EPS = 0.03

    // Converter para array na ordem correta
    const real = [toxina, preenchedor, biotech]

    // Funções auxiliares
    const bestScaleK = (realArr: number[], pattern: number[]) => {
      let num = 0, den = 0
      for (let i = 0; i < 3; i++) {
        num += realArr[i] * pattern[i]
        den += pattern[i] * pattern[i]
      }
      return den === 0 ? 0 : num / den
    }

    const mseAfterScale = (realArr: number[], pattern: number[], k: number) => {
      let sum = 0
      for (let i = 0; i < 3; i++) {
        const diff = realArr[i] - k * pattern[i]
        sum += diff * diff
      }
      return sum / 3
    }

    const deficiencyForPattern = (realArr: number[], pattern: number[], k: number) => {
      const expected = pattern.map(v => v * k)
      const fulfillment = expected.map((exp, i) => {
        if (exp <= 0) return Number.POSITIVE_INFINITY
        return realArr[i] / exp
      })
      return { expected, fulfillment }
    }

    // 1) Encontrar padrão mais semelhante
    let best: { pattern: number[], k: number, mse: number, fulfillment: number[] } | null = null

    for (const pattern of PATTERNS) {
      const k = bestScaleK(real, pattern)
      const mse = mseAfterScale(real, pattern, k)
      const { fulfillment } = deficiencyForPattern(real, pattern, k)

      const candidate = { pattern, k, mse, fulfillment }
      if (!best || candidate.mse < best.mse) best = candidate
    }

    if (!best) return { categoria: 'Sem definição', color: 'gray' }

    // 2) Identificar categoria defasada (menor fulfillment)
    const f = best.fulfillment.slice()
    const sortedIdx = [0, 1, 2].sort((a, b) => f[a] - f[b])

    const first = sortedIdx[0]
    const second = sortedIdx[1]

    // Empate: se os dois menores fulfillments estiverem muito próximos
    const denom = Math.max(1e-12, f[first])
    const relDiff = Math.abs(f[second] - f[first]) / denom

    if (relDiff <= TIE_EPS) {
      return { 
        categoria: `${CATEGORIES[first].nome}, ${CATEGORIES[second].nome}`,
        color: 'amber',
        indices: [first, second]
      }
    }

    return { 
      categoria: CATEGORIES[first].nome,
      color: CATEGORIES[first].color,
      indices: [first]
    }
  }, [vendasPorCategoria])

  // Título do período
  const tituloPeriodo = `${MESES[mesSelecionado - 1]} ${anoSelecionado}`
  const tituloMix = mesesMix.length > 0 
    ? `${mesesMix.map(m => MESES[m - 1]).join(', ')} / ${anoSelecionado}`
    : 'Nenhum mês selecionado'

  if (loading && !parametros) {
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
    <div className="min-h-screen bg-clinic-black text-white">
      <div className="container mx-auto px-4 py-6">
        
        {/* Header Universal */}
        <HeaderUniversal 
          titulo="Comercial" 
          descricao="Acompanhamento de vendas, metas e mix de produtos"
          icone={TrendingUp}
          showNovaClinicaModal={() => setShowNovaClinicaModal(true)}
        />

        {/* Navegação por Tabs */}
        <div className="mb-8">
          <div className="border-b border-clinic-gray-700">
            <nav className="flex space-x-8">
              <button
                onClick={() => router.push('/dashboard/marketing')}
                className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
              >
                Marketing e Terapêutico
              </button>
              <button
                onClick={() => router.push('/dashboard/terapeutico')}
                className="py-3 px-4 border-b-2 border-transparent text-clinic-gray-400 hover:text-clinic-gray-300 hover:border-clinic-gray-300 font-medium text-sm transition-all duration-200"
              >
                IA - Paciente
              </button>
              <button
                className="py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 border-clinic-cyan text-clinic-cyan"
              >
                Comercial
              </button>
            </nav>
          </div>
        </div>

        {/* Filtros e Ações */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 uppercase">Ano</label>
              <select
                value={anoSelecionado}
                onChange={(e) => setAnoSelecionado(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                {ANOS_DISPONIVEIS.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 uppercase">Mês</label>
              <select
                value={mesSelecionado}
                onChange={(e) => setMesSelecionado(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                {MESES.map((nome, idx) => (
                  <option key={idx + 1} value={idx + 1}>{nome}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowFormulas(true)}
              className="px-4 py-2 bg-cyan-500/10 border border-cyan-500 text-cyan-400 rounded-full text-sm font-semibold hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-2"
            >
              <Info className="w-4 h-4" /> Ver Fórmulas
            </button>
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700/50">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
              <span className="text-slate-400 text-sm">{tituloPeriodo}</span>
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <KpiCard
            label="Meta Mensal (Faturamento)"
            value={formatCurrency(metaMensal)}
            subtitle={`${diasUteisTotais} Dias Úteis (${MESES[mesSelecionado - 1]} ${anoSelecionado})`}
          />
          <KpiCard
            label="Realizado Acumulado"
            value={formatCurrency(realizadoAcumulado)}
            subtitle={`Faltam: ${formatCurrency(Math.max(0, gap))}`}
            variant="cyan"
            borderColor="#00E7FF"
          />
          <KpiCard
            label="Atingimento Real"
            value={formatPercent(percentRealizado)}
            subtitle="(Realizado / Meta)"
            progress={percentRealizado}
          />
          <KpiCard
            label="Projeção de Fechamento"
            value={formatCurrency(projecaoFechamento)}
            subtitle={`${formatPercent(projecaoPercent)} da Meta`}
            variant={projecaoPercent >= 100 ? 'green' : 'warning'}
            borderColor={projecaoPercent >= 100 ? '#00ff9d' : '#f59e0b'}
          />
        </div>

        {/* CONTROLES DO GRÁFICO */}
        <div className="flex justify-end gap-2 mb-2">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'daily'
                ? 'bg-cyan-500/10 border border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Visão Diária
          </button>
          <button
            onClick={() => setViewMode('cumulative')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'cumulative'
                ? 'bg-cyan-500/10 border border-cyan-500 text-cyan-400 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Visão Acumulada
          </button>
        </div>

        {/* GRÁFICO */}
        <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl p-6 border border-slate-700/30 mb-8">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'daily' ? (
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="dia" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(16, 24, 39, 0.95)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#00E7FF' }}
                    labelFormatter={(label) => `Dia ${label}`}
                    formatter={((value: number | null, name: string) => {
                      const displayName = name === 'vendaRealizada' ? 'Venda Realizada' : 'Meta Dinâmica'
                      return [formatCurrency(value || 0), displayName]
                    }) as any}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => value === 'vendaRealizada' ? 'Venda Realizada' : 'Meta Dinâmica'}
                  />
                  <Bar 
                    dataKey="vendaRealizada" 
                    fill="#00E7FF" 
                    radius={[4, 4, 0, 0]}
                    name="vendaRealizada"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="metaDinamica" 
                    stroke="#F59E0B" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="metaDinamica"
                  />
                </ComposedChart>
              ) : (
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="dia" tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 12 }} 
                    tickFormatter={(val) => `${(val/1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'rgba(16, 24, 39, 0.95)', 
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: '#00E7FF' }}
                    labelFormatter={(label) => `Dia ${label}`}
                    formatter={((value: number | null, name: string) => {
                      const displayName = name === 'acumuladoReal' ? 'Acumulado Real' : 'Referência Meta'
                      return [formatCurrency(value || 0), displayName]
                    }) as any}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    formatter={(value) => value === 'acumuladoReal' ? 'Acumulado Real' : 'Referência Meta'}
                  />
                  <defs>
                    <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00ff9d" stopOpacity={0.6}/>
                      <stop offset="50%" stopColor="#00ff9d" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#00ff9d" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  {/* Linha de referência da meta (tracejada, cinza) */}
                  <Line 
                    type="monotone" 
                    dataKey="acumuladoMeta" 
                    stroke="#64748b" 
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={false}
                    name="acumuladoMeta"
                  />
                  {/* Área preenchida do realizado */}
                  <Area 
                    type="monotone" 
                    dataKey="acumuladoReal" 
                    stroke="#00ff9d" 
                    fill="url(#colorReal)"
                    strokeWidth={3}
                    name="acumuladoReal"
                    dot={{ fill: '#00ff9d', strokeWidth: 0, r: 2 }}
                    activeDot={{ fill: '#00ff9d', strokeWidth: 2, stroke: '#fff', r: 6 }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* SEÇÃO MIX DE PRODUTOS */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/30">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* LADO ESQUERDO - Inputs e Filtros */}
            <div className="flex-[2]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-slate-400 text-sm font-bold uppercase tracking-wider">
                  Mix de Produtos - {tituloMix}
                </h3>
                <span className="text-xs text-slate-500">Dados Acumulados</span>
              </div>

              {/* Filtro de Meses do Mix */}
              <div className="mb-6 pb-6 border-b border-slate-700/50">
                <label className="text-xs text-slate-400 uppercase mb-3 block">
                  Meses (clique para selecionar múltiplos)
                </label>
                <div className="flex flex-wrap gap-2">
                  {MESES.map((nome, idx) => {
                    const mes = idx + 1
                    const selected = mesesMix.includes(mes)
                    return (
                      <button
                        key={mes}
                        onClick={() => handleMixMesToggle(mes)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          selected
                            ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {nome}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Inputs de Categorias */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-cyan-400 font-semibold">Toxina Botulínica</label>
                  <div className="bg-black/20 border-l-4 border-cyan-400 rounded-lg p-4">
                    <span className="text-3xl font-bold text-cyan-400 font-mono">
                      {vendasPorCategoria.toxina}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-green-400 font-semibold">Preenchedor</label>
                  <div className="bg-black/20 border-l-4 border-green-400 rounded-lg p-4">
                    <span className="text-3xl font-bold text-green-400 font-mono">
                      {vendasPorCategoria.preenchedor}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-purple-400 font-semibold">Bio / Tech</label>
                  <div className="bg-black/20 border-l-4 border-purple-400 rounded-lg p-4">
                    <span className="text-3xl font-bold text-purple-400 font-mono">
                      {vendasPorCategoria.biotech}
                    </span>
                  </div>
                </div>
              </div>

              {/* Proporção */}
              <div className="bg-cyan-500/5 border border-dashed border-cyan-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl font-extrabold font-mono bg-gradient-to-r from-cyan-400 via-white to-cyan-400 bg-clip-text text-transparent">
                  {mixRatio.formatted}
                </div>
                <div className="text-xs text-cyan-400 uppercase tracking-widest mt-2">
                  Proporção Atual
                </div>
              </div>

              {/* Alerta de Categoria Defasada */}
              {categoriaDefasada.categoria !== 'Sem definição' && (
                <div className={`mt-4 rounded-xl p-4 border ${
                  categoriaDefasada.color === 'cyan' ? 'bg-cyan-500/10 border-cyan-500/30' :
                  categoriaDefasada.color === 'green' ? 'bg-green-500/10 border-green-500/30' :
                  categoriaDefasada.color === 'purple' ? 'bg-purple-500/10 border-purple-500/30' :
                  'bg-amber-500/10 border-amber-500/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                      categoriaDefasada.color === 'cyan' ? 'text-cyan-400' :
                      categoriaDefasada.color === 'green' ? 'text-green-400' :
                      categoriaDefasada.color === 'purple' ? 'text-purple-400' :
                      'text-amber-400'
                    }`} />
                    <div>
                      <div className="text-xs text-slate-400 uppercase tracking-wider">
                        Categoria Defasada
                      </div>
                      <div className={`font-semibold ${
                        categoriaDefasada.color === 'cyan' ? 'text-cyan-400' :
                        categoriaDefasada.color === 'green' ? 'text-green-400' :
                        categoriaDefasada.color === 'purple' ? 'text-purple-400' :
                        'text-amber-400'
                      }`}>
                        {categoriaDefasada.categoria}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LADO DIREITO - Legendas de Referência */}
            <div className="flex-1 border-l border-slate-700/50 pl-6">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-4">
                Referências de Mix
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="font-semibold text-purple-400">Ultra</span>
                  <span className="font-mono text-white">2 : 5 : 2</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="font-semibold text-green-400">Premium</span>
                  <span className="font-mono text-white">2 : 4 : 1</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-700/30">
                  <span className="font-semibold text-cyan-400">Standard</span>
                  <span className="font-mono text-white">1 : 3 : 1</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-semibold text-slate-400">Basic</span>
                  <span className="font-mono text-white">1 : 2 : 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MODAL DE FÓRMULAS */}
        {showFormulas && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFormulas(false)}
          >
            <div 
              className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-slate-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-700 sticky top-0 bg-slate-900">
                <h3 className="text-xl font-semibold">Documentação</h3>
                <button 
                  onClick={() => setShowFormulas(false)}
                  className="text-slate-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="text-cyan-400 text-sm font-bold uppercase mb-2">1. Meta Mensal (Faturamento Necessário)</h4>
                  <p className="text-slate-300 text-sm mb-3">Engenharia reversa do DRE baseada na meta de lucro líquido.</p>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-green-400">
                    <p>Lucro = Margem × (1 - %Inovação) - Desp. Fixas</p>
                    <p>Alvo Margem = (Meta Lucro + Desp. Fixas) / (1 - %Inovação)</p>
                    <p>Faturamento = Alvo Margem / Margem% atual</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-cyan-400 text-sm font-bold uppercase mb-2">2. Meta Diária Dinâmica</h4>
                  <p className="text-slate-300 text-sm mb-3">Recalcula a meta diariamente baseada no que falta para vender.</p>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-green-400">
                    Meta do Dia = (Meta Total - Realizado) / Dias Úteis Restantes
                  </div>
                </div>
                <div>
                  <h4 className="text-cyan-400 text-sm font-bold uppercase mb-2">3. Projeção de Fechamento</h4>
                  <p className="text-slate-300 text-sm mb-3">Estima o fechamento do mês baseado no ritmo atual.</p>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-green-400">
                    Projeção R$ = (Realizado / Dias Úteis Corridos) × Total Dias Úteis
                  </div>
                </div>
                <div>
                  <h4 className="text-cyan-400 text-sm font-bold uppercase mb-2">4. Proporção de Mix</h4>
                  <p className="text-slate-300 text-sm mb-3">Divide todos os valores pelo menor valor e arredonda.</p>
                  <div className="bg-black rounded-lg p-4 font-mono text-sm text-green-400">
                    <p>Mínimo = Menor valor entre (Toxina, Preenchedor, Bio) {">"} 0</p>
                    <p>T' = (Toxina / Mínimo).toFixed(1)</p>
                    <p>P' = (Preenchedor / Mínimo).toFixed(1)</p>
                    <p>B' = (Bio / Mínimo).toFixed(1)</p>
                    <p>Formato: T' : P' : B'</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal Nova Clínica */}
      <NovaClinicaModal
        isOpen={showNovaClinicaModal}
        onClose={() => setShowNovaClinicaModal(false)}
        onSuccess={() => setShowNovaClinicaModal(false)}
      />
    </div>
  )
}