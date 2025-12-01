'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Trash2, Check } from 'lucide-react'
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
    }, [])

    // useEffect
    useEffect(() => {
        if (isOpen) {
            loadData()
            resetForm()
        }
    }, [isOpen, loadData, resetForm])

    // useMemo - Cálculos
    const totais = useMemo(() => {
        const custoTotal = insumosSelecionados.reduce((acc, item) => 
            acc + ((item.preco_unitario_custo || 0) * item.quantidade), 0)
        const vendaTotal = insumosSelecionados.reduce((acc, item) => 
            acc + ((item.preco_unitario_venda || 0) * item.quantidade), 0)

        const precoFinal = Math.max(0, vendaTotal - descontoValor)
        const descontoPercentual = vendaTotal > 0 ? (descontoValor / vendaTotal) * 100 : 0
        const valorParcelado = Math.max(0, precoFinal - valorEntrada)
        const valorParcela = parcelas > 0 ? valorParcelado / parcelas : 0

        return {
            custoTotal: isNaN(custoTotal) ? 0 : custoTotal,
            vendaTotal: isNaN(vendaTotal) ? 0 : vendaTotal,
            precoFinal: isNaN(precoFinal) ? 0 : precoFinal,
            descontoPercentual: isNaN(descontoPercentual) ? 0 : descontoPercentual,
            valorParcelado: isNaN(valorParcelado) ? 0 : valorParcelado,
            valorParcela: isNaN(valorParcela) ? 0 : valorParcela
        }
    }, [insumosSelecionados, descontoValor, valorEntrada, parcelas])

    const borderClass = useMemo(() => {
        const counts = { toxina: 0, preenchedor: 0, bio: 0 }

        insumosSelecionados.forEach(item => {
            const classe = (item.classe_terapeutica || '').toUpperCase()
            if (classe.includes('TOXINA')) counts.toxina += item.quantidade
            else if (classe.includes('PREENCHEDOR')) counts.preenchedor += item.quantidade
            else if (['BIOESTIMULADOR', 'BIOREGENERADOR', 'TECNOLOGIA'].some(c => classe.includes(c))) 
                counts.bio += item.quantidade
        })

        if (counts.toxina === 2 && counts.preenchedor === 2 && counts.bio === 1) 
            return 'border-l-4 border-l-yellow-400'
        if (counts.toxina === 2 && counts.preenchedor === 4 && counts.bio === 1) 
            return 'border-l-4 border-l-orange-500'
        if (counts.toxina === 4 && counts.preenchedor === 5 && counts.bio === 2) 
            return 'border-l-4 border-l-purple-600'

        return 'border border-gray-200 dark:border-clinic-cyan/20'
    }, [insumosSelecionados])

    const lotesPorClasse = useMemo(() => {
        const grouped: Record<string, typeof lotesDisponiveis> = {}
        
        lotesDisponiveis.forEach(lote => {
            const skuData = lote.skus as any
            const classe = skuData?.classe_terapeutica || 'OUTROS'
            if (!grouped[classe]) grouped[classe] = []
            grouped[classe].push(lote)
        })

        return grouped
    }, [lotesDisponiveis])

    // ✅ RETURN CONDICIONAL DEPOIS DE TODOS OS HOOKS
    if (!isOpen) return null

    // ============ HANDLERS (não são hooks) ============
    const handleAddInsumo = (loteId: string) => {
        const id = parseInt(loteId)
        const lote = lotesDisponiveis.find(l => l.id_lote === id)
        if (!lote) return

        if (insumosSelecionados.some(i => i.id_lote === id)) return

        const skuData = lote.skus as any
        const valorVenda = skuData?.valor_venda || 0

        setInsumosSelecionados(prev => [...prev, {
            id_lote: lote.id_lote,
            id_sku: lote.id_sku,
            nome_produto: skuData?.nome_produto || 'Produto',
            classe_terapeutica: skuData?.classe_terapeutica || 'Outros',
            quantidade: 1,
            preco_unitario_custo: lote.preco_unitario || 0,
            preco_unitario_venda: valorVenda,
            validade: lote.validade
        }])
    }

    const handleUpdateQuantidade = (loteId: number, qtd: number) => {
        if (qtd < 1) return
        setInsumosSelecionados(prev => prev.map(item =>
            item.id_lote === loteId ? { ...item, quantidade: qtd } : item
        ))
    }

    const handleRemoveInsumo = (loteId: number) => {
        setInsumosSelecionados(prev => prev.filter(i => i.id_lote !== loteId))
    }

    const handleSave = async () => {
        if (!selectedPacienteId) return

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

    // ============ RENDER ============
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`bg-white dark:bg-clinic-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden ${borderClass}`}>
                
                <div className="p-6 border-b border-gray-200 dark:border-clinic-cyan/20 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-clinic-cyan">Nova Venda</h2>
                        <p className="text-sm text-gray-500 dark:text-clinic-gray-400">
                            {step === 1 ? 'Seleção de Insumos' : 'Resumo e Pagamento'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-clinic-gray-400 dark:hover:text-clinic-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Data da Venda"
                                    type="date"
                                    value={dataVenda}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataVenda(e.target.value)}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-clinic-gray-300 mb-1">
                                        Paciente
                                    </label>
                                    <select
                                        value={selectedPacienteId || ''}
                                        onChange={(e) => setSelectedPacienteId(parseInt(e.target.value) || null)}
                                        className="w-full bg-gray-50 dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded-lg px-3 py-2 text-gray-900 dark:text-clinic-white"
                                    >
                                        <option value="">Selecione um paciente...</option>
                                        {pacientes.map(p => (
                                            <option key={p.id_paciente} value={p.id_paciente}>
                                                {p.nome_completo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-clinic-white">
                                    Selecionar Insumos
                                </h3>
                                
                                {Object.entries(lotesPorClasse).map(([classe, lotes]) => {
                                    const lotesNaoSelecionados = lotes.filter(l => 
                                        !insumosSelecionados.some(i => i.id_lote === l.id_lote)
                                    )
                                    
                                    if (lotesNaoSelecionados.length === 0) return null

                                    return (
                                        <div key={classe} className="bg-gray-50 dark:bg-clinic-gray-700/30 p-4 rounded-lg">
                                            <h4 className="text-sm font-semibold text-clinic-cyan mb-2">{classe}</h4>
                                            <select
                                                onChange={(e) => handleAddInsumo(e.target.value)}
                                                value=""
                                                className="w-full bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded-lg px-3 py-2 text-gray-900 dark:text-clinic-white"
                                            >
                                                <option value="">+ Adicionar insumo...</option>
                                                {lotesNaoSelecionados.map(lote => {
                                                    const skuData = lote.skus as any
                                                    return (
                                                        <option key={lote.id_lote} value={lote.id_lote}>
                                                            {skuData?.nome_produto} - Qtd: {lote.quantidade_disponivel} - Val: {new Date(lote.validade).toLocaleDateString('pt-BR')}
                                                        </option>
                                                    )
                                                })}
                                            </select>

                                            <div className="mt-2 space-y-2">
                                                {insumosSelecionados
                                                    .filter(i => (i.classe_terapeutica || '').toUpperCase() === classe.toUpperCase())
                                                    .map(item => (
                                                        <div key={item.id_lote} className="flex items-center justify-between bg-white dark:bg-clinic-gray-700 p-2 rounded">
                                                            <div className="flex-1 min-w-0 mr-2">
                                                                <p className="text-sm font-medium truncate text-gray-900 dark:text-clinic-white">
                                                                    {item.nome_produto}
                                                                </p>
                                                                <p className="text-xs text-gray-500">
                                                                    Custo: R$ {(item.preco_unitario_custo || 0).toFixed(2)} | Venda: R$ {(item.preco_unitario_venda || 0).toFixed(2)}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantidade}
                                                                    onChange={(e) => handleUpdateQuantidade(item.id_lote, parseInt(e.target.value))}
                                                                    className="w-16 bg-gray-50 dark:bg-clinic-gray-600 border rounded px-2 py-1 text-sm text-center"
                                                                />
                                                                <button 
                                                                    onClick={() => handleRemoveInsumo(item.id_lote)} 
                                                                    className="text-red-500 hover:text-red-700"
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

                            {insumosSelecionados.length > 0 && (
                                <div className="bg-clinic-cyan/10 p-4 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600 dark:text-clinic-gray-300">
                                            {insumosSelecionados.length} item(s) selecionado(s)
                                        </span>
                                        <span className="text-lg font-bold text-clinic-cyan">
                                            R$ {totais.vendaTotal.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 dark:bg-clinic-gray-700/30 p-4 rounded-lg">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-clinic-white mb-4">
                                    Resumo Financeiro
                                </h3>

                                <div className="mb-4 max-h-40 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-gray-500">
                                                <th className="pb-2">Item</th>
                                                <th className="pb-2 text-right">Qtd</th>
                                                <th className="pb-2 text-right">Unit.</th>
                                                <th className="pb-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {insumosSelecionados.map(item => (
                                                <tr key={item.id_lote} className="border-t border-gray-200 dark:border-gray-700">
                                                    <td className="py-2">{item.nome_produto}</td>
                                                    <td className="py-2 text-right">{item.quantidade}</td>
                                                    <td className="py-2 text-right">R$ {(item.preco_unitario_venda || 0).toFixed(2)}</td>
                                                    <td className="py-2 text-right font-medium">
                                                        R$ {((item.preco_unitario_venda || 0) * item.quantidade).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Valor Total Venda</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-clinic-white">
                                            R$ {totais.vendaTotal.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Custo Total</p>
                                        <p className="text-xl font-bold text-red-500">
                                            R$ {totais.custoTotal.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <Input
                                        label="Desconto (R$)"
                                        type="number"
                                        value={descontoValor}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescontoValor(parseFloat(e.target.value) || 0)}
                                        placeholder="Valor do desconto"
                                    />
                                    <p className="text-sm text-gray-500">
                                        Desconto Aplicado: {totais.descontoPercentual.toFixed(2)}%
                                    </p>

                                    <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                        <p className="text-sm text-gray-500">Preço Final</p>
                                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                            R$ {totais.precoFinal.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-clinic-gray-300 mb-1">
                                            Método Pagamento
                                        </label>
                                        <select
                                            value={metodoPagamento}
                                            onChange={(e) => setMetodoPagamento(e.target.value as 'PIX' | 'Débito' | 'Crédito')}
                                            className="w-full bg-gray-50 dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded-lg px-3 py-2"
                                        >
                                            <option value="PIX">PIX</option>
                                            <option value="Débito">Débito</option>
                                            <option value="Crédito">Crédito</option>
                                        </select>
                                    </div>

                                    <Input
                                        label="Valor Entrada (R$)"
                                        type="number"
                                        value={valorEntrada}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValorEntrada(parseFloat(e.target.value) || 0)}
                                        placeholder="Valor em R$"
                                    />

                                    {metodoPagamento === 'Crédito' && (
                                        <>
                                            <Input
                                                label="Número de Parcelas"
                                                type="number"
                                                min="1"
                                                max="12"
                                                value={parcelas}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParcelas(parseInt(e.target.value) || 1)}
                                            />
                                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm text-blue-700 dark:text-blue-300">
                                                <p>Valor Parcelado: R$ {totais.valorParcelado.toFixed(2)}</p>
                                                <p>{parcelas}x de R$ {totais.valorParcela.toFixed(2)}</p>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-clinic-cyan/20 flex justify-between">
                    {step === 2 ? (
                        <Button variant="secondary" onClick={() => setStep(1)}>Voltar</Button>
                    ) : (
                        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
                    )}

                    {step === 1 ? (
                        <Button 
                            onClick={() => setStep(2)} 
                            disabled={insumosSelecionados.length === 0 || !selectedPacienteId}
                        >
                            Continuar <Check className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleSave} 
                            disabled={loading || totais.precoFinal <= 0}
                        >
                            {loading ? 'Salvando...' : 'Finalizar Venda'} <Check className="w-4 h-4 ml-2" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}