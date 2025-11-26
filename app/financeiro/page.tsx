'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { DollarSign, Save, X, Plus, Trash2, Search, Calendar, User, CreditCard } from 'lucide-react'
import { HeaderUniversal, Button } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import type { Servico, Despesa, Profissional, Parametros, Venda, ServicoCalculado } from '@/types/database'

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
const FinanceCard = ({ title, value, variant = 'default' }: { title: string; value: string | number; variant?: 'cyan' | 'green' | 'red' | 'default' }) => {
  const colors = {
    cyan: 'bg-cyan-50 dark:bg-clinic-cyan/10 border-cyan-200 dark:border-clinic-cyan/30',
    green: 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30',
    red: 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
    default: 'bg-gray-100 dark:bg-clinic-gray-700/50 border-gray-200 dark:border-clinic-gray-600'
  }
  return (
    <div className={`${colors[variant]} border rounded-lg p-4`}>
      <p className="text-xs text-gray-600 dark:text-clinic-gray-400 mb-1">{title}</p>
      <p className="text-xl font-bold text-gray-900 dark:text-clinic-white">{value}</p>
    </div>
  )
}

const calcularDiasUteis = (ano: number, mes: number) => {
  const ultimoDia = new Date(ano, mes, 0).getDate()
  let diasUteis = 0
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const data = new Date(ano, mes - 1, dia)
    const diaSemana = data.getDay()
    const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    if (diaSemana !== 0 && diaSemana !== 6 && !FERIADOS_2025.includes(dataStr)) diasUteis++
  }
  return diasUteis
}

const calcularDiaUtilAtual = (ano: number, mes: number) => {
  const hoje = new Date()
  if (hoje.getFullYear() !== ano || hoje.getMonth() + 1 !== mes) return 0
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
  const [abaAtiva, setAbaAtiva] = useState('servicos')
  const [anoSelecionado, setAnoSelecionado] = useState(2025)
  const [mesesSelecionados, setMesesSelecionados] = useState([new Date().getMonth() + 1])
  const [loading, setLoading] = useState(false)

  // Estados de dados
  const [servicos, setServicos] = useState<Servico[]>([])
  const [despesas, setDespesas] = useState<Despesa[]>([])
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [parametros, setParametros] = useState<Parametros | null>(null)
  const [vendas, setVendas] = useState<any[]>([])
  const [skus, setSKUs] = useState<SKU[]>([]) // ✅ NOVO

  // Estados de formulários
  const [mostrarFormServico, setMostrarFormServico] = useState(false)
  const [novoServico, setNovoServico] = useState({ nome: '', preco: 0, custo_insumos: 0 })
  const [mostrarFormDespesa, setMostrarFormDespesa] = useState(false)
  const [novaDespesa, setNovaDespesa] = useState({ categoria: 'Infraestrutura', item: '', valor: 0 })
  const [novoProfissional, setNovoProfissional] = useState({ nome: '', horasSemanais: 40 })

  // ✅ NOVO: Estados para edição de SKU
  const [editandoSKU, setEditandoSKU] = useState<number | null>(null)
  const [editFormSKU, setEditFormSKU] = useState<Partial<SKU>>({})
  const [feedbackSKU, setFeedbackSKU] = useState<{ tipo: 'success' | 'error', mensagem: string } | null>(null)
  const [loadingSKUs, setLoadingSKUs] = useState(false) // ✅ NOVO: Estado de loading local para SKUs

  // ✅ ESTADO PARA INSUMOS DO NOVO SERVIÇO
  const [lotesDisponiveis, setLotesDisponiveis] = useState<any[]>([])
  const [novosInsumos, setNovosInsumos] = useState<{ id_lote: number, quantidade: number }[]>([])
  const [pacientes, setPacientes] = useState<any[]>([]) // ✅ ESTADO DE PACIENTES

  // Estado temporário para meta
  const [metaTemporaria, setMetaTemporaria] = useState<number | null>(null)

 // Declarar funções ANTES dos useEffect
const loadData = useCallback(async () => {
  try {
    setLoading(true)
    const [servicosData, despesasData, profissionaisData, parametrosData, skusData, lotesData, pacientesData] = await Promise.all([
      supabaseApi.getServicos(),
      supabaseApi.getDespesas(),
      supabaseApi.getProfissionais(),
      supabaseApi.getParametros(),
      supabaseApi.getSKUs(),
      supabaseApi.getLotesDisponiveis(),
      supabaseApi.getPacientes(1000)
    ])

    setServicos(servicosData)
    setDespesas(despesasData)
    setProfissionais(profissionaisData)
    setParametros(parametrosData)
    setSKUs(skusData)
    setLotesDisponiveis(lotesData)
    setPacientes(pacientesData)
  } catch (error) {
    console.error('Erro ao carregar dados:', error)
  } finally {
    setLoading(false)
  }
}, [])

const loadVendas = useCallback(async () => {
  try {
    const vendasData = await supabaseApi.getVendas(anoSelecionado, mesesSelecionados)
    setVendas(vendasData)
  } catch (error) {
    console.error('Erro ao carregar vendas:', error)
  }
}, [anoSelecionado, mesesSelecionados])

// Carregar dados
useEffect(() => {
  loadData()
}, [loadData])

useEffect(() => {
  if (['vendas', 'metas', 'controle', 'dre'].includes(abaAtiva)) {
    loadVendas()
  }
}, [abaAtiva, loadVendas])

  // ✅ NOVA FUNÇÃO: Carregar SKUs
  const loadSKUs = async () => {
    try {
      setLoadingSKUs(true)
      const skusData = await supabaseApi.getSKUs()
      setSKUs(skusData)
    } catch (error) {
      console.error('Erro ao carregar SKUs:', error)
      showFeedbackSKU('error', 'Falha ao carregar produtos')
    } finally {
      setLoadingSKUs(false)
    }
  }

  // ✅ NOVA FUNÇÃO: Feedback SKU
  const showFeedbackSKU = (tipo: 'success' | 'error', mensagem: string) => {
    setFeedbackSKU({ tipo, mensagem })
    setTimeout(() => setFeedbackSKU(null), 3000)
  }

  // ✅ NOVA FUNÇÃO: Editar SKU
  const handleEditSKU = (sku: SKU) => {
    setEditandoSKU(sku.id_sku)
    setEditFormSKU({
      classe_terapeutica: sku.classe_terapeutica,
      fator_divisao: sku.fator_divisao
    })
  }

  // ✅ NOVA FUNÇÃO: Cancelar edição SKU
  const handleCancelEditSKU = () => {
    setEditandoSKU(null)
    setEditFormSKU({})
  }

  // ✅ NOVA FUNÇÃO: Salvar SKU
  const handleSaveSKU = async (id_sku: number) => {
    try {
      setLoadingSKUs(true)

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
      loadSKUs() // Recarregar apenas SKUs
    } catch (error) {
      console.error('Erro ao atualizar SKU:', error)
      showFeedbackSKU('error', 'Falha ao atualizar SKU')
    } finally {
      setLoadingSKUs(false)
    }
  }

  // Handlers existentes
  const handleAdicionarServico = async () => {
    if (!novoServico.nome || !novoServico.preco) return

    try {
      // 1. Criar o serviço
      const servicoCriado = await supabaseApi.createServico(novoServico)

      // 2. Processar insumos se houver
      if (novosInsumos.length > 0) {
        for (const insumo of novosInsumos) {
          // Salvar relacionamento
          await supabaseApi.createServicoInsumo({
            id_servico: servicoCriado.id,
            id_lote: insumo.id_lote,
            quantidade_usada: insumo.quantidade
          })

          // Reduzir estoque
          await supabaseApi.reduzirQuantidadeLote(insumo.id_lote, insumo.quantidade)
        }
      }

      setServicos([...servicos, servicoCriado])
      setNovoServico({ nome: '', preco: 0, custo_insumos: 0 })
      setNovosInsumos([]) // Limpar insumos
      setMostrarFormServico(false)
      loadData() // Recarregar para atualizar estoques
    } catch (error) {
      console.error('Erro ao criar serviço:', error)
    }
  }

  const handleAdicionarDespesa = async () => {
    if (!novaDespesa.item || novaDespesa.valor <= 0) return
    try {
      await supabaseApi.createDespesa({ categoria: novaDespesa.categoria, item: novaDespesa.item, valor_mensal: novaDespesa.valor })
      setNovaDespesa({ categoria: 'Infraestrutura', item: '', valor: 0 })
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

  // ✅ NOVA FUNÇÃO: Salvar Venda
  const handleSalvarVenda = async (venda: any) => {
    try {
      await supabaseApi.createVenda({
        id_paciente: venda.id_paciente,
        data_venda: venda.data,
        metodo_pagamento: venda.metodo_pagamento,
        parcelas: venda.parcelas,
        servicos: venda.servicos.map((s: any) => s.id)
      })

      loadVendas() // Recarregar vendas
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
    }
  }

  // Cálculos
  const diasUteisTotais = useMemo(() =>
    mesesSelecionados.reduce((total, mes) => total + calcularDiasUteis(anoSelecionado, mes), 0),
    [anoSelecionado, mesesSelecionados]
  )

  const diaUtilAtual = useMemo(() =>
    mesesSelecionados.reduce((total, mes) => total + calcularDiaUtilAtual(anoSelecionado, mes), 0),
    [anoSelecionado, mesesSelecionados]
  )

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
    const custoOciosidade = (horasProdutivasPotenciais - horasOcupadas) * custoHora

    return { horasDaEquipe, horasDasSalas, horasProdutivasPotenciais, custoHora, horasOcupadas, taxaOcupacao, custoOciosidade }
  }, [parametros, profissionais, diasUteisTotais, despesasFixasPeriodo, vendas])

  const dre = useMemo(() => {
    if (!parametros) return null

    const faturamentoBruto = vendas.reduce((sum, v) => sum + v.preco_total, 0)
    const impostos = faturamentoBruto * (parametros.aliquota_impostos_pct / 100)
    const taxasFinanceiras = vendas.reduce((sum, v) => sum + v.custo_taxa_cartao, 0)
    const faturamentoLiquido = faturamentoBruto - impostos - taxasFinanceiras
    const custosVariaveis = vendas.reduce((sum, v) => sum + (v.custo_total - v.custo_taxa_cartao), 0)
    const lucroBruto = faturamentoLiquido - custosVariaveis
    const resultadoOperacional = lucroBruto - despesasFixasPeriodo

    return { faturamentoBruto, impostos, taxasFinanceiras, faturamentoLiquido, custosVariaveis, lucroBruto, despesasFixas: despesasFixasPeriodo, resultadoOperacional }
  }, [vendas, parametros, despesasFixasPeriodo])

  const controleCalc = useMemo(() => {
    if (!dre || !parametros) return null

    const { faturamentoBruto, lucroBruto } = dre
    const diasRestantes = diasUteisTotais - diaUtilAtual
    const performanceDiaria = diaUtilAtual > 0 ? lucroBruto / diaUtilAtual : 0

    const faturamentoProjetado = diaUtilAtual > 0 ? (faturamentoBruto / diaUtilAtual) * diasUteisTotais : 0
    const lucroBrutoProjetado = diaUtilAtual > 0 ? (lucroBruto / diaUtilAtual) * diasUteisTotais : 0
    const resultadoProjetado = lucroBrutoProjetado - despesasFixasPeriodo

    const metaResultadoLiquido = parametros.meta_resultado_liquido_mensal * mesesSelecionados.length
    const metaLucroBruto = metaResultadoLiquido + despesasFixasPeriodo
    const lucroBrutoFaltante = Math.max(0, metaLucroBruto - lucroBruto)

    return {
      faturamentoAcumulado: faturamentoBruto,
      lucroBrutoAcumulado: lucroBruto,
      diasRestantes,
      performanceDiaria,
      faturamentoProjetado,
      lucroBrutoProjetado,
      resultadoProjetado,
      metaResultadoLiquido,
      metaLucroBruto,
      lucroBrutoFaltante
    }
  }, [dre, parametros, diasUteisTotais, diaUtilAtual, despesasFixasPeriodo, mesesSelecionados])

  const metasCalculadas = useMemo(() => {
    if (!controleCalc || !parametros) return []

    const { metaLucroBruto } = controleCalc
    const servicosAtivos = servicosCalculados.filter(s => s.margemContribuicao > 0)
    if (servicosAtivos.length === 0) return []

    const metaLucroBrutoPorServico = metaLucroBruto / servicosAtivos.length

    return servicosAtivos.map(servico => {
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
  }, [controleCalc, parametros, servicosCalculados, vendas, diaUtilAtual, diasUteisTotais])

  const tituloPeriodo = useMemo(() => {
    if (mesesSelecionados.length === 1) return `${MESES[mesesSelecionados[0] - 1]} ${anoSelecionado}`
    return `${mesesSelecionados.map(m => MESES[m - 1]).join(', ')} / ${anoSelecionado}`
  }, [mesesSelecionados, anoSelecionado])

  // ✅ ARRAY DE ABAS ATUALIZADO COM GESTÃO DE SKUs
  const abas = [
    { id: 'servicos', label: 'Serviços' },
    { id: 'skus', label: 'Gestão de SKUs' }, // ✅ NOVA ABA
    { id: 'parametros', label: 'Parâmetros' },
    { id: 'despesas', label: 'Despesas' },
    { id: 'vendas', label: 'Vendas' },
    { id: 'metas', label: 'Metas' },
    { id: 'controle', label: 'Controle' },
    { id: 'dre', label: 'DRE' }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-slate-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-clinic-gray-400">Carregando dashboard financeiro...</p>
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
                ? 'bg-gradient-to-r from-clinic-cyan to-blue-500 text-white shadow-lg'
                : 'bg-white dark:bg-slate-800/50 text-clinic-cyan hover:bg-gray-100 dark:hover:bg-slate-700/50 border border-gray-200 dark:border-clinic-cyan/20'
                }`}
            >
              {aba.label}
            </button>
          ))}
        </nav>

        <div className="space-y-6">
          {['vendas', 'metas', 'controle', 'dre'].includes(abaAtiva) && (
            <FiltroPeriodo
              ano={anoSelecionado}
              setAno={setAnoSelecionado}
              mesesSelecionados={mesesSelecionados}
              onMesToggle={handleMesToggle}
            />
          )}

          {abaAtiva === 'servicos' && (
            <AbaServicos
              servicos={servicosCalculados}
              mostrarForm={mostrarFormServico}
              setMostrarForm={setMostrarFormServico}
              novoServico={novoServico}
              setNovoServico={setNovoServico}
              onAdicionar={handleAdicionarServico}
              lotesDisponiveis={lotesDisponiveis}
              novosInsumos={novosInsumos}
              setNovosInsumos={setNovosInsumos}
            />
          )}

          {/* ✅ NOVA ABA GESTÃO DE SKUs */}
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

          {abaAtiva === 'vendas' && (
            <AbaVendas
              vendas={vendas}
              tituloPeriodo={tituloPeriodo}
              onNovaVenda={handleSalvarVenda}
              pacientes={pacientes}
              servicos={servicos}
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
              setMetaResultadoMensal={setMetaTemporaria}
              onBlurMeta={handleUpdateMetaMensal}
              tituloPeriodo={tituloPeriodo}
              mesesSelecionadosCount={mesesSelecionados.length}
            />
          )}

          {abaAtiva === 'dre' && dre && parametrosCalculados && (
            <AbaDRE dre={dre} tituloPeriodo={tituloPeriodo} parametros={parametrosCalculados} />
          )}
        </div>
      </div>
    </div>
  )
}

// ============ SUBCOMPONENTES ============

const FiltroPeriodo = ({ ano, setAno, mesesSelecionados, onMesToggle }: any) => (
  <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div>
        <label className="text-sm font-semibold text-gray-700 dark:text-clinic-gray-400 mb-2 block">Ano</label>
        <select
          value={ano}
          onChange={(e) => setAno(Number(e.target.value))}
          className="w-full bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded-lg px-4 py-2 text-gray-900 dark:text-clinic-cyan"
        >
          {ANOS_DISPONIVEIS.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div className="md:col-span-3">
        <label className="text-sm font-semibold text-gray-700 dark:text-clinic-gray-400 mb-2 block">Meses</label>
        <div className="grid grid-cols-6 lg:grid-cols-12 gap-2">
          {MESES.map((nome, index) => {
            const mesNumero = index + 1
            const isSelected = mesesSelecionados.includes(mesNumero)
            return (
              <button
                key={mesNumero}
                onClick={() => onMesToggle(mesNumero)}
                className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${isSelected
                  ? 'bg-gradient-to-r from-clinic-cyan to-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-clinic-gray-700 text-gray-700 dark:text-clinic-gray-400 hover:bg-gray-200 dark:hover:bg-clinic-gray-600'
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

const Input = ({ label, type = 'text', value, onChange, placeholder = '' }: any) => (
  <div>
    <label className="text-sm text-gray-700 dark:text-clinic-gray-400 mb-2 block">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded-lg px-4 py-2 text-gray-900 dark:text-clinic-white"
    />
  </div>
)

// ✅ NOVO COMPONENTE: Aba Gestão de SKUs
const AbaGestaoSKUs = ({ skus, editandoId, editForm, setEditForm, onEdit, onSave, onCancel, feedback, loading }: any) => (
  <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan mb-6">Gestão de SKUs</h2>

    {/* Feedback */}
    {feedback && (
      <div className={`mb-6 p-4 rounded-lg border ${feedback.tipo === 'success'
        ? 'bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30 text-green-700 dark:text-green-400'
        : 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400'
        }`}>
        {feedback.mensagem}
      </div>
    )}



    {loading && !editandoId ? (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-clinic-gray-400">Carregando SKUs...</p>
      </div>
    ) : skus.length === 0 ? (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-clinic-gray-400">Nenhum SKU cadastrado</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-clinic-cyan/20">
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-clinic-cyan">Produto</th>
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-clinic-cyan">Fabricante</th>
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-clinic-cyan">Categoria</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-clinic-cyan">Fator Divisão</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-clinic-cyan">Ações</th>
            </tr>
          </thead>
          <tbody>
            {skus.map((sku: SKU) => (
              <tr key={sku.id_sku} className="border-b border-gray-100 dark:border-clinic-cyan/10 hover:bg-gray-50 dark:hover:bg-clinic-cyan/5">
                <td className="px-4 py-3 text-gray-900 dark:text-clinic-white font-medium">{sku.nome_produto}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-clinic-gray-400 text-sm">{sku.fabricante}</td>
                <td className="px-4 py-3">
                  {editandoId === sku.id_sku ? (
                    <select
                      value={editForm.classe_terapeutica}
                      onChange={(e) => setEditForm((prev: any) => ({ ...prev, classe_terapeutica: e.target.value }))}
                      className="w-full bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded px-3 py-1 text-gray-900 dark:text-clinic-white text-sm focus:outline-none focus:border-clinic-cyan"
                    >
                      {CATEGORIAS_SKU.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="inline-block px-3 py-1 bg-cyan-50 dark:bg-clinic-cyan/10 border border-cyan-200 dark:border-clinic-cyan/30 rounded text-cyan-700 dark:text-clinic-cyan text-sm">
                      {sku.classe_terapeutica}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {editandoId === sku.id_sku ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={editForm.fator_divisao}
                      onChange={(e) => setEditForm((prev: any) => ({ ...prev, fator_divisao: e.target.value }))}
                      className="w-24 bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded px-3 py-1 text-gray-900 dark:text-clinic-white text-sm text-center focus:outline-none focus:border-clinic-cyan"
                    />
                  ) : (
                    <span className="text-gray-900 dark:text-clinic-white font-mono">{sku.fator_divisao}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-center space-x-2">
                    {editandoId === sku.id_sku ? (
                      <>
                        <button
                          onClick={() => onSave(sku.id_sku)}
                          disabled={loading}
                          className="p-2 bg-green-50 dark:bg-green-500/20 hover:bg-green-100 dark:hover:bg-green-500/30 border border-green-200 dark:border-green-500/30 rounded-lg text-green-700 dark:text-green-400 transition-colors disabled:opacity-50"
                          title="Salvar"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={onCancel}
                          disabled={loading}
                          className="p-2 bg-red-50 dark:bg-red-500/20 hover:bg-red-100 dark:hover:bg-red-500/30 border border-red-200 dark:border-red-500/30 rounded-lg text-red-700 dark:text-red-400 transition-colors disabled:opacity-50"
                          title="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onEdit(sku)}
                        className="px-3 py-1 bg-cyan-50 dark:bg-clinic-cyan/20 hover:bg-cyan-100 dark:hover:bg-clinic-cyan/30 border border-cyan-200 dark:border-clinic-cyan/30 rounded-lg text-cyan-700 dark:text-clinic-cyan text-sm transition-colors"
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

    {/* Estatísticas */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
      <FinanceCard title="Total de SKUs" value={skus.length} variant="cyan" />
      <FinanceCard
        title="Categorias Ativas"
        value={new Set(skus.map((s: SKU) => s.classe_terapeutica)).size}
        variant="green"
      />
      <FinanceCard
        title="SKUs Ativos"
        value={skus.filter((s: SKU) => s.status_estoque === 'Ativo').length}
      />
    </div>
  </div>
)

const AbaServicos = ({ servicos, mostrarForm, setMostrarForm, novoServico, setNovoServico, onAdicionar, lotesDisponiveis, novosInsumos, setNovosInsumos }: any) => {
  const [hoveredService, setHoveredService] = React.useState<number | null>(null)
  const [insumosHover, setInsumosHover] = React.useState<any[]>([])
  const [loadingHover, setLoadingHover] = React.useState(false)

  React.useEffect(() => {
    let isMounted = true
    if (hoveredService) {
      setLoadingHover(true)
      supabaseApi.getServicoInsumos(hoveredService)
        .then(data => {
          if (isMounted) setInsumosHover(data)
        })
        .finally(() => {
          if (isMounted) setLoadingHover(false)
        })
    } else {
      setInsumosHover([])
    }
    return () => { isMounted = false }
  }, [hoveredService])

  const handleAddInsumo = () => {
    setNovosInsumos([...novosInsumos, { id_lote: 0, quantidade: 0 }])
  }

  const handleRemoveInsumo = (index: number) => {
    const newInsumos = [...novosInsumos]
    newInsumos.splice(index, 1)
    setNovosInsumos(newInsumos)
  }

  const handleUpdateInsumo = (index: number, field: string, value: any) => {
    const newInsumos = [...novosInsumos]
    newInsumos[index] = { ...newInsumos[index], [field]: value }
    setNovosInsumos(newInsumos)

    // Opcional: Calcular custo automaticamente se desejar
    // Mas manteremos o campo manual por enquanto conforme o original
  }

  return (
    <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan">Catálogo de Serviços</h2>
        <Button onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? '✕ Cancelar' : '+ Novo Serviço'}
        </Button>
      </div>

      {mostrarForm && (
        <div className="bg-cyan-50 dark:bg-clinic-cyan/10 border border-cyan-200 dark:border-clinic-cyan/30 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-cyan-700 dark:text-clinic-cyan mb-4">Adicionar Novo Serviço</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input label="Nome do Serviço" value={novoServico.nome} onChange={(v: string) => setNovoServico({ ...novoServico, nome: v })} />
            <Input label="Preço" type="number" value={novoServico.preco} onChange={(v: number) => setNovoServico({ ...novoServico, preco: v })} />
            <Input label="Custo Insumos (Estimado)" type="number" value={novoServico.custo_insumos} onChange={(v: number) => setNovoServico({ ...novoServico, custo_insumos: v })} />
          </div>

          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-700 dark:text-clinic-gray-400 mb-2 block">Insumos Utilizados</label>

            {novosInsumos.map((insumo: any, index: number) => (
              <div key={index} className="flex items-end gap-4 mb-3">
                <div className="flex-grow">
                  <label className="text-xs text-gray-600 dark:text-clinic-gray-400 mb-1 block">Selecione o Insumo</label>
                  <select
                    value={insumo.id_lote}
                    onChange={(e) => handleUpdateInsumo(index, 'id_lote', Number(e.target.value))}
                    className="w-full bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded-lg px-4 py-2 text-sm text-gray-900 dark:text-clinic-white"
                  >
                    <option value={0}>Selecione um lote...</option>
                    {lotesDisponiveis.map((lote: any) => (
                      <option key={lote.id_lote} value={lote.id_lote}>
                        {lote.skus?.nome_produto} ({new Date(lote.validade).toLocaleDateString('pt-BR').slice(3)}) - Disp: {lote.quantidade_disponivel}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-32">
                  <Input
                    label="Qtd Usada"
                    type="number"
                    value={insumo.quantidade}
                    onChange={(v: number) => handleUpdateInsumo(index, 'quantidade', v)}
                  />
                </div>
                <button
                  onClick={() => handleRemoveInsumo(index)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg mb-1"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}

            <button
              onClick={handleAddInsumo}
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 mt-2"
            >
              <Plus className="w-4 h-4" />
              Adicionar Insumo
            </button>
          </div>

          <Button onClick={onAdicionar}>Salvar Serviço</Button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-clinic-cyan/20">
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-clinic-cyan">Serviço</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">Preço</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">Custo Insumos</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">Margem</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">%</th>
            </tr>
          </thead>
          <tbody>
            {servicos.map((s: ServicoCalculado) => (
              <tr
                key={s.id}
                className="border-b border-gray-100 dark:border-clinic-cyan/10 hover:bg-gray-50 dark:hover:bg-clinic-cyan/5 relative group"
                onMouseEnter={() => setHoveredService(s.id)}
                onMouseLeave={() => setHoveredService(null)}
              >
                <td className="px-4 py-3 text-gray-900 dark:text-clinic-white relative">
                  {s.nome}
                  {/* Tooltip de Insumos */}
                  {hoveredService === s.id && (
                    <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 pointer-events-none">
                      <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Insumos Utilizados</h4>
                      {loadingHover ? (
                        <div className="text-center py-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-clinic-cyan border-t-transparent mx-auto"></div>
                        </div>
                      ) : insumosHover.length > 0 ? (
                        <ul className="space-y-2">
                          {insumosHover.map((item: any, idx: number) => (
                            <li key={idx} className="text-xs text-gray-700 dark:text-gray-300 flex justify-between">
                              <span>{item.lotes?.skus?.nome_produto}</span>
                              <span className="font-mono font-bold">{item.quantidade_usada}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Nenhum insumo vinculado</p>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-cyan-600 dark:text-clinic-cyan">{formatCurrency(s.preco)}</td>
                <td className="px-4 py-3 text-right text-gray-600 dark:text-clinic-gray-400">{formatCurrency(s.custo_insumos)}</td>
                <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-bold">{formatCurrency(s.margemContribuicao)}</td>
                <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-bold">{formatPercent(s.margemContribuicaoPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const AbaParametros = ({ parametros, calculados, onUpdate, profissionais, novoProfissional, setNovoProfissional, onAdicionarProfissional, onRemoverProfissional }: any) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan mb-6">Parâmetros Dinâmicos</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Input label="Nº de Salas" type="number" value={parametros.numero_salas}
          onChange={(v: number) => onUpdate({ numero_salas: v })} />
        <Input label="Horas Trabalho/Dia" type="number" value={parametros.horas_trabalho_dia}
          onChange={(v: number) => onUpdate({ horas_trabalho_dia: v })} />
        <Input label="Duração Serviço (h)" type="number" value={parametros.duracao_media_servico_horas}
          onChange={(v: number) => onUpdate({ duracao_media_servico_horas: v })} />
        <Input label="MOD Padrão" type="number" value={parametros.mod_padrao}
          onChange={(v: number) => onUpdate({ mod_padrao: v })} />
        <Input label="Alíquota Impostos (%)" type="number" value={parametros.aliquota_impostos_pct}
          onChange={(v: number) => onUpdate({ aliquota_impostos_pct: v })} />
        <Input label="Taxa Cartão (%)" type="number" value={parametros.taxa_cartao_pct}
          onChange={(v: number) => onUpdate({ taxa_cartao_pct: v })} />
      </div>
    </div>

    <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan mb-6">Equipe de Profissionais</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border border-gray-200 dark:border-clinic-cyan/20 rounded-lg">
        <Input label="Nome" value={novoProfissional.nome} onChange={(v: string) => setNovoProfissional({ ...novoProfissional, nome: v })} />
        <Input label="Horas Semanais" type="number" value={novoProfissional.horasSemanais} onChange={(v: number) => setNovoProfissional({ ...novoProfissional, horasSemanais: v })} />
        <Button onClick={onAdicionarProfissional} className="self-end">Adicionar</Button>
      </div>
      <div className="space-y-2">
        {profissionais.map((p: Profissional) => (
          <div key={p.id} className="flex justify-between items-center bg-gray-50 dark:bg-clinic-gray-700/50 p-3 rounded-lg">
            <span className="font-semibold text-gray-900 dark:text-clinic-white">{p.nome}</span>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-clinic-gray-400">{p.horas_semanais}h/semana</span>
              <button onClick={() => onRemoverProfissional(p.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>

    {calculados && (
      <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan mb-6">Indicadores de Produtividade</h2>
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

const AbaDespesas = ({ despesas, total, mostrarForm, setMostrarForm, novaDespesa, setNovaDespesa, onAdicionar }: any) => (
  <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan">Despesas Fixas Mensais</h2>
      <Button onClick={() => setMostrarForm(!mostrarForm)}>
        {mostrarForm ? '✕ Cancelar' : '+ Nova Despesa'}
      </Button>
    </div>

    {mostrarForm && (
      <div className="bg-cyan-50 dark:bg-clinic-cyan/10 border border-cyan-200 dark:border-clinic-cyan/30 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-700 dark:text-clinic-gray-400 mb-2 block">Categoria</label>
            <select value={novaDespesa.categoria} onChange={(e) => setNovaDespesa({ ...novaDespesa, categoria: e.target.value })}
              className="w-full bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded-lg px-4 py-2 text-gray-900 dark:text-clinic-white">
              <option>Infraestrutura</option>
              <option>Pessoal</option>
              <option>Administrativo</option>
              <option>Marketing</option>
            </select>
          </div>
          <Input label="Item" value={novaDespesa.item} onChange={(v: string) => setNovaDespesa({ ...novaDespesa, item: v })} />
          <Input label="Valor" type="number" value={novaDespesa.valor} onChange={(v: number) => setNovaDespesa({ ...novaDespesa, valor: v })} />
        </div>
        <Button onClick={onAdicionar}>Salvar Despesa</Button>
      </div>
    )}

    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 dark:border-clinic-cyan/20">
          <th className="px-4 py-3 text-left text-cyan-700 dark:text-clinic-cyan">Categoria</th>
          <th className="px-4 py-3 text-left text-cyan-700 dark:text-clinic-cyan">Item</th>
          <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">Valor</th>
        </tr>
      </thead>
      <tbody>
        {despesas.map((d: Despesa) => (
          <tr key={d.id} className="border-b border-gray-100 dark:border-clinic-cyan/10">
            <td className="px-4 py-3 text-gray-900 dark:text-clinic-white">{d.categoria}</td>
            <td className="px-4 py-3 text-gray-600 dark:text-clinic-gray-400">{d.item}</td>
            <td className="px-4 py-3 text-right text-cyan-600 dark:text-clinic-cyan">{formatCurrency(d.valor_mensal)}</td>
          </tr>
        ))}
        <tr className="bg-cyan-50 dark:bg-clinic-cyan/10 font-bold">
          <td colSpan={2} className="px-4 py-3 text-cyan-700 dark:text-clinic-cyan">TOTAL</td>
          <td className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">{formatCurrency(total)}</td>
        </tr>
      </tbody>
    </table>
  </div>
)

const AbaVendas = ({ vendas, tituloPeriodo, onNovaVenda, pacientes, servicos }: any) => {
  const [mostrarForm, setMostrarForm] = useState(false)
  const [buscaPaciente, setBuscaPaciente] = useState('')
  const [novaVenda, setNovaVenda] = useState({
    data: new Date().toISOString().split('T')[0],
    id_paciente: 0,
    metodo_pagamento: 'Dinheiro',
    parcelas: 1,
    servicos: [] as any[]
  })

  const pacientesFiltrados = useMemo(() => {
    if (!buscaPaciente) return pacientes.slice(0, 10)
    return pacientes.filter((p: any) =>
      p.nome_completo.toLowerCase().includes(buscaPaciente.toLowerCase())
    ).slice(0, 10)
  }, [pacientes, buscaPaciente])

  const servicosPorCategoria = useMemo(() => {
    const grupos: Record<string, any[]> = {}
    servicos.forEach((s: any) => {
      const cat = s.categoria || 'Geral'
      if (!grupos[cat]) grupos[cat] = []
      grupos[cat].push(s)
    })
    return grupos
  }, [servicos])

  const handleAddServico = (servicoId: string) => {
    const servico = servicos.find((s: any) => s.id === Number(servicoId))
    if (servico) {
      setNovaVenda(prev => ({
        ...prev,
        servicos: [...prev.servicos, servico]
      }))
    }
  }

  const handleRemoveServico = (index: number) => {
    setNovaVenda(prev => ({
      ...prev,
      servicos: prev.servicos.filter((_, i) => i !== index)
    }))
  }

  const totalVenda = novaVenda.servicos.reduce((acc, s) => acc + s.preco, 0)

  const handleSalvar = () => {
    if (!novaVenda.id_paciente || novaVenda.servicos.length === 0) return
    onNovaVenda({ ...novaVenda, total: totalVenda })
    setMostrarForm(false)
    setNovaVenda({
      data: new Date().toISOString().split('T')[0],
      id_paciente: 0,
      metodo_pagamento: 'Dinheiro',
      parcelas: 1,
      servicos: []
    })
    setBuscaPaciente('')
  }

  return (
    <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan">Vendas - {tituloPeriodo}</h2>
        <Button onClick={() => setMostrarForm(!mostrarForm)}>
          {mostrarForm ? '✕ Cancelar' : '+ Nova Venda'}
        </Button>
      </div>

      {mostrarForm && (
        <div className="bg-cyan-50 dark:bg-clinic-cyan/10 border border-cyan-200 dark:border-clinic-cyan/30 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-cyan-700 dark:text-clinic-cyan mb-4">Registrar Nova Venda</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Coluna 1: Dados da Venda */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="date"
                    value={novaVenda.data}
                    onChange={e => setNovaVenda({ ...novaVenda, data: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Paciente</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar paciente..."
                    value={buscaPaciente}
                    onChange={e => setBuscaPaciente(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 mb-2"
                  />
                  {buscaPaciente && (
                    <div className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {pacientesFiltrados.map((p: any) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            setNovaVenda({ ...novaVenda, id_paciente: p.id })
                            setBuscaPaciente(p.nome_completo)
                          }}
                          className={`px-4 py-2 cursor-pointer hover:bg-cyan-50 dark:hover:bg-cyan-900/30 ${novaVenda.id_paciente === p.id ? 'bg-cyan-100 dark:bg-cyan-900/50' : ''}`}
                        >
                          <div className="font-medium text-gray-900 dark:text-white">{p.nome_completo}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">CPF: {p.cpf}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pagamento</label>
                <div className="flex gap-4">
                  <select
                    value={novaVenda.metodo_pagamento}
                    onChange={e => setNovaVenda({ ...novaVenda, metodo_pagamento: e.target.value })}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                  >
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Crédito">Crédito (Parcelado)</option>
                  </select>

                  {novaVenda.metodo_pagamento === 'Crédito' && (
                    <select
                      value={novaVenda.parcelas}
                      onChange={e => setNovaVenda({ ...novaVenda, parcelas: Number(e.target.value) })}
                      className="w-24 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                    >
                      {Array.from({ length: 18 }, (_, i) => i + 1).map(n => (
                        <option key={n} value={n}>{n}x</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna 2: Serviços */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adicionar Serviço</label>
                <select
                  onChange={e => {
                    handleAddServico(e.target.value)
                    e.target.value = ''
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2"
                >
                  <option value="">Selecione um serviço...</option>
                  {Object.entries(servicosPorCategoria).map(([categoria, items]) => (
                    <optgroup key={categoria} label={categoria}>
                      {items.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.nome} - {formatCurrency(s.preco)}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 min-h-[200px]">
                <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Serviços Selecionados</h4>
                {novaVenda.servicos.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Nenhum serviço adicionado</p>
                ) : (
                  <div className="space-y-2">
                    {novaVenda.servicos.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{s.nome}</div>
                          <div className="text-xs text-gray-500">{s.categoria || 'Geral'}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-cyan-600 dark:text-cyan-400">{formatCurrency(s.preco)}</span>
                          <button onClick={() => handleRemoveServico(idx)} className="text-red-500 hover:text-red-700">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
                <span className="text-lg font-bold text-gray-900 dark:text-white">Total</span>
                <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{formatCurrency(totalVenda)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setMostrarForm(false)}>Cancelar</Button>
            <Button onClick={handleSalvar} disabled={!novaVenda.id_paciente || novaVenda.servicos.length === 0}>
              Confirmar Venda
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-clinic-cyan/20">
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-clinic-cyan">Data</th>
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-clinic-cyan">Paciente</th>
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-clinic-cyan">Pagamento</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">Total</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">Margem</th>
            </tr>
          </thead>
          <tbody>
            {vendas.map((v: any) => (
              <tr key={v.id} className="border-b border-gray-100 dark:border-clinic-cyan/10">
                <td className="px-4 py-3 text-gray-900 dark:text-clinic-white">{new Date(v.data_venda).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-gray-900 dark:text-clinic-white">{v.pacientes?.nome_completo || 'N/A'}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-clinic-gray-400">
                  {v.metodo_pagamento}
                  {v.parcelas > 1 && ` (${v.parcelas}x)`}
                </td>
                <td className="px-4 py-3 text-right text-cyan-600 dark:text-clinic-cyan font-bold">{formatCurrency(v.preco_total)}</td>
                <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 font-bold">{formatCurrency(v.margem_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const AbaMetas = ({ metas, tituloPeriodo }: any) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan mb-4">Metas por Serviço - {tituloPeriodo}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-clinic-cyan/20">
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-clinic-cyan">Serviço</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">Meta</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">Realizado</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">Cobertura</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">GAP</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-clinic-cyan">Projeção</th>
            </tr>
          </thead>
          <tbody>
            {metas.map((m: any, idx: number) => (
              <tr key={idx} className="border-b border-gray-100 dark:border-clinic-cyan/10">
                <td className="px-4 py-3 text-gray-900 dark:text-clinic-white">{m.servico}</td>
                <td className="px-4 py-3 text-right text-cyan-600 dark:text-clinic-cyan font-semibold">{m.metaUnidades}</td>
                <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 font-semibold">{m.realizado}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-bold ${m.cobertura >= 100 ? 'text-green-600 dark:text-green-400' :
                    m.cobertura >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                    {formatPercent(m.cobertura)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 font-semibold">{m.gap}</td>
                <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400 font-semibold">{m.projecao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)

const AbaControle = ({ controle, diasUteis, diaAtual, metaResultadoMensal, setMetaResultadoMensal, onBlurMeta, tituloPeriodo, mesesSelecionadosCount }: any) => {
  const [valorFormatado, setValorFormatado] = React.useState(formatCurrency(metaResultadoMensal))

  React.useEffect(() => {
    setValorFormatado(formatCurrency(metaResultadoMensal))
  }, [metaResultadoMensal])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valor = e.target.value.replace(/\D/g, '')

    if (valor === '') {
      setValorFormatado('R$ 0,00')
      setMetaResultadoMensal(0)
      return
    }

    valor = valor.replace(/^0+/, '') || '0'
    const numeroDecimal = parseFloat(valor) / 100
    setValorFormatado(formatCurrency(numeroDecimal))
    setMetaResultadoMensal(numeroDecimal)
  }

  const handleBlur = () => {
    onBlurMeta(metaResultadoMensal)
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-500/20 dark:to-pink-500/20 rounded-xl border border-purple-300 dark:border-purple-500/40 p-6">
          <h3 className="text-xl font-bold text-purple-700 dark:text-purple-400 mb-4">🎯 Defina sua Meta Mensal</h3>
          <p className="text-xs text-gray-700 dark:text-gray-400 mb-2">
            A meta total para o período de {tituloPeriodo} ({mesesSelecionadosCount} {mesesSelecionadosCount === 1 ? 'mês' : 'meses'}) será {formatCurrency(metaResultadoMensal * mesesSelecionadosCount)}.
          </p>
          <div className="max-w-md">
            <label className="text-sm text-gray-700 dark:text-clinic-gray-400 mb-2 block">Meta de Resultado Operacional Mensal</label>
            <input
              type="text"
              value={valorFormatado}
              onChange={handleInputChange}
              onBlur={handleBlur}
              placeholder="R$ 0,00"
              className="w-full bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded-lg px-4 py-2 text-gray-900 dark:text-clinic-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan mb-4">Controle - {tituloPeriodo}</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <FinanceCard title="Dias Úteis Totais" value={diasUteis} />
          <FinanceCard title="Dia Útil Atual" value={diaAtual} variant="cyan" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-clinic-cyan mb-4">Performance Atual</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <FinanceCard title="Faturamento" value={formatCurrency(controle.faturamentoAcumulado)} variant="cyan" />
          <FinanceCard title="Lucro Bruto" value={formatCurrency(controle.lucroBrutoAcumulado)} variant="green" />
          <FinanceCard title="Dias Restantes" value={controle.diasRestantes} />
          <FinanceCard title="Performance Diária" value={formatCurrency(controle.performanceDiaria)} variant="green" />
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-clinic-cyan mb-4">Projeções</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <FinanceCard title="Faturamento Projetado" value={formatCurrency(controle.faturamentoProjetado)} variant="cyan" />
          <FinanceCard title="Lucro Bruto Projetado" value={formatCurrency(controle.lucroBrutoProjetado)} variant="green" />
          <FinanceCard
            title="Resultado Projetado"
            value={formatCurrency(controle.resultadoProjetado)}
            variant={controle.resultadoProjetado >= 0 ? 'green' : 'red'}
          />
        </div>

        <h3 className="text-xl font-bold text-purple-700 dark:text-purple-400 mb-4">Engenharia Reversa</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <FinanceCard title="Meta Resultado Líquido" value={formatCurrency(controle.metaResultadoLiquido)} />
          <FinanceCard title="Meta Lucro Bruto" value={formatCurrency(controle.metaLucroBruto)} variant="cyan" />
          <FinanceCard title="Lucro Faltante" value={formatCurrency(controle.lucroBrutoFaltante)} variant="red" />
        </div>
      </div>
    </>
  )
}

const AbaDRE = ({ dre, tituloPeriodo, parametros }: any) => (
  <div className="space-y-6">
    <div className="bg-white dark:bg-clinic-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-clinic-cyan/20 p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan mb-6">DRE - {tituloPeriodo}</h2>
      <div className="space-y-4">
        <DRELine label="(+) Faturamento Bruto" value={dre.faturamentoBruto} isMain />
        <DRELine label="(-) Impostos" value={dre.impostos} isNegative />
        <DRELine label="(-) Taxas Financeiras" value={dre.taxasFinanceiras} isNegative />
        <DRELine label="(=) Faturamento Líquido" value={dre.faturamentoLiquido} isMain />
        <DRELine label="(-) Custos Variáveis" value={dre.custosVariaveis} isNegative />
        <DRELine label="(=) Lucro Bruto" value={dre.lucroBruto} isSubTotal />
        <DRELine label="(-) Despesas Fixas" value={dre.despesasFixas} isNegative />
        <DRELine label="(=) RESULTADO OPERACIONAL" value={dre.resultadoOperacional} isFinal />
      </div>
    </div>
  </div>
)

const DRELine = ({ label, value, isMain, isNegative, isSubTotal, isFinal }: any) => {
  let classes = "flex justify-between py-3"
  let valueClasses = "text-lg"

  if (isMain) {
    classes += " border-b-2 border-cyan-500 dark:border-clinic-cyan"
    valueClasses = "text-xl font-bold text-cyan-600 dark:text-clinic-cyan"
  }
  if (isNegative) valueClasses += " text-red-600 dark:text-red-400"
  if (isSubTotal) {
    classes += " bg-green-50 dark:bg-green-500/10 px-4 rounded border-b-2 border-green-500"
    valueClasses = `text-xl font-bold ${value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`
  }
  if (isFinal) {
    classes += ` px-4 rounded ${value >= 0 ? 'bg-green-50 dark:bg-green-500/10 border-b-4 border-green-500' : 'bg-red-50 dark:bg-red-500/10 border-b-4 border-red-500'}`
    valueClasses = `text-2xl font-bold ${value >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`
  }

  return (
    <div className={classes}>
      <span className={`font-semibold text-gray-900 dark:text-clinic-white ${isFinal ? 'text-lg' : ''}`}>{label}</span>
      <p className={valueClasses}>{formatCurrency(value)}</p>
    </div>
  )
}