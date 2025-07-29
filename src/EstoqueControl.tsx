import React, { useState, useEffect } from 'react';

interface User {
  id_usuario?: number;
  usuario: string;
  nome_completo?: string;
  role?: string;
}

interface Lote {
  id_lote: number;
  validade: string; // MM/YYYY format from database
  quantidade: number; // quantidade_disponivel
}

interface Produto {
  id_sku: number; // produtos_sku table
  nome_comercial_produto: string;
  classe_terapeutica: string; // from classes_terapeuticas join
  estoque_minimo: number; // estoque_minimo_dias from classes_terapeuticas
  lotes: Lote[];
}

interface Movimentacao {
  id_movimentacao?: number;
  id_lote: number;
  id_sku?: number;
  tipo_movimentacao: 'ENTRADA' | 'SAIDA'; // real DB values
  quantidade: number;
  observacao?: string;
  data_movimentacao: Date | string;
  usuario: string;
}

interface EstoqueControlProps {
  user: User | null;
}

// Enhanced error interface for proper typing
interface ApiError extends Error {
  status?: number;
  code?: string;
}

const EstoqueControl: React.FC<EstoqueControlProps> = ({ user }) => {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [selectedLote, setSelectedLote] = useState<string>('');
  const [quantidadeUtilizada, setQuantidadeUtilizada] = useState<string>('');
  const [quantidadeAdicionada, setQuantidadeAdicionada] = useState<string>('');
  const [validadeLote, setValidadeLote] = useState<string>('');
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ type: '', title: '', message: '' });
  const [loading, setLoading] = useState(false);

  const selectedProduto = produtos.find(p => p.id_sku === parseInt(selectedSku));

  useEffect(() => {
    loadProdutos();
    loadMovimentacoes();
  }, []);

  const loadProdutos = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading produtos from produtos_sku + classes_terapeuticas...');
      const response = await fetch('/api/produtos');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Produtos loaded:', data.length, 'items');
      setProdutos(data);
    } catch (err) {
      const error = err as ApiError;
      console.error('❌ Error loading produtos:', error.message);
      showModal('error', 'Erro', `Erro ao carregar produtos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadMovimentacoes = async () => {
    try {
      console.log('🔄 Loading movimentacoes from movimentacoes_estoque...');
      const response = await fetch('/api/movimentacoes');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Movimentacoes loaded:', data.length, 'items');
      setMovimentacoes(data);
    } catch (err) {
      const error = err as ApiError;
      console.error('❌ Error loading movimentacoes:', error.message);
      // Don't show modal for movimentacoes error, just log it
    }
  };

  const showModal = (type: string, title: string, message: string) => {
    setModalData({ type, title, message });
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
  };

  const handleSaida = async () => {
    const skuId = parseInt(selectedSku);
    const loteId = parseInt(selectedLote);
    const quantidade = parseInt(quantidadeUtilizada);

    if (!skuId || !loteId || !quantidade || quantidade <= 0) {
      showModal('error', 'Erro de Validação', 'Por favor, selecione um produto, um lote e insira uma quantidade válida.');
      return;
    }

    const produto = produtos.find(p => p.id_sku === skuId);
    const lote = produto?.lotes.find(l => l.id_lote === loteId);

    if (!lote || lote.quantidade < quantidade) {
      showModal('error', 'Estoque Insuficiente', `Não é possível registrar a saída de ${quantidade} unidades. Disponível: ${lote?.quantidade || 0}`);
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Recording SAIDA:', { skuId, loteId, quantidade, usuario: user?.usuario });
      
      const response = await fetch('/api/movimentacoes/saida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_sku: skuId,
          id_lote: loteId,
          quantidade,
          usuario: user?.usuario || 'sistema'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no servidor');
      }

      console.log('✅ SAIDA recorded successfully');
      await loadProdutos();
      await loadMovimentacoes();
      setQuantidadeUtilizada('');
      setSelectedSku('');
      setSelectedLote('');
      showModal('success', 'Sucesso!', 'Saída de estoque registrada com sucesso.');
    } catch (err) {
      const error = err as ApiError;
      console.error('❌ Error recording saida:', error.message);
      showModal('error', 'Erro', `Erro ao registrar saída: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEntrada = async () => {
    const skuId = parseInt(selectedSku);
    const quantidade = parseInt(quantidadeAdicionada);
    const validade = validadeLote;

    if (!skuId || !quantidade || quantidade <= 0 || !/^\d{2}\/\d{4}$/.test(validade)) {
      showModal('error', 'Erro de Validação', 'Selecione um produto, insira uma quantidade válida e uma validade no formato MM/AAAA.');
      return;
    }

    // Validate date format and future date
    const [mes, ano] = validade.split('/');
    const mesNum = parseInt(mes);
    const anoNum = parseInt(ano);
    const currentYear = new Date().getFullYear();
    
    if (mesNum < 1 || mesNum > 12) {
      showModal('error', 'Data Inválida', 'Mês deve estar entre 01 e 12.');
      return;
    }
    
    if (anoNum < currentYear) {
      showModal('error', 'Data Inválida', 'Ano de validade não pode ser no passado.');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Recording ENTRADA:', { skuId, quantidade, validade, usuario: user?.usuario });
      
      const response = await fetch('/api/movimentacoes/entrada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_sku: skuId,
          quantidade,
          validade,
          usuario: user?.usuario || 'sistema'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no servidor');
      }

      console.log('✅ ENTRADA recorded successfully');
      await loadProdutos();
      await loadMovimentacoes();
      setQuantidadeAdicionada('');
      setValidadeLote('');
      setSelectedSku('');
      showModal('success', 'Sucesso!', 'Entrada de estoque registrada com sucesso.');
    } catch (err) {
      const error = err as ApiError;
      console.error('❌ Error recording entrada:', error.message);
      showModal('error', 'Erro', `Erro ao registrar entrada: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatValidade = (value: string) => {
    let v = value.replace(/\D/g, '');
    if (v.length > 2) {
      v = v.substring(0, 2) + '/' + v.substring(2, 6);
    }
    return v;
  };

  const totalEstoque = selectedProduto?.lotes.reduce((sum, lote) => sum + lote.quantidade, 0) || 0;
  const estoqueStatus = selectedProduto && totalEstoque < selectedProduto.estoque_minimo ? 'CRÍTICO' : 'OK';
  const statusColor = estoqueStatus === 'CRÍTICO' ? 'text-red-400' : 'text-green-400';

  const getMovimentacaoColor = (tipo: string) => {
    return tipo === 'ENTRADA' ? 'bg-green-900/20 border-green-700' : 'bg-red-900/20 border-red-700';
  };

  const getMovimentacaoTextColor = (tipo: string) => {
    return tipo === 'ENTRADA' ? 'text-green-400' : 'text-red-400';
  };

  const getMovimentacaoSign = (tipo: string) => {
    return tipo === 'ENTRADA' ? '+' : '-';
  };

  const formatDateTime = (dateString: string | Date): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-amber-400 mb-8">Controle de Estoque</h1>

        {/* Status do Sistema */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">Status:</span>
              <span className="text-green-400">✅ Sistema Operacional</span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-400">Produtos carregados: {produtos.length}</span>
              <span className="text-sm text-gray-400">|</span>
              <span className="text-sm text-gray-400">Usuário: {user?.usuario || 'Sistema'}</span>
            </div>
            {loading && (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-600 border-t-amber-400 rounded-full animate-spin"></div>
                <span className="text-sm text-gray-400">Processando...</span>
              </div>
            )}
          </div>
        </div>

        {/* Formulários de Entrada e Saída */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Entrada de Estoque */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-green-400 mb-4">➕ Entrada de Estoque</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Produto</label>
                <select
                  value={selectedSku}
                  onChange={(e) => setSelectedSku(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map((produto) => (
                    <option key={produto.id_sku} value={produto.id_sku}>
                      {produto.nome_comercial_produto} - {produto.classe_terapeutica}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={quantidadeAdicionada}
                  onChange={(e) => setQuantidadeAdicionada(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Digite a quantidade"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Validade (MM/AAAA)</label>
                <input
                  type="text"
                  value={validadeLote}
                  onChange={(e) => setValidadeLote(formatValidade(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="12/2025"
                  maxLength={7}
                />
              </div>

              <button
                onClick={handleEntrada}
                disabled={loading || !selectedSku || !quantidadeAdicionada || !validadeLote}
                className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
              >
                {loading ? 'Processando...' : 'Registrar Entrada'}
              </button>
            </div>
          </div>

          {/* Saída de Estoque */}
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-red-400 mb-4">➖ Saída de Estoque</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Produto</label>
                <select
                  value={selectedSku}
                  onChange={(e) => {
                    setSelectedSku(e.target.value);
                    setSelectedLote(''); // Reset lote selection
                  }}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Selecione um produto</option>
                  {produtos.map((produto) => (
                    <option key={produto.id_sku} value={produto.id_sku}>
                      {produto.nome_comercial_produto} - {produto.classe_terapeutica}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProduto && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lote</label>
                  <select
                    value={selectedLote}
                    onChange={(e) => setSelectedLote(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="">Selecione um lote</option>
                    {selectedProduto.lotes
                      .filter(lote => lote.quantidade > 0)
                      .map((lote) => (
                        <option key={lote.id_lote} value={lote.id_lote}>
                          Validade: {lote.validade} - Disponível: {lote.quantidade}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={quantidadeUtilizada}
                  onChange={(e) => setQuantidadeUtilizada(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Digite a quantidade"
                />
              </div>

              <button
                onClick={handleSaida}
                disabled={loading || !selectedSku || !selectedLote || !quantidadeUtilizada}
                className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-md font-medium transition-colors"
              >
                {loading ? 'Processando...' : 'Registrar Saída'}
              </button>
            </div>
          </div>
        </div>

        {/* Informações do Produto Selecionado */}
        {selectedProduto && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold text-amber-400 mb-4">📊 Informações do Produto</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-400">Produto:</span>
                <p className="font-medium text-gray-300">{selectedProduto.nome_comercial_produto}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Classe:</span>
                <p className="font-medium text-gray-300">{selectedProduto.classe_terapeutica}</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Estoque Total:</span>
                <p className={`font-medium ${statusColor}`}>{totalEstoque} unidades</p>
              </div>
              <div>
                <span className="text-sm text-gray-400">Status:</span>
                <p className={`font-medium ${statusColor}`}>
                  {estoqueStatus} ({selectedProduto.estoque_minimo} mín.)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Produtos com Estoque */}
        <div className="mb-8 bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">📦 Produtos em Estoque</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-300">Produto</th>
                  <th className="text-left py-2 text-gray-300">Classe</th>
                  <th className="text-center py-2 text-gray-300">Total</th>
                  <th className="text-center py-2 text-gray-300">Mínimo</th>
                  <th className="text-center py-2 text-gray-300">Status</th>
                  <th className="text-left py-2 text-gray-300">Lotes</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((produto) => {
                  const total = produto.lotes.reduce((sum, lote) => sum + lote.quantidade, 0);
                  const status = total < produto.estoque_minimo ? 'CRÍTICO' : 'OK';
                  const statusColorClass = status === 'CRÍTICO' ? 'text-red-400' : 'text-green-400';
                  
                  return (
                    <tr key={produto.id_sku} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="py-2 text-gray-300">{produto.nome_comercial_produto}</td>
                      <td className="py-2 text-gray-400">{produto.classe_terapeutica}</td>
                      <td className="py-2 text-center text-gray-300">{total}</td>
                      <td className="py-2 text-center text-gray-400">{produto.estoque_minimo}</td>
                      <td className={`py-2 text-center font-medium ${statusColorClass}`}>{status}</td>
                      <td className="py-2 text-gray-400">
                        {produto.lotes.length > 0 ? (
                          <div className="space-y-1">
                            {produto.lotes.slice(0, 2).map((lote) => (
                              <div key={lote.id_lote} className="text-xs">
                                {lote.validade}: {lote.quantidade}
                              </div>
                            ))}
                            {produto.lotes.length > 2 && (
                              <div className="text-xs text-gray-500">
                                +{produto.lotes.length - 2} lotes
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">Sem lotes</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Movimentações Recentes */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-amber-400 mb-4">📋 Movimentações Recentes</h3>
          
          {movimentacoes.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {movimentacoes.map((mov) => (
                <div key={mov.id_movimentacao || mov.id_lote} className={`p-3 rounded border-l-4 ${getMovimentacaoColor(mov.tipo_movimentacao)}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <span className={`font-medium ${getMovimentacaoTextColor(mov.tipo_movimentacao)}`}>
                          {getMovimentacaoSign(mov.tipo_movimentacao)}{mov.quantidade} unidades
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-300">
                          {produtos.find(p => p.id_sku === mov.id_sku)?.nome_comercial_produto || `SKU ${mov.id_sku}`}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-400">
                        <span>Lote: {mov.id_lote}</span>
                        <span>Usuário: {mov.usuario}</span>
                        <span>{formatDateTime(mov.data_movimentacao)}</span>
                      </div>
                      {mov.observacao && (
                        <p className="mt-1 text-sm text-gray-500">{mov.observacao}</p>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      mov.tipo_movimentacao === 'ENTRADA' 
                        ? 'bg-green-900 text-green-300'
                        : 'bg-red-900 text-red-300'
                    }`}>
                      {mov.tipo_movimentacao}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>Nenhuma movimentação registrada hoje</p>
            </div>
          )}
        </div>

        {/* Modal */}
        {modalVisible && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${
                  modalData.type === 'success' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {modalData.title}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
              <p className="text-gray-300 mb-6">{modalData.message}</p>
              <div className="flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-md font-medium transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstoqueControl;