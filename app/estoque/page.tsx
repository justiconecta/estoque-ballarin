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
  dataLote?: string // Para entrada: data do lote em DD/MM/YYYY
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
    dataLote: '',
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

  const showModal = (type: 'success' | 'error', title: string, message: string) => {
    setModalState({ isOpen: true, type, title, message })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  // Converter data DD/MM/YYYY para ISO
  const convertDateToISO = (ddmmyyyy: string): string => {
    if (!ddmmyyyy) return ''
    const [day, month, year] = ddmmyyyy.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
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
      
      // Processar dados para incluir estoque total - SEM FALLBACKS
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
    // Reset form ao selecionar produto
    setMovForm({
      tipo: 'SAIDA',
      quantidade: '',
      loteId: produto.lotes.length > 0 ? produto.lotes[0].id_lote : undefined,
      dataLote: '',
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

      if (movForm.tipo === 'ENTRADA') {
        // ENTRADA: Criar novo lote
        if (!movForm.dataLote) {
          showModal('error', 'Erro de Validação', 'Informe a data do lote para entrada.')
          return
        }

        const dataValidade = convertDateToISO(movForm.dataLote)
        
        // Criar novo lote
        const novoLote = await supabaseApi.createLote({
          id_sku: selectedProduto.id_sku,
          quantidade_disponivel: quantidade,
          validade: dataValidade
        })

        // Registrar movimentação de entrada
        await supabaseApi.createMovimentacao({
          id_lote: novoLote.id_lote,
          tipo_movimentacao: 'ENTRADA',
          quantidade: quantidade,
          usuario: currentUser?.usuario || 'desconhecido',
          observacao: movForm.observacao || `Novo lote criado - Val: ${movForm.dataLote}`
        })

        showModal('success', 'Sucesso', `Entrada de ${quantidade} unidades registrada com sucesso!`)
        
      } else {
        // SAÍDA: Usar lote existente
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

        // Registrar movimentação de saída
        await supabaseApi.createMovimentacao({
          id_lote: movForm.loteId,
          tipo_movimentacao: 'SAIDA',
          quantidade: quantidade,
          usuario: currentUser?.usuario || 'desconhecido',
          observacao: movForm.observacao || `Uso diário - ${new Date().toLocaleDateString('pt-BR')}`
        })

        // Atualizar quantidade do lote
        const novaQuantidade = loteAtual.quantidade_disponivel - quantidade
        await supabaseApi.updateLoteQuantidade(movForm.loteId, novaQuantidade)

        showModal('success', 'Sucesso', `Saída de ${quantidade} unidades registrada com sucesso!`)
      }

      // Resetar formulário e recarregar dados
      setMovForm({
        tipo: 'SAIDA',
        quantidade: '',
        loteId: undefined,
        dataLote: '',
        observacao: ''
      })
      setSelectedProduto(null)
      loadProdutos()
      loadMovimentacoes()

    } catch (error) {
      showModal('error', 'Erro', 'Falha ao registrar movimentação.')
      console.error('Erro na movimentação:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-clinic-black">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="bg-gradient-to-r from-clinic-gray-800 via-clinic-gray-700 to-clinic-gray-700 rounded-xl p-5 mb-6 border border-clinic-gray-600 shadow-xl backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 relative">
                <div className="absolute inset-0"></div>
                <Image
                  src="/justiconecta.png"
                  alt="Clínica Ballarin"
                  width={75}
                  height={75}
                  className="rounded-lg relative z-10"
                />
              </div>
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <div className="p-1.5 bg-clinic-cyan/20 rounded-md backdrop-blur-sm">
                    <Package className="h-5 w-5 text-clinic-cyan" />
                  </div>
                  <h1 className="text-xl font-bold text-clinic-white tracking-tight">Controle de Estoque</h1>
                </div>
                <p className="text-clinic-gray-300 text-sm">Gerencie produtos e movimentações</p>
              </div>
            </div>
            
            {/* Navegação Universal */}
            <div className="flex items-center space-x-3">
              <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-1.5 flex items-center space-x-1 border border-clinic-gray-600">
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
              
              <div className="bg-clinic-gray-800/80 backdrop-blur-sm rounded-lg p-1.5 flex items-center space-x-1 border border-clinic-gray-600">
                <Button 
                  variant="secondary" 
                  onClick={toggleTheme} 
                  icon={isDarkTheme ? Sun : Moon} 
                  size="sm"
                  className="px-3 py-2 hover:bg-clinic-cyan hover:text-clinic-black transition-all duration-300 hover:scale-105 rounded-md font-medium"
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

        {/* Layout Principal: ESQUERDA = Movimentação | DIREITA = Produtos */}
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
                    
                    {/* Estoque Total */}
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

                  {/* Tipo de Movimentação */}
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
                    /* INTERFACE PARA SAÍDA */
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
                    /* INTERFACE PARA ENTRADA */
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
                          Data do Lote
                        </label>
                        <input
                          type="date"
                          value={movForm.dataLote ? convertDateToISO(movForm.dataLote) : ''}
                          onChange={(e) => {
                            if (e.target.value) {
                              const [year, month, day] = e.target.value.split('-')
                              const formattedDate = `${day}/${month}/${year}`
                              setMovForm(prev => ({ ...prev, dataLote: formattedDate }))
                            } else {
                              setMovForm(prev => ({ ...prev, dataLote: '' }))
                            }
                          }}
                          className="block w-full px-3 py-2 bg-clinic-gray-800 border border-clinic-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-clinic-cyan focus:border-clinic-cyan transition-all duration-200"
                          required
                        />
                        {movForm.dataLote && (
                          <p className="text-clinic-gray-400 text-xs">Data selecionada: {movForm.dataLote}</p>
                        )}
                      </div>
                    </>
                  )}

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
                      disabled={loading || !movForm.quantidade || (movForm.tipo === 'SAIDA' && !movForm.loteId) || (movForm.tipo === 'ENTRADA' && !movForm.dataLote)}
                      className="flex-1"
                      loading={loading}
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

        {/* EMBAIXO: Histórico de Movimentações Completo */}
        <Card title="Histórico de Movimentações">
          {movimentacoes.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-8 w-8 text-clinic-gray-500 mb-4" />
              <p className="text-clinic-gray-400">Nenhuma movimentação registrada ainda</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-clinic-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-clinic-gray-300">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-clinic-gray-300">Produto</th>
                    <th className="text-left py-3 px-4 font-medium text-clinic-gray-300">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-clinic-gray-300">Quantidade</th>
                    <th className="text-left py-3 px-4 font-medium text-clinic-gray-300">Usuário</th>
                    <th className="text-left py-3 px-4 font-medium text-clinic-gray-300">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((mov) => (
                    <tr key={mov.id_movimentacao} className="border-b border-clinic-gray-800 hover:bg-clinic-gray-800/50">
                      <td className="py-3 px-4 text-clinic-gray-300 text-sm">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-clinic-gray-500" />
                          {formatDate(mov.data_movimentacao)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-clinic-white font-medium">
                        {mov.lotes.skus.nome_produto}
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