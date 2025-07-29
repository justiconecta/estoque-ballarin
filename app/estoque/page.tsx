'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Package, TrendingUp, TrendingDown, AlertCircle, Home } from 'lucide-react'
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
        if (!movForm.loteId) {
          showModal('error', 'Erro de Validação', 'Selecione um lote para dar baixa.')
          return
        }

        const lote = selectedProduto.lotes.find(l => l.id_lote === movForm.loteId)
        if (!lote || lote.quantidade_disponivel < quantidade) {
          showModal('error', 'Estoque Insuficiente', 
            `Não é possível registrar a saída de ${quantidade} unidades. Estoque disponível: ${lote?.quantidade_disponivel || 0}.`)
          return
        }

        // Registrar movimentação
        await supabaseApi.createMovimentacao({
          id_lote: movForm.loteId,
          tipo_movimentacao: 'SAIDA',
          quantidade,
          usuario: currentUser?.usuario || '',
          observacao: `Baixa do lote com validade ${lote.validade}`
        })

        // Atualizar quantidade do lote
        await supabaseApi.updateLoteQuantidade(movForm.loteId, lote.quantidade_disponivel - quantidade)

        showModal('success', 'Sucesso!', 'Saída de estoque registrada com sucesso.')
      } else {
        // ENTRADA - implementar lógica de criar novo lote
        if (!movForm.validade || !/^\d{4}-\d{2}-\d{2}$/.test(movForm.validade)) {
          showModal('error', 'Erro de Validação', 'Informe uma data de validade válida (AAAA-MM-DD).')
          return
        }

        // Criar novo lote
        const novoLote = await supabaseApi.createLote({
          id_sku: selectedProduto.id_sku,
          quantidade_disponivel: quantidade,
          validade: movForm.validade
        })

        // Registrar movimentação
        await supabaseApi.createMovimentacao({
          id_lote: novoLote.id_lote,
          tipo_movimentacao: 'ENTRADA',
          quantidade,
          usuario: currentUser?.usuario || '',
          observacao: `Recebimento de lote com validade ${movForm.validade}`
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
                  label="1. Escolha o Produto (SKU)"
                  value={selectedProduto?.id_sku || ''}
                  onChange={(e) => handleProdutoSelect(e.target.value)}
                  options={[
                    { value: '', label: '-- Selecione um produto --' },
                    ...produtos.map(p => ({
                      value: p.id_sku.toString(),
                      label: `${p.nome_produto} (${p.fabricante})`
                    }))
                  ]}
                />

                {/* Informações do Estoque */}
                {selectedProduto && (
                  <div className="bg-clinic-gray-900 p-4 rounded-lg border border-clinic-gray-600">
                    <div className="text-center mb-4">
                      <p className="text-clinic-gray-400 text-sm">Estoque Total</p>
                      <p className="text-3xl font-bold text-clinic-cyan">
                        {selectedProduto.estoque_total} <span className="text-lg text-clinic-gray-400">unidades</span>
                      </p>
                    </div>
                    
                    <div className="border-t border-clinic-gray-700 pt-4 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-clinic-gray-400">Fabricante:</span>
                        <span className="text-clinic-white font-medium">{selectedProduto.fabricante}</span>
                      </div>
                      
                      {selectedProduto.lotes.length > 0 && (
                        <div className="border-t border-clinic-gray-700 pt-2">
                          <p className="text-clinic-gray-400 text-xs mb-2">Lotes Disponíveis:</p>
                          {selectedProduto.lotes
                            .filter(lote => lote.quantidade_disponivel > 0)
                            .map(lote => (
                            <div key={lote.id_lote} className="flex justify-between text-xs">
                              <span>Val: {new Date(lote.validade).toLocaleDateString('pt-BR')}</span>
                              <span className="font-medium">{lote.quantidade_disponivel} un.</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Formulário de Movimentação */}
                <form onSubmit={handleMovimentacao} className="space-y-4">
                  <div className="flex space-x-4">
                    <Button
                      type="button"
                      variant={movForm.tipo === 'SAIDA' ? 'danger' : 'secondary'}
                      onClick={() => setMovForm(prev => ({ ...prev, tipo: 'SAIDA' }))}
                      icon={TrendingDown}
                      className="flex-1"
                    >
                      Saída
                    </Button>
                    <Button
                      type="button"
                      variant={movForm.tipo === 'ENTRADA' ? 'success' : 'secondary'}
                      onClick={() => setMovForm(prev => ({ ...prev, tipo: 'ENTRADA' }))}
                      icon={TrendingUp}
                      className="flex-1"
                    >
                      Entrada
                    </Button>
                  </div>

                  {movForm.tipo === 'SAIDA' && selectedProduto && (
                    <Select
                      label="Selecione o Lote"
                      value={movForm.loteId || ''}
                      onChange={(e) => setMovForm(prev => ({ ...prev, loteId: parseInt(e.target.value) }))}
                      options={[
                        { value: '', label: '-- Selecione um lote --' },
                        ...selectedProduto.lotes
                          .filter(lote => lote.quantidade_disponivel > 0)
                          .sort((a, b) => new Date(a.validade).getTime() - new Date(b.validade).getTime())
                          .map(lote => ({
                            value: lote.id_lote.toString(),
                            label: `Val: ${new Date(lote.validade).toLocaleDateString('pt-BR')} - Qtd: ${lote.quantidade_disponivel}`
                          }))
                      ]}
                    />
                  )}

                  {movForm.tipo === 'ENTRADA' && (
                    <Input
                      label="Data de Validade"
                      type="date"
                      value={movForm.validade}
                      onChange={(e) => setMovForm(prev => ({ ...prev, validade: e.target.value }))}
                    />
                  )}

                  <Input
                    label="Quantidade"
                    type="number"
                    min="1"
                    value={movForm.quantidade}
                    onChange={(e) => setMovForm(prev => ({ ...prev, quantidade: e.target.value }))}
                    required
                  />

                  <Button
                    type="submit"
                    variant={movForm.tipo === 'SAIDA' ? 'danger' : 'success'}
                    loading={loading}
                    disabled={!selectedProduto}
                    className="w-full"
                  >
                    Registrar {movForm.tipo === 'SAIDA' ? 'Saída' : 'Entrada'}
                  </Button>
                </form>
              </div>
            </Card>
          </div>

          {/* Coluna de Histórico */}
          <div>
            <Card title="Últimas Movimentações">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {movimentacoes.length === 0 ? (
                  <p className="text-clinic-gray-500 text-center py-8">
                    Nenhuma movimentação registrada
                  </p>
                ) : (
                  movimentacoes.map((mov) => (
                    <div
                      key={mov.id_movimentacao}
                      className={`p-3 rounded-lg border ${
                        mov.tipo_movimentacao === 'ENTRADA'
                          ? 'bg-green-900/20 border-green-700'
                          : 'bg-red-900/20 border-red-700'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            {mov.tipo_movimentacao === 'ENTRADA' ? (
                              <TrendingUp className="w-4 h-4 text-green-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                            <span className={`font-medium text-sm ${
                              mov.tipo_movimentacao === 'ENTRADA' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {mov.tipo_movimentacao}
                            </span>
                          </div>
                          <p className="text-clinic-white text-sm mt-1">
                            Produto ID: {mov.lotes?.id_sku}
                          </p>
                          {mov.observacao && (
                            <p className="text-clinic-gray-400 text-xs mt-1">{mov.observacao}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${
                            mov.tipo_movimentacao === 'ENTRADA' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {mov.tipo_movimentacao === 'ENTRADA' ? '+' : '-'}{mov.quantidade}
                          </p>
                          <p className="text-clinic-gray-500 text-xs">
                            {mov.usuario} - {formatDateTime(mov.data_movimentacao)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
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
        <div className="text-center">
          <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${
            modalState.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {modalState.type === 'success' ? (
              <Package className="h-6 w-6 text-white" />
            ) : (
              <AlertCircle className="h-6 w-6 text-white" />
            )}
          </div>
          <p className="text-clinic-gray-300 mb-4">{modalState.message}</p>
          <Button onClick={() => setModalState(prev => ({ ...prev, isOpen: false }))}>
            OK
          </Button>
        </div>
      </Modal>
    </div>
  )
}