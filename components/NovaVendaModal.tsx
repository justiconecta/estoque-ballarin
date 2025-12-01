'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { X, Plus, Trash2, Calculator, Check, AlertCircle } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
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

const CLASSES_TERAPEUTICAS = [
    'TOXINA BOTULÍNICA',
    'PREENCHEDOR',
    'BIOESTIMULADOR',
    'BIOREGENERADOR',
    'TECNOLOGIA',
    'OUTROS'
]

export default function NovaVendaModal({ isOpen, onClose, onSuccess }: NovaVendaModalProps) {
    const [loading, setLoading] = useState(false)
    const [step, setStep] = useState(1) // 1: Seleção, 2: Resumo/Pagamento

    // Dados carregados
    const [pacientes, setPacientes] = useState<Paciente[]>([])
    const [lotesDisponiveis, setLotesDisponiveis] = useState<(Lote & { skus: Sku })[]>([])

    // Form State
    const [dataVenda, setDataVenda] = useState(new Date().toISOString().split('T')[0])
    const [selectedPacienteId, setSelectedPacienteId] = useState<number | null>(null)
    const [insumosSelecionados, setInsumosSelecionados] = useState<InsumoSelecionado[]>([])

    // Pagamento State
    const [descontoValor, setDescontoValor] = useState(0)
    const [metodoPagamento, setMetodoPagamento] = useState<'PIX' | 'Débito' | 'Crédito'>('PIX')
    const [parcelas, setParcelas] = useState(1)
    const [valorEntrada, setValorEntrada] = useState(0)

    // Carregar dados ao abrir
    useEffect(() => {
        if (isOpen) {
            loadData()
            resetForm()
        }
    }, [isOpen])

    const loadData = async () => {
        try {
            setLoading(true)
            const [pacientesData, produtosData] = await Promise.all([
                supabaseApi.getPacientes(),
                supabaseApi.getProdutos()
            ])

            setPacientes(pacientesData)

            // Flatten lotes from products
            const lotes: (Lote & { skus: Sku })[] = []
            produtosData.forEach((prod: any) => {
                if (prod.lotes && prod.lotes.length > 0) {
                    prod.lotes.forEach((lote: Lote) => {
                        lotes.push({
                            ...lote,
                            skus: prod // Attach SKU info to lote
                        })
                    })
                }
            })
            setLotesDisponiveis(lotes)
        } catch (error) {
            console.error('Erro ao carregar dados:', error)
        } finally {
            setLoading(false)
        }
    }

    const resetForm = () => {
        setStep(1)
        setDataVenda(new Date().toISOString().split('T')[0])
        setSelectedPacienteId(null)
        setInsumosSelecionados([])
        setDescontoValor(0)
        setMetodoPagamento('PIX')
        setParcelas(1)
        setValorEntrada(0)
    }

    // Handlers de Insumos
    const handleAddInsumo = (loteId: string) => {
        const id = parseInt(loteId)
        const lote = lotesDisponiveis.find(l => l.id_lote === id)
        if (!lote) return

        // Verificar se já existe
        if (insumosSelecionados.some(i => i.id_lote === id)) return

        setInsumosSelecionados(prev => [...prev, {
            id_lote: lote.id_lote,
            id_sku: lote.id_sku,
            nome_produto: lote.skus.nome_produto,
            classe_terapeutica: lote.skus.classe_terapeutica,
            quantidade: 1, // Default 1
            preco_unitario_custo: lote.preco_unitario,
            preco_unitario_venda: lote.skus.preco_unitario,
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

    // Cálculos Financeiros
    const totais = useMemo(() => {
        const custoTotal = insumosSelecionados.reduce((acc, item) => acc + (item.preco_unitario_custo * item.quantidade), 0)
        const vendaTotal = insumosSelecionados.reduce((acc, item) => acc + (item.preco_unitario_venda * item.quantidade), 0)

        const precoFinal = Math.max(0, vendaTotal - descontoValor)
        const descontoPercentual = vendaTotal > 0 ? (descontoValor / vendaTotal) * 100 : 0

        const valorParcelado = Math.max(0, precoFinal - valorEntrada)
        const valorParcela = parcelas > 0 ? valorParcelado / parcelas : 0

        return {
            custoTotal,
            vendaTotal,
            precoFinal,
            descontoPercentual,
            valorParcelado,
            valorParcela
        }
    }, [insumosSelecionados, descontoValor, valorEntrada, parcelas])

    // Lógica de Borda Dinâmica
    const borderClass = useMemo(() => {
        const counts = {
            toxina: 0,
            preenchedor: 0,
            bio: 0 // bioestimulador, bioregenerador, tecnologia
        }

        insumosSelecionados.forEach(item => {
            const classe = item.classe_terapeutica.toUpperCase()
            if (classe.includes('TOXINA')) counts.toxina += item.quantidade
            else if (classe.includes('PREENCHEDOR')) counts.preenchedor += item.quantidade
            else if (['BIOESTIMULADOR', 'BIOREGENERADOR', 'TECNOLOGIA'].some(c => classe.includes(c))) counts.bio += item.quantidade
        })

        // Regra 1: 2 Toxina + 2 Preenchedor + 1 Bio
        if (counts.toxina === 2 && counts.preenchedor === 2 && counts.bio === 1) return 'border-l-4 border-l-yellow-400'

        // Regra 2: 2 Toxina + 4 Preenchedor + 1 Bio
        if (counts.toxina === 2 && counts.preenchedor === 4 && counts.bio === 1) return 'border-l-4 border-l-orange-500'

        // Regra 3: 4 Toxina + 5 Preenchedor + 2 Bio
        if (counts.toxina === 4 && counts.preenchedor === 5 && counts.bio === 2) return 'border-l-4 border-l-purple-600'

        return 'border border-gray-200 dark:border-clinic-cyan/20' // Default
    }, [insumosSelecionados])

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

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className={`bg-white dark:bg-clinic-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto ${borderClass}`}>

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-clinic-cyan/20">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-clinic-cyan">Nova Venda</h2>
                        <p className="text-sm text-gray-500 dark:text-clinic-gray-400">
                            {step === 1 ? 'Seleção de Insumos' : 'Resumo e Pagamento'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Dados Básicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                            label="Data da Venda"
                            type="date"
                            value={dataVenda}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDataVenda(e.target.value)}
                        />
                        <div>
                            <label className="text-sm text-gray-700 dark:text-clinic-gray-400 mb-2 block">Paciente</label>
                            <select
                                value={selectedPacienteId || ''}
                                onChange={(e) => setSelectedPacienteId(Number(e.target.value))}
                                className="w-full bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded-lg px-4 py-2 text-gray-900 dark:text-clinic-white"
                            >
                                <option value="">Selecione um paciente...</option>
                                {pacientes.map(p => (
                                    <option key={p.id_paciente} value={p.id_paciente}>{p.nome_completo}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Blocos de Insumos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {CLASSES_TERAPEUTICAS.map(classe => {
                                    const lotesDaClasse = lotesDisponiveis.filter(l =>
                                        l.skus.classe_terapeutica.toUpperCase() === classe &&
                                        l.quantidade_disponivel > 0
                                    )

                                    return (
                                        <div key={classe} className="bg-gray-50 dark:bg-clinic-gray-700/30 p-4 rounded-lg border border-gray-100 dark:border-clinic-cyan/10">
                                            <h3 className="text-sm font-bold text-cyan-700 dark:text-clinic-cyan mb-3">{classe}</h3>

                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value) {
                                                        handleAddInsumo(e.target.value)
                                                        e.target.value = '' // Reset
                                                    }
                                                }}
                                                className="w-full mb-3 bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded px-3 py-1 text-sm"
                                            >
                                                <option value="">Adicionar Insumo...</option>
                                                {lotesDaClasse.map(l => (
                                                    <option key={l.id_lote} value={l.id_lote}>
                                                        {l.skus.nome_produto} (Val: {new Date(l.validade).toLocaleDateString('pt-BR')}) - Disp: {l.quantidade_disponivel}
                                                    </option>
                                                ))}
                                            </select>

                                            {/* Lista de Selecionados desta Classe */}
                                            <div className="space-y-2">
                                                {insumosSelecionados.filter(i => i.classe_terapeutica.toUpperCase() === classe).map(item => (
                                                    <div key={item.id_lote} className="flex items-center justify-between bg-white dark:bg-clinic-gray-800 p-2 rounded border border-gray-200 dark:border-clinic-cyan/20">
                                                        <div className="flex-1 min-w-0 mr-2">
                                                            <p className="text-sm font-medium truncate text-gray-900 dark:text-clinic-white">{item.nome_produto}</p>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantidade}
                                                                onChange={(e) => handleUpdateQuantidade(item.id_lote, parseInt(e.target.value))}
                                                                className="w-16 bg-gray-50 dark:bg-clinic-gray-700 border rounded px-2 py-1 text-sm text-center"
                                                            />
                                                            <button onClick={() => handleRemoveInsumo(item.id_lote)} className="text-red-500 hover:text-red-700">
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

                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Resumo Financeiro */}
                            <div className="bg-gray-50 dark:bg-clinic-gray-700/30 p-4 rounded-lg">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-clinic-white mb-4">Resumo Financeiro</h3>

                                {/* Lista Detalhada */}
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
                                                    <td className="py-2 text-right font-medium">R$ {(item.preco_unitario_venda * item.quantidade).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="grid grid-cols-2 gap-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Valor Total Venda</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-clinic-white">R$ {totais.vendaTotal.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Custo Total</p>
                                        <p className="text-xl font-bold text-gray-500">R$ {totais.custoTotal.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Configuração Pagamento */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <Input
                                        label="Desconto (R$)"
                                        type="number"
                                        value={descontoValor}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescontoValor(parseFloat(e.target.value) || 0)}
                                    />
                                    <div className="text-sm text-gray-500">
                                        Desconto Aplicado: {totais.descontoPercentual.toFixed(2)}%
                                    </div>

                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-sm font-bold text-gray-900 dark:text-clinic-white mb-2">Preço Final</p>
                                        <p className="text-3xl font-bold text-clinic-cyan">R$ {totais.precoFinal.toFixed(2)}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm text-gray-700 dark:text-clinic-gray-400 mb-2 block">Método Pagamento</label>
                                        <select
                                            value={metodoPagamento}
                                            onChange={(e) => setMetodoPagamento(e.target.value as any)}
                                            className="w-full bg-white dark:bg-clinic-gray-700 border border-gray-300 dark:border-clinic-cyan/30 rounded-lg px-4 py-2"
                                        >
                                            <option value="PIX">PIX</option>
                                            <option value="Débito">Débito</option>
                                            <option value="Crédito">Crédito</option>
                                        </select>
                                    </div>

                                    <Input
                                        label="% Entrada / Valor Entrada (R$)"
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

                {/* Footer Actions */}
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
                            Continuar <Calculator className="ml-2 w-4 h-4" />
                        </Button>
                    ) : (
                        <Button onClick={handleSave} disabled={loading}>
                            {loading ? 'Processando...' : 'Finalizar Venda'} <Check className="ml-2 w-4 h-4" />
                        </Button>
                    )}
                </div>

            </div>
        </div>
    )
}
