'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { 
  LogOut, 
  Package, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Home, 
  Users, 
  Sun, 
  Moon,
  Plus,
  Calendar,
  User,
  FileText
} from 'lucide-react'
import { Button, Input, Select, Card, Modal } from '@/components/ui'
import { supabaseApi } from '@/lib/supabase'
import { ProdutoComEstoque, MovimentacaoDetalhada, Usuario } from '@/types/database'

interface MovimentacaoForm {
  tipo: 'ENTRADA' | 'SAIDA'
  quantidade: string
  loteId?: number
  validade?: string
  observacao?: string
}

export default function EstoquePage() {
  const router = useRouter()
  
  // Estados principais
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null)
  const [produtos, setProdutos] = useState<ProdutoComEstoque[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoDetalhada[]>([])
  const [selectedProduto, setSelectedProduto] = useState<ProdutoComEstoque | null>(null)
  const [loading, setLoading] = useState(false)
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  
  // Estados de formulário
  const [movForm, setMovForm] = useState<MovimentacaoForm>({
    tipo: 'SAIDA',
    quantidade: '',
    loteId: undefined,
    validade: '',
    observacao: ''
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

  // Detectar página atual para botão ativo
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
  const isCurrentPage = (path: string) => {
    if (path === '/dashboard') {
      return currentPath === '/dashboard' || currentPath.startsWith('/dashboard/')
    }
    return currentPath === path
  }

  const handleLogout = () => {
    localStorage.removeItem('ballarin_user')
    router.push('/login')
  }

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme)
    localStorage.setItem('ballarin_theme', !isDarkTheme ? 'dark' : 'light')
  }

  // Carregar tema salvo
  useEffect(() => {
    const savedTheme = localStorage.getItem('ballarin_theme')
    if (savedTheme) {
      setIsDarkTheme(savedTheme === 'dark')
    }
  }, [])

  // Aplicar tema no documento
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', isDarkTheme ? 'dark' : 'light')
    }
  }, [isDarkTheme])

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
      const data = await supabaseApi.getMovimentacoes(50) // Buscar mais movimentações para o histórico
      setMovimentacoes(data)
    } catch (error) {
      console.error('Erro ao carregar movimentações:', error)
    }
  }

  const handleProdutoSelect = (produto: ProdutoComEstoque) => {
    setSelectedProduto(produto)
    setMovForm(prev => ({ 
      ...prev, 
      loteId: produto.lotes.length > 0 ? produto.lotes[0].id_lote : undefined 
    }))
  }

  const handleMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedProduto || !movForm.quantidade || !movForm.loteId) {
      showModal('error', 'Erro de Validação', 'Selecione um produto, lote e informe a quantidade.')
      return
    }

    const quantidade = parseInt(movForm.quantidade)
    if (quantidade <= 0) {
      showModal('error', 'Erro de Validação', 'Quantidade deve ser maior que zero.')
      return
    }

    try {
      setLoading(true)

      // Buscar lote atual
      const loteAtual = selectedProduto.lotes.find(l => l.id_lote === movForm.loteId)
      if (!loteAtual) {
        showModal('error', 'Erro', 'Lote não encontrado.')
        return
      }

      let novaQuantidade = loteAtual.quantidade_disponivel

      if (movForm.tipo === 'ENTRADA') {
        novaQuantidade += quantidade
      } else {
        if (quantidade > loteAtual.quantidade_disponivel) {
          showModal('error', 'Erro', 'Quantidade insuficiente em estoque.')
          return
        }
        novaQuantidade -= quantidade
      }

      // Registrar movimentação
      await supabaseApi.createMovimentacao({
        id_lote: movForm.loteId,
        tipo_movimentacao: movForm.tipo,
        quantidade: quantidade,
        usuario: currentUser?.nome || 'Sistema',
        observacao: movForm.observacao || null
      })

      // Atualizar quantidade do lote
      await supabaseApi.updateLoteQuantidade(movForm.loteId, novaQuantidade)

      showModal('success', 'Sucesso', `${movForm.tipo.toLowerCase()} registrada com sucesso!`)
      
      // Recarregar dados
      await Promise.all([loadProdutos(), loadMovimentacoes()])
      
      // Limpar formulário
      setMovForm({
        tipo: 'SAIDA',
        quantidade: '',
        loteId: undefined,
        validade: '',
        observacao: ''
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
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
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
      <div className="max-w-7xl mx-auto">
        {/* Header Universal */}
        <header className="bg-gradient-to-r from-clinic-gray-800 via-clinic-gray-750 to-clinic-gray-700 rounded-xl p-6 mb-6 border border-clinic-gray-600 shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Image
                  src="/justiconecta.png"
                  alt="JustiConecta"
                  width={55}
                  height={55}
                  className="rounded-lg"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="p-2 bg-clinic-cyan/20 rounded-md backdrop-blur-sm">
                    <Package className="h-5 w-5 text-clinic-cyan" />
                  </div>
                  <h1 className="text-xl font-bold text-clinic-white tracking-tight">Controle de Estoque</h1>
                </div>
                <p className="text-clinic-gray-300 text-sm">
                  Gestão de produtos, lotes e movimentações
                </p>
              </div>
            </div>
            
            {/* Navegação Universal */}
            <div className="flex items-center space-x-3">
              <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-1 border border-clinic-gray-600">
                <Button 
                  variant="secondary" 
                  onClick={() => router.push('/dashboard')} 
                  icon={Home} 
                  size="sm"
                  className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                    isCurrentPage('/dashboard')
                      ? 'bg-clinic-cyan text-clinic-black shadow-md' 
                      : 'hover:bg-clinic-cyan hover:text-clinic-black hover:scale-105'
                  }`}
                >
                  Dashboard
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => router.push('/estoque')} 
                  icon={Package} 
                  size="sm"
                  className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                    isCurrentPage('/estoque')
                      ? 'bg-clinic-cyan text-clinic-black shadow-md' 
                      : 'hover:bg-clinic-cyan hover:text-clinic-black hover:scale-105'
                  }`}
                >
                  Estoque
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => router.push('/pacientes')} 
                  icon={Users} 
                  size="sm"
                  className={`px-4 py-2 transition-all duration-300 rounded-md font-medium ${
                    isCurrentPage('/pacientes')
                      ? 'bg-clinic-cyan text-clinic-black shadow-md' 
                      : 'hover:bg-clinic-cyan hover:text-clinic-black hover:scale-105'
                  }`}
                >
                  Pacientes
                </Button>
              </div>
              
              <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-2 flex items-center space-x-1 border border-clinic-gray-600">
                <Button 
                  variant="secondary" 
                  onClick={toggleTheme} 
                  icon={isDarkTheme ? Sun : Moon} 
                  size="sm"
                  className="w-12 h-10 flex items-center justify-center hover:bg-clinic-cyan hover:text-clinic-black transition-all duration-300 hover:scale-105 rounded-md font-medium"
                  title={isDarkTheme ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                />
                
                <Button 
                  variant="secondary" 
                  onClick={handleLogout} 
                  icon={LogOut} 
                  size="sm"
                  className="px-4 py-2 hover:bg-red-500 hover:text-white transition-all duration-300 hover:scale-105 rounded-md font-medium"
                >
                  Sair
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Layout Principal: Esquerda + Direita */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          
          {/* ESQUERDA: Lista de Produtos */}
          <Card title="Produtos em Estoque">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-clinic-cyan"></div>
                <span className="ml-3 text-clinic-gray-400">Carregando produtos...</span>
              </div>
            ) : produtos.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {produtos.map((produto) => (
                  <div
                    key={produto.id_sku}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedProduto?.id_sku === produto.id_sku
                        ? 'bg-clinic-cyan/20 border-2 border-clinic-cyan'
                        : 'bg-clinic-gray-700 hover:bg-clinic-gray-600 border-2 border-transparent'
                    }`}
                    onClick={() => handleProdutoSelect(produto)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="text-clinic-white font-medium">{produto.nome_produto}</h3>
                        <p className="text-clinic-gray-400 text-sm">{produto.fabricante}</p>
                        <p className="text-clinic-gray-400 text-xs">{produto.classe_terapeutica}</p>
                        <p className="text-clinic-gray-500 text-xs mt-1">
                          {produto.lotes.length} lote{produto.lotes.length !== 1 ? 's' : ''} disponível{produto.lotes.length !== 1 ? 'is' : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-clinic-white font-bold text-lg">{produto.estoque_total}</div>
                        <div className="text-clinic-gray-400 text-sm">unidades</div>
                        <div className={`text-xs px-2 py-1 rounded mt-1 ${
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

          {/* DIREITA: Registro de Movimentação */}
          <Card title="Registrar Movimentação">
            {!selectedProduto ? (
              <div className="text-center py-12">
                <Plus className="mx-auto h-12 w-12 text-clinic-gray-500 mb-4" />
                <p className="text-clinic-gray-400">Selecione um produto para registrar movimentação</p>
              </div>
            ) : (
              <form onSubmit={handleMovimentacao} className="space-y-4">
                {/* Produto Selecionado */}
                <div className="bg-clinic-gray-700 p-4 rounded-lg">
                  <h3 className="text-clinic-white font-medium mb-2">Produto Selecionado:</h3>
                  <p className="text-clinic-cyan font-medium">{selectedProduto.nome_produto}</p>
                  <p className="text-clinic-gray-400 text-sm">{selectedProduto.fabricante}</p>
                  <p className="text-clinic-gray-400 text-sm">Estoque atual: {selectedProduto.estoque_total} unidades</p>
                </div>

                {/* Tipo de Movimentação */}
                <Select
                  label="Tipo de Movimentação"
                  value={movForm.tipo}
                  onChange={(e) => setMovForm(prev => ({ ...prev, tipo: e.target.value as 'ENTRADA' | 'SAIDA' }))}
                  options={[
                    { value: 'ENTRADA', label: 'Entrada de Estoque' },
                    { value: 'SAIDA', label: 'Saída de Estoque' }
                  ]}
                />

                {/* Seleção de Lote */}
                <Select
                  label="Lote"
                  value={movForm.loteId || ''}
                  onChange={(e) => setMovForm(prev => ({ ...prev, loteId: parseInt(e.target.value) }))}
                  options={[
                    { value: '', label: 'Selecione um lote...' },
                    ...selectedProduto.lotes.map(lote => ({
                      value: lote.id_lote.toString(),
                      label: `Lote ${lote.id_lote} - ${lote.quantidade_disponivel} un. - Val: ${formatDate(lote.validade)}`
                    }))
                  ]}
                />

                {/* Quantidade */}
                <Input
                  label="Quantidade"
                  type="number"
                  min="1"
                  value={movForm.quantidade}
                  onChange={(e) => setMovForm(prev => ({ ...prev, quantidade: e.target.value }))}
                  placeholder="Digite a quantidade"
                  required
                />

                {/* Observação */}
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-clinic-white">
                    Observação (opcional)
                  </label>
                  <textarea
                    value={movForm.observacao}
                    onChange={(e) => setMovForm(prev => ({ ...prev, observacao: e.target.value }))}
                    placeholder="Adicione uma observação sobre a movimentação..."
                    rows={3}
                    className="block w-full px-3 py-2 bg-clinic-gray-800 border border-clinic-gray-600 rounded-md text-clinic-white placeholder-clinic-gray-400 focus:outline-none focus:ring-2 focus:ring-clinic-cyan focus:border-clinic-cyan transition-all duration-200"
                  />
                </div>

                {/* Botões */}
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="submit"
                    disabled={loading || !movForm.quantidade || !movForm.loteId}
                    className="flex-1"
                    loading={loading}
                  >
                    Registrar {movForm.tipo === 'ENTRADA' ? 'Entrada' : 'Saída'}
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
                        validade: '',
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

        {/* EMBAIXO: Histórico de Movimentações Completo */}
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
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Data/Hora</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Tipo</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Produto</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Lote</th>
                    <th className="text-center py-3 px-4 text-clinic-gray-400 font-medium">Quantidade</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Usuário</th>
                    <th className="text-left py-3 px-4 text-clinic-gray-400 font-medium">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((mov) => (
                    <tr key={mov.id_movimentacao} className="border-b border-clinic-gray-700 hover:bg-clinic-gray-750">
                      <td className="py-3 px-4 text-clinic-gray-300 text-sm">
                        {formatDateTime(mov.data_movimentacao)}
                      </td>
                      <td className="py-3 px-4">
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
                      </td>
                      <td className="py-3 px-4 text-clinic-white">
                        {mov.lotes?.skus?.nome_produto || 'Produto não encontrado'}
                      </td>
                      <td className="py-3 px-4 text-clinic-gray-300">
                        Lote {mov.id_lote}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${
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

        {/* Modal de Feedback */}
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
    </div>
  )
}