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
  // ✅ ITEM 9: Produtos com lotes disponíveis (qty > 0)
  const [produtosComLotes, setProdutosComLotes] = useState<any[]>([])

  // Estados de formulários
  const [mostrarFormServico, setMostrarFormServico] = useState(false)
  const [novoServico, setNovoServico] = useState({ nome: '', preco: 0, custo_insumos: 0 })
  const [mostrarFormDespesa, setMostrarFormDespesa] = useState(false)
  
  // ✅ FIX UX ITEM 3 + ITEM 5: valor como string vazia, campo periodo adicionado
  const [novaDespesa, setNovaDespesa] = useState<{
    tipo: TipoDespesa
    categoria: string
    item: string
    valor: number | string
    periodo: string
  }>({
    tipo: 'Despesa Fixa',
    categoria: 'Infraestrutura',
    item: '',
    valor: '',
    periodo: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`
  })
  const [novoProfissional, setNovoProfissional] = useState({ nome: '', horasSemanais: 40 })

  // Estados para SKUs
  const [editandoSKU, setEditandoSKU] = useState<number | null>(null)
  const [editFormSKU, setEditFormSKU] = useState<{ classe_terapeutica?: string; fator_divisao?: string }>({})
  const [feedbackSKU, setFeedbackSKU] = useState<{ tipo: 'success' | 'error'; mensagem: string } | null>(null)

  // Estado para meta temporária
  const [metaTemporaria, setMetaTemporaria] = useState<number | string>('')

  // ✅ FIX: Garantir clinic_id válido antes de carregar dados
  useEffect(() => {
    const ensureClinicId = () => {
      const currentClinicId = localStorage.getItem('clinic_id')
      if (!currentClinicId) {
        // Tentar recuperar do usuário logado
        const userData = localStorage.getItem('ballarin_user')
        if (userData) {
          try {
            const user = JSON.parse(userData)
            if (user.id_clinica) {
              localStorage.setItem('clinic_id', user.id_clinica.toString())
              console.log('✅ clinic_id recuperado do usuário:', user.id_clinica)
            }
          } catch (e) {
            console.error('Erro ao recuperar clinic_id:', e)
          }
        }
      }
    }
    
    ensureClinicId()
    loadData()
    loadSKUs()
    loadProdutosComLotes() // ✅ ITEM 9: Carregar produtos para Metas
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
      // ✅ DEBUG: Verificar clinicId antes de carregar
      const clinicId = supabaseApi.getCurrentClinicId()
      console.log('🔍 DEBUG loadData - clinicId:', clinicId)
      
      if (!clinicId) {
        console.error('❌ clinicId é NULL! Verificar localStorage...')
        // Tentar recuperar do localStorage diretamente
        const storedClinic = localStorage.getItem('clinic_id')
        const storedUser = localStorage.getItem('ballarin_user')
        console.log('📦 localStorage clinic_id:', storedClinic)
        console.log('📦 localStorage ballarin_user:', storedUser)
      }

      const [servicosData, despesasData, profissionaisData, parametrosData] = await Promise.all([
        supabaseApi.getServicos(),
        supabaseApi.getDespesas(),
        supabaseApi.getProfissionais(),
        supabaseApi.getParametros()
      ])

      console.log('👥 Profissionais carregados:', profissionaisData.length, profissionaisData)

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

  // ✅ ITEM 9: Carregar produtos com lotes disponíveis para Metas
  const loadProdutosComLotes = async () => {
    try {
      const produtosData = await supabaseApi.getProdutos()
      // Filtrar apenas SKUs que têm lotes com quantidade > 0
      const produtosComEstoque = produtosData.filter((p: any) => 
        p.lotes && p.lotes.length > 0 && p.lotes.some((l: any) => l.quantidade_disponivel > 0)
      )
      setProdutosComLotes(produtosComEstoque)
      console.log(`📊 ITEM 9: ${produtosComEstoque.length} SKUs com estoque disponível`)
    } catch (error) {
      console.error('Erro ao carregar produtos com lotes:', error)
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

  // ✅ FIX UX ITEM 3 + ITEM 5: Converter valor para number, incluir periodo
  const handleAdicionarDespesa = async () => {
    const valorNumerico = Number(novaDespesa.valor) || 0
    if (!novaDespesa.item || valorNumerico <= 0) return
    try {
      await supabaseApi.createDespesa({
        tipo: novaDespesa.tipo,
        categoria: novaDespesa.categoria,
        item: novaDespesa.item,
        valor_mensal: valorNumerico,
        periodo: novaDespesa.periodo
      })
      setNovaDespesa({ 
        tipo: 'Despesa Fixa', 
        categoria: 'Infraestrutura', 
        item: '', 
        valor: '',
        periodo: `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`
      })
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

  // ✅ NOVO ITEM 4: Handler para atualizar profissional (percentual e perfil)
  const handleUpdateProfissional = async (id: number, updates: Partial<{
    nome: string
    horas_semanais: number
    percentual_profissional: number
    perfil: 'proprietario' | 'comissionado'
  }>) => {
    try {
      await supabaseApi.updateProfissional(id, updates)
      loadData()
    } catch (error) {
      console.error('Erro ao atualizar profissional:', error)
    }
  }

  const handleUpdateParametros = async (updates: Record<string, number | string | null>) => {
    try {
      await supabaseApi.updateParametros(updates as any)
      loadData()
    } catch (error) {
      console.error('Erro ao atualizar parâmetros:', error)
    }
  }

  // ✅ ITEM 8: Salvar Meta faz UPDATE (não INSERT)
  const handleUpdateMetaMensal = async (novaMeta: number) => {
    try {
      console.log('📝 ATUALIZANDO META (UPDATE):', novaMeta)
      // ✅ Chama updateParametros que faz UPDATE na tabela parametros
      await supabaseApi.updateParametros({ meta_resultado_liquido_mensal: novaMeta })
      if (parametros) {
        setParametros({ ...parametros, meta_resultado_liquido_mensal: novaMeta })
      }
      setMetaTemporaria('')
      console.log('✅ META ATUALIZADA COM SUCESSO')
    } catch (error) {
      console.error('❌ Erro ao atualizar meta:', error)
      alert('Erro ao salvar meta. Verifique o console.')
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

  // ✅ ITEM 7: DRE COMPLETO COM 9 LINHAS
  const dreCalc = useMemo(() => {
    if (!parametros) return null

    // 1. RECEITA OPERACIONAL BRUTA
    const receitaBruta = vendas.reduce((sum, v) => sum + (v.preco_final || v.preco_total || 0), 0)

    // 2. DEDUÇÕES DA RECEITA
    // 2.1 Impostos (sobre toda receita)
    const impostos = receitaBruta * (parametros.aliquota_impostos_pct / 100)

    // 2.2 Taxas Financeiras (só para vendas no CRÉDITO)
    const vendasCredito = vendas.filter(v => v.metodo_pagamento === 'Crédito')
    const totalVendasCredito = vendasCredito.reduce((sum, v) => sum + (v.preco_final || v.preco_total || 0), 0)
    const taxasFinanceiras = totalVendasCredito * (parametros.taxa_cartao_pct / 100)

    const totalDeducoes = impostos + taxasFinanceiras

    // 3. RECEITA LÍQUIDA
    const receitaLiquida = receitaBruta - totalDeducoes

    // 4. CUSTOS VARIÁVEIS
    // 4.1 Custo dos Insumos (CMV)
    const custoInsumos = vendas.reduce((sum, v) => sum + (v.custo_total || 0), 0)

    // 4.2 Repasse Profissionais (comissionados)
    let repasseProfissionais = 0
    vendas.forEach(v => {
      if (v.id_usuario_responsavel) {
        const prof = profissionais.find(p => p.id === v.id_usuario_responsavel)
        if (prof && prof.perfil === 'comissionado' && prof.percentual_profissional) {
          const valorVenda = v.preco_final || v.preco_total || 0
          repasseProfissionais += valorVenda * (prof.percentual_profissional / 100)
        }
      }
    })

    const totalCustosVariaveis = custoInsumos + repasseProfissionais

    // 5. MARGEM DE CONTRIBUIÇÃO
    const margemContribuicao = receitaLiquida - totalCustosVariaveis
    const margemContribuicaoPct = receitaBruta > 0 ? (margemContribuicao / receitaBruta) * 100 : 0

    // 6. DESPESAS FIXAS (tipo = 'Despesa Fixa' ou 'Custo Fixo') - multiplicado pelo número de meses
    const despesasFixasMensal = despesas
      .filter(d => d.tipo === 'Despesa Fixa' || d.tipo === 'Custo Fixo')
      .reduce((sum, d) => sum + d.valor_mensal, 0)
    const despesasFixas = despesasFixasMensal * mesesSelecionados.length

    // 7. EBITDA (Operacional)
    const ebitda = margemContribuicao - despesasFixas

    // 8. RESERVAS / INOVAÇÃO
    const modernInova = parametros.modern_inova || 10 // default 10%
    const reservasInovacao = ebitda > 0 ? ebitda * (modernInova / 100) : 0

    // 9. LUCRO LÍQUIDO (BOLSO)
    const lucroLiquidoBolso = ebitda - reservasInovacao

    return {
      // Linha 1
      receitaBruta,
      // Linha 2
      impostos,
      taxasFinanceiras,
      totalDeducoes,
      totalVendasCredito,
      // Linha 3
      receitaLiquida,
      // Linha 4
      custoInsumos,
      repasseProfissionais,
      totalCustosVariaveis,
      // Linha 5
      margemContribuicao,
      margemContribuicaoPct,
      // Linha 6
      despesasFixas,
      // Linha 7
      ebitda,
      // Linha 8
      modernInova,
      reservasInovacao,
      // Linha 9
      lucroLiquidoBolso,
      // Extras para compatibilidade
      aliquotaImpostos: parametros.aliquota_impostos_pct,
      taxaCartao: parametros.taxa_cartao_pct
    }
  }, [parametros, vendas, profissionais, despesas, mesesSelecionados])

  // Manter controleCalc para compatibilidade com AbaControle
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

  // ✅ ITEM 9: NOVA LÓGICA DE METAS - SKUs com lotes disponíveis
  const metasCalculadas = useMemo(() => {
    // Validações
    if (!parametros || produtosComLotes.length === 0) return []
    if (!dreCalc) return []

    // 1. Calcular Faturamento Necessário (mesmo cálculo do AbaControle)
    const modernInova = parametros.modern_inova || 10
    const metaMensal = parametros.meta_resultado_liquido_mensal || 0
    const despesasFixas = dreCalc.despesasFixas || 0
    const margemContribuicao = dreCalc.margemContribuicao || 0
    const receitaBruta = dreCalc.receitaBruta || 0

    const alvoEbitda = metaMensal / (1 - (modernInova / 100))
    const alvoMc = alvoEbitda + despesasFixas
    const margemAtualPct = receitaBruta > 0 ? margemContribuicao / receitaBruta : 0.3 // default 30% se sem dados
    const faturamentoNecessario = margemAtualPct > 0 ? alvoMc / margemAtualPct : 0

    // 2. Número de produtos (SKUs únicos com lotes > 0)
    const numProdutos = produtosComLotes.length

    // 3. Calcular meta por produto
    return produtosComLotes.map((produto: any) => {
      const valorVenda = produto.valor_venda || 0
      
      // Meta = (Faturamento Necessário / nº produtos) / valor_venda (arredondar para cima)
      const metaUnidades = valorVenda > 0 
        ? Math.ceil((faturamentoNecessario / numProdutos) / valorVenda)
        : 0

      // Realizado = Quantidade de doses vendidas deste SKU neste mês
      // Buscar em vendas.insumos onde o lote pertence a este SKU
      let realizado = 0
      vendas.forEach((v: any) => {
        if (v.insumos && Array.isArray(v.insumos)) {
          v.insumos.forEach((insumo: any) => {
            // Verificar se o insumo pertence a este SKU
            const insumoSkuId = insumo.lotes?.id_sku || insumo.id_sku
            if (insumoSkuId === produto.id_sku) {
              realizado += insumo.quantidade || 0
            }
          })
        }
      })

      // Cobertura = (realizado/meta) * 100 (%)
      const cobertura = metaUnidades > 0 ? (realizado / metaUnidades) * 100 : 0

      // GAP = Meta - Realizado
      const gap = metaUnidades - realizado

      // Projeção = [(Realizado * dias úteis do mês) / (Dia útil atual * Meta)] * 100
      const projecao = (diaUtilAtual > 0 && metaUnidades > 0)
        ? Math.round((realizado * diasUteisTotais) / (diaUtilAtual * metaUnidades) * 100)
        : 0

      return {
        produto: produto.nome_produto,
        idSku: produto.id_sku,
        valorVenda: valorVenda,
        metaUnidades,
        realizado,
        cobertura,
        gap,
        projecao
      }
    })
  }, [parametros, produtosComLotes, vendas, dreCalc, diaUtilAtual, diasUteisTotais])

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
              profissionais={profissionais}
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

          {/* ✅ ATUALIZADO ITEM 4: Passa onUpdateProfissional */}
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
              onUpdateProfissional={handleUpdateProfissional}
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

          {/* ✅ ITEM 8: AbaControle com Faturamento Necessário */}
          {abaAtiva === 'controle' && controleCalc && parametros && (
            <AbaControle
              controle={controleCalc}
              dre={dreCalc}
              parametros={parametros}
              diasUteis={diasUteisTotais}
              diaAtual={diaUtilAtual}
              metaResultadoMensal={Number(metaTemporaria) || parametros.meta_resultado_liquido_mensal}
              mesesSelecionados={mesesSelecionados}
              onUpdateMeta={handleUpdateMetaMensal}
              metaTemporaria={metaTemporaria}
              setMetaTemporaria={setMetaTemporaria}
            />
          )}

          {/* ✅ ITEM 7: DRE com novo cálculo completo */}
          {abaAtiva === 'dre' && dreCalc && (
            <AbaDRE dre={dreCalc} tituloPeriodo={tituloPeriodo} />
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

// ✅ FIX UX ITEM 3: InputLocal com tratamento para campos zero
const InputLocal = ({ label, type = 'text', value, onChange, placeholder = '' }: any) => (
  <div>
    <label className="text-sm text-gray-700 dark:text-slate-400 mb-2 block">{label}</label>
    <input
      type={type}
      value={value === 0 || value === null ? '' : value}
      onChange={(e) => {
        if (type === 'number') {
          onChange(e.target.value === '' ? '' : Number(e.target.value))
        } else {
          onChange(e.target.value)
        }
      }}
      onFocus={(e) => {
        if (type === 'number' && e.target.value === '0') {
          onChange('')
        }
      }}
      placeholder={placeholder}
      className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
    />
  </div>
)

// ✅ ITEM 5: ABA DESPESAS COM CAMPO PERÍODO E TÍTULO CORRIGIDO
const AbaDespesas = ({ despesas, total, mostrarForm, setMostrarForm, novaDespesa, setNovaDespesa, onAdicionar }: any) => (
  <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400">Despesas Mensais</h2>
      <Button onClick={() => setMostrarForm(!mostrarForm)}>
        {mostrarForm ? '✕ Cancelar' : '+ Nova Despesa'}
      </Button>
    </div>

    {mostrarForm && (
      <div className="bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/30 rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          {/* Campo Período MM/YYYY */}
          <div>
            <label className="text-sm text-gray-700 dark:text-slate-400 mb-2 block">Período (MM/AAAA)</label>
            <input
              type="text"
              value={novaDespesa.periodo}
              onChange={(e) => setNovaDespesa({ ...novaDespesa, periodo: e.target.value })}
              placeholder="12/2025"
              maxLength={7}
              className="w-full bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg px-4 py-2 text-gray-900 dark:text-white"
            />
          </div>
          {/* Campo Tipo */}
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
          <InputLocal label="Valor" type="number" value={novaDespesa.valor} onChange={(v: number | string) => setNovaDespesa({ ...novaDespesa, valor: v })} />
        </div>
        <Button onClick={onAdicionar}>Salvar Despesa</Button>
      </div>
    )}

    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-slate-700">
            <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Período</th>
            <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Tipo</th>
            <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Categoria</th>
            <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Item</th>
            <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Valor</th>
          </tr>
        </thead>
        <tbody>
          {despesas.map((d: Despesa) => (
            <tr key={d.id} className="border-b border-gray-100 dark:border-slate-700/50">
              <td className="px-4 py-3 text-gray-600 dark:text-slate-400 font-mono text-xs">{d.periodo || '—'}</td>
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
            <td colSpan={4} className="px-4 py-3 text-cyan-700 dark:text-cyan-400">TOTAL</td>
            <td className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">{formatCurrency(total)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)

// ✅ ITEM 6: ABA VENDAS COM COLUNAS PROFISSIONAL E PRODUTOS
const AbaVendas = ({ vendas, tituloPeriodo, onNovaVenda, profissionais = [] }: { vendas: any[], tituloPeriodo: string, onNovaVenda: () => void, profissionais?: any[] }) => {
  // ✅ ITEM 6: Helper para buscar nome do profissional
  const getProfissionalNome = (idResponsavel: number | null) => {
    if (!idResponsavel) return '—'
    const prof = profissionais.find(p => p.id === idResponsavel)
    return prof?.nome || '—'
  }

  return (
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
              {/* ✅ ITEM 6: Coluna Profissional */}
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Profissional</th>
              {/* ✅ ITEM 6: Coluna Produtos */}
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Produtos</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Valor Total</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Desconto</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Valor Final</th>
              <th className="px-4 py-3 text-right text-cyan-700 dark:text-cyan-400">Margem %</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Pagamento</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Parcelas</th>
            </tr>
          </thead>
          <tbody>
            {vendas.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-slate-500">
                  Nenhuma venda encontrada no período selecionado
                </td>
              </tr>
            ) : (
              vendas.map((v: any) => {
                // ✅ ITEM 6: Extrair nomes dos produtos dos insumos
                const produtosNomes = v.insumos?.map((ins: any) => ins.lotes?.skus?.nome_produto).filter(Boolean) || []
                const produtosTexto = produtosNomes.length > 0 
                  ? produtosNomes.slice(0, 2).join(', ') + (produtosNomes.length > 2 ? ` +${produtosNomes.length - 2}` : '')
                  : '—'

                return (
                  <tr key={v.id} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 text-gray-900 dark:text-white">
                      {new Date(v.data_venda).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                      {v.pacientes?.nome_completo || 'N/A'}
                    </td>
                    {/* ✅ ITEM 6: Exibir Profissional */}
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400">
                      {getProfissionalNome(v.id_usuario_responsavel)}
                    </td>
                    {/* ✅ ITEM 6: Exibir Produtos */}
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400 max-w-[150px] truncate" title={produtosNomes.join(', ')}>
                      {produtosTexto}
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
                    <td className="px-4 py-3 text-right text-green-600 dark:text-green-400">
                      {formatPercent(v.margem_percentual_final || v.margem_percentual || 0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${v.metodo_pagamento === 'PIX' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' :
                          v.metodo_pagamento === 'Débito' ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                            'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400'
                        }`}>
                        {v.metodo_pagamento}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-900 dark:text-white">
                      {v.metodo_pagamento === 'Crédito' && v.parcelas ? `${v.parcelas}x` : '-'}
                    </td>
                  </tr>
                )
              })
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
}

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

// ✅ ITEM 4: ABA PARÂMETROS COMPLETA COM NOVOS CAMPOS
const AbaParametros = ({ 
  parametros, 
  calculados, 
  onUpdate, 
  profissionais, 
  novoProfissional, 
  setNovoProfissional, 
  onAdicionarProfissional, 
  onRemoverProfissional,
  onUpdateProfissional
}: any) => {
  // Estado local para edição de profissionais
  const [editandoProfissional, setEditandoProfissional] = useState<number | null>(null)
  const [editFormProfissional, setEditFormProfissional] = useState<{
    percentual_profissional?: number | string
    perfil?: string
  }>({})

  const handleEditProfissional = (p: any) => {
    setEditandoProfissional(p.id)
    setEditFormProfissional({
      percentual_profissional: p.percentual_profissional ?? '',
      perfil: p.perfil ?? ''
    })
  }

  const handleSaveProfissional = async (id: number) => {
    await onUpdateProfissional(id, {
      percentual_profissional: Number(editFormProfissional.percentual_profissional) || 0,
      perfil: editFormProfissional.perfil || null
    })
    setEditandoProfissional(null)
    setEditFormProfissional({})
  }

  const handleCancelEditProfissional = () => {
    setEditandoProfissional(null)
    setEditFormProfissional({})
  }

  return (
    <div className="space-y-6">
      {/* ✅ SEÇÃO 1: Parâmetros Operacionais */}
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Parâmetros Operacionais</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <InputLocal 
            label="Número de Salas" 
            type="number" 
            value={parametros.numero_salas} 
            onChange={(v: number) => onUpdate({ numero_salas: v })} 
          />
          <InputLocal 
            label="Horas/Dia" 
            type="number" 
            value={parametros.horas_trabalho_dia} 
            onChange={(v: number) => onUpdate({ horas_trabalho_dia: v })} 
          />
          <InputLocal 
            label="Duração Média Serviço (h)" 
            type="number" 
            value={parametros.duracao_media_servico_horas} 
            onChange={(v: number) => onUpdate({ duracao_media_servico_horas: v })} 
          />
          <InputLocal 
            label="Alíquota Impostos (%)" 
            type="number" 
            value={parametros.aliquota_impostos_pct} 
            onChange={(v: number) => onUpdate({ aliquota_impostos_pct: v })} 
          />
          <InputLocal 
            label="Taxa Cartão (%)" 
            type="number" 
            value={parametros.taxa_cartao_pct} 
            onChange={(v: number) => onUpdate({ taxa_cartao_pct: v })} 
          />
          
          {/* ✅ NOVOS CAMPOS ITEM 4 */}
          <InputLocal 
            label="Modernização e Inovação (%)" 
            type="number" 
            value={parametros.modern_inova} 
            onChange={(v: number) => onUpdate({ modern_inova: v })} 
          />
          <InputLocal 
            label="Fator Correção Marca (%)" 
            type="number" 
            value={parametros.fator_correcao_marca} 
            onChange={(v: number) => onUpdate({ fator_correcao_marca: v })} 
          />
          <InputLocal 
            label="Custo/Hora (R$)" 
            type="number" 
            value={parametros.custo_hora} 
            onChange={(v: number) => onUpdate({ custo_hora: v })} 
          />
        </div>
      </div>

      {/* ✅ SEÇÃO 2: Equipe (com percentual e perfil) */}
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Equipe</h2>
        
        {/* Form adicionar profissional */}
        <div className="flex gap-4 mb-4 flex-wrap">
          <InputLocal 
            label="Nome" 
            value={novoProfissional.nome} 
            onChange={(v: string) => setNovoProfissional({ ...novoProfissional, nome: v })} 
          />
          <InputLocal 
            label="Horas/Semana" 
            type="number" 
            value={novoProfissional.horasSemanais} 
            onChange={(v: number) => setNovoProfissional({ ...novoProfissional, horasSemanais: v })} 
          />
          <div className="flex items-end">
            <Button onClick={onAdicionarProfissional}>Adicionar</Button>
          </div>
        </div>
        
        {/* Lista de profissionais */}
        <div className="space-y-3">
          {profissionais.map((p: any) => (
            <div 
              key={p.id} 
              className="flex flex-col md:flex-row justify-between items-start md:items-center p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg gap-4"
            >
              {/* Info básica */}
              <div className="flex-1">
                <span className="text-gray-900 dark:text-white font-medium">{p.nome}</span>
                <span className="text-sm text-gray-500 dark:text-slate-400 ml-2">({p.horas_semanais}h/semana)</span>
              </div>
              
              {/* Campos editáveis ou exibição */}
              {editandoProfissional === p.id ? (
                // Modo edição
                <div className="flex items-center gap-3 flex-wrap">
                  <div>
                    <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Repasse %</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editFormProfissional.percentual_profissional ?? ''}
                      onChange={(e) => setEditFormProfissional({
                        ...editFormProfissional,
                        percentual_profissional: e.target.value === '' ? '' : Number(e.target.value)
                      })}
                      className="w-20 px-2 py-1 text-sm bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">Perfil</label>
                    <select
                      value={editFormProfissional.perfil ?? ''}
                      onChange={(e) => setEditFormProfissional({
                        ...editFormProfissional,
                        perfil: e.target.value
                      })}
                      className="w-36 px-2 py-1 text-sm bg-white dark:bg-slate-600 border border-gray-300 dark:border-slate-500 rounded text-gray-900 dark:text-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="proprietario">Proprietário</option>
                      <option value="comissionado">Comissionado</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleSaveProfissional(p.id)}
                      className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 text-white rounded"
                    >
                      Salvar
                    </button>
                    <button 
                      onClick={handleCancelEditProfissional}
                      className="px-3 py-1 text-xs bg-gray-400 hover:bg-gray-500 text-white rounded"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo visualização
                <div className="flex items-center gap-4">
                  {/* Perfil Badge */}
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    p.perfil === 'proprietario' 
                      ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400' 
                      : p.perfil === 'comissionado'
                        ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-slate-600 text-gray-500 dark:text-slate-400'
                  }`}>
                    {p.perfil === 'proprietario' ? 'Proprietário' : 
                     p.perfil === 'comissionado' ? 'Comissionado' : 
                     'Não definido'}
                  </span>
                  
                  {/* Percentual */}
                  <span className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">
                    {p.percentual_profissional != null ? `${p.percentual_profissional}%` : '—'}
                  </span>
                  
                  {/* Botões */}
                  <button 
                    onClick={() => handleEditProfissional(p)}
                    className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 text-xs"
                  >
                    Editar
                  </button>
                  <button 
                    onClick={() => onRemoverProfissional(p.id)} 
                    className="text-red-600 dark:text-red-400 hover:text-red-700 text-xs"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          ))}
          
          {profissionais.length === 0 && (
            <p className="text-gray-500 dark:text-slate-400 text-sm text-center py-4">
              Nenhum profissional cadastrado
            </p>
          )}
        </div>
      </div>

      {/* ✅ SEÇÃO 3: Indicadores de Produtividade */}
      {calculados && (
        <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Indicadores de Produtividade</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FinanceCard title="Horas Equipe" value={`${calculados.horasDaEquipe.toFixed(0)}h`} />
            <FinanceCard title="Horas Salas" value={`${calculados.horasDasSalas}h`} />
            <FinanceCard title="Custo Hora (Calc)" value={formatCurrency(calculados.custoHora)} />
            <FinanceCard title="Taxa Ocupação" value={formatPercent(calculados.taxaOcupacao)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ✅ ITEM 9: AbaMetas atualizado - usa Produtos (SKUs com lotes) em vez de Serviços
const AbaMetas = ({ metas, tituloPeriodo }: any) => (
  <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Metas por Produto - {tituloPeriodo}</h2>
    
    {metas.length === 0 ? (
      <div className="text-center py-8 text-gray-500 dark:text-slate-400">
        <p>Nenhum produto com estoque disponível.</p>
        <p className="text-sm mt-2">Adicione lotes aos seus SKUs para visualizar as metas.</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="px-4 py-3 text-left text-cyan-700 dark:text-cyan-400">Produto</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Meta (un)</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Realizado</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Cobertura</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Gap</th>
              <th className="px-4 py-3 text-center text-cyan-700 dark:text-cyan-400">Projeção</th>
            </tr>
          </thead>
          <tbody>
            {metas.map((m: any, i: number) => (
              <tr key={m.idSku || i} className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">{m.produto}</td>
                <td className="px-4 py-3 text-center text-gray-600 dark:text-slate-400">{m.metaUnidades}</td>
                <td className="px-4 py-3 text-center text-gray-900 dark:text-white font-bold">{m.realizado}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    m.cobertura >= 100 
                      ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' 
                      : m.cobertura >= 50
                        ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                        : 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400'
                  }`}>
                    {formatPercent(m.cobertura)}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={m.gap > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                    {m.gap > 0 ? `-${m.gap}` : m.gap === 0 ? '✓' : `+${Math.abs(m.gap)}`}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`font-medium ${
                    m.projecao >= 100 
                      ? 'text-green-600 dark:text-green-400' 
                      : m.projecao >= 70
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-500 dark:text-red-400'
                  }`}>
                    {m.projecao}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
)

// ✅ ITEM 8: AbaControle com campo Faturamento Necessário
const AbaControle = ({ controle, dre, parametros, diasUteis, diaAtual, metaResultadoMensal, mesesSelecionados, onUpdateMeta, metaTemporaria, setMetaTemporaria }: any) => {
  // ✅ ITEM 8: Cálculo do Faturamento Necessário
  // Fórmula:
  // alvo_EBITDA = Meta de Resultado Mensal / ( 1 - % inovação)
  // alvo_mc = alvo_EBITDA + despesas fixas
  // % Margem_atual = margem_contribuicao (R$) / receita_bruta (R$)
  // Faturamento Necessário = alvo_mc / %Margem_atual

  const modernInova = parametros?.modern_inova || 10
  const metaMensal = metaResultadoMensal || 0
  const despesasFixas = dre?.despesasFixas || controle?.despesasFixasPeriodo || 0
  const margemContribuicao = dre?.margemContribuicao || (controle?.receitaBruta - controle?.custoInsumos) || 0
  const receitaBruta = dre?.receitaBruta || controle?.receitaBruta || 0

  // Cálculos
  const alvoEbitda = metaMensal / (1 - (modernInova / 100))
  const alvoMc = alvoEbitda + despesasFixas
  const margemAtualPct = receitaBruta > 0 ? margemContribuicao / receitaBruta : 0
  const faturamentoNecessario = margemAtualPct > 0 ? alvoMc / margemAtualPct : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinanceCard title="Dias Úteis" value={diasUteis} />
        <FinanceCard title="Dia Útil Atual" value={diaAtual} />
        <FinanceCard title="Progresso" value={formatPercent(diasUteis > 0 ? (diaAtual / diasUteis) * 100 : 0)} variant="cyan" />
      </div>

      {/* ✅ ITEM 8: Seção Meta + Faturamento Necessário */}
      <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-cyan-400 mb-6">Meta de Resultado Mensal</h2>
        <div className="flex gap-4 items-end mb-6">
          <InputLocal
            label="Meta (R$)"
            type="number"
            value={metaTemporaria !== '' ? metaTemporaria : metaResultadoMensal}
            onChange={(v: number | string) => setMetaTemporaria(v)}
          />
          <Button onClick={() => onUpdateMeta(Number(metaTemporaria) || metaResultadoMensal)}>
            Salvar Meta
          </Button>
        </div>

        {/* ✅ ITEM 8: Campo Faturamento Necessário */}
        <div className="mt-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-700/50">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                Faturamento Necessário
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                Para atingir a meta com margem atual de {formatPercent(margemAtualPct * 100)}
              </p>
            </div>
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">
              {formatCurrency(faturamentoNecessario)}
            </span>
          </div>
          
          {/* Detalhamento do cálculo */}
          <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700/50 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-amber-600 dark:text-amber-500">Alvo EBITDA:</span>
              <span className="ml-1 font-medium text-amber-800 dark:text-amber-300">{formatCurrency(alvoEbitda)}</span>
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-500">Alvo MC:</span>
              <span className="ml-1 font-medium text-amber-800 dark:text-amber-300">{formatCurrency(alvoMc)}</span>
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-500">% Inovação:</span>
              <span className="ml-1 font-medium text-amber-800 dark:text-amber-300">{modernInova}%</span>
            </div>
            <div>
              <span className="text-amber-600 dark:text-amber-500">Desp. Fixas:</span>
              <span className="ml-1 font-medium text-amber-800 dark:text-amber-300">{formatCurrency(despesasFixas)}</span>
            </div>
          </div>
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
}

// ✅ ITEM 7: DRE COMPLETO COM 9 LINHAS
const AbaDRE = ({ dre, tituloPeriodo }: any) => (
  <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 p-6 shadow-xl">
    {/* Header */}
    <div className="mb-6 flex items-center justify-between border-b border-gray-200 dark:border-slate-700 pb-4">
      <h2 className="text-xl font-bold text-gray-900 dark:text-cyan-400">DRE - {tituloPeriodo}</h2>
      <span className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wider">Regime de Competência</span>
    </div>

    {/* 1. RECEITA OPERACIONAL BRUTA */}
    <div className="flex justify-between items-center py-2">
      <span className="font-semibold text-gray-900 dark:text-white">1. Receita Operacional Bruta</span>
      <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(dre.receitaBruta)}</span>
    </div>

    {/* 2. DEDUÇÕES DA RECEITA */}
    <div className="mt-2 mb-4">
      <div className="flex justify-between items-center py-1">
        <span className="font-medium text-gray-700 dark:text-slate-300">2. Deduções da Receita</span>
        <span className="font-medium text-red-600 dark:text-red-400">- {formatCurrency(dre.totalDeducoes)}</span>
      </div>
      <div className="pl-4 border-l-2 border-gray-200 dark:border-slate-800 ml-1 mt-1 space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-slate-400">2.1 Impostos ({dre.aliquotaImpostos}%)</span>
          <span className="text-red-500 dark:text-red-400/80">- {formatCurrency(dre.impostos)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-slate-400">2.2 Taxas Financeiras ({dre.taxaCartao}% s/ {formatCurrency(dre.totalVendasCredito)})</span>
          <span className="text-red-500 dark:text-red-400/80">- {formatCurrency(dre.taxasFinanceiras)}</span>
        </div>
      </div>
    </div>

    {/* 3. RECEITA LÍQUIDA */}
    <div className="flex justify-between items-center py-3 border-t border-gray-200 dark:border-slate-700 bg-blue-50 dark:bg-slate-800/30 px-3 rounded mb-4">
      <span className="font-bold text-gray-800 dark:text-slate-100">3. (=) Receita Líquida</span>
      <span className="font-bold text-blue-600 dark:text-blue-200">{formatCurrency(dre.receitaLiquida)}</span>
    </div>

    {/* 4. CUSTOS VARIÁVEIS */}
    <div className="mb-4">
      <div className="flex justify-between items-center py-1">
        <span className="font-medium text-gray-700 dark:text-slate-300">4. Custos Variáveis</span>
        <span className="font-medium text-red-600 dark:text-red-400">- {formatCurrency(dre.totalCustosVariaveis)}</span>
      </div>
      <div className="pl-4 border-l-2 border-gray-200 dark:border-slate-800 ml-1 mt-1 space-y-1">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-slate-400">(-) Custo dos Insumos (CMV)</span>
          <span className="text-red-500 dark:text-red-400/80">- {formatCurrency(dre.custoInsumos)}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500 dark:text-slate-400">(-) Repasse Profissionais (Comissionados)</span>
          <span className="text-red-500 dark:text-red-400/80">- {formatCurrency(dre.repasseProfissionais)}</span>
        </div>
      </div>
    </div>

    {/* 5. MARGEM DE CONTRIBUIÇÃO - Destaque especial */}
    <div className="flex justify-between items-center py-4 px-4 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-500/30 mb-6">
      <div className="flex flex-col">
        <span className="text-cyan-700 dark:text-cyan-400 font-bold text-lg">5. (=) Margem de Contribuição</span>
        <span className="text-xs text-cyan-600/60 dark:text-cyan-200/60 uppercase">Indicador de Eficiência</span>
      </div>
      <div className="text-right">
        <div className="text-cyan-700 dark:text-cyan-400 font-bold text-xl">{formatCurrency(dre.margemContribuicao)}</div>
        <div className="text-sm text-cyan-600 dark:text-cyan-300 font-medium">({dre.margemContribuicaoPct.toFixed(1)}%)</div>
      </div>
    </div>

    {/* 6. DESPESAS FIXAS */}
    <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-slate-800 mb-2">
      <span className="text-gray-700 dark:text-slate-300">6. (-) Despesas Fixas</span>
      <span className="text-red-600 dark:text-red-400">- {formatCurrency(dre.despesasFixas)}</span>
    </div>

    {/* 7. EBITDA */}
    <div className="flex justify-between items-center py-3 bg-gray-100 dark:bg-slate-800 rounded px-3 mb-2">
      <span className="font-bold text-gray-900 dark:text-white">7. (=) EBITDA (Operacional)</span>
      <span className={`font-bold text-lg ${dre.ebitda >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-500'}`}>
        {formatCurrency(dre.ebitda)}
      </span>
    </div>

    {/* 8. RESERVAS / INOVAÇÃO */}
    <div className="flex justify-between items-center py-2 text-sm mb-4 pl-3">
      <span className="text-amber-600 dark:text-amber-500/90">8. (-) Reservas / Inovação ({dre.modernInova}%)</span>
      <span className="text-amber-600 dark:text-amber-500 font-medium">- {formatCurrency(dre.reservasInovacao)}</span>
    </div>

    {/* 9. LUCRO LÍQUIDO (BOLSO) - Destaque máximo */}
    <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-gray-100 to-gray-200 dark:from-slate-800 dark:to-slate-900 border border-gray-300 dark:border-slate-600 p-6 mt-4">
      <div className="flex justify-between items-end relative z-10">
        <div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium uppercase tracking-widest mb-1">9. Lucro Líquido (Bolso)</h3>
          <p className="text-xs text-gray-400 dark:text-gray-500">Resultado final após reinvestimento</p>
        </div>
        <span className={`text-3xl font-extrabold tracking-tight ${dre.lucroLiquidoBolso >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}`}>
          {formatCurrency(dre.lucroLiquidoBolso)}
        </span>
      </div>
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white dark:bg-white opacity-5 rounded-full blur-xl"></div>
    </div>
  </div>
)