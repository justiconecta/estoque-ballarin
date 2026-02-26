'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, AlertTriangle, Calendar, Phone, ChevronDown, ChevronUp, RotateCcw, Check, ShoppingBag } from 'lucide-react'
import { HeaderUniversal, DashboardTabs } from '@/components/ui'
import { getClasseBadge } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useRetornos } from '@/contexts/DataContext'
import { supabaseApi } from '@/lib/supabase'
import NovaClinicaModal from '@/components/NovaClinicaModal'
import type { RetornoDashboard } from '@/types/database'

// ============ HELPERS ============

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR')
}

const formatCurrency = (value: number | null) => {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(value)
}

const formatPhoneForWhatsApp = (phone: string | null): string => {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55')) return digits
  return `55${digits}`
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'atrasado': return 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
    case 'proximo': return 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
    case 'agendado': return 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
    case 'pendente': return 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    case 'contactado': return 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
    default: return 'bg-slate-600/20 text-slate-400 border border-slate-600/30'
  }
}

const getDiasLabel = (dias: number | null) => {
  if (dias == null) return { text: '—', color: 'text-slate-400' }
  if (dias < 0) return { text: `${Math.abs(dias)} dias atrasado`, color: 'text-rose-400' }
  if (dias === 0) return { text: 'Hoje', color: 'text-amber-400' }
  if (dias <= 30) return { text: `em ${dias} dias`, color: 'text-amber-400' }
  return { text: `em ${dias} dias`, color: 'text-slate-400' }
}

// ============ SUBCOMPONENTES MEMOIZADOS ============

const KpiCard = React.memo(function KpiCard({
  label, value, icon: Icon, color = 'cyan'
}: {
  label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color?: 'cyan' | 'rose' | 'amber'
}) {
  const colors = {
    cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/30 text-cyan-400',
    rose: 'from-rose-500/20 to-rose-600/5 border-rose-500/30 text-rose-400',
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

const FilterButton = React.memo(function FilterButton({
  label, active, onClick
}: {
  label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/20'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
      }`}
    >
      {label}
    </button>
  )
})

const RetornoExpandido = React.memo(function RetornoExpandido({
  retorno, onConfirmar, confirmandoId
}: {
  retorno: RetornoDashboard
  onConfirmar: (id: number) => void
  confirmandoId: number | null
}) {
  return (
    <div className="px-4 pb-4 pl-8">
      {/* Todos os retornos pendentes */}
      {retorno.todos_retornos && retorno.todos_retornos.length > 0 && (
        <div className="bg-slate-900/50 rounded-lg p-4 mb-3">
          <div className="text-sm text-slate-400 mb-3 font-medium">Retornos pendentes:</div>
          <div className="space-y-2">
            {retorno.todos_retornos.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-medium">{r.produto}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getClasseBadge(r.classe)}`}>
                      {r.classe}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(r.status)}`}>
                      {r.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Procedimento: {formatDate(r.data_procedimento)} | Retorno previsto: {formatDate(r.data_retorno)} | Contato: {formatDate(r.data_contato)}
                  </div>
                </div>
                {r.status !== 'confirmado' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onConfirmar(r.id)
                    }}
                    disabled={confirmandoId === r.id}
                    className={`flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${
                      confirmandoId === r.id
                        ? 'bg-slate-700/30 text-slate-500 border-slate-600/30 cursor-not-allowed'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                    }`}
                  >
                    {confirmandoId === r.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border border-slate-500 border-t-transparent" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    {confirmandoId === r.id ? 'Confirmando...' : 'Confirmar'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upsell */}
      {retorno.upsell_lista && retorno.upsell_lista.length > 0 && (
        <div className="bg-purple-900/20 rounded-lg p-4 mb-3 border border-purple-500/20">
          <div className="text-sm text-purple-400 mb-2 font-medium flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            Procedimentos sugeridos (Upsell):
          </div>
          <div className="space-y-1">
            {retorno.upsell_lista.map((u, idx) => (
              <div key={idx} className="text-sm text-slate-300">
                <span className="font-medium">{u.procedimento}</span>
                {u.motivo && <span className="text-slate-400"> — {u.motivo}</span>}
                <span className="text-slate-500 text-xs ml-2">({formatDate(u.sugerido_em)})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Última compra e valor */}
      <div className="flex items-center gap-4 text-sm text-slate-400">
        {retorno.ultima_compra && (
          <span>Última compra: {formatDate(retorno.ultima_compra)}</span>
        )}
        {retorno.valor_total != null && (
          <span>Valor total investido: <span className="text-emerald-400 font-medium">{formatCurrency(retorno.valor_total)}</span></span>
        )}
      </div>
    </div>
  )
})

// ============ COMPONENTE PRINCIPAL ============
export default function DashboardRetornosPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { retornos, loading, reload } = useRetornos()

  // Estados
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'atrasados' | 'proximos'>('todos')
  const [expandedPatient, setExpandedPatient] = useState<number | null>(null)
  const [confirmando, setConfirmando] = useState<number | null>(null)
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)

  // Callbacks
  const handleShowNovaClinica = useCallback(() => setShowNovaClinicaModal(true), [])
  const handleCloseNovaClinica = useCallback(() => setShowNovaClinicaModal(false), [])

  const handleToggleExpand = useCallback((idPaciente: number) => {
    setExpandedPatient(prev => prev === idPaciente ? null : idPaciente)
  }, [])

  const handleConfirmarRetorno = useCallback(async (idRetorno: number) => {
    setConfirmando(idRetorno)
    try {
      const hoje = new Date().toISOString().split('T')[0]
      await supabaseApi.confirmarRetornoManual(idRetorno, 'Confirmado via dashboard', hoje)
      reload()
    } catch (error) {
      console.error('Erro ao confirmar retorno:', error)
    } finally {
      setConfirmando(null)
    }
  }, [reload])

  // Métricas computadas
  const metricas = useMemo(() => ({
    total: retornos.filter(r => r.status_consolidado !== 'confirmado').length,
    atrasados: retornos.filter(r => r.status_consolidado === 'atrasado').length,
    proximos: retornos.filter(r => r.status_consolidado === 'proximo' || r.status_consolidado === 'agendado').length,
  }), [retornos])

  // Filtro + ordenação
  const retornosFiltrados = useMemo(() => {
    let filtrados = retornos

    switch (filtroStatus) {
      case 'atrasados':
        filtrados = retornos.filter(r => r.status_consolidado === 'atrasado')
        break
      case 'proximos':
        filtrados = retornos.filter(r => r.status_consolidado === 'proximo' || r.status_consolidado === 'agendado')
        break
      default:
        filtrados = retornos.filter(r => r.status_consolidado !== 'confirmado')
    }

    return filtrados.sort((a, b) => {
      // Atrasados primeiro
      if (a.status_consolidado === 'atrasado' && b.status_consolidado !== 'atrasado') return -1
      if (a.status_consolidado !== 'atrasado' && b.status_consolidado === 'atrasado') return 1
      // Depois por data de retorno ASC
      const dateA = a.data_retorno_mais_proxima || '9999-12-31'
      const dateB = b.data_retorno_mais_proxima || '9999-12-31'
      return dateA.localeCompare(dateB)
    })
  }, [retornos, filtroStatus])

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
          titulo="Retornos"
          descricao="Controle de retornos e acompanhamento de pacientes"
          icone={RotateCcw}
          showNovaClinicaModal={handleShowNovaClinica}
        />

        <DashboardTabs activeTab="retornos" />

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <KpiCard icon={Users} label="Total Ativo" value={metricas.total} color="cyan" />
          <KpiCard icon={AlertTriangle} label="Atrasados" value={metricas.atrasados} color="rose" />
          <KpiCard icon={Calendar} label="Próximos" value={metricas.proximos} color="amber" />
        </div>

        {/* Filtros por Status */}
        <div className="flex gap-2 mb-6">
          <FilterButton label="Todos" active={filtroStatus === 'todos'} onClick={() => setFiltroStatus('todos')} />
          <FilterButton label="Atrasados" active={filtroStatus === 'atrasados'} onClick={() => setFiltroStatus('atrasados')} />
          <FilterButton label="Próximos" active={filtroStatus === 'proximos'} onClick={() => setFiltroStatus('proximos')} />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent"></div>
            <span className="ml-3 text-slate-400">Carregando retornos...</span>
          </div>
        )}

        {/* Lista de Pacientes */}
        {!loading && (
          <div className="bg-gradient-to-br from-slate-800/30 to-slate-900/30 rounded-2xl border border-slate-700/30 overflow-hidden">
            <div className="divide-y divide-slate-700/50">
              {retornosFiltrados.map((retorno) => {
                const diasInfo = getDiasLabel(retorno.dias_para_retorno)
                const isExpanded = expandedPatient === retorno.id_paciente

                return (
                  <div key={retorno.id_paciente} className="hover:bg-slate-700/30 transition-colors">
                    <div
                      className="p-4 flex items-center gap-4 cursor-pointer"
                      onClick={() => handleToggleExpand(retorno.id_paciente)}
                    >
                      {/* Nome do paciente */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{retorno.nome}</div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {/* Telefone WhatsApp */}
                          {retorno.celular && (
                            <a
                              href={`https://api.whatsapp.com/send/?phone=${formatPhoneForWhatsApp(retorno.celular)}&text&type=phone_number&app_absent=0`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                              {retorno.celular}
                            </a>
                          )}
                          {/* Produto */}
                          {retorno.produto_retorno_proximo && (
                            <span className="text-sm text-slate-400">{retorno.produto_retorno_proximo}</span>
                          )}
                          {/* Classe terapêutica */}
                          {retorno.classe_retorno_proximo && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getClasseBadge(retorno.classe_retorno_proximo)}`}>
                              {retorno.classe_retorno_proximo}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Data e dias */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm text-slate-300">{formatDate(retorno.data_retorno_mais_proxima)}</div>
                        <div className={`text-xs ${diasInfo.color}`}>{diasInfo.text}</div>
                      </div>

                      {/* Badge status */}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${getStatusBadge(retorno.status_consolidado)}`}>
                        {retorno.status_consolidado}
                      </span>

                      {/* Badge upsell */}
                      {retorno.qtd_upsell > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 flex-shrink-0">
                          +{retorno.qtd_upsell} upsell
                        </span>
                      )}

                      {/* Seta expandir */}
                      {isExpanded
                        ? <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        : <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      }
                    </div>

                    {/* Expansão */}
                    {isExpanded && (
                      <RetornoExpandido
                        retorno={retorno}
                        onConfirmar={handleConfirmarRetorno}
                        confirmandoId={confirmando}
                      />
                    )}
                  </div>
                )
              })}

              {retornosFiltrados.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhum retorno pendente encontrado
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
