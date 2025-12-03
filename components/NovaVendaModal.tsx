'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Trash2, Check, ShoppingCart } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { Paciente, Lote, Sku } from '@/types/database'

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

// ✅ 6 CATEGORIAS FIXAS - SEMPRE VISÍVEIS
const CATEGORIAS_FIXAS = [
  'Toxina Botulínica',
  'Preenchedor',
  'Bioestimulador',
  'Bioregenerador',
  'Tecnologia',
  'Outros'
]

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
const determinarNivelCombo = (toxina: number, preenchedor: number, especiais: number): {
  nivel: 'none' | 'basic' | 'standard' | 'premium' | 'ultra'
  label: string
  borderClass: string
  badgeClass: string
} => {
  // Ultra: Toxina >= 2, Preenchedor >= 5, Especiais >= 2
  if (toxina >= 2 && preenchedor >= 5 && especiais >= 2) {
    return {
      nivel: 'ultra',
      label: 'Combo Ultra',
      borderClass: 'border-2 border-yellow-400 shadow-[0_0_30px_rgba(251,191,36,0.5)]',
      badgeClass: 'bg-yellow-400 text-black'
    }
  }
  
  // Premium: Toxina >= 2, Preenchedor >= 4, Especiais >= 1
  if (toxina >= 2 && preenchedor >= 4 && especiais >= 1) {
    return {
      nivel: 'premium',
      label: 'Combo Premium',
      borderClass: 'border-2 border-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.4)]',
      badgeClass: 'bg-purple-500 text-white'
    }
  }
  
  // Standard: Toxina >= 1, Preenchedor >= 4, Especiais >= 1
  if (toxina >= 1 && preenchedor >= 4 && especiais >= 1) {
    return {
      nivel: 'standard',
      label: 'Combo Standard',
      borderClass: 'border-2 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]',
      badgeClass: 'bg-cyan-400 text-black'
    }
  }
  
  // Basic: Toxina >= 1, Preenchedor >= 2, Especiais >= 1
  if (toxina >= 1 && preenchedor >= 2 && especiais >= 1) {
    return {
      nivel: 'basic',
      label: 'Combo Basic',
      borderClass: 'border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
      badgeClass: 'bg-green-500 text-black'
    }
  }
  
  // Sem combo
  return {
    nivel: 'none',
    label: 'Padrão',
    borderClass: 'border-2 border-slate-600',
    badgeClass: 'bg-slate-600 text-slate-300'
  }
}

export default function NovaVendaModal({ isOpen, onClose, onSuccess }: NovaVendaModalProps) {
  // ============ TODOS OS HOOKS PRIMEIRO ============
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [lotesDisponiveis, setLotesDisponiveis] = useState<(Lote & { skus: Sku })[]>([])
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0])
  const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(null)
  const [insumosSelecionados, setInsumosSelecionados] = useState<InsumoSelecionado[]>([])
  const [descontoValor, setDescontoValor] = useState(0)
  const [metodoPagamento, setMetodoPagamento] = useState<'PIX' | 'Débito' | 'Crédito'>('PIX')
  const [parcelas, setParcelas] = useState(1)
  const [valorEntrada, setValorEntrada] = useState(0)
  const [buscaPaciente, setBuscaPaciente] = useState('')

  // useCallback para funções estáveis
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [pacientesData, produtosData] = await Promise.all([
        supabaseApi.getPacientes(),
        supabaseApi.getProdutos()
      ])

      setPacientes(pacientesData)

      const lotes: (Lote & { skus: Sku })[] = []
      produtosData.forEach((prod: any) => {
        if (prod.lotes && prod.lotes.length > 0) {
          prod.lotes.forEach((lote: Lote) => {
            lotes.push({ ...lote, skus: prod })
          })
        }
      })
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
    setDescontoValor(0)
    setMetodoPagamento('PIX')
    setParcelas(1)
    setValorEntrada(0)
    setBuscaPaciente('')
  }, [])

  // useEffect
  useEffect(() => {
    if (isOpen) {
      loadData()
      resetForm()
    }
  }, [isOpen, loadData, resetForm])

  // useMemo - Cálculos de totais
  const totais = useMemo(() => {
    const custoTotal = insumosSelecionados.reduce((acc, item) =>
      acc + ((item.preco_unitario_custo || 0) * item.quantidade), 0)
    const vendaTotal = insumosSelecionados.reduce((acc, item) =>
      acc + ((item.preco_unitario_venda || 0) * item.quantidade), 0)

    const precoFinal = Math.max(0, vendaTotal - descontoValor)
    const descontoPercentual = vendaTotal > 0 ? (descontoValor / vendaTotal) * 100 : 0
    const valorParcelado = Math.max(0, precoFinal - valorEntrada)
    const valorParcela = parcelas > 0 ? valorParcelado / parcelas : 0

    // Margens
    const margemTotal = vendaTotal - custoTotal
    const margemPercentual = vendaTotal > 0 ? (margemTotal / vendaTotal) * 100 : 0
    const margemTotalFinal = precoFinal - custoTotal
    const margemPercentualFinal = precoFinal > 0 ? (margemTotalFinal / precoFinal) * 100 : 0

    return {
      custoTotal: isNaN(custoTotal) ? 0 : custoTotal,
      vendaTotal: isNaN(vendaTotal) ? 0 : vendaTotal,
      precoFinal: isNaN(precoFinal) ? 0 : precoFinal,
      descontoPercentual: isNaN(descontoPercentual) ? 0 : descontoPercentual,
      valorParcelado: isNaN(valorParcelado) ? 0 : valorParcelado,
      valorParcela: isNaN(valorParcela) ? 0 : valorParcela,
      margemTotal: isNaN(margemTotal) ? 0 : margemTotal,
      margemPercentual: isNaN(margemPercentual) ? 0 : margemPercentual,
      margemTotalFinal: isNaN(margemTotalFinal) ? 0 : margemTotalFinal,
      margemPercentualFinal: isNaN(margemPercentualFinal) ? 0 : margemPercentualFinal
    }
  }, [insumosSelecionados, descontoValor, valorEntrada, parcelas])

  // useMemo - Contagem por categoria para gamificação
  const contagemCategorias = useMemo(() => {
    const counts = { toxina: 0, preenchedor: 0, especiais: 0 }

    insumosSelecionados.forEach(item => {
      const categoria = normalizarCategoria(item.classe_terapeutica)

      if (categoria === 'Toxina Botulínica') {
        counts.toxina += item.quantidade
      } else if (categoria === 'Preenchedor') {
        counts.preenchedor += item.quantidade
      } else if (['Bioestimulador', 'Bioregenerador', 'Tecnologia'].includes(categoria)) {
        counts.especiais += item.quantidade
      }
    })

    return counts
  }, [insumosSelecionados])

  // useMemo - Nível do combo
  const nivelCombo = useMemo(() => {
    return determinarNivelCombo(
      contagemCategorias.toxina,
      contagemCategorias.preenchedor,
      contagemCategorias.especiais
    )
  }, [contagemCategorias])

  // useMemo - Lotes agrupados por categoria (6 categorias fixas)
  const lotesPorCategoria = useMemo(() => {
    const grouped: Record<string, typeof lotesDisponiveis> = {}

    // Inicializar todas as 6 categorias
    CATEGORIAS_FIXAS.forEach(cat => {
      grouped[cat] = []
    })

    // Distribuir lotes nas categorias
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

  // useMemo - Pacientes filtrados pela busca (autocomplete)
  const pacientesFiltrados = useMemo(() => {
    if (!buscaPaciente.trim()) return []
    const termo = buscaPaciente.toLowerCase().trim()
    return pacientes.filter(p =>
      p.nome_completo?.toLowerCase().includes(termo) ||
      p.cpf?.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
    ).slice(0, 10)
  }, [pacientes, buscaPaciente])

  // ✅ RETURN CONDICIONAL DEPOIS DE TODOS OS HOOKS
  if (!isOpen) return null

  // ============ HANDLERS ============
  const handleAddInsumo = (loteId: string, categoria: string) => {
    const id = parseInt(loteId)
    if (!id) return

    const lote = lotesDisponiveis.find(l => l.id_lote === id)
    if (!lote) return

    if (insumosSelecionados.some(i => i.id_lote === id)) return

    const skuData = lote.skus as any
    const valorVenda = skuData?.valor_venda || 0

    setInsumosSelecionados(prev => [...prev, {
      id_lote: lote.id_lote,
      id_sku: lote.id_sku,
      nome_produto: skuData?.nome_produto || 'Produto',
      classe_terapeutica: categoria,
      quantidade: 1,
      preco_unitario_custo: lote.preco_unitario || 0,
      preco_unitario_venda: valorVenda,
      validade: lote.validade,
      quantidade_disponivel: lote.quantidade_disponivel
    }])
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

  const handleRemoveInsumo = (loteId: number) => {
    setInsumosSelecionados(prev => prev.filter(i => i.id_lote !== loteId))
  }

  const handleSave = async () => {
    if (!selectedPacienteId) {
      alert('Selecione um paciente')
      return
    }

    if (insumosSelecionados.length === 0) {
      alert('Adicione pelo menos um insumo')
      return
    }

    try {
      setLoading(true)
      await supabaseApi.createVenda({
        id_paciente: selectedPacienteId,
        data_venda: dataVenda,
        metodo_pagamento: metodoPagamento,
        parcelas: parcelas,
        desconto_valor: descontoValor,
        valor_entrada: valorEntrada,
        insumos: insumosSelecionados.map(i => ({
          id_lote: i.id_lote,
          quantidade: i.quantidade
        }))
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao salvar venda:', error)
      alert('Erro ao salvar venda. Verifique o console.')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)

  // ============ RENDER ============
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-slate-700">

        {/* Header */}
        <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-cyan-400">Registrar Venda</h2>
              <p className="text-sm text-slate-400">
                {step === 1 ? 'Seleção de Insumos' : 'Resumo e Pagamento'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-slate-400 hover:text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">

          {/* Step 1: Seleção de Insumos */}
          {step === 1 && (
            <div className="space-y-6">

              {/* Data e Paciente */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data da Venda
                  </label>
                  <input
                    type="date"
                    value={dataVenda}
                    onChange={(e) => setDataVenda(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none"
                  />
                </div>
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Paciente
                  </label>
                  <input
                    type="text"
                    placeholder="Buscar por nome ou CPF..."
                    value={buscaPaciente}
                    onChange={(e) => {
                      setBuscaPaciente(e.target.value)
                      if (!e.target.value.trim()) {
                        setSelectedPacienteId(null)
                      }
                    }}
                    className={`w-full bg-slate-800 border rounded-lg px-4 py-3 text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none ${
                      selectedPacienteId ? 'border-cyan-500' : 'border-slate-600'
                    }`}
                  />
                  
                  {/* Dropdown de resultados */}
                  {buscaPaciente.trim().length >= 1 && !selectedPacienteId && (
                    <div 
                      className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl overflow-hidden"
                      style={{ zIndex: 9999, maxHeight: '240px', overflowY: 'auto' }}
                    >
                      {pacientesFiltrados.length > 0 ? (
                        pacientesFiltrados.map(p => (
                          <button
                            key={p.id_paciente}
                            type="button"
                            onClick={() => {
                              setSelectedPacienteId(p.id_paciente)
                              setBuscaPaciente(p.nome_completo || '')
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0 bg-slate-800"
                          >
                            <p className="text-white font-medium">{p.nome_completo}</p>
                            {p.cpf && (
                              <p className="text-slate-400 text-sm">CPF: {p.cpf}</p>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 bg-slate-800">
                          <p className="text-slate-400 text-sm text-center">Nenhum paciente encontrado</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Indicador de paciente selecionado */}
                  {selectedPacienteId && (
                    <div className="flex items-center justify-between mt-2 px-3 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                      <span className="text-cyan-400 text-sm">✓ Paciente selecionado</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPacienteId(null)
                          setBuscaPaciente('')
                        }}
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        Alterar
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Título da seção */}
              <h3 className="text-lg font-bold text-white border-b border-slate-700 pb-2">
                Selecionar Insumos
              </h3>

              {/* ✅ CATEGORIAS - APENAS COM PRODUTOS DISPONÍVEIS */}
              <div className="space-y-4">
                {CATEGORIAS_FIXAS.map(categoria => {
                  const lotesCategoria = lotesPorCategoria[categoria] || []
                  const lotesNaoSelecionados = lotesCategoria.filter(l =>
                    !insumosSelecionados.some(i => i.id_lote === l.id_lote)
                  )
                  const insumosDaCategoria = insumosSelecionados.filter(i =>
                    normalizarCategoria(i.classe_terapeutica) === categoria
                  )

                  // ✅ OCULTAR categoria se não tem produtos E não tem selecionados
                  if (lotesCategoria.length === 0 && insumosDaCategoria.length === 0) {
                    return null
                  }

                  return (
                    <div key={categoria} className="bg-slate-800 rounded-lg overflow-hidden">
                      {/* Header da categoria */}
                      <div className="px-4 py-3 bg-slate-700/50 border-l-4 border-cyan-400">
                        <h4 className="text-sm font-bold text-cyan-400 uppercase tracking-wide">
                          {categoria}
                        </h4>
                        <p className="text-xs text-slate-400">
                          {lotesCategoria.length} produto(s) disponível(is) • {insumosDaCategoria.length} selecionado(s)
                        </p>
                      </div>

                      <div className="p-4 space-y-3">
                        {/* Select para adicionar insumo */}
                        {lotesNaoSelecionados.length > 0 ? (
                          <select
                            onChange={(e) => handleAddInsumo(e.target.value, categoria)}
                            value=""
                            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-cyan-400 outline-none"
                          >
                            <option value="">+ Adicionar insumo desta categoria...</option>
                            {lotesNaoSelecionados.map(lote => {
                              const skuData = lote.skus as any
                              return (
                                <option key={lote.id_lote} value={lote.id_lote}>
                                  {skuData?.nome_produto} - Qtd: {lote.quantidade_disponivel} - Val: {new Date(lote.validade).toLocaleDateString('pt-BR')}
                                </option>
                              )
                            })}
                          </select>
                        ) : (
                          <p className="text-green-400 text-sm">
                            ✓ Todos os produtos desta categoria já foram selecionados
                          </p>
                        )}

                        {/* Insumos selecionados desta categoria */}
                        {insumosDaCategoria.map(insumo => (
                          <div
                            key={insumo.id_lote}
                            className="flex items-center justify-between bg-slate-900 border border-cyan-500/30 rounded-lg p-3"
                          >
                            <div className="flex-1">
                              <p className="text-white font-medium text-sm">{insumo.nome_produto}</p>
                              <p className="text-slate-400 text-xs">
                                Val: {new Date(insumo.validade).toLocaleDateString('pt-BR')} •
                                Disp: {insumo.quantidade_disponivel} •
                                Venda: {formatCurrency(insumo.preco_unitario_venda)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <label className="text-slate-400 text-xs">Qtd:</label>
                                <input
                                  type="number"
                                  min="1"
                                  max={insumo.quantidade_disponivel}
                                  value={insumo.quantidade}
                                  onChange={(e) => handleUpdateQuantidade(insumo.id_lote, parseInt(e.target.value) || 1)}
                                  className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-center text-sm"
                                />
                              </div>
                              <button
                                onClick={() => handleRemoveInsumo(insumo.id_lote)}
                                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 2: Resumo e Pagamento */}
          {step === 2 && (
            <div className="space-y-6">

              {/* ✅ RESUMO COM BORDA DINÂMICA (GAMIFICAÇÃO) */}
              <div className={`rounded-xl p-6 bg-slate-800 transition-all duration-500 ${nivelCombo.borderClass}`}>

                {/* Badge do nível */}
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Resumo de Itens</h3>
                  <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${nivelCombo.badgeClass}`}>
                    {nivelCombo.label}
                  </span>
                </div>

                {/* Lista de itens */}
                <div className="space-y-2 mb-6">
                  {insumosSelecionados.length === 0 ? (
                    <p className="text-slate-500 italic">Nenhum item selecionado.</p>
                  ) : (
                    insumosSelecionados.map(item => (
                      <div
                        key={item.id_lote}
                        className="flex justify-between items-center py-2 border-b border-slate-700"
                      >
                        <div className="flex-1">
                          <p className="text-white text-sm">{item.nome_produto}</p>
                          <p className="text-slate-400 text-xs">{item.classe_terapeutica} • x{item.quantidade}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-cyan-400 text-sm font-medium">
                            {formatCurrency(item.preco_unitario_venda * item.quantidade)}
                          </p>
                          <p className="text-slate-500 text-xs">
                            Custo: {formatCurrency(item.preco_unitario_custo * item.quantidade)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Indicadores de combo */}
                <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-slate-900 rounded-lg">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Toxina</p>
                    <p className="text-lg font-bold text-white">{contagemCategorias.toxina}</p>
                  </div>
                  <div className="text-center border-x border-slate-700">
                    <p className="text-xs text-slate-400">Preenchedor</p>
                    <p className="text-lg font-bold text-white">{contagemCategorias.preenchedor}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Especiais</p>
                    <p className="text-lg font-bold text-white">{contagemCategorias.especiais}</p>
                  </div>
                </div>

                {/* Totais */}
                <div className="space-y-2 pt-4 border-t border-slate-600">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Valor Total:</span>
                    <span className="text-white font-bold">{formatCurrency(totais.vendaTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Custo Total:</span>
                    <span className="text-slate-300">{formatCurrency(totais.custoTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Margem (s/ desc.):</span>
                    <span className="text-green-400">{totais.margemPercentual.toFixed(2)}%</span>
                  </div>
                </div>
              </div>

              {/* Desconto */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-bold text-cyan-400 mb-3">Desconto</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Valor do Desconto (R$)</label>
                    <input
                      type="number"
                      min="0"
                      max={totais.vendaTotal}
                      value={descontoValor}
                      onChange={(e) => setDescontoValor(Number(e.target.value) || 0)}
                      className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <div className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2">
                      <span className="text-slate-400 text-sm">Percentual: </span>
                      <span className="text-cyan-400 font-bold">{totais.descontoPercentual.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex justify-between p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
                  <span className="text-cyan-400 font-medium">Valor Final:</span>
                  <span className="text-cyan-400 font-bold text-lg">{formatCurrency(totais.precoFinal)}</span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-400">Margem (c/ desc.):</span>
                  <span className="text-green-400 font-medium">{totais.margemPercentualFinal.toFixed(2)}%</span>
                </div>
              </div>

              {/* Pagamento */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-bold text-cyan-400 mb-3">Forma de Pagamento</h4>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {(['PIX', 'Débito', 'Crédito'] as const).map(metodo => (
                    <button
                      key={metodo}
                      onClick={() => {
                        setMetodoPagamento(metodo)
                        if (metodo !== 'Crédito') setParcelas(1)
                      }}
                      className={`py-3 px-4 rounded-lg font-medium transition-all ${metodoPagamento === metodo
                        ? 'bg-cyan-500 text-black'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                      {metodo}
                    </button>
                  ))}
                </div>

                {metodoPagamento === 'Crédito' && (
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Valor de Entrada (R$)</label>
                      <input
                        type="number"
                        min="0"
                        max={totais.precoFinal}
                        value={valorEntrada}
                        onChange={(e) => setValorEntrada(Number(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Número de Parcelas</label>
                      <select
                        value={parcelas}
                        onChange={(e) => setParcelas(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {metodoPagamento === 'Crédito' && parcelas > 1 && (
                  <div className="mt-4 p-3 bg-slate-900 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Valor a Parcelar:</span>
                      <span className="text-white">{formatCurrency(totais.valorParcelado)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Valor da Parcela:</span>
                      <span className="text-cyan-400 font-bold">
                        {parcelas}x de {formatCurrency(totais.valorParcela)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-between">
          {step === 1 ? (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={insumosSelecionados.length === 0 || !selectedPacienteId}
              >
                Continuar para Pagamento
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setStep(1)}>
                ← Voltar
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : 'Finalizar Venda'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}