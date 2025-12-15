'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Trash2, Check, ShoppingCart, User } from 'lucide-react'
import { Button } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Paciente, Lote, Sku, Profissional } from '@/types/database'

interface NovaVendaModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface InsumoSelecionado {
  id_lote: number
  id_sku: number
  nome_produto: string
  classe_terapeutica: string
  quantidade: number
  preco_unitario_custo: number
  preco_unitario_venda: number
  validade: string
  quantidade_disponivel: number
}

// ✅ 6 CATEGORIAS FIXAS
const CATEGORIAS_FIXAS = [
  'Toxina Botulínica',
  'Preenchedor',
  'Bioestimulador',
  'Bioregenerador',
  'Tecnologia',
  'Outros'
]

// ✅ NOVO: Percentuais de desconto fixo
const DESCONTOS_FIXOS = [5, 10, 15, 20, 25, 30, 40, 50]

// ✅ Função para normalizar categoria
const normalizarCategoria = (categoria: string): string => {
  const cat = (categoria || '').toUpperCase().trim()
  
  if (cat.includes('TOXINA') || cat.includes('BOTUL')) return 'Toxina Botulínica'
  if (cat.includes('PREENCHEDOR') || cat.includes('FILLER')) return 'Preenchedor'
  if (cat.includes('BIOESTIMULADOR')) return 'Bioestimulador'
  if (cat.includes('BIOREGENERADOR') || cat.includes('BIOREGEN')) return 'Bioregenerador'
  if (cat.includes('TECNOLOGIA') || cat.includes('LASER') || cat.includes('ULTRA')) return 'Tecnologia'
  
  return 'Outros'
}

// ✅ Função para determinar nível do combo
const determinarNivelCombo = (toxina: number, preenchedor: number, especiais: number) => {
  if (toxina >= 2 && preenchedor >= 5 && especiais >= 2) {
    return {
      nivel: 'ultra',
      label: 'Combo Ultra',
      borderClass: 'border-2 border-yellow-400 shadow-[0_0_30px_rgba(251,191,36,0.5)]',
      badgeClass: 'bg-yellow-400 text-black'
    }
  }
  if (toxina >= 2 && preenchedor >= 4 && especiais >= 1) {
    return {
      nivel: 'premium',
      label: 'Combo Premium',
      borderClass: 'border-2 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.4)]',
      badgeClass: 'bg-purple-500 text-white'
    }
  }
  if (toxina >= 1 && preenchedor >= 4 && especiais >= 1) {
    return {
      nivel: 'standard',
      label: 'Combo Standard',
      borderClass: 'border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]',
      badgeClass: 'bg-cyan-400 text-black'
    }
  }
  if (toxina >= 1 && preenchedor >= 2 && especiais >= 1) {
    return {
      nivel: 'basic',
      label: 'Combo Basic',
      borderClass: 'border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
      badgeClass: 'bg-green-500 text-black'
    }
  }
  return {
    nivel: 'none',
    label: 'Sem Combo',
    borderClass: 'border-2 border-slate-600',
    badgeClass: 'bg-slate-600 text-slate-300'
  }
}

export default function NovaVendaModal({ isOpen, onClose, onSuccess }: NovaVendaModalProps) {
  // ============ ESTADOS ============
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<(Lote & { skus: Sku })[]>([])
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0])
  const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(null)
  const [insumosSelecionados, setInsumosSelecionados] = useState<InsumoSelecionado[]>([])
  
  // ✅ ITEM 6: Profissional responsável
  const [profissionais, setProfissionais] = useState<Profissional[]>([])
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<number | null>(null)
  
  // ✅ FIX UX: Usar string vazia em vez de 0 para evitar "050000"
  const [descontoValor, setDescontoValor] = useState<number | string>('')
  const [metodoPagamento, setMetodoPagamento] = useState<'PIX' | 'Débito' | 'Crédito'>('PIX')
  const [parcelas, setParcelas] = useState(1)
  // ✅ ITEM 6: Entrada em % (não mais em R$)
  const [entradaPercentual, setEntradaPercentual] = useState<number | string>('')
  const [buscaPaciente, setBuscaPaciente] = useState('')

  // ============ CARREGAR DADOS ============
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      // ✅ ITEM 6: Carregar profissionais também
      const [pacientesData, produtosData, profissionaisData] = await Promise.all([
        supabaseApi.getPacientes(),
        supabaseApi.getProdutos(),
        supabaseApi.getProfissionais()
      ])

      console.log('📦 Produtos carregados:', produtosData.length)
      console.log('👥 Profissionais carregados:', profissionaisData.length)
      setPacientes(pacientesData)
      setProfissionais(profissionaisData)

      // ✅ LÓGICA ORIGINAL QUE FUNCIONA - SEM FILTRO EXTRA
      const lotes: (Lote & { skus: Sku })[] = []
      produtosData.forEach((prod: any) => {
        console.log(`  SKU: ${prod.nome_produto}, Lotes: ${prod.lotes?.length || 0}`)
        if (prod.lotes && prod.lotes.length > 0) {
          prod.lotes.forEach((lote: Lote) => {
            // ✅ Adiciona TODOS os lotes retornados (já filtrados pelo getProdutos)
            lotes.push({ ...lote, skus: prod })
          })
        }
      })
      
      console.log('📋 Total de lotes disponíveis:', lotes.length)
      setLotesDisponiveis(lotes)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const resetForm = useCallback(() => {
    setStep(1)
    setDataVenda(new Date().toISOString().split('T')[0])
    setSelectedPacienteId(null)
    setInsumosSelecionados([])
    // ✅ FIX UX: Usar string vazia no reset
    setDescontoValor('')
    setMetodoPagamento('PIX')
    setParcelas(1)
    // ✅ ITEM 6: Reset entrada percentual e profissional
    setEntradaPercentual('')
    setProfissionalSelecionado(null)
    setBuscaPaciente('')
  }, [])

  useEffect(() => {
    if (isOpen) {
      loadData()
      resetForm()
    }
  }, [isOpen, loadData, resetForm])

  // ============ CÁLCULOS ============
  const totais = useMemo(() => {
    const custoTotal = insumosSelecionados.reduce((acc, item) =>
      acc + ((item.preco_unitario_custo || 0) * item.quantidade), 0)
    const vendaTotal = insumosSelecionados.reduce((acc, item) =>
      acc + ((item.preco_unitario_venda || 0) * item.quantidade), 0)

    // ✅ FIX UX: Converter para number antes de calcular
    const descontoNumerico = Number(descontoValor) || 0
    // ✅ ITEM 6: Entrada em % - calcular valor em R$
    const entradaPctNumerico = Number(entradaPercentual) || 0
    
    const precoFinal = Math.max(0, vendaTotal - descontoNumerico)
    const descontoPercentual = vendaTotal > 0 ? (descontoNumerico / vendaTotal) * 100 : 0
    
    // ✅ ITEM 6: Calcular entrada em R$ baseado no percentual sobre preço final
    const valorEntradaReais = precoFinal * (entradaPctNumerico / 100)
    const valorParcelado = Math.max(0, precoFinal - valorEntradaReais)
    const valorParcela = parcelas > 0 ? valorParcelado / parcelas : 0
    const margemTotal = vendaTotal - custoTotal
    const margemPercentual = vendaTotal > 0 ? (margemTotal / vendaTotal) * 100 : 0
    const margemTotalFinal = precoFinal - custoTotal
    const margemPercentualFinal = precoFinal > 0 ? (margemTotalFinal / precoFinal) * 100 : 0

    return {
      custoTotal: isNaN(custoTotal) ? 0 : custoTotal,
      vendaTotal: isNaN(vendaTotal) ? 0 : vendaTotal,
      precoFinal: isNaN(precoFinal) ? 0 : precoFinal,
      descontoPercentual: isNaN(descontoPercentual) ? 0 : descontoPercentual,
      // ✅ ITEM 6: Adicionar valorEntradaReais calculado
      entradaPercentual: isNaN(entradaPctNumerico) ? 0 : entradaPctNumerico,
      valorEntradaReais: isNaN(valorEntradaReais) ? 0 : valorEntradaReais,
      valorParcelado: isNaN(valorParcelado) ? 0 : valorParcelado,
      valorParcela: isNaN(valorParcela) ? 0 : valorParcela,
      margemTotal: isNaN(margemTotal) ? 0 : margemTotal,
      margemPercentual: isNaN(margemPercentual) ? 0 : margemPercentual,
      margemTotalFinal: isNaN(margemTotalFinal) ? 0 : margemTotalFinal,
      margemPercentualFinal: isNaN(margemPercentualFinal) ? 0 : margemPercentualFinal
    }
  }, [insumosSelecionados, descontoValor, entradaPercentual, parcelas])

  const contagemCategorias = useMemo(() => {
    const counts = { toxina: 0, preenchedor: 0, especiais: 0 }
    insumosSelecionados.forEach(item => {
      const categoria = normalizarCategoria(item.classe_terapeutica)
      if (categoria === 'Toxina Botulínica') counts.toxina += item.quantidade
      else if (categoria === 'Preenchedor') counts.preenchedor += item.quantidade
      else if (['Bioestimulador', 'Bioregenerador', 'Tecnologia'].includes(categoria)) counts.especiais += item.quantidade
    })
    return counts
  }, [insumosSelecionados])

  const nivelCombo = useMemo(() => {
    return determinarNivelCombo(contagemCategorias.toxina, contagemCategorias.preenchedor, contagemCategorias.especiais)
  }, [contagemCategorias])

  const lotesPorCategoria = useMemo(() => {
    const grouped: Record<string, typeof lotesDisponiveis> = {}
    CATEGORIAS_FIXAS.forEach(cat => { grouped[cat] = [] })
    
    lotesDisponiveis.forEach(lote => {
      const skuData = lote.skus as any
      const categoriaOriginal = skuData?.classe_terapeutica || 'Outros'
      const categoriaNormalizada = normalizarCategoria(categoriaOriginal)
      if (grouped[categoriaNormalizada]) {
        grouped[categoriaNormalizada].push(lote)
      } else {
        grouped['Outros'].push(lote)
      }
    })
    return grouped
  }, [lotesDisponiveis])

  const pacientesFiltrados = useMemo(() => {
    if (!buscaPaciente.trim()) return []
    const termo = buscaPaciente.toLowerCase().trim()
    return pacientes.filter(p =>
      p.nome_completo?.toLowerCase().includes(termo) ||
      p.cpf?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
    ).slice(0, 10)
  }, [pacientes, buscaPaciente])

  if (!isOpen) return null

  // ============ HANDLERS ============
  const handleToggleInsumo = (lote: Lote & { skus: Sku }) => {
    const exists = insumosSelecionados.find(i => i.id_lote === lote.id_lote)
    
    if (exists) {
      // Remove
      setInsumosSelecionados(prev => prev.filter(i => i.id_lote !== lote.id_lote))
    } else {
      // Adiciona
      const skuData = lote.skus as any
      setInsumosSelecionados(prev => [...prev, {
        id_lote: lote.id_lote,
        id_sku: lote.id_sku,
        nome_produto: skuData?.nome_produto || 'Produto',
        classe_terapeutica: skuData?.classe_terapeutica || 'Outros',
        quantidade: 1,
        preco_unitario_custo: lote.preco_unitario || 0,
        preco_unitario_venda: skuData?.valor_venda || 0,
        validade: lote.validade,
        quantidade_disponivel: lote.quantidade_disponivel
      }])
    }
  }

  const handleUpdateQuantidade = (loteId: number, qtd: number) => {
    if (qtd < 1) return
    const insumo = insumosSelecionados.find(i => i.id_lote === loteId)
    if (insumo && qtd > insumo.quantidade_disponivel) {
      alert(`Quantidade máxima disponível: ${insumo.quantidade_disponivel}`)
      return
    }
    setInsumosSelecionados(prev => prev.map(item =>
      item.id_lote === loteId ? { ...item, quantidade: qtd } : item
    ))
  }

  // ✅ NOVO: Handler para botões de desconto fixo
  const handleDescontoFixo = (percentual: number) => {
    const descontoCalculado = totais.vendaTotal * (percentual / 100)
    setDescontoValor(descontoCalculado)
  }

  const handleSave = async () => {
    if (!selectedPacienteId) return alert('Selecione um paciente')
    if (insumosSelecionados.length === 0) return alert('Adicione pelo menos um insumo')

    try {
      setLoading(true)
      await supabaseApi.createVenda({
        id_paciente: selectedPacienteId,
        data_venda: dataVenda,
        metodo_pagamento: metodoPagamento,
        parcelas: parcelas,
        // ✅ FIX UX: Converter para number no save
        desconto_valor: Number(descontoValor) || 0,
        // ✅ ITEM 6: Usar valor calculado em R$ (baseado no %)
        valor_entrada: totais.valorEntradaReais,
        // ✅ ITEM 6: Profissional responsável
        id_usuario_responsavel: profissionalSelecionado,
        // ✅ ITEM 6: IDs dos lotes como array
        items: insumosSelecionados.map(i => i.id_lote),
        insumos: insumosSelecionados.map(i => ({
          id_lote: i.id_lote,
          quantidade: i.quantidade
        }))
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
      alert('Erro ao salvar venda.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

  // ============ RENDER ============
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700">

        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-cyan-400">Registrar Venda</h2>
              <p className="text-xs text-slate-400">
                {step === 1 ? 'Selecionar Itens' : 'Resumo e Pagamento'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent"></div>
              <span className="ml-3 text-slate-400">Carregando produtos...</span>
            </div>
          ) : step === 1 ? (
            <div className="space-y-5">

              {/* Data e Paciente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Data da Venda</label>
                  <input
                    type="date"
                    value={dataVenda}
                    onChange={(e) => setDataVenda(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:border-cyan-400 outline-none"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-300 mb-2">Paciente</label>
                  <input
                    type="text"
                    placeholder="Buscar por nome ou CPF..."
                    value={buscaPaciente}
                    onChange={(e) => {
                      setBuscaPaciente(e.target.value)
                      if (!e.target.value.trim()) setSelectedPacienteId(null)
                    }}
                    className={`w-full bg-slate-800 border rounded-lg px-4 py-2.5 text-white outline-none ${
                      selectedPacienteId ? 'border-cyan-500' : 'border-slate-600'
                    }`}
                  />
                  
                  {buscaPaciente.trim() && !selectedPacienteId && (
                    <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                      {pacientesFiltrados.length > 0 ? pacientesFiltrados.map(p => (
                        <button
                          key={p.id_paciente}
                          type="button"
                          onClick={() => {
                            setSelectedPacienteId(p.id_paciente)
                            setBuscaPaciente(p.nome_completo || '')
                          }}
                          className="w-full px-4 py-2 text-left hover:bg-slate-700 border-b border-slate-700 last:border-b-0"
                        >
                          <p className="text-white text-sm">{p.nome_completo}</p>
                          <p className="text-slate-400 text-xs">CPF: {p.cpf}</p>
                        </button>
                      )) : (
                        <p className="px-4 py-3 text-slate-400 text-sm">Nenhum paciente encontrado</p>
                      )}
                    </div>
                  )}

                  {selectedPacienteId && (
                    <div className="flex items-center justify-between mt-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 rounded">
                      <span className="text-cyan-400 text-xs">✓ Paciente selecionado</span>
                      <button onClick={() => { setSelectedPacienteId(null); setBuscaPaciente('') }} className="text-slate-400 text-xs hover:text-white">
                        Alterar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* ✅ ITEM 6: CATEGORIAS COM DESIGN DESTACADO */}
              {CATEGORIAS_FIXAS.map(categoria => {
                const lotesCategoria = lotesPorCategoria[categoria] || []
                const insumosDaCategoria = insumosSelecionados.filter(i => normalizarCategoria(i.classe_terapeutica) === categoria)

                if (lotesCategoria.length === 0 && insumosDaCategoria.length === 0) return null

                // ✅ ITEM 6: Cores por categoria para destaque
                const coresCategoria: Record<string, { bg: string; border: string; text: string; icon: string }> = {
                  'Toxina Botulínica': { bg: 'bg-pink-500/10', border: 'border-pink-500/40', text: 'text-pink-400', icon: '💉' },
                  'Preenchedor': { bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-400', icon: '✨' },
                  'Bioestimulador': { bg: 'bg-purple-500/10', border: 'border-purple-500/40', text: 'text-purple-400', icon: '🔬' },
                  'Bioregenerador': { bg: 'bg-green-500/10', border: 'border-green-500/40', text: 'text-green-400', icon: '🌿' },
                  'Tecnologia': { bg: 'bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-400', icon: '⚡' },
                  'Outros': { bg: 'bg-slate-500/10', border: 'border-slate-500/40', text: 'text-slate-400', icon: '📦' }
                }
                const cores = coresCategoria[categoria] || coresCategoria['Outros']

                return (
                  <div key={categoria} className="mb-6">
                    {/* ✅ ITEM 6: Título da categoria com DESTAQUE MAIOR */}
                    <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg ${cores.bg} border ${cores.border}`}>
                      <span className="text-2xl">{cores.icon}</span>
                      <div className="flex-1">
                        <h4 className={`text-lg font-bold ${cores.text} uppercase tracking-wide`}>{categoria}</h4>
                        <span className="text-xs text-slate-500">{lotesCategoria.length} produto(s) disponível(is)</span>
                      </div>
                      {insumosDaCategoria.length > 0 && (
                        <span className="px-3 py-1 bg-teal-500 text-black text-sm font-bold rounded-full">
                          {insumosDaCategoria.length} selecionado(s)
                        </span>
                      )}
                    </div>

                    {/* Cards de produtos */}
                    <div className="space-y-2 pl-2">
                      {lotesCategoria.map(lote => {
                        const skuData = lote.skus as any
                        const isSelected = insumosSelecionados.some(i => i.id_lote === lote.id_lote)
                        const insumoSelecionado = insumosSelecionados.find(i => i.id_lote === lote.id_lote)

                        return (
                          <div
                            key={lote.id_lote}
                            className={`rounded-lg overflow-hidden transition-all duration-200 ${
                              isSelected 
                                ? 'border-2 border-teal-400 bg-slate-800' 
                                : 'border border-slate-600 bg-slate-900 hover:bg-slate-800'
                            }`}
                          >
                            {/* Header clicável */}
                            <div
                              onClick={() => handleToggleInsumo(lote)}
                              className="px-4 py-3 flex justify-between items-center cursor-pointer"
                            >
                              <div className="flex-1">
                                <span className="text-sm font-medium text-white">{skuData?.nome_produto || 'Produto'}</span>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-xs text-slate-400">Estoque: {lote.quantidade_disponivel}</span>
                                  <span className="text-xs text-slate-400">Val: {new Date(lote.validade).toLocaleDateString('pt-BR')}</span>
                                  <span className="text-xs text-teal-400 font-medium">{formatCurrency(skuData?.valor_venda || 0)}</span>
                                </div>
                              </div>
                              
                              {/* Ícone Check */}
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                                isSelected ? 'bg-teal-500 scale-100' : 'bg-slate-700 scale-75 opacity-30'
                              }`}>
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            </div>

                            {/* Área de quantidade (expande quando selecionado) */}
                            <div className={`overflow-hidden transition-all duration-300 bg-slate-800 border-t border-slate-700 ${
                              isSelected ? 'max-h-14 opacity-100 py-2 px-4' : 'max-h-0 opacity-0 py-0'
                            }`}>
                              <div className="flex items-center gap-3">
                                <label className="text-xs text-slate-400">Quantidade:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={lote.quantidade_disponivel}
                                  value={insumoSelecionado?.quantidade || 1}
                                  onChange={(e) => handleUpdateQuantidade(lote.id_lote, parseInt(e.target.value) || 1)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-16 px-2 py-1 text-center text-white bg-slate-900 border border-slate-600 rounded focus:border-teal-400 outline-none"
                                />
                                <span className="text-xs text-slate-500">máx: {lote.quantidade_disponivel}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Resumo com gamificação */}
              <div className={`rounded-xl p-5 bg-slate-950 transition-all duration-500 ${nivelCombo.borderClass}`}>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-white font-semibold">Resumo de Itens</h4>
                  <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${nivelCombo.badgeClass}`}>
                    {nivelCombo.label}
                  </span>
                </div>

                {insumosSelecionados.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">Nenhum item selecionado.</p>
                ) : (
                  <ul className="space-y-2 mb-4">
                    {insumosSelecionados.map(item => (
                      <li key={item.id_lote} className="flex justify-between text-sm text-slate-300 pb-2 border-b border-slate-800">
                        <span>{item.nome_produto}</span>
                        <span className="text-cyan-400">x{item.quantidade}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Stats do Combo */}
                <div className="flex gap-4 pt-4 border-t border-slate-800">
                  <div className="text-center flex-1">
                    <p className="text-xs text-slate-500">Toxina</p>
                    <p className="text-lg font-bold text-white">{contagemCategorias.toxina}</p>
                  </div>
                  <div className="text-center flex-1 border-x border-slate-700">
                    <p className="text-xs text-slate-500">Preenchedor</p>
                    <p className="text-lg font-bold text-white">{contagemCategorias.preenchedor}</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-xs text-slate-500">Especiais</p>
                    <p className="text-lg font-bold text-white">{contagemCategorias.especiais}</p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-slate-400">Total:</span>
                  <span className="text-2xl font-bold text-cyan-400">{formatCurrency(totais.vendaTotal)}</span>
                </div>
              </div>
            </div>
          ) : (
            /* Step 2: Resumo e Pagamento */
            <div className="space-y-5">
              {/* Resumo */}
              <div className={`rounded-xl p-5 bg-slate-800 ${nivelCombo.borderClass}`}>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Resumo de Itens</h3>
                  <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${nivelCombo.badgeClass}`}>{nivelCombo.label}</span>
                </div>
                <div className="space-y-2 mb-4">
                  {insumosSelecionados.map(item => (
                    <div key={item.id_lote} className="flex justify-between py-2 border-b border-slate-700">
                      <div>
                        <p className="text-white text-sm">{item.nome_produto}</p>
                        <p className="text-slate-400 text-xs">{item.classe_terapeutica} • x{item.quantidade}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-cyan-400 text-sm">{formatCurrency(item.preco_unitario_venda * item.quantidade)}</p>
                        <p className="text-slate-500 text-xs">Custo: {formatCurrency(item.preco_unitario_custo * item.quantidade)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-900 rounded-lg">
                  <div className="text-center"><p className="text-xs text-slate-400">Toxina</p><p className="text-lg font-bold text-white">{contagemCategorias.toxina}</p></div>
                  <div className="text-center border-x border-slate-700"><p className="text-xs text-slate-400">Preenchedor</p><p className="text-lg font-bold text-white">{contagemCategorias.preenchedor}</p></div>
                  <div className="text-center"><p className="text-xs text-slate-400">Especiais</p><p className="text-lg font-bold text-white">{contagemCategorias.especiais}</p></div>
                </div>
                <div className="space-y-2 pt-4 border-t border-slate-600 mt-4">
                  <div className="flex justify-between"><span className="text-slate-400">Valor Total:</span><span className="text-white font-bold">{formatCurrency(totais.vendaTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Custo Total:</span><span className="text-slate-300">{formatCurrency(totais.custoTotal)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Margem:</span><span className="text-green-400">{totais.margemPercentual.toFixed(1)}%</span></div>
                </div>
              </div>

              {/* Desconto com Botões Fixos */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-bold text-cyan-400 mb-3">Desconto</h4>
                
                {/* ✅ NOVO: Botões de desconto fixo */}
                <div className="mb-4">
                  <label className="block text-xs text-slate-400 mb-2">Atalhos de Desconto</label>
                  <div className="grid grid-cols-4 gap-2">
                    {DESCONTOS_FIXOS.map(pct => (
                      <button
                        key={pct}
                        onClick={() => handleDescontoFixo(pct)}
                        className="px-3 py-2 bg-slate-700 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Valor (R$)</label>
                    <input 
                      type="number" 
                      min="0" 
                      max={totais.vendaTotal} 
                      value={descontoValor} 
                      onChange={(e) => setDescontoValor(e.target.value === '' ? '' : Number(e.target.value))}
                      onFocus={(e) => { if (e.target.value === '0') setDescontoValor('') }}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" 
                    />
                  </div>
                  <div className="flex items-end"><div className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2"><span className="text-slate-400 text-sm">Percentual: </span><span className="text-cyan-400 font-bold">{totais.descontoPercentual.toFixed(1)}%</span></div></div>
                </div>
                <div className="mt-3 flex justify-between p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                  <span className="text-cyan-400 font-medium">Valor Final:</span>
                  <span className="text-cyan-400 font-bold text-lg">{formatCurrency(totais.precoFinal)}</span>
                </div>
              </div>

              {/* ✅ ITEM 6: Profissional Responsável */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-bold text-cyan-400 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" /> Profissional Responsável
                </h4>
                <select
                  value={profissionalSelecionado || ''}
                  onChange={(e) => setProfissionalSelecionado(e.target.value ? Number(e.target.value) : null)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                >
                  <option value="">Selecione o profissional...</option>
                  {profissionais.map(prof => (
                    <option key={prof.id} value={prof.id}>
                      {prof.nome} {prof.perfil === 'proprietario' ? '(Proprietário)' : prof.perfil === 'comissionado' ? `(${prof.percentual_profissional || 0}% comissão)` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pagamento */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-bold text-cyan-400 mb-3">Forma de Pagamento</h4>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(['PIX', 'Débito', 'Crédito'] as const).map(metodo => (
                    <button key={metodo} onClick={() => { setMetodoPagamento(metodo); if (metodo !== 'Crédito') setParcelas(1) }} className={`py-3 rounded-lg font-medium transition-all ${metodoPagamento === metodo ? 'bg-cyan-500 text-black' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      {metodo}
                    </button>
                  ))}
                </div>
                {metodoPagamento === 'Crédito' && (
                  <div className="grid grid-cols-2 gap-4">
                    {/* ✅ ITEM 6: Entrada em % (não mais em R$) */}
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Entrada (%)</label>
                      <input 
                        type="number" 
                        min="0"
                        max="100"
                        step="5"
                        value={entradaPercentual} 
                        onChange={(e) => setEntradaPercentual(e.target.value === '' ? '' : Math.min(100, Number(e.target.value)))}
                        onFocus={(e) => { if (e.target.value === '0') setEntradaPercentual('') }}
                        placeholder="Ex: 30"
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white" 
                      />
                      {/* Mostrar valor em R$ calculado */}
                      {totais.valorEntradaReais > 0 && (
                        <p className="text-xs text-cyan-400 mt-1">= {formatCurrency(totais.valorEntradaReais)}</p>
                      )}
                    </div>
                    <div><label className="block text-xs text-slate-400 mb-1">Parcelas</label><select value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white">{[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n}x</option>)}</select></div>
                  </div>
                )}
                {metodoPagamento === 'Crédito' && parcelas > 1 && (
                  <div className="mt-4 p-3 bg-slate-900 rounded-lg flex justify-between">
                    <span className="text-slate-400">Valor da Parcela:</span>
                    <span className="text-cyan-400 font-bold">{parcelas}x de {formatCurrency(totais.valorParcela)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-700 bg-slate-800/50 flex justify-between">
          <Button variant="secondary" onClick={step === 1 ? onClose : () => setStep(1)}>
            {step === 1 ? 'Cancelar' : '← Voltar'}
          </Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={insumosSelecionados.length === 0 || !selectedPacienteId}>
              Continuar →
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando...' : '✓ Finalizar Venda'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}