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
    } catch (error) {
      console.error('❌ Error loading produtos:', error);
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
    } catch (error) {
      console.error('❌ Error loading movimentacoes:', error);
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
    } catch (error) {
      console.error('❌ Error recording saida:', error);
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
    } catch (error) {
      console.error('❌ Error recording entrada:', error);
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

  if (loading && produtos.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-amber-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-amber-400 text-lg">Carregando sistema de estoque...</div>
          <div className="text-gray-500 text-sm mt-2">Conectando com schema PostgreSQL real...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-gray-800 bg-opacity-90 p-8 rounded-xl shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Coluna de Registro */}
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-50">Registrar Movimentação</h2>
              <div className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded">
                Schema Real PostgreSQL
              </div>
            </div>
            
            <div>
              <label htmlFor="sku-select" className="block text-sm font-medium text-gray-300">
                1. Escolha o Produto (SKU)
              </label>
              <select
                id="sku-select"
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                disabled={loading}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-900 text-gray-50 border border-gray-600 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md disabled:opacity-50"
              >
                <option value="">-- Selecione um produto --</option>
                {produtos.map(produto => (
                  <option key={produto.id_sku} value={produto.id_sku}>
                    {produto.nome_comercial_produto} ({produto.classe_terapeutica})
                  </option>
                ))}
              </select>
            </div>

            {selectedProduto && (
              <div className="p-4 bg-gray-900 rounded-lg text-center">
                <p className="text-sm text-gray-400">Estoque Total</p>
                <p className="text-3xl font-bold text-amber-400">
                  {totalEstoque} <span className="text-lg font-medium text-gray-300">unidades</span>
                </p>
                <div className="border-t border-gray-600 mt-4 pt-2 space-y-1 text-xs text-gray-400">
                  <div className="flex justify-between items-center">
                    <span>Estoque Mínimo:</span>
                    <span className="font-semibold">{selectedProduto.estoque_minimo} dias</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Status:</span>
                    <span className={`font-semibold ${statusColor}`}>{estoqueStatus}</span>
                  </div>
                  <div className="border-t border-gray-600 mt-2 pt-2">
                    <p className="text-sm font-semibold text-left mb-1">Lotes Disponíveis:</p>
                    {selectedProduto.lotes.filter(l => l.quantidade > 0).map(lote => (
                      <div key={lote.id_lote} className="flex justify-between items-center">
                        <span>Lote (Val: {lote.validade})</span>
                        <span className="font-semibold">{lote.quantidade} un.</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <hr className="border-gray-600" />

            {/* Saída */}
            <div className="space-y-4">
              <p className="font-medium text-gray-50">Registrar Saída (Uso Diário)</p>
              
              {selectedProduto && selectedProduto.lotes.filter(l => l.quantidade > 0).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300">
                    Selecione o Lote para dar baixa
                  </label>
                  <select
                    value={selectedLote}
                    onChange={(e) => setSelectedLote(e.target.value)}
                    disabled={loading}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-900 text-gray-50 border border-gray-600 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm rounded-md disabled:opacity-50"
                  >
                    <option value="">-- Selecione um lote --</option>
                    {selectedProduto.lotes
                      .filter(l => l.quantidade > 0)
                      .sort((a, b) => {
                        const [mesA, anoA] = a.validade.split('/');
                        const [mesB, anoB] = b.validade.split('/');
                        return new Date(parseInt(anoA), parseInt(mesA) - 1).getTime() - 
                               new Date(parseInt(anoB), parseInt(mesB) - 1).getTime();
                      })
                      .map(lote => (
                        <option key={lote.id_lote} value={lote.id_lote}>
                          Lote (Val: {lote.validade}) - Disponível: {lote.quantidade}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300">
                  2. Quantidade Utilizada
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantidadeUtilizada}
                  onChange={(e) => setQuantidadeUtilizada(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  placeholder="Digite a quantidade"
                  className="mt-1 block w-full px-3 py-2 bg-gray-900 text-gray-50 border border-gray-600 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm disabled:opacity-50"
                />
              </div>

              <button
                onClick={handleSaida}
                disabled={loading || !selectedSku || !selectedLote || !quantidadeUtilizada}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processando...' : 'Registrar Saída'}
              </button>
            </div>

            <hr className="border-gray-600" />

            {/* Entrada */}
            <div className="space-y-4">
              <p className="font-medium text-gray-50">Registrar Entrada (Recebimento)</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  3. Quantidade de Unidades para Adicionar
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={quantidadeAdicionada}
                  onChange={(e) => setQuantidadeAdicionada(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                  placeholder="Digite a quantidade"
                  className="mt-1 block w-full px-3 py-2 bg-gray-900 text-gray-50 border border-gray-600 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300">
                  4. Validade do Lote Recebido (MM/AAAA)
                </label>
                <input
                  type="text"
                  placeholder="MM/AAAA"
                  value={validadeLote}
                  onChange={(e) => setValidadeLote(formatValidade(e.target.value))}
                  disabled={loading}
                  className="mt-1 block w-full px-3 py-2 bg-gray-900 text-gray-50 border border-gray-600 rounded-md shadow-sm focus:ring-amber-500 focus:border-amber-500 sm:text-sm disabled:opacity-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Será convertido para data no banco PostgreSQL
                </p>
              </div>

              <button
                onClick={handleEntrada}
                disabled={loading || !selectedSku || !quantidadeAdicionada || !validadeLote}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-900 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processando...' : 'Registrar Entrada'}
              </button>
            </div>
          </div>

          {/* Coluna de Histórico */}
          <div className="border-l border-gray-600 pl-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-50">Últimas Movimentações</h2>
              <button
                onClick={loadMovimentacoes}
                disabled={loading}
                className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600 disabled:opacity-50"
              >
                🔄 Atualizar
              </button>
            </div>
            <div className="space-y-4 max-h-[30rem] overflow-y-auto pr-2">
              {movimentacoes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center">Nenhuma movimentação registrada hoje.</p>
              ) : (
                movimentacoes.slice().reverse().map((mov, index) => {
                  const produto = produtos.find(p => p.id_sku === mov.id_sku);
                  const bgColor = getMovimentacaoColor(mov.tipo_movimentacao);
                  const textColor = getMovimentacaoTextColor(mov.tipo_movimentacao);
                  const sign = getMovimentacaoSign(mov.tipo_movimentacao);

                  return (
                    <div key={index} className={`${bgColor} p-3 rounded-lg border`}>
                      <div className="flex justify-between items-center">
                        <p className={`font-medium text-sm ${textColor}`}>{mov.tipo_movimentacao}</p>
                        <p className={`font-bold text-lg ${textColor}`}>{sign}{mov.quantidade}</p>
                      </div>
                      <p className="text-sm text-gray-50">{produto?.nome_comercial_produto || 'Produto não encontrado'}</p>
                      <p className="text-xs text-gray-400">{mov.observacao || 'Sem observações'}</p>
                      <div className="text-xs text-gray-500 text-right mt-1">
                        <span>{mov.usuario} - {new Date(mov.data_movimentacao).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="relative mx-auto p-5 border border-gray-600 shadow-lg rounded-md bg-gray-800 w-full max-w-sm">
            <div className="mt-3 text-center">
              <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
                modalData.type === 'success' ? 'bg-green-500' : 'bg-red-500'
              }`}>
                {modalData.type === 'success' ? (
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-50">{modalData.title}</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-300">{modalData.message}</p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 bg-amber-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstoqueControl;