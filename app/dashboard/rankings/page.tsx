'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, Users, Package, DollarSign, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'
import { HeaderUniversal, DashboardTabs } from '@/components/ui'
import { getClasseBadge } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useData, useVendas } from '@/contexts/DataContext'
import NovaClinicaModal from '@/components/NovaClinicaModal'

// ============ CONSTANTES ============
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const ANOS_DISPONIVEIS = [2025, 2026, 2027, 2028, 2029, 2030]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value || 0)

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR')

// ============ SUBCOMPONENTES MEMOIZADOS ============

const KpiCard = React.memo(function KpiCard({
  label, value, icon: Icon, color = 'cyan'
}: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color?: 'cyan' | 'green' | 'purple' | 'amber'
}) {
  const colors = {
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
    green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/30 text-emerald-400',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/30 text-purple-400',
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/30 text-amber-400',
  }
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-2xl p-6 hover:border-opacity-60 transition-all hover:-translate-y-0.5`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  )
})

const MesButton = React.memo(function MesButton({
  nome, selected, onClick
}: {
  nome: string; selected: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        selected
          ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
      }`}
    >
      {nome}
    </button>
  )
})

const getMedalClass = (index: number) => {
  if (index === 0) return 'bg-amber-500 text-slate-900'
  if (index === 1) return 'bg-slate-400 text-slate-900'
  if (index === 2) return 'bg-amber-700 text-white'
  return 'bg-slate-700 text-slate-400'
}


// ============ COMPONENTE PRINCIPAL ============
export default function DashboardRankingsPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()

  // Estados
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear())
  const [mesesSelecionados, setMesesSelecionados] = useState<number[]>([new Date().getMonth() + 1])
  const [rankingType, setRankingType] = useState<'patients' | 'products'>('patients')
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null)
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)

  // Dados do Supabase
  const { vendas } = useVendas(anoSelecionado, mesesSelecionados)
  const { skus, loading: dataLoading } = useData()

  // Callbacks memoizados
  const handleMesToggle = useCallback((mes: number) => {
    setMesesSelecionados(prev => {
      if (prev.includes(mes)) {
        return prev.length === 1 ? prev : prev.filter(m => m !== mes)
      }
      return [...prev, mes].sort((a, b) => a - b)
    })
  }, [])

  const handleAnoChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setAnoSelecionado(Number(e.target.value))
  }, [])

  const handleShowNovaClinica = useCallback(() => setShowNovaClinicaModal(true), [])
  const handleCloseNovaClinica = useCallback(() => setShowNovaClinicaModal(false), [])

  const handleSelectAll = useCallback(() => {
    setMesesSelecionados(MESES.map((_, idx) => idx + 1))
  }, [])

  const handleClearMonths = useCallback(() => {
    setMesesSelecionados([new Date().getMonth() + 1])
  }, [])

  // ============ CÁLCULOS ============

  // Métricas gerais
  const metricas = useMemo(() => {
    const receitaTotal = vendas.reduce((sum: number, v: any) => sum + (v.preco_final || v.preco_total || 0), 0)
    const produtosVendidos = vendas.reduce((sum: number, v: any) => {
      if (!v.items || !Array.isArray(v.items)) return sum
      return sum + v.items.reduce((iSum: number, i: any) => iSum + (i.qtd || 0), 0)
    }, 0)
    const pacientesUnicos = new Set(vendas.map((v: any) => v.id_paciente)).size
    const ticketMedio = pacientesUnicos > 0 ? receitaTotal / pacientesUnicos : 0

    return { receitaTotal, produtosVendidos, ticketMedio }
  }, [vendas])

  // Ranking de Pacientes
  const patientRanking = useMemo(() => {
    const patientTotals: Record<number, {
      total: number
      visits: number
      products: Array<{ id: number; qtd: number }>
      lastVisit: string | null
      nome: string
    }> = {}

    vendas.forEach((venda: any) => {
      const pid = venda.id_paciente
      if (!patientTotals[pid]) {
        patientTotals[pid] = {
          total: 0,
          visits: 0,
          products: [],
          lastVisit: null,
          nome: venda.pacientes?.nome_completo || 'Paciente não identificado'
        }
      }
      patientTotals[pid].total += (venda.preco_final || venda.preco_total || 0)
      patientTotals[pid].visits += 1
      if (venda.items && Array.isArray(venda.items)) {
        patientTotals[pid].products.push(...venda.items)
      }
      if (!patientTotals[pid].lastVisit || venda.data_venda > patientTotals[pid].lastVisit!) {
        patientTotals[pid].lastVisit = venda.data_venda
      }
    })

    return Object.entries(patientTotals)
      .map(([id, data]) => ({
        id: parseInt(id),
        ...data,
        ticketMedio: data.total / data.visits,
      }))
      .sort((a, b) => b.total - a.total)
  }, [vendas])

  // Ranking de Produtos
  const productRanking = useMemo(() => {
    const productTotals: Record<number, { quantity: number }> = {}

    vendas.forEach((venda: any) => {
      if (!venda.items || !Array.isArray(venda.items)) return
      venda.items.forEach((item: any) => {
        if (!item.id || !item.qtd) return
        if (!productTotals[item.id]) {
          productTotals[item.id] = { quantity: 0 }
        }
        productTotals[item.id].quantity += item.qtd
      })
    })

    return (Object.entries(productTotals)
      .map(([skuId, data]) => {
        const sku = skus.find((s: any) => s.id_sku === parseInt(skuId))
        if (!sku) return null
        return {
          sku,
          quantity: data.quantity,
          revenue: data.quantity * (sku.valor_venda || 0),
        }
      })
      .filter(Boolean) as Array<{ sku: any; quantity: number; revenue: number }>
    ).sort((a, b) => b.quantity - a.quantity)
  }, [vendas, skus])

  // Título do período
  const tituloPeriodo = useMemo(() => {
    if (mesesSelecionados.length === 0) return 'Nenhum mês selecionado'
    if (mesesSelecionados.length === 12) return `Ano completo ${anoSelecionado}`
    return `${mesesSelecionados.map(m => MESES[m - 1]).join(', ')} / ${anoSelecionado}`
  }, [mesesSelecionados, anoSelecionado])

  // ============ LOADING / AUTH ============
  if (authLoading) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-clinic-cyan border-t-transparent mx-auto mb-4"></div>
          <p className="text-clinic-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.push('/login')
    return null
  }

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-clinic-black text-white">
      <div className="container mx-auto px-4 py-6">

        <HeaderUniversal
          titulo="Rankings"
          descricao="Ranking de pacientes e produtos por período"
          icone={Trophy}
          showNovaClinicaModal={handleShowNovaClinica}
        />

        <DashboardTabs activeTab="rankings" />

        {/* Filtros de Período */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/30 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 uppercase">Ano</label>
              <select
                value={anoSelecionado}
                onChange={handleAnoChange}
                className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {ANOS_DISPONIVEIS.map(ano => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>

            <div className="h-6 w-px bg-slate-700 hidden lg:block" />

            <div className="flex-1">
              <label className="text-xs text-slate-400 uppercase mb-2 block">Meses</label>
              <div className="flex flex-wrap gap-2">
                {MESES.map((nome, idx) => (
                  <MesButton
                    key={idx + 1}
                    nome={nome}
                    selected={mesesSelecionados.includes(idx + 1)}
                    onClick={() => handleMesToggle(idx + 1)}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleSelectAll} className="text-sm text-cyan-400 hover:text-cyan-300 whitespace-nowrap">
                Selecionar todos
              </button>
              <button onClick={handleClearMonths} className="text-sm text-slate-400 hover:text-white whitespace-nowrap">
                Limpar
              </button>
            </div>
          </div>

          {/* Período selecionado */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700/50">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50" />
            <span className="text-slate-400 text-sm">{tituloPeriodo}</span>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <KpiCard icon={DollarSign} label="Receita Total" value={formatCurrency(metricas.receitaTotal)} color="green" />
          <KpiCard icon={Package} label="Produtos Vendidos" value={metricas.produtosVendidos} color="purple" />
          <KpiCard icon={TrendingUp} label="Ticket Médio" value={formatCurrency(metricas.ticketMedio)} color="amber" />
        </div>

        {/* Tabs: Pacientes | Produtos */}
        <div className="flex gap-2 border-b border-slate-700 pb-2 mb-6">
          {([
            { id: 'patients' as const, label: 'Pacientes', icon: Users },
            { id: 'products' as const, label: 'Produtos', icon: Package },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setRankingType(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                rankingType === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ============ RANKING DE PACIENTES ============ */}
        {rankingType === 'patients' && (
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl border border-slate-700/30 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                Ranking de Pacientes por Valor Investido
              </h3>
            </div>
            <div className="divide-y divide-slate-700/50">
              {patientRanking.map((item, index) => (
                <div key={item.id} className="hover:bg-slate-700/30 transition-colors">
                  <div
                    className="p-4 flex items-center gap-4 cursor-pointer"
                    onClick={() => setExpandedPatient(expandedPatient === item.id ? null : item.id)}
                  >
                    {/* Posição / Medalha */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${getMedalClass(index)}`}>
                      {index + 1}
                    </div>

                    {/* Info do paciente */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{item.nome}</div>
                      <div className="text-sm text-slate-400">
                        {item.visits} visita{item.visits > 1 ? 's' : ''} {item.lastVisit ? `• Última: ${formatDate(item.lastVisit)}` : ''}
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-emerald-400">{formatCurrency(item.total)}</div>
                      <div className="text-xs text-slate-400">Ticket médio: {formatCurrency(item.ticketMedio)}</div>
                    </div>

                    {/* Seta */}
                    {expandedPatient === item.id
                      ? <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    }
                  </div>

                  {/* Expansão: Produtos adquiridos */}
                  {expandedPatient === item.id && (
                    <div className="px-4 pb-4 pl-16">
                      <div className="bg-slate-900/50 rounded-lg p-3">
                        <div className="text-sm text-slate-400 mb-2">Produtos adquiridos:</div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            // Agrupar produtos por ID
                            const grouped: Record<number, number> = {}
                            item.products.forEach(p => {
                              grouped[p.id] = (grouped[p.id] || 0) + p.qtd
                            })
                            return Object.entries(grouped).map(([productId, qty]) => {
                              const sku = skus.find((s: any) => s.id_sku === parseInt(productId))
                              if (!sku) return null
                              return (
                                <span
                                  key={productId}
                                  className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded-full text-xs font-medium"
                                >
                                  {sku.nome_produto} ({qty}x)
                                </span>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {patientRanking.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhuma venda encontrada no período selecionado
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============ RANKING DE PRODUTOS ============ */}
        {rankingType === 'products' && (
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl border border-slate-700/30 overflow-hidden">
            <div className="p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-400" />
                Ranking de Produtos Mais Vendidos
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-400 border-b border-slate-700">
                    <th className="p-4 w-12">#</th>
                    <th className="p-4">Produto</th>
                    <th className="p-4">Classe Terapêutica</th>
                    <th className="p-4">Fabricante</th>
                    <th className="p-4 text-right">Qtd. Vendida</th>
                    <th className="p-4 text-right">Receita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {productRanking.map((item, index) => (
                    <tr key={item.sku.id_sku} className="hover:bg-slate-700/30 transition-colors">
                      <td className="p-4">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${getMedalClass(index)}`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="p-4 font-medium text-white">{item.sku.nome_produto}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getClasseBadge(item.sku.classe_terapeutica)}`}>
                          {item.sku.classe_terapeutica}
                        </span>
                      </td>
                      <td className="p-4 text-slate-400">{item.sku.fabricante}</td>
                      <td className="p-4 text-right font-bold text-white">{item.quantity}</td>
                      <td className="p-4 text-right text-emerald-400">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {productRanking.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhum produto vendido no período selecionado
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      <NovaClinicaModal isOpen={showNovaClinicaModal} onClose={handleCloseNovaClinica} onSuccess={handleCloseNovaClinica} />
    </div>
  )
}
