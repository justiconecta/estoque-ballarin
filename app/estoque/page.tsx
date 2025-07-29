'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Package, TrendingUp, TrendingDown, AlertCircle, Home, Users } from 'lucide-react'
import { Button, Input, Select, Card, Modal } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { ProdutoComEstoque, MovimentacaoDetalhada, Usuario } from '@/types/database'

interface MovimentacaoForm {
  tipo: 'ENTRADA' | 'SAIDA'
  quantidade: string
  loteId?: number
  validade?: string
}

export default function EstoquePage() {
  const router = useRouter()
  
  // Estados principais
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoDetalhada[]>([])
  const [selectedProduto, setSelectedProduto] = useState<ProdutoComEstoque | null>(null)
  const [loading, setLoading] = useState(false)
  
  // Estados de formulário
  const [movForm, setMovForm] = useState<MovimentacaoForm>({
    tipo: 'SAIDA',
    quantidade: '',
    loteId: undefined,
    validade: ''
  })
  
  // Estados de UI
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

  // Verificar autenticação
  useEffect(() => {
    const userData = localStorage.getItem('ballarin_user')
    if (!userData) {
      router.push('/login')
      return
    }
    
    try {
      const user = JSON.parse(userData) as Usuario
      setCurrentUser(user)
    } catch {
      router.push('/login')
    }
  }, [router])

  // Carregar dados iniciais
  useEffect(() => {
    if (currentUser) {
      loadProdutos()
      loadMovimentacoes()
    }
  }, [currentUser])

  const loadProdutos = async () => {
    try {
      setLoading(true)
      const data = await supabaseApi.getProdutos()
      
      // Processar dados para incluir estoque total
      const produtosProcessados = data.map(produto => ({
        ...produto,
        estoque_total: produto.lotes.reduce((sum, lote) => sum + lote.quantidade_disponivel, 0)
      }))
      
      setProdutos(produtosProcessados)
    } catch (error) {
      showModal('error', 'Erro', 'Falha ao carregar produtos')
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMovimentacoes = async () => {
    try {
      const data = await supabaseApi.getMovimentacoes(20)
      setMovimentacoes(data)
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('ballarin_user')
    router.push('/login')
  }

  const handleProdutoSelect = (produtoId: string) => {
    const produto = produtos.find(p => p.id_sku === parseInt(produtoId))
    setSelectedProduto(produto || null)
    setMovForm(prev => ({ ...prev, loteId: undefined }))
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

      if (movForm.tipo === 'SAIDA') {
        // Para saída, verificar se há lote selecionado e estoque suficiente
        if (!movForm.loteId) {
          showModal('error', 'Erro de Validação', 'Selecione um lote para a saída.')
          return
        }

        const lote = selectedProduto.lotes.find(l => l.id_lote === movForm.loteId)
        if (!lote) {
          showModal('error', 'Erro', 'Lote não encontrado.')
          return
        }

        if (lote.quantidade_disponivel < quantidade) {
          showModal('error', 'Estoque Insuficiente', `Estoque disponível: ${lote.quantidade_disponivel} unidades`)
          return
        }

        // Registrar movimentação de saída
        await supabaseApi.createMovimentacao({
          id_lote: movForm.loteId,
          tipo_movimentacao: 'SAIDA',
          quantidade: quantidade,
          usuario: currentUser.nome_completo,
          observacao: `Aplicação paciente (${currentUser.nome_completo})`
        })

        // Atualizar quantidade do lote
        const novaQuantidade = lote.quantidade_disponivel - quantidade
        await supabaseApi.updateLoteQuantidade(movForm.loteId, novaQuantidade)

        showModal('success', 'Sucesso!', 'Saída de estoque registrada com sucesso.')

      } else {
        // Para entrada, criar novo lote ou atualizar existente
        if (!movForm.validade) {
          showModal('error', 'Erro de Validação', 'Informe a data de validade para entrada.')
          return
        }

        // Criar novo lote
        const novoLote = await supabaseApi.createLote({
          id_sku: selectedProduto.id_sku,
          quantidade_disponivel: quantidade,
          validade: movForm.validade
        })

        // Registrar movimentação de entrada
        await supabaseApi.createMovimentacao({
          id_lote: novoLote.id_lote,
          tipo_movimentacao: 'ENTRADA',
          quantidade: quantidade,
          usuario: currentUser.nome_completo,
          observacao: `Pedido #P${new Date().getFullYear()}${String(Date.now()).slice(-3)}`
        })

        showModal('success', 'Sucesso!', 'Entrada de estoque registrada com sucesso.')
      }

      // Recarregar dados
      await loadProdutos()
      await loadMovimentacoes()
      
      // Limpar formulário
      setMovForm({
        tipo: 'SAIDA',
        quantidade: '',
        loteId: undefined,
        validade: ''
      })
      setSelectedProduto(null)

    } catch (error) {
      showModal('error', 'Erro', 'Falha ao registrar movimentação.')
      console.error('Erro ao registrar movimentação:', error)
    } finally {
      setLoading(false)
    }
  }

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalState({ isOpen: true, type, title, message })
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
    return date.toLocaleDateString('pt-BR')
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-clinic-black flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-clinic-black">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-8 pb-4 border-b border-clinic-gray-700">
          <div>
            <h1 className="text-3xl font-bold text-clinic-white">Controle de Estoque</h1>
            <p className="text-clinic-gray-400 mt-1">
              Usuário: <span className="font-semibold text-clinic-cyan">{currentUser.nome_completo}</span>
              <span className="text-xs ml-2 text-clinic-gray-500">({currentUser.role})</span>
            </p>
          </div>
          <div className="flex space-x-2">
            {currentUser.role === 'admin' && (
              <>
                <Button variant="secondary" onClick={() => router.push('/dashboard')} icon={Home}>
                  Dashboard
                </Button>
                <Button variant="secondary" onClick={() => router.push('/pacientes')} icon={Users}>
                  Pacientes
                </Button>
              </>
            )}
            <Button variant="secondary" onClick={handleLogout} icon={LogOut}>
              Sair
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna de Controle */}
          <div className="space-y-6">
            <Card title="Registrar Movimentação">
              <div className="space-y-4">
                {/* Seleção de Produto */}
                <Select
                  label="1. Selecionar Produto"
                  value={selectedProduto?.id_sku.toString() || ''}
                  onChange={(e) => handleProdutoSelect(e.target.value)}
                  options={[
                    { value: '', label: 'Escolha um produto...' },
                    ...produtos.map(produto => ({
                      value: produto.id_sku.toString(),
                      label: `${produto.nome_produto} (${produto.estoque_total} unidades)`
                    }))
                  ]}
                />

                {selectedProduto && (
                  <>
                    {/* Tipo de Movimentação */}
                    <Select
                      label="2. Tipo de Movimentação"
                      value={movForm.tipo}
                      onChange={(e) => setMovForm(prev => ({ 
                        ...prev, 
                        tipo: e.target.value as 'ENTRADA' | 'SAIDA',
                        loteId: undefined 
                      }))}
                      options={[
                        { value: 'SAIDA', label: '📤 Saída (Aplicação)' },
                        { value: 'ENTRADA', label: '📥 Entrada (Pedido)' }
                      ]}
                    />

                    {/* Quantidade */}
                    <Input
                      label="3. Quantidade"
                      type="number"
                      min="1"
                      value={movForm.quantidade}
                      onChange={(e) => setMovForm(prev => ({ ...prev, quantidade: e.target.value }))}
                      placeholder="Digite a quantidade"
                    />

                    {/* Seleção de Lote (apenas para SAIDA) */}
                    {movForm.tipo === 'SAIDA' && selectedProduto.lotes.length > 0 && (
                      <Select
                        label="4. Selecionar Lote"
                        value={movForm.loteId?.toString() || ''}
                        onChange={(e) => setMovForm(prev => ({ ...prev, loteId: parseInt(e.target.value) }))}
                        options={[
                          { value: '', label: 'Escolha um lote...' },
                          ...selectedProduto.lotes
                            .filter(lote => lote.quantidade_disponivel > 0)
                            .map(lote => ({
                              value: lote.id_lote.toString(),
                              label: `Lote ${lote.id_lote} - ${lote.quantidade_disponivel} unidades (Val: ${new Date(lote.validade).toLocaleDateString('pt-BR')})`
                            }))
                        ]}
                      />
                    )}

                    {/* Data de Validade (apenas para ENTRADA) */}
                    {movForm.tipo === 'ENTRADA' && (
                      <Input
                        label="4. Data de Validade"
                        type="date"
                        value={movForm.validade}
                        onChange={(e) => setMovForm(prev => ({ ...prev, validade: e.target.value }))}
                      />
                    )}

                    {/* Botão de Ação */}
                    <Button
                      type="button"
                      onClick={handleMovimentacao}
                      loading={loading}
                      className="w-full"
                      icon={movForm.tipo === 'ENTRADA' ? TrendingUp : TrendingDown}
                    >
                      {movForm.tipo === 'ENTRADA' ? 'Registrar Entrada' : 'Registrar Saída'}
                    </Button>
                  </>
                )}
              </div>
            </Card>

            {/* Estoque Atual */}
            <Card title="Estoque Atual">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="loading-spinner" />
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {produtos.map(produto => (
                    <div key={produto.id_sku} className="flex justify-between items-center p-3 bg-clinic-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-clinic-white">{produto.nome_produto}</p>
                        <p className="text-sm text-clinic-gray-400">{produto.fabricante}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${produto.estoque_total < 10 ? 'text-red-400' : 'text-clinic-cyan'}`}>
                          {produto.estoque_total} und
                        </p>
                        {produto.estoque_total < 10 && (
                          <p className="text-xs text-red-400 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Baixo estoque
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Coluna de Histórico */}
          <div className="space-y-6">
            <Card title="Movimentações Recentes">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {movimentacoes.map(mov => (
                  <div key={mov.id_movimentacao} className="p-3 bg-clinic-gray-700 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        {mov.tipo_movimentacao === 'ENTRADA' ? (
                          <TrendingUp className="w-4 h-4 text-green-400 mr-2" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-400 mr-2" />
                        )}
                        <span className={`text-sm font-medium ${
                          mov.tipo_movimentacao === 'ENTRADA' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {mov.tipo_movimentacao}
                        </span>
                      </div>
                      <span className="text-xs text-clinic-gray-400">
                        {formatDateTime(mov.data_movimentacao)}
                      </span>
                    </div>
                    
                    <p className="text-clinic-white font-medium">
                      {mov.lotes?.skus?.nome_produto || 'Produto não encontrado'}
                    </p>
                    <p className="text-sm text-clinic-gray-300">
                      Quantidade: <span className="font-medium">{mov.quantidade}</span>
                    </p>
                    <p className="text-sm text-clinic-gray-300">
                      Usuário: <span className="font-medium">{mov.usuario}</span>
                    </p>
                    {mov.observacao && (
                      <p className="text-xs text-clinic-gray-400 mt-1">{mov.observacao}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal de Feedback */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
        title={modalState.title}
      >
        <div className="text-center py-4">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            modalState.type === 'success' ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {modalState.type === 'success' ? (
              <TrendingUp className="w-8 h-8 text-green-600" />
            ) : (
              <AlertCircle className="w-8 h-8 text-red-600" />
            )}
          </div>
          <p className="text-clinic-gray-300">{modalState.message}</p>
          <Button
            onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}
            className="mt-4"
          >
            OK
          </Button>
        </div>
      </Modal>
    </div>
  )
}