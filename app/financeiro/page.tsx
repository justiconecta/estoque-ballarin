'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { PlusCircle, TrendingUp, DollarSign, Users, Target, Activity, BarChart3, Calculator, Plus, Save, X } from 'lucide-react'
import { HeaderUniversal, Button } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import type { Servico, Despesa, Profissional, Parametros, Venda, ServicoCalculado, TipoDespesa, TIPOS_DESPESA } from '@/types/database'
import NovaVendaModal from '@/components/NovaVendaModal'

// ============ CONSTANTES ============
const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const ANOS_DISPONIVEIS = Array.from({ length: 11 }, (_, i) => 2025 + i)
const FERIADOS_2025 = ['2025-01-01', '2025-03-03', '2025-03-04', '2025-04-18', '2025-04-21', '2025-05-01', '2025-06-19', '2025-09-07', '2025-10-12', '2025-11-02', '2025-11-15', '2025-11-20', '2025-12-25']

const CATEGORIAS_SKU = [
  'Toxina Botulínica',
  'Bioestimulador',
  'Preenchedor',
  'Bioregenerador',
  'Tecnologias',
  'Outros'
]

// ✅ TIPOS DE DESPESA
const TIPOS_DESPESA_OPTIONS: TipoDespesa[] = [
  'Despesa Fixa',
  'Custo Fixo',
  'Despesa Variável',
  'Custo Variável'
]

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
const formatPercent = (value: number) => `${(value || 0).toFixed(2)}%`

// ============ INTERFACES ============
interface SKU {
  id_sku: number
  nome_produto: string
  fabricante: string
  classe_terapeutica: string
  fator_divisao: string
  status_estoque: string
  id_clinica: number
}

// ============ COMPONENTE CARD CUSTOMIZADO ============
const FinanceCard = ({ title, value, variant = 'default' }: { title: string; value: string | number; variant?: 'default' | 'cyan' | 'green' | 'red' }) => {
  const variantClasses = {
    default: 'bg-gray-100 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700',
    cyan: 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30',
    green: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30',
    red: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
  }

  const textClasses = {
    default: 'text-gray-900 dark:text-white',
    cyan: 'text-cyan-700 dark:text-cyan-400',
    green: 'text-green-700 dark:text-green-400',
    red: 'text-red-700 dark:text-red-400'
  }

  return (
    <div className={`rounded-xl p-4 border ${variantClasses[variant]}`}>
      <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">{title}</p>
      <p className={`text-xl font-bold ${textClasses[variant]}`}>{value}</p>
    </div>
  )
}

// ============ FUNÇÕES AUXILIARES ============
function calcularDiasUteis(ano: number, mes: number): number {
  const primeiroDia = new Date(ano, mes - 1, 1)
  const ultimoDia = new Date(ano, mes, 0)
  let diasUteis = 0

  for (let dia = primeiroDia.getDate(); dia <= ultimoDia.getDate(); dia++) {
    const data = new Date(ano, mes - 1, dia)
    const diaSemana = data.getDay()
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    if (diaSemana !== 0 && diaSemana !== 6 && !FERIADOS_2025.includes(dataStr)) diasUteis++
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
    const data = new Date(ano, mes - 1, dia)
    const diaSemana = data.getDay()
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    if (diaSemana !== 0 && diaSemana !== 6 && !FERIADOS_2025.includes(dataStr)) diaUtilAtual++
  }
  return diaUtilAtual
}

// ============ COMPONENTE PRINCIPAL ============
export default function FinanceiroPage() {
  const [abaAtiva, setAbaAtiva] = useState('vendas')
  const [anosSelecionados, setAnosSelecionados] = useState([2025])
  const [mesesSelecionados, setMesesSelecionados] = useState([new Date().getMonth() + 1])
  const [loading, setLoading] = useState(false)
  const [showNovaVendaModal, setShowNovaVendaModal] = useState(false)

  // Estados de dados
  const [servicos, setServicos] = useState<Servico[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [parametros, setParametros] = useState<Parametros | null>(null)
  const [vendas, setVendas] = useState<any[]>([])
  const [skus, setSKUs] = useState<SKU[]>([])

  // Estados de formulários
  const [mostrarFormServico, setMostrarFormServico] = useState(false)
  const [novoServico, setNovoServico] = useState({ nome: '', preco: 0, custo_insumos: 0 })
  const [mostrarFormDespesa, setMostrarFormDespesa] = useState(false)
  // ✅ ATUALIZADO: Incluindo tipo no estado
  const [novaDespesa, setNovaDespesa] = useState<{
    tipo: TipoDespesa
    categoria: string
    item: string
    valor: number
  }>({
    tipo: 'Despesa Fixa',
    categoria: 'Infraestrutura',
    item: '',
    valor: 0
  })
  const [novoProfissional, setNovoProfissional] = useState({ nome: '', horasSemanais: 40 })

  // Estados para SKUs
  const [editandoSKU, setEditandoSKU] = useState<number | null>(null)
  const [editFormSKU, setEditFormSKU] = useState<{ classe_terapeutica?: string; fator_divisao?: string }>({})
  const [feedbackSKU, setFeedbackSKU] = useState<{ tipo: 'success' | 'error'; mensagem: string } | null>(null)

  // Estado para meta temporária
  const [metaTemporaria, setMetaTemporaria] = useState<number | null>(null)

  // Load inicial
  useEffect(() => {
    loadData()
    loadSKUs()
  }, [])

  // Reload vendas quando mudar período
  useEffect(() => {
    if (anosSelecionados.length > 0 && mesesSelecionados.length > 0) {
      loadVendas()
    }
  }, [anosSelecionados, mesesSelecionados])

  const loadData = async () => {
    setLoading(true)
    try {
      const [servicosData, despesasData, profissionaisData, parametrosData] = await Promise.all([
        supabaseApi.getServicos(),
        supabaseApi.getDespesas(),
        supabaseApi.getProfissionais(),
        supabaseApi.getParametros()
      ])

      setServicos(servicosData)
      setDespesas(despesasData)
      setProfissionais(profissionaisData)
      setParametros(parametrosData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVendas = async () => {
    try {
      const ano = anosSelecionados[0] || 2025
      const vendasData = await supabaseApi.getVendas(ano, mesesSelecionados)
      setVendas(vendasData)
    } catch (error) {
      console.error('Erro ao carregar vendas:', error)
    }
  }

  const loadSKUs = async () => {
    try {
      const skusData = await supabaseApi.getSKUs()
      setSKUs(skusData)
    } catch (error) {
      console.error('Erro ao carregar SKUs:', error)
      showFeedbackSKU('error', 'Falha ao carregar produtos')
    }
  }

  const showFeedbackSKU = (tipo: 'success' | 'error', mensagem: string) => {
    setFeedbackSKU({ tipo, mensagem })
    setTimeout(() => setFeedbackSKU(null), 3000)
  }

  const handleEditSKU = (sku: SKU) => {
    setEditandoSKU(sku.id_sku)
    setEditFormSKU({
      classe_terapeutica: sku.classe_terapeutica,
      fator_divisao: sku.fator_divisao
    })
  }

  const handleCancelEditSKU = () => {
    setEditandoSKU(null)
    setEditFormSKU({})
  }

  const handleSaveSKU = async (id_sku: number) => {
    try {
      setLoading(true)

      const fatorDivisao = parseFloat(editFormSKU.fator_divisao || '1')
      if (isNaN(fatorDivisao) || fatorDivisao <= 0) {
        showFeedbackSKU('error', 'Fator de divisão deve ser um número positivo')
        return
      }

      await supabaseApi.updateSKU(id_sku, {
        classe_terapeutica: editFormSKU.classe_terapeutica,
        fator_divisao: editFormSKU.fator_divisao
      })

      showFeedbackSKU('success', 'SKU atualizado com sucesso!')
      setEditandoSKU(null)
      setEditFormSKU({})
      loadSKUs()
    } catch (error) {
      console.error('Erro ao atualizar SKU:', error)
      showFeedbackSKU('error', 'Falha ao atualizar SKU')
    } finally {
      setLoading(false)
    }
  }

  const handleAdicionarServico = async () => {
    if (!novoServico.nome || novoServico.preco <= 0) return
    try {
      await supabaseApi.createServico(novoServico)
      setNovoServico({ nome: '', preco: 0, custo_insumos: 0 })
      setMostrarFormServico(false)
      loadData()
    } catch (error) {
      console.error('Erro ao criar serviço:', error)
    }
  }

  // ✅ ATUALIZADO: Incluindo tipo na criação de despesa
  const handleAdicionarDespesa = async () => {
    if (!novaDespesa.item || novaDespesa.valor <= 0) return
    try {
      await supabaseApi.createDespesa({
        tipo: novaDespesa.tipo,
        categoria: novaDespesa.categoria,
        item: novaDespesa.item,
        valor_mensal: novaDespesa.valor
      })
      setNovaDespesa({ tipo: 'Despesa Fixa', categoria: 'Infraestrutura', item: '', valor: 0 })
      setMostrarFormDespesa(false)
      loadData()
    } catch (error) {
      console.error('Erro ao criar despesa:', error)
    }
  }

  const handleAdicionarProfissional = async () => {
    if (!novoProfissional.nome || novoProfissional.horasSemanais <= 0) return
    try {
      await supabaseApi.createProfissional({ nome: novoProfissional.nome, horas_semanais: novoProfissional.horasSemanais })
      setNovoProfissional({ nome: '', horasSemanais: 40 })
      loadData()
    } catch (error) {
      console.error('Erro ao criar profissional:', error)
    }
  }

  const handleRemoverProfissional = async (id: number) => {
    try {
      await supabaseApi.deleteProfissional(id)
      loadData()
    } catch (error) {
      console.error('Erro ao remover profissional:', error)
    }
  }

  const handleUpdateParametros = async (updates: Partial<Parametros>) => {
    try {
      await supabaseApi.updateParametros(updates)
      loadData()
    } catch (error) {
      console.error('Erro ao atualizar parâmetros:', error)
    }
  }

  const handleUpdateMetaMensal = async (novaMeta: number) => {
    try {
      await supabaseApi.updateParametros({ meta_resultado_liquido_mensal: novaMeta })
      if (parametros) {
        setParametros({ ...parametros, meta_resultado_liquido_mensal: novaMeta })
      }
      setMetaTemporaria(null)
    } catch (error) {
      console.error('Erro ao atualizar meta:', error)
    }
  }

  const handleMesToggle = useCallback((mes: number) => {
    setMesesSelecionados(prev => {
      const jaSelecionado = prev.includes(mes)
      if (jaSelecionado) {
        return prev.length === 1 ? prev : prev.filter(m => m !== mes)
      }
      return [...prev, mes].sort((a, b) => a - b)
    })
  }, [])

  // Cálculos
  const diasUteisTotais = useMemo(() => {
    if (anosSelecionados.length === 0) return 0
    return anosSelecionados.reduce((acc: number, ano: number) =>
      acc + mesesSelecionados.reduce((total, mes) => total + calcularDiasUteis(ano, mes), 0)
      , 0)
  }, [anosSelecionados, mesesSelecionados])

  const diaUtilAtual = useMemo(() => {
    if (anosSelecionados.length === 0) return 0
    return anosSelecionados.reduce((acc: number, ano: number) =>
      acc + mesesSelecionados.reduce((total, mes) => total + calcularDiaUtilAtual(ano, mes), 0)
      , 0)
  }, [anosSelecionados, mesesSelecionados])

  const servicosCalculados: ServicoCalculado[] = useMemo(() =>
    servicos.map(s => ({
      ...s,
      margemContribuicao: s.preco - s.custo_insumos - s.custo_equip,
      margemContribuicaoPct: s.preco > 0 ? ((s.preco - s.custo_insumos - s.custo_equip) / s.preco) * 100 : 0
    })),
    [servicos]
  )

  const totalDespesasFixas = useMemo(() =>
    despesas.reduce((sum, d) => sum + d.valor_mensal, 0),
    [despesas]
  )

  const despesasFixasPeriodo = useMemo(() =>
    totalDespesasFixas * mesesSelecionados.length,
    [totalDespesasFixas, mesesSelecionados]
  )

  const parametrosCalculados = useMemo(() => {
    if (!parametros) return null

    const totalHorasSemanais = profissionais.reduce((sum, p) => sum + p.horas_semanais, 0)
    const horasDaEquipe = (totalHorasSemanais / 5) * diasUteisTotais
    const horasDasSalas = parametros.numero_salas * parametros.horas_trabalho_dia * diasUteisTotais
    const horasProdutivasPotenciais = Math.min(horasDaEquipe, horasDasSalas)

    const totalServicosVendidos = vendas.reduce((sum, v) => sum + (v.servicos?.length || 0), 0)
    const horasOcupadas = totalServicosVendidos * parametros.duracao_media_servico_horas

    const custoHora = horasProdutivasPotenciais > 0 ? despesasFixasPeriodo / horasProdutivasPotenciais : 0
    const taxaOcupacao = horasProdutivasPotenciais > 0 ? (horasOcupadas / horasProdutivasPotenciais) * 100 : 0

    return {
      horasDaEquipe,
      horasDasSalas,
      horasProdutivasPotenciais,
      horasOcupadas,
      custoHora,
      taxaOcupacao
    }
  }, [parametros, profissionais, diasUteisTotais, despesasFixasPeriodo, vendas])

  const controleCalc = useMemo(() => {
    if (!parametros || !parametrosCalculados) return null

    const receitaBruta = vendas.reduce((sum, v) => sum + (v.preco_final || v.preco_total || 0), 0)
    const custoInsumos = vendas.reduce((sum, v) => sum + (v.custo_total || 0), 0)
    const lucroBruto = receitaBruta - custoInsumos
    const impostos = receitaBruta * (parametros.aliquota_impostos_pct / 100)
    const resultadoLiquido = lucroBruto - despesasFixasPeriodo - impostos

    return {
      receitaBruta,
      custoInsumos,
      lucroBruto,
      despesasFixasPeriodo,
      impostos,
      resultadoLiquido
    }
  }, [parametros, parametrosCalculados, vendas, despesasFixasPeriodo])

  const metasCalculadas = useMemo(() => {
    if (!controleCalc || !parametros || servicosCalculados.length === 0) return []

    const metaPorServico = parametros.meta_resultado_liquido_mensal / servicosCalculados.length
    const metaLucroBrutoPorServico = metaPorServico + (despesasFixasPeriodo / servicosCalculados.length)

    return servicosCalculados.map(servico => {
      const metaUnidades = servico.margemContribuicao > 0
        ? Math.ceil(metaLucroBrutoPorServico / servico.margemContribuicao)
        : 0

      const realizado = vendas.reduce((sum, v) => {
        const servicosVenda = v.servicos?.filter((s: any) => s.servicos?.nome === servico.nome) || []
        return sum + servicosVenda.length
      }, 0)

      const cobertura = metaUnidades > 0 ? (realizado / metaUnidades) * 100 : 0
      const gap = metaUnidades - realizado
      const projecao = diaUtilAtual > 0 ? Math.round((realizado / diaUtilAtual) * diasUteisTotais) : 0

      return {
        servico: servico.nome,
        metaUnidades,
        realizado,
        cobertura,
        gap,
        projecao
      }
    })
  }, [controleCalc, parametros, servicosCalculados, vendas, diaUtilAtual, diasUteisTotais, despesasFixasPeriodo])

  const tituloPeriodo = useMemo(() => {
    const anosTexto = anosSelecionados.length > 1 ? anosSelecionados.join(', ') : anosSelecionados[0]
    if (mesesSelecionados.length === 1) return `${MESES[mesesSelecionados[0] - 1]} / ${anosTexto}`
    return `${mesesSelecionados.map((m: number) => MESES[m - 1]).join(', ')} / ${anosTexto}`
  }, [mesesSelecionados, anosSelecionados])

  const abas = [
    { id: 'vendas', label: 'Vendas' },
    { id: 'skus', label: 'Gestão de SKUs' },
    { id: 'parametros', label: 'Parâmetros' },
    { id: 'despesas', label: 'Despesas' },
    { id: 'metas', label: 'Metas' },
    { id: 'controle', label: 'Controle' },
    { id: 'dre', label: 'DRE' }
  ]

  if (loading && !servicos.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Carregando dashboard financeiro...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-6">
        <HeaderUniversal
          titulo="Dashboard Financeiro"
          descricao="Gestão completa de receitas, despesas e indicadores"
          icone={DollarSign}
        />

        <nav className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          {abas.map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all text-sm ${abaAtiva === aba.id
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : 'bg-white dark:bg-slate-800/50 text-cyan-600 dark:text-cyan-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 border border-gray-200 dark:border-slate-700'
                }`}
            >
              {aba.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {['vendas', 'metas', 'controle', 'dre'].includes(abaAtiva) && (
            <FiltroPeriodo
              anos={anosSelecionados}
              setAnos={setAnosSelecionados}
              mesesSelecionados={mesesSelecionados}
              onMesToggle={handleMesToggle}
            />
          )}

          {abaAtiva === 'vendas' && (
            <AbaVendas
              vendas={vendas}
              tituloPeriodo={tituloPeriodo}
              onNovaVenda={() => setShowNovaVendaModal(true)}
            />
          )}

          {abaAtiva === 'skus' && (
            <AbaGestaoSKUs
              skus={skus}
              editandoId={editandoSKU}
              editForm={editFormSKU}
              setEditForm={setEditFormSKU}
              onEdit={handleEditSKU}
              onSave={handleSaveSKU}
              onCancel={handleCancelEditSKU}
              feedback={feedbackSKU}
              loading={loading}
            />
          )}

          {abaAtiva === 'parametros' && parametros && parametrosCalculados && (
            <AbaParametros
              parametros={parametros}
              calculados={parametrosCalculados}
              onUpdate={handleUpdateParametros}
              profissionais={profissionais}
              novoProfissional={novoProfissional}
              setNovoProfissional={setNovoProfissional}
              onAdicionarProfissional={handleAdicionarProfissional}
              onRemoverProfissional={handleRemoverProfissional}
            />
          )}

          {abaAtiva === 'despesas' && (
            <AbaDespesas
              despesas={despesas}
              total={totalDespesasFixas}
              mostrarForm={mostrarFormDespesa}
              setMostrarForm={setMostrarFormDespesa}
              novaDespesa={novaDespesa}
              setNovaDespesa={setNovaDespesa}
              onAdicionar={handleAdicionarDespesa}
            />
          )}

          {abaAtiva === 'metas' && metasCalculadas && (
            <AbaMetas metas={metasCalculadas} tituloPeriodo={tituloPeriodo} />
          )}

          {abaAtiva === 'controle' && controleCalc && parametros && (
            <AbaControle
              controle={controleCalc}
              diasUteis={diasUteisTotais}
              diaAtual={diaUtilAtual}
              metaResultadoMensal={metaTemporaria ?? parametros.meta_resultado_liquido_mensal}
              mesesSelecionados={mesesSelecionados}
              onUpdateMeta={handleUpdateMetaMensal}
              metaTemporaria={metaTemporaria}
              setMetaTemporaria={setMetaTemporaria}
            />
          )}

          {abaAtiva === 'dre' && controleCalc && (
            <AbaDRE controle={controleCalc} tituloPeriodo={tituloPeriodo} />
          )}
        </div>

        <NovaVendaModal
          isOpen={showNovaVendaModal}
          onClose={() => setShowNovaVendaModal(false)}
          onSuccess={() => {
            setShowNovaVendaModal(false)
            loadVendas()
          }}
        />
      </div>
    </div>
  )
}

// ============ COMPONENTES AUXILIARES ============

const FiltroPeriodo = ({ anos, setAnos, mesesSelecionados, onMesToggle }: any) => (
  <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
    <div className="flex flex-wrap items-center gap-6">
      <div>
        <label className="text-sm text-gray-600 dark:text-slate-400 mb-2 block">Ano</label>
        <select
          value={anos[0]}
          onChange={(e) => setAnos([parseInt(e.target.value)])}
          className="bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
        >
          {ANOS_DISPONIVEIS.map(ano => (
            <option key={ano} value={ano}>{ano}</option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label className="text-sm text-gray-600 dark:text-slate-400 mb-2 block">Meses (clique para selecionar múltiplos)</label>
        <div className="flex flex-wrap gap-2">
          {MESES.map((nome, index) => {
            const mes = index + 1
            const selecionado = mesesSelecionados.includes(mes)
            return (
              <button
                key={mes}
                onClick={() => onMesToggle(mes)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${selecionado
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
              >
                {nome}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  </div>
)

const InputLocal = ({ label, type = 'text', value, onChange, placeholder = '' }: any) => (
  <div>
    <label className="text-sm text-gray-700 dark:text-slate-400 mb-2 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
    />
  </div>
)

// ✅ ABA DESPESAS ATUALIZADA COM CAMPO TIPO
const AbaDespesas = ({ despesas, total, mostrarForm, setMostrarForm, novaDespesa, setNovaDespesa, onAdicionar }: any) => (
  <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400">Despesas Fixas Mensais</h2>
      <Button onClick={() => setMostrarForm(!mostrarForm)}>
        {mostrarForm ? '✕ Cancelar' : '+ Nova Despesa'}
      </Button>
    </div>

    {mostrarForm && (
      <div className="bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {/* ✅ NOVO: Campo Tipo */}
          <div>
            <label className="text-sm text-gray-700 dark:text-slate-400 mb-2 block">Tipo</label>
            <select
              value={novaDespesa.tipo}
              onChange={(e) => setNovaDespesa({ ...novaDespesa, tipo: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
            >
              {TIPOS_DESPESA_OPTIONS.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700 dark:text-slate-400 mb-2 block">Categoria</label>
            <select
              value={novaDespesa.categoria}
              onChange={(e) => setNovaDespesa({ ...novaDespesa, categoria: e.target.value })}
              className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
            >
              <option>Infraestrutura</option>
              <option>Pessoal</option>
              <option>Administrativo</option>
              <option>Marketing</option>
              <option>Operacional</option>
              <option>Financeiro</option>
            </select>
          </div>
          <InputLocal label="Item" value={novaDespesa.item} onChange={(v: string) => setNovaDespesa({ ...novaDespesa, item: v })} />
          <InputLocal label="Valor" type="number" value={novaDespesa.valor} onChange={(v: number) => setNovaDespesa({ ...novaDespesa, valor: v })} />
        </div>
        <Button onClick={onAdicionar}>Salvar Despesa</Button>
      </div>
    )}

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700">
            {/* ✅ NOVO: Coluna Tipo */}
            <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Tipo</th>
            <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Categoria</th>
            <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Item</th>
            <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Valor</th>
          </tr>
        </thead>
        <tbody>
          {despesas.map((d: Despesa) => (
            <tr key={d.id} className="border-b border-gray-100 dark:border-slate-700/50">
              {/* ✅ NOVO: Exibindo Tipo */}
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs font-medium ${d.tipo === 'Despesa Fixa' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                    d.tipo === 'Custo Fixo' ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' :
                      d.tipo === 'Despesa Variável' ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400' :
                        'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                  }`}>
                  {d.tipo || 'Despesa Fixa'}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-900 dark:text-white">{d.categoria}</td>
              <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{d.item}</td>
              <td className="px-4 py-3 text-right text-cyan-600 dark:text-cyan-400">{formatCurrency(d.valor_mensal)}</td>
            </tr>
          ))}
          <tr className="bg-cyan-50 dark:bg-cyan-500/10 font-bold">
            <td colSpan={3} className="px-4 py-3 text-cyan-700 dark:text-cyan-400">TOTAL</td>
            <td className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">{formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)

// ✅ ABA VENDAS ATUALIZADA COM MARGENS E PARCELAS
const AbaVendas = ({ vendas, tituloPeriodo, onNovaVenda }: { vendas: any[], tituloPeriodo: string, onNovaVenda: () => void }) => (
  <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400">Vendas - {tituloPeriodo}</h2>
      <Button onClick={onNovaVenda}>
        <Plus className="w-4 h-4 mr-2" /> Nova Venda
      </Button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700">
            <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Data</th>
            <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Paciente</th>
            <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Valor Total</th>
            <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Desconto</th>
            <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Valor Final</th>
            {/* ✅ NOVO: Margem % Sem Desconto */}
            <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Margem % (s/desc)</th>
            {/* ✅ NOVO: Margem % Com Desconto */}
            <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Margem % (c/desc)</th>
            <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Pagamento</th>
            {/* ✅ NOVO: Parcelas */}
            <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Parcelas</th>
          </tr>
        </thead>
        <tbody>
          {vendas.length === 0 ? (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-gray-500 dark:text-slate-500">
                Nenhuma venda encontrada no período selecionado
              </td>
            </tr>
          ) : (
            vendas.map((v: any) => (
              <tr key={v.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 text-gray-900 dark:text-white">
                  {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                  {v.pacientes?.nome_completo || 'N/A'}
                </td>
                <td className="px-4 py-3 text-right text-gray-900 dark:text-white">
                  {formatCurrency(v.preco_total)}
                </td>
                <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400">
                  {v.desconto_valor > 0 ? formatCurrency(v.desconto_valor) : '-'}
                </td>
                <td className="px-4 py-3 text-right font-bold text-cyan-600 dark:text-cyan-400">
                  {formatCurrency(v.preco_final)}
                </td>
                {/* ✅ NOVO: Margem % Sem Desconto */}
                <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                  {formatPercent(v.margem_percentual || 0)}
                </td>
                {/* ✅ NOVO: Margem % Com Desconto */}
                <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                  {formatPercent(v.margem_percentual_final || 0)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${v.metodo_pagamento === 'PIX' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' :
                      v.metodo_pagamento === 'Débito' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                        'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'
                    }`}>
                    {v.metodo_pagamento}
                  </span>
                </td>
                {/* ✅ NOVO: Número de Parcelas */}
                <td className="px-4 py-3 text-center text-gray-900 dark:text-white">
                  {v.metodo_pagamento === 'Crédito' && v.parcelas ? `${v.parcelas}x` : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {/* Resumo */}
    {vendas.length > 0 && (
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <FinanceCard
          title="Total de Vendas"
          value={vendas.length}
          variant="cyan"
        />
        <FinanceCard
          title="Receita Bruta"
          value={formatCurrency(vendas.reduce((s, v) => s + (v.preco_total || 0), 0))}
          variant="green"
        />
        <FinanceCard
          title="Total Descontos"
          value={formatCurrency(vendas.reduce((s, v) => s + (v.desconto_valor || 0), 0))}
          variant="red"
        />
        <FinanceCard
          title="Receita Líquida"
          value={formatCurrency(vendas.reduce((s, v) => s + (v.preco_final || 0), 0))}
          variant="cyan"
        />
      </div>
    )}
  </div>
)

const AbaGestaoSKUs = ({ skus, editandoId, editForm, setEditForm, onEdit, onSave, onCancel, feedback, loading }: any) => (
  <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Gestão de SKUs</h2>

    {feedback && (
      <div className={`mb-6 p-4 rounded-lg border ${feedback.tipo === 'success'
        ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400'
        : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
        }`}>
        {feedback.mensagem}
      </div>
    )}

    {skus.length === 0 ? (
      <p className="text-gray-500 dark:text-slate-500 text-center py-8">Nenhum SKU cadastrado</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Produto</th>
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Fabricante</th>
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Categoria</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Fator Divisão</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Status</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {skus.map((sku: SKU) => (
              <tr key={sku.id_sku} className="border-b border-gray-100 dark:border-slate-700/50">
                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{sku.nome_produto}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-slate-400">{sku.fabricante}</td>
                <td className="px-4 py-3">
                  {editandoId === sku.id_sku ? (
                    <select
                      value={editForm.classe_terapeutica || ''}
                      onChange={(e) => setEditForm({ ...editForm, classe_terapeutica: e.target.value })}
                      className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
                    >
                      {CATEGORIAS_SKU.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-2 py-1 bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 rounded text-xs">
                      {sku.classe_terapeutica}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {editandoId === sku.id_sku ? (
                    <input
                      type="text"
                      value={editForm.fator_divisao || ''}
                      onChange={(e) => setEditForm({ ...editForm, fator_divisao: e.target.value })}
                      className="w-20 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-sm text-center text-gray-900 dark:text-white"
                    />
                  ) : (
                    <span className="text-gray-900 dark:text-white">{sku.fator_divisao || '1'}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs ${sku.status_estoque === 'Ativo'
                    ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                    : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                    }`}>
                    {sku.status_estoque}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center gap-2">
                    {editandoId === sku.id_sku ? (
                      <>
                        <button
                          onClick={() => onSave(sku.id_sku)}
                          disabled={loading}
                          className="p-2 bg-green-50 dark:bg-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/30 border border-green-200 dark:border-green-500/30 rounded-lg text-green-700 dark:text-green-400 transition-colors disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={onCancel}
                          disabled={loading}
                          className="p-2 bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 transition-colors disabled:opacity-50"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onEdit(sku)}
                        className="px-3 py-1 bg-cyan-50 dark:bg-cyan-500/20 hover:bg-cyan-100 dark:hover:bg-cyan-500/30 border border-cyan-200 dark:border-cyan-500/30 rounded-lg text-cyan-700 dark:text-cyan-400 text-sm transition-colors"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <FinanceCard title="Total de SKUs" value={skus.length} variant="cyan" />
      <FinanceCard title="Categorias Ativas" value={new Set(skus.map((s: SKU) => s.classe_terapeutica)).size} variant="green" />
      <FinanceCard title="SKUs Ativos" value={skus.filter((s: SKU) => s.status_estoque === 'Ativo').length} />
    </div>
  </div>
)

const AbaParametros = ({ parametros, calculados, onUpdate, profissionais, novoProfissional, setNovoProfissional, onAdicionarProfissional, onRemoverProfissional }: any) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Parâmetros Operacionais</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <InputLocal label="Número de Salas" type="number" value={parametros.numero_salas} onChange={(v: number) => onUpdate({ numero_salas: v })} />
        <InputLocal label="Horas/Dia" type="number" value={parametros.horas_trabalho_dia} onChange={(v: number) => onUpdate({ horas_trabalho_dia: v })} />
        <InputLocal label="Duração Média Serviço (h)" type="number" value={parametros.duracao_media_servico_horas} onChange={(v: number) => onUpdate({ duracao_media_servico_horas: v })} />
        <InputLocal label="Alíquota Impostos (%)" type="number" value={parametros.aliquota_impostos_pct} onChange={(v: number) => onUpdate({ aliquota_impostos_pct: v })} />
        <InputLocal label="Taxa Cartão (%)" type="number" value={parametros.taxa_cartao_pct} onChange={(v: number) => onUpdate({ taxa_cartao_pct: v })} />
      </div>
    </div>

    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Equipe</h2>
      <div className="flex gap-4 mb-4">
        <InputLocal label="Nome" value={novoProfissional.nome} onChange={(v: string) => setNovoProfissional({ ...novoProfissional, nome: v })} />
        <InputLocal label="Horas/Semana" type="number" value={novoProfissional.horasSemanais} onChange={(v: number) => setNovoProfissional({ ...novoProfissional, horasSemanais: v })} />
        <div className="flex items-end">
          <Button onClick={onAdicionarProfissional}>Adicionar</Button>
        </div>
      </div>
      <div className="space-y-2">
        {profissionais.map((p: Profissional) => (
          <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <span className="text-gray-900 dark:text-white">{p.nome}</span>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-slate-400">{p.horas_semanais}h/semana</span>
              <button onClick={() => onRemoverProfissional(p.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 text-xs">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>

    {calculados && (
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Indicadores de Produtividade</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FinanceCard title="Horas Equipe" value={`${calculados.horasDaEquipe.toFixed(0)}h`} />
          <FinanceCard title="Horas Salas" value={`${calculados.horasDasSalas}h`} />
          <FinanceCard title="Custo Hora" value={formatCurrency(calculados.custoHora)} />
          <FinanceCard title="Taxa Ocupação" value={formatPercent(calculados.taxaOcupacao)} />
        </div>
      </div>
    )}
  </div>
)

const AbaMetas = ({ metas, tituloPeriodo }: any) => (
  <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Metas por Serviço - {tituloPeriodo}</h2>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700">
            <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Serviço</th>
            <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Meta</th>
            <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Realizado</th>
            <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Cobertura</th>
            <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Gap</th>
            <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Projeção</th>
          </tr>
        </thead>
        <tbody>
          {metas.map((m: any, i: number) => (
            <tr key={i} className="border-b border-gray-100 dark:border-slate-700/50">
              <td className="px-4 py-3 text-gray-900 dark:text-white">{m.servico}</td>
              <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-400">{m.metaUnidades}</td>
              <td className="px-4 py-3 text-center text-gray-900 dark:text-white font-bold">{m.realizado}</td>
              <td className="px-4 py-3 text-center">
                <span className={`px-2 py-1 rounded text-xs ${m.cobertura >= 100 ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400'}`}>
                  {formatPercent(m.cobertura)}
                </span>
              </td>
              <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-400">{m.gap}</td>
              <td className="px-4 py-3 text-center text-cyan-600 dark:text-cyan-400">{m.projecao}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const AbaControle = ({ controle, diasUteis, diaAtual, metaResultadoMensal, mesesSelecionados, onUpdateMeta, metaTemporaria, setMetaTemporaria }: any) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <FinanceCard title="Dias Úteis" value={diasUteis} />
      <FinanceCard title="Dia Útil Atual" value={diaAtual} />
      <FinanceCard title="Progresso" value={formatPercent(diasUteis > 0 ? (diaAtual / diasUteis) * 100 : 0)} variant="cyan" />
    </div>

    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Meta de Resultado Mensal</h2>
      <div className="flex gap-4 items-end">
        <InputLocal
          label="Meta (R$)"
          type="number"
          value={metaTemporaria ?? metaResultadoMensal}
          onChange={(v: number) => setMetaTemporaria(v)}
        />
        <Button onClick={() => onUpdateMeta(metaTemporaria ?? metaResultadoMensal)}>
          Salvar Meta
        </Button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <FinanceCard title="Receita Bruta" value={formatCurrency(controle.receitaBruta)} variant="green" />
      <FinanceCard title="Custo Insumos" value={formatCurrency(controle.custoInsumos)} variant="red" />
      <FinanceCard title="Lucro Bruto" value={formatCurrency(controle.lucroBruto)} variant="cyan" />
      <FinanceCard title="Despesas Fixas" value={formatCurrency(controle.despesasFixasPeriodo)} variant="red" />
      <FinanceCard title="Impostos" value={formatCurrency(controle.impostos)} variant="red" />
      <FinanceCard title="Resultado Líquido" value={formatCurrency(controle.resultadoLiquido)} variant={controle.resultadoLiquido >= 0 ? 'green' : 'red'} />
    </div>
  </div>
)

const AbaDRE = ({ controle, tituloPeriodo }: any) => (
  <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">DRE - {tituloPeriodo}</h2>
    <div className="space-y-3">
      <div className="flex justify-between py-3 border-b border-gray-200 dark:border-slate-700">
        <span className="text-gray-900 dark:text-white font-medium">Receita Bruta</span>
        <span className="text-green-600 dark:text-green-400 font-bold">{formatCurrency(controle.receitaBruta)}</span>
      </div>
      <div className="flex justify-between py-3 border-b border-gray-200 dark:border-slate-700 pl-4">
        <span className="text-gray-600 dark:text-slate-400">(-) Custo dos Insumos</span>
        <span className="text-red-600 dark:text-red-400">{formatCurrency(controle.custoInsumos)}</span>
      </div>
      <div className="flex justify-between py-3 border-b border-gray-200 dark:border-slate-700 bg-cyan-50 dark:bg-cyan-500/10 px-4 rounded">
        <span className="text-cyan-700 dark:text-cyan-400 font-medium">= Lucro Bruto</span>
        <span className="text-cyan-700 dark:text-cyan-400 font-bold">{formatCurrency(controle.lucroBruto)}</span>
      </div>
      <div className="flex justify-between py-3 border-b border-gray-200 dark:border-slate-700 pl-4">
        <span className="text-gray-600 dark:text-slate-400">(-) Despesas Fixas</span>
        <span className="text-red-600 dark:text-red-400">{formatCurrency(controle.despesasFixasPeriodo)}</span>
      </div>
      <div className="flex justify-between py-3 border-b border-gray-200 dark:border-slate-700 pl-4">
        <span className="text-gray-600 dark:text-slate-400">(-) Impostos</span>
        <span className="text-red-600 dark:text-red-400">{formatCurrency(controle.impostos)}</span>
      </div>
      <div className={`flex justify-between py-4 px-4 rounded-lg ${controle.resultadoLiquido >= 0 ? 'bg-green-100 dark:bg-green-500/20' : 'bg-red-100 dark:bg-red-500/20'}`}>
        <span className={`font-bold ${controle.resultadoLiquido >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
          = Resultado Líquido
        </span>
        <span className={`font-bold text-xl ${controle.resultadoLiquido >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
          {formatCurrency(controle.resultadoLiquido)}
        </span>
      </div>
    </div>
  </div>
)