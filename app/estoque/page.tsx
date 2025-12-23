'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useVirtualizer } from '@tanstack/react-virtual'
import { 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Plus,
  Calendar,
  User,
  FileText
} from 'lucide-react'
import { Button, Input, Select, Card, Modal, HeaderUniversal } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ProdutoComEstoque, MovimentacaoDetalhada } from '@/types/database'
import NovaClinicaModal from '@/components/NovaClinicaModal'

interface MovimentacaoForm {
  tipo: 'ENTRADA' | 'SAIDA'
  quantidade: string
  loteId?: number
  dataLote?: string
  valorTotal?: string
  observacao?: string
}

// ============ COMPONENTES MEMOIZADOS ============

// ✅ Componente memoizado para cada produto na lista
const ProdutoCard = React.memo(function ProdutoCard({
  produto,
  isSelected,
  status,
  statusClasses,
  formatDate,
  onSelect
}: {
  produto: ProdutoComEstoque
  isSelected: boolean
  status: { status: string; cor: string; diasEstoque: number }
  statusClasses: string
  formatDate: (date: string) => string
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-clinic-cyan bg-clinic-cyan/10'
          : 'border-clinic-gray-600 bg-clinic-gray-800 hover:border-clinic-cyan/50 hover:bg-clinic-gray-700'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-clinic-white font-medium">{produto.nome_produto}</h3>
          <p className="text-clinic-gray-400 text-sm">{produto.fabricante}</p>
          <p className="text-clinic-gray-400 text-sm">{produto.classe_terapeutica}</p>
          <p className="text-clinic-gray-500 text-xs mt-1">
            {produto.lotes.length} lote{produto.lotes.length !== 1 ? 's' : ''} disponível{produto.lotes.length !== 1 ? 'eis' : ''}
          </p>
        </div>
        <div className="text-right">
          <div className="text-clinic-white text-xl font-bold">{produto.estoque_total}</div>
          <div className="text-clinic-gray-400 text-sm">unidades</div>
          <div className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${statusClasses}`}>
            {status.status}
            {status.diasEstoque < 999 && status.diasEstoque > 0 && (
              <span className="ml-1 opacity-75">({status.diasEstoque}d)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})

// ✅ Componente memoizado para cada linha de movimentação
const MovimentacaoRow = React.memo(function MovimentacaoRow({
  mov,
  formatDate
}: {
  mov: MovimentacaoDetalhada
  formatDate: (date: string) => string
}) {
  return (
    <tr className="border-b border-clinic-gray-800 hover:bg-clinic-gray-800/50">
      <td className="py-3 px-4 text-clinic-white text-sm">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-clinic-gray-500" />
          {formatDate(mov.data_movimentacao)}
        </div>
      </td>
      <td className="py-3 px-4 text-clinic-white text-sm font-medium">
        {mov.lote?.skus?.nome_produto || 'N/A'}
      </td>
      <td className="py-3 px-4">
        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
          mov.tipo_movimentacao === 'ENTRADA' 
            ? 'bg-green-900/30 text-green-300' 
            : 'bg-orange-900/30 text-orange-300'
        }`}>
          {mov.tipo_movimentacao}
        </span>
      </td>
      <td className="py-3 px-4">
        <span className={`font-medium ${
          mov.tipo_movimentacao === 'ENTRADA' ? 'text-green-400' : 'text-red-400'
        }`}>
          {mov.tipo_movimentacao === 'ENTRADA' ? '+' : '-'}{mov.quantidade}
        </span>
      </td>
      <td className="py-3 px-4 text-clinic-gray-300">
        <div className="flex items-center">
          <User className="w-4 h-4 mr-2 text-clinic-gray-500" />
          {mov.usuario}
        </div>
      </td>
      <td className="py-3 px-4 text-clinic-gray-400 text-sm max-w-xs truncate">
        {mov.observacao || '-'}
      </td>
    </tr>
  )
})

// ============ COMPONENTE PRINCIPAL ============

export default function EstoquePage() {
  const router = useRouter()
  
  // ✅ USA AUTH CONTEXT
  const { isAuthenticated, loading: authLoading, profile } = useAuth()
  
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoDetalhada[]>([])
  const [selectedProduto, setSelectedProduto] = useState<ProdutoComEstoque | null>(null)
  const [loading, setLoading] = useState(true)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)
  
  // Estado para média de saída por SKU
  const [mediaSaidaPorSku, setMediaSaidaPorSku] = useState<Record<number, number>>({})
  
  const [movForm, setMovForm] = useState<MovimentacaoForm>({
    tipo: 'SAIDA',
    quantidade: '',
    loteId: undefined,
    dataLote: '',
    valorTotal: '',
    observacao: ''
  })
  
  const [modalState, setModalState] = useState<{
    isOpen: boolean
    type: 'success' | 'error'
    title: string
    message: string
  }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: ''
  })

  // ✅ Refs para virtualização
  const produtosContainerRef = useRef<HTMLDivElement>(null)
  const movimentacoesContainerRef = useRef<HTMLDivElement>(null)

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalState({ isOpen: true, type, title, message })
  }

  const handleShowNovaClinicaModal = () => {
    setShowNovaClinicaModal(true)
  }

  const handleClinicaCriada = () => {
    setShowNovaClinicaModal(false)
    showModal('success', 'Sucesso', 'Clínica criada com sucesso!')
  }

  // Formatar data sem problema de timezone
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return '-'
    const str = typeof dateString === 'string' ? dateString : String(dateString)
    if (str.includes('-') && str.length >= 10) {
      const [year, month, day] = str.substring(0, 10).split('-')
      return `${day}/${month}/${year}`
    }
    return new Date(dateString).toLocaleDateString('pt-BR')
  }, [])

  const convertDateToISO = (dateValue: string): string => {
    if (!dateValue) return ''
    if (dateValue.includes('-') && dateValue.length === 10) {
      return dateValue
    }
    if (dateValue.includes('/')) {
      const parts = dateValue.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
    return dateValue
  }

  const formatCurrency = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    if (!numbers) return ''
    const amount = parseInt(numbers) / 100
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const parseCurrency = (value: string): number => {
    if (!value) return 0
    const numbers = value.replace(/\D/g, '')
    return parseInt(numbers) / 100
  }

  // ============ CARREGAR DADOS ============
  const loadProdutos = useCallback(async () => {
    try {
      const data = await supabaseApi.getProdutos()
      
      const produtosProcessados = data.map(produto => ({
        ...produto,
        estoque_total: produto.lotes.reduce((sum: number, lote: { quantidade_disponivel: number }) => sum + lote.quantidade_disponivel, 0)
      }))
      
      setProdutos(produtosProcessados)
      console.log(`✅ Estoque: ${produtosProcessados.length} produtos carregados`)
    } catch (error) {
      console.error('❌ Erro ao carregar produtos:', error)
      showModal('error', 'Erro', 'Falha ao carregar produtos do Supabase')
    }
  }, [])

  const loadMovimentacoes = useCallback(async () => {
    try {
      const data = await supabaseApi.getMovimentacoes(50)
      setMovimentacoes(data)
      console.log(`✅ Estoque: ${data.length} movimentações carregadas`)
    } catch (error) {
      console.error('❌ Erro ao carregar movimentações:', error)
    }
  }, [])

  const loadMediaSaida = useCallback(async () => {
    try {
      const media = await supabaseApi.getMediaSaidaPorSku()
      setMediaSaidaPorSku(media)
    } catch (error) {
      console.error('❌ Erro ao carregar média de saída:', error)
    }
  }, [])

  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadProdutos(),
        loadMovimentacoes(),
        loadMediaSaida()
      ])
      setDataLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [loadProdutos, loadMovimentacoes, loadMediaSaida])

  // ✅ CARREGAR DADOS QUANDO AUTENTICADO
  useEffect(() => {
    if (!authLoading && isAuthenticated && !dataLoaded) {
      console.log('🔑 Estoque: Auth pronto, carregando dados...')
      loadAllData()
    }
  }, [authLoading, isAuthenticated, dataLoaded, loadAllData])

  // ✅ REDIRECIONAR SE NÃO AUTENTICADO
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  // ✅ MEMOIZAR: Cálculo de status para todos os produtos (evita recálculo em cada render)
  const produtosComStatus = useMemo(() => {
    return produtos.map(produto => {
      const mediaDiaria = mediaSaidaPorSku[produto.id_sku] || 0
      
      let status: { status: string; cor: string; diasEstoque: number }
      
      if (!mediaDiaria || mediaDiaria === 0) {
        if (produto.estoque_total > 0) {
          status = { status: 'Sem Saída', cor: 'gray', diasEstoque: 999 }
        } else {
          status = { status: 'Sem Estoque', cor: 'gray', diasEstoque: 0 }
        }
      } else {
        const diasEstoque = Math.round(produto.estoque_total / mediaDiaria)
        
        if (diasEstoque < 4) {
          status = { status: 'Crítico', cor: 'red', diasEstoque }
        } else if (diasEstoque < 7) {
          status = { status: 'Baixo', cor: 'yellow', diasEstoque }
        } else if (diasEstoque <= 10) {
          status = { status: 'OK', cor: 'green', diasEstoque }
        } else {
          status = { status: 'Alto', cor: 'blue', diasEstoque }
        }
      }
      
      return { produto, status }
    })
  }, [produtos, mediaSaidaPorSku])

  // ✅ MEMOIZAR: Classes de cor para tags
  const getStatusClasses = useCallback((status: { status: string; cor: string }) => {
    const corMap: Record<string, string> = {
      red: 'bg-red-900/30 text-red-300',
      yellow: 'bg-yellow-900/30 text-yellow-300',
      green: 'bg-green-900/30 text-green-300',
      blue: 'bg-blue-900/30 text-blue-300',
      gray: 'bg-gray-900/30 text-gray-400'
    }
    return corMap[status.cor] || corMap.gray
  }, [])

  // Calcular status inteligente baseado em velocidade de saída (para produto selecionado)
  const getStatusProduto = useCallback((produto: ProdutoComEstoque): { status: string; cor: string; diasEstoque: number } => {
    const mediaDiaria = mediaSaidaPorSku[produto.id_sku] || 0
    
    if (!mediaDiaria || mediaDiaria === 0) {
      if (produto.estoque_total > 0) {
        return { status: 'Sem Saída', cor: 'gray', diasEstoque: 999 }
      }
      return { status: 'Sem Estoque', cor: 'gray', diasEstoque: 0 }
    }

    const diasEstoque = Math.round(produto.estoque_total / mediaDiaria)

    if (diasEstoque < 4) {
      return { status: 'Crítico', cor: 'red', diasEstoque }
    }
    if (diasEstoque < 7) {
      return { status: 'Baixo', cor: 'yellow', diasEstoque }
    }
    if (diasEstoque <= 10) {
      return { status: 'OK', cor: 'green', diasEstoque }
    }
    return { status: 'Alto', cor: 'blue', diasEstoque }
  }, [mediaSaidaPorSku])

  const handleProdutoSelect = useCallback((produto: ProdutoComEstoque) => {
    setSelectedProduto(produto)
    setMovForm({
      tipo: 'SAIDA',
      quantidade: '',
      loteId: produto.lotes.length > 0 ? produto.lotes[0].id_lote : undefined,
      dataLote: '',
      valorTotal: '',
      observacao: ''
    })
  }, [])

  const handleMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProduto || !movForm.quantidade) {
      showModal('error', 'Erro de Validação', 'Selecione um produto e informe a quantidade.')
      return
    }

    const quantidade = parseInt(movForm.quantidade)
    if (quantidade <= 0) {
      showModal('error', 'Erro de Validação', 'Quantidade deve ser maior que zero.')
      return
    }

    try {
      setLoading(true)

      // ✅ USA PROFILE DO AUTH CONTEXT
      const currentUser = profile

      if (movForm.tipo === 'ENTRADA') {
        if (!movForm.dataLote) {
          showModal('error', 'Erro de Validação', 'Informe a data do lote para entrada.')
          return
        }

        if (!movForm.valorTotal || parseCurrency(movForm.valorTotal) <= 0) {
          showModal('error', 'Erro de Validação', 'Informe o valor total da compra.')
          return
        }

        const dataValidade = convertDateToISO(movForm.dataLote)
        const valorTotalNumerico = parseCurrency(movForm.valorTotal)
        
        const novoLote = await supabaseApi.createLoteComValor({
          id_sku: selectedProduto.id_sku,
          quantidade_disponivel: quantidade,
          validade: dataValidade,
          valor_total_compra: valorTotalNumerico
        })

        await supabaseApi.createMovimentacao({
          id_lote: novoLote.id_lote,
          tipo_movimentacao: 'ENTRADA',
          quantidade: quantidade,
          usuario: currentUser?.usuario || 'desconhecido',
          observacao: movForm.observacao || `Entrada - Val: ${movForm.dataLote} - R$ ${movForm.valorTotal}`
        })

        showModal('success', 'Sucesso', `Entrada de ${quantidade} unidades registrada!\nPreço unitário calculado: R$ ${novoLote.preco_unitario.toFixed(2)}`)
        
      } else {
        if (!movForm.loteId) {
          showModal('error', 'Erro de Validação', 'Selecione um lote para saída.')
          return
        }

        const loteAtual = selectedProduto.lotes.find(l => l.id_lote === movForm.loteId)
        if (!loteAtual) {
          showModal('error', 'Erro', 'Lote não encontrado.')
          return
        }

        if (quantidade > loteAtual.quantidade_disponivel) {
          showModal('error', 'Erro de Validação', `Quantidade insuficiente no lote. Disponível: ${loteAtual.quantidade_disponivel}`)
          return
        }

        await supabaseApi.createMovimentacao({
          id_lote: movForm.loteId,
          tipo_movimentacao: 'SAIDA',
          quantidade: quantidade,
          usuario: currentUser?.usuario || 'desconhecido',
          observacao: movForm.observacao || `Uso diário - ${new Date().toLocaleDateString('pt-BR')}`
        })

        const novaQuantidade = loteAtual.quantidade_disponivel - quantidade
        await supabaseApi.updateLoteQuantidade(movForm.loteId, novaQuantidade)

        showModal('success', 'Sucesso', `Saída de ${quantidade} unidades registrada com sucesso!`)
      }

      // Limpar formulário
      setMovForm({
        tipo: 'SAIDA',
        quantidade: '',
        loteId: undefined,
        dataLote: '',
        valorTotal: '',
        observacao: ''
      })
      setSelectedProduto(null)
      
      // Recarregar dados
      await loadAllData()

    } catch (error) {
      showModal('error', 'Erro', 'Falha ao registrar movimentação.')
      console.error('Erro ao registrar movimentação:', error)
    } finally {
      setLoading(false)
    }
  }

  // ✅ VIRTUALIZAÇÃO: Lista de produtos
  const produtosVirtualizer = useVirtualizer({
    count: produtosComStatus.length,
    getScrollElement: () => produtosContainerRef.current,
    estimateSize: () => 120, // Altura estimada de cada card
    overscan: 5, // Renderiza 5 itens extras acima/abaixo
  })

  // ✅ VIRTUALIZAÇÃO: Tabela de movimentações
  const movimentacoesVirtualizer = useVirtualizer({
    count: movimentacoes.length,
    getScrollElement: () => movimentacoesContainerRef.current,
    estimateSize: () => 52, // Altura estimada de cada linha
    overscan: 10,
  })

  // ============ LOADING STATES ============
  if (authLoading) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent mx-auto mb-4"></div>
          <p className="text-clinic-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null // Será redirecionado pelo useEffect
  }

  if (loading && !dataLoaded) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-clinic-cyan border-t-transparent mx-auto mb-4"></div>
          <p className="text-clinic-gray-400">Carregando estoque...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-clinic-black">
      <div className="container mx-auto px-4 py-6">
        <HeaderUniversal 
          titulo="Controle de Estoque" 
          descricao="Gerencie produtos e movimentações"
          icone={Package}
          showNovaClinicaModal={handleShowNovaClinicaModal}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* ESQUERDA: Registrar Movimentação */}
          <div className="lg:min-h-[700px]">
            <Card title="Registrar Movimentação">
              {!selectedProduto ? (
                <div className="text-center py-12">
                  <Plus className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                  <p className="text-clinic-gray-400">Selecione um produto à direita para registrar movimentação</p>
                </div>
              ) : (
                <form onSubmit={handleMovimentacao} className="space-y-4">
                  {/* Produto Selecionado */}
                  <div className="bg-clinic-gray-700 p-4 rounded-lg">
                    <h3 className="text-clinic-white font-medium mb-2">Produto Selecionado:</h3>
                    <p className="text-clinic-cyan font-medium">{selectedProduto.nome_produto}</p>
                    <p className="text-clinic-gray-400 text-sm">{selectedProduto.fabricante}</p>
                    <p className="text-clinic-gray-400 text-sm">{selectedProduto.classe_terapeutica}</p>
                    <p className="text-clinic-gray-400 text-sm">Fator Divisão: {selectedProduto.fator_divisao || '1'}</p>
                    
                    <div className="mt-3 p-3 bg-clinic-gray-800 rounded-lg">
                      <div className="text-center">
                        <p className="text-clinic-gray-400 text-sm">Estoque Total</p>
                        <p className="text-clinic-cyan text-2xl font-bold">{selectedProduto.estoque_total}</p>
                        <p className="text-clinic-gray-400 text-sm">unidades</p>
                        
                        {/* Tag inteligente no produto selecionado */}
                        {(() => {
                          const status = getStatusProduto(selectedProduto)
                          return (
                            <div className="mt-2">
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusClasses(status)}`}>
                                {status.status}
                                {status.diasEstoque < 999 && status.diasEstoque > 0 && (
                                  <span className="ml-1 opacity-75">({status.diasEstoque}d)</span>
                                )}
                              </span>
                            </div>
                          )
                        })()}
                      </div>
                      
                      {selectedProduto.lotes.length > 0 && (
                        <div className="mt-3 space-y-1">
                          <p className="text-clinic-gray-400 text-sm">Lotes Disponíveis:</p>
                          {selectedProduto.lotes.map(lote => (
                            <div key={lote.id_lote} className="flex justify-between text-sm">
                              <span className="text-clinic-gray-300">Lote (Val: {formatDate(lote.validade)})</span>
                              <span className="text-clinic-white">{lote.quantidade_disponivel} un.</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <Select
                    label="Tipo de Movimentação"
                    value={movForm.tipo}
                    onChange={(e) => setMovForm(prev => ({ 
                      ...prev, 
                      tipo: e.target.value as 'ENTRADA' | 'SAIDA',
                      loteId: e.target.value === 'ENTRADA' ? undefined : (selectedProduto.lotes[0]?.id_lote || undefined)
                    }))}
                    options={[
                      { value: 'SAIDA', label: 'Registrar Saída (Uso Diário)' },
                      { value: 'ENTRADA', label: 'Entrada de Estoque' }
                    ]}
                  />

                  {movForm.tipo === 'SAIDA' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-clinic-white mb-2">
                          Selecione o Lote para dar baixa
                        </label>
                        <Select
                          value={movForm.loteId?.toString() || ''}
                          onChange={(e) => setMovForm(prev => ({ ...prev, loteId: parseInt(e.target.value) }))}
                          options={[
                            { value: '', label: 'Selecione um lote...' },
                            ...selectedProduto.lotes.map(lote => ({
                              value: lote.id_lote.toString(),
                              label: `Lote (Val: ${formatDate(lote.validade)}) - Qtd: ${lote.quantidade_disponivel}`
                            }))
                          ]}
                        />
                      </div>

                      <Input
                        label="Quantidade Utilizada"
                        type="number"
                        min="1"
                        value={movForm.quantidade}
                        onChange={(e) => setMovForm(prev => ({ ...prev, quantidade: e.target.value }))}
                        placeholder="Digite a quantidade utilizada"
                        required
                      />
                    </>
                  ) : (
                    <>
                      <Input
                        label="Quantidade Comprada"
                        type="number"
                        min="1"
                        value={movForm.quantidade}
                        onChange={(e) => setMovForm(prev => ({ ...prev, quantidade: e.target.value }))}
                        placeholder="Digite a quantidade comprada"
                        required
                      />

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-clinic-white">
                          Valor Total da Compra (R$) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-clinic-gray-400">R$</span>
                          <input
                            type="text"
                            value={movForm.valorTotal}
                            onChange={(e) => {
                              const formatted = formatCurrency(e.target.value)
                              setMovForm(prev => ({ ...prev, valorTotal: formatted }))
                            }}
                            placeholder="0,00"
                            className="w-full bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg px-10 py-2 text-clinic-white focus:outline-none focus:border-clinic-cyan"
                            required
                          />
                        </div>                    
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-medium text-clinic-white">
                          Data de Validade do Lote *
                        </label>
                        <input
                          type="date"
                          value={movForm.dataLote || ''}
                          onChange={(e) => setMovForm(prev => ({ ...prev, dataLote: e.target.value }))}
                          className="w-full bg-clinic-gray-800 border border-clinic-gray-600 rounded-lg px-4 py-2 text-clinic-white focus:outline-none focus:border-clinic-cyan"
                          required
                        />
                      </div>
                    </>
                  )}

                  <Input
                    label="Observação (opcional)"
                    type="text"
                    value={movForm.observacao}
                    onChange={(e) => setMovForm(prev => ({ ...prev, observacao: e.target.value }))}
                    placeholder="Digite uma observação"
                  />

                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Processando...' : `Registrar ${movForm.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}`}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setSelectedProduto(null)
                        setMovForm({
                          tipo: 'SAIDA',
                          quantidade: '',
                          loteId: undefined,
                          dataLote: '',
                          valorTotal: '',
                          observacao: ''
                        })
                      }}
                    >
                      Limpar
                    </Button>
                  </div>
                </form>
              )}
            </Card>
          </div>

          {/* DIREITA: Produtos em Estoque - ✅ VIRTUALIZADO */}
          <div className="lg:min-h-[700px]">
            <Card title="Produtos em Estoque">
              {loading && !dataLoaded ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clinic-cyan mx-auto mb-4"></div>
                  <p className="text-clinic-gray-400">Carregando produtos...</p>
                </div>
              ) : produtos.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                  <p className="text-clinic-gray-400">Nenhum produto encontrado no estoque</p>
                </div>
              ) : (
                <div 
                  ref={produtosContainerRef}
                  className="overflow-y-auto max-h-[740px]"
                >
                  {/* ✅ Container virtualizado */}
                  <div
                    style={{
                      height: `${produtosVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {produtosVirtualizer.getVirtualItems().map((virtualItem) => {
                      const { produto, status } = produtosComStatus[virtualItem.index]
                      
                      return (
                        <div
                          key={produto.id_sku}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: `${virtualItem.size}px`,
                            transform: `translateY(${virtualItem.start}px)`,
                            padding: '6px 0',
                          }}
                        >
                          <ProdutoCard
                            produto={produto}
                            isSelected={selectedProduto?.id_sku === produto.id_sku}
                            status={status}
                            statusClasses={getStatusClasses(status)}
                            formatDate={formatDate}
                            onSelect={() => handleProdutoSelect(produto)}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Histórico de Movimentações - ✅ VIRTUALIZADO */}
        <Card title="Histórico de Movimentações">
          {movimentacoes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
              <p className="text-clinic-gray-400">Nenhuma movimentação registrada</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-clinic-gray-700">
                    <th className="py-3 px-4 text-left text-clinic-cyan text-sm font-semibold">Data</th>
                    <th className="py-3 px-4 text-left text-clinic-cyan text-sm font-semibold">Produto</th>
                    <th className="py-3 px-4 text-left text-clinic-cyan text-sm font-semibold">Tipo</th>
                    <th className="py-3 px-4 text-left text-clinic-cyan text-sm font-semibold">Qtd</th>
                    <th className="py-3 px-4 text-left text-clinic-cyan text-sm font-semibold">Usuário</th>
                    <th className="py-3 px-4 text-left text-clinic-cyan text-sm font-semibold">Observação</th>
                  </tr>
                </thead>
              </table>
              {/* ✅ Container virtualizado para tbody */}
              <div
                ref={movimentacoesContainerRef}
                className="max-h-[400px] overflow-y-auto"
              >
                <div
                  style={{
                    height: `${movimentacoesVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                >
                  <table className="w-full">
                    <tbody>
                      {movimentacoesVirtualizer.getVirtualItems().map((virtualItem) => {
                        const mov = movimentacoes[virtualItem.index]
                        
                        return (
                          <tr
                            key={mov.id_movimentacao}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: `${virtualItem.size}px`,
                              transform: `translateY(${virtualItem.start}px)`,
                              display: 'table',
                              tableLayout: 'fixed',
                            }}
                            className="border-b border-clinic-gray-800 hover:bg-clinic-gray-800/50"
                          >
                            <td className="py-3 px-4 text-clinic-white text-sm" style={{ width: '15%' }}>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-clinic-gray-500" />
                                {formatDate(mov.data_movimentacao)}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-clinic-white text-sm font-medium" style={{ width: '25%' }}>
                              {mov.lote?.skus?.nome_produto || 'N/A'}
                            </td>
                            <td className="py-3 px-4" style={{ width: '12%' }}>
                              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                mov.tipo_movimentacao === 'ENTRADA' 
                                  ? 'bg-green-900/30 text-green-300' 
                                  : 'bg-orange-900/30 text-orange-300'
                              }`}>
                                {mov.tipo_movimentacao}
                              </span>
                            </td>
                            <td className="py-3 px-4" style={{ width: '10%' }}>
                              <span className={`font-medium ${
                                mov.tipo_movimentacao === 'ENTRADA' ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {mov.tipo_movimentacao === 'ENTRADA' ? '+' : '-'}{mov.quantidade}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-clinic-gray-300" style={{ width: '15%' }}>
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-2 text-clinic-gray-500" />
                                {mov.usuario}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-clinic-gray-400 text-sm truncate" style={{ width: '23%' }}>
                              {mov.observacao || '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Modal
          isOpen={modalState.isOpen}
          onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
          title={modalState.title}
        >
          <div className="text-center py-4">
            <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              modalState.type === 'success' ? 'bg-green-100/10' : 'bg-red-100/10'
            }`}>
              {modalState.type === 'success' ? (
                <TrendingUp className="w-8 h-8 text-green-400" />
              ) : (
                <AlertCircle className="w-8 h-8 text-red-400" />
              )}
            </div>
            <p className="text-clinic-gray-300 whitespace-pre-line">{modalState.message}</p>
            <Button
              onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}
              className="mt-4"
            >
              OK
            </Button>
          </div>
        </Modal>

        <NovaClinicaModal
          isOpen={showNovaClinicaModal}
          onClose={() => setShowNovaClinicaModal(false)}
          onSuccess={handleClinicaCriada}
        />
      </div>
    </div>
  )
}