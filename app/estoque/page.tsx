'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { ProdutoComEstoque, MovimentacaoDetalhada, Usuario } from '@/types/database'
import NovaClinicaModal from '@/components/NovaClinicaModal'

interface MovimentacaoForm {
  tipo: 'ENTRADA' | 'SAIDA'
  quantidade: string
  loteId?: number
  dataLote?: string
  valorTotal?: string // ✅ NOVO: Valor total da compra em R$
  observacao?: string
}

export default function EstoquePage() {
  const router = useRouter()
  
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoDetalhada[]>([])
  const [selectedProduto, setSelectedProduto] = useState<ProdutoComEstoque | null>(null)
  const [loading, setLoading] = useState(false)
  const [showNovaClinicaModal, setShowNovaClinicaModal] = useState(false)
  
  const [movForm, setMovForm] = useState<MovimentacaoForm>({
    tipo: 'SAIDA',
    quantidade: '',
    loteId: undefined,
    dataLote: '',
    valorTotal: '', // ✅ NOVO
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const convertDateToISO = (ddmmyyyy: string): string => {
    if (!ddmmyyyy) return ''
    const [day, month, year] = ddmmyyyy.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  // ✅ NOVA FUNÇÃO: Formatar valor monetário em tempo real
  const formatCurrency = (value: string): string => {
    const numbers = value.replace(/\D/g, '')
    if (!numbers) return ''
    const amount = parseInt(numbers) / 100
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // ✅ NOVA FUNÇÃO: Parse do valor formatado para número
  const parseCurrency = (value: string): number => {
    if (!value) return 0
    const numbers = value.replace(/\D/g, '')
    return parseInt(numbers) / 100
  }

  useEffect(() => {
    const userData = localStorage.getItem('ballarin_user')
    if (userData) {
      loadProdutos()
      loadMovimentacoes()
    }
  }, [])

  const loadProdutos = async () => {
    try {
      setLoading(true)
      const data = await supabaseApi.getProdutos()
      
      const produtosProcessados = data.map(produto => ({
        ...produto,
        estoque_total: produto.lotes.reduce((sum: any, lote: { quantidade_disponivel: any }) => sum + lote.quantidade_disponivel, 0)
      }))
      
      setProdutos(produtosProcessados)
    } catch (error) {
      showModal('error', 'Erro', 'Falha ao carregar produtos do Supabase')
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMovimentacoes = async () => {
    try {
      const data = await supabaseApi.getMovimentacoes(50)
      setMovimentacoes(data)
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error)
    }
  }

  const handleProdutoSelect = (produto: ProdutoComEstoque) => {
    setSelectedProduto(produto)
    setMovForm({
      tipo: 'SAIDA',
      quantidade: '',
      loteId: produto.lotes.length > 0 ? produto.lotes[0].id_lote : undefined,
      dataLote: '',
      valorTotal: '',
      observacao: ''
    })
  }

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

      const userData = localStorage.getItem('ballarin_user')
      const currentUser = userData ? JSON.parse(userData) : null

      if (movForm.tipo === 'ENTRADA') {
        // ✅ VALIDAÇÃO: Entrada requer data E valor
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
        
        // ✅ CRIAR LOTE COM VALOR TOTAL (API calculará preco_unitario)
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
        // SAÍDA: Lógica existente mantida
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

      setMovForm({
        tipo: 'SAIDA',
        quantidade: '',
        loteId: undefined,
        dataLote: '',
        valorTotal: '',
        observacao: ''
      })
      setSelectedProduto(null)
      loadProdutos()
      loadMovimentacoes()

    } catch (error) {
      showModal('error', 'Erro', 'Falha ao registrar movimentação.')
      console.error('Erro ao registrar movimentação:', error)
    } finally {
      setLoading(false)
    }
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
                    /* ✅ INTERFACE ENTRADA COM NOVO CAMPO VALOR */
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

                      {/* ✅ NOVO CAMPO: Valor Total da Compra */}
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

          {/* DIREITA: Produtos em Estoque */}
          <div className="lg:min-h-[700px]">
            <Card title="Produtos em Estoque">
              {loading ? (
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
                <div className="space-y-3 overflow-y-auto max-h-[740px]">
                  {produtos.map((produto) => (
                    <div
                      key={produto.id_sku}
                      onClick={() => handleProdutoSelect(produto)}
                      className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                        selectedProduto?.id_sku === produto.id_sku
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
                          <div className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${
                            produto.estoque_total < 10 ? 'bg-red-900/30 text-red-300' :
                            produto.estoque_total < 50 ? 'bg-yellow-900/30 text-yellow-300' :
                            'bg-green-900/30 text-green-300'
                          }`}>
                            {produto.estoque_total < 10 ? 'Crítico' :
                             produto.estoque_total < 50 ? 'Baixo' : 'OK'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Histórico de Movimentações */}
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
                <tbody>
                  {movimentacoes.map((mov) => (
                    <tr key={mov.id_movimentacao} className="border-b border-clinic-gray-800 hover:bg-clinic-gray-800/50">
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
                  ))}
                </tbody>
              </table>
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