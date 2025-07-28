import React, { useState, useEffect } from 'react';

interface PacienteRanking {
  cpf: string;
  total_resumos: number;
}

interface TopItem {
  item: string;
  count: number;
  percentage: number;
}

interface DashboardData {
  totalPacientes: number;
  pacientesAtivosMes: number;
  pacientesAtivosTotal: number;
  mediaMensal: number;
  rankingResumos: PacienteRanking[];
  topEfeitosAdversos: TopItem[];
  topFatoresSucesso: TopItem[];
  topMelhorias: TopItem[];
  topSupervalorizados: TopItem[];
  fonteUsuarios: TopItem[];
  temasMarketing: string;
  oportunidadesMarketing: string;
  observacoes: string;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );

  useEffect(() => {
    loadDashboardData();
  }, [selectedMonth]);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading dashboard data for month:', selectedMonth);
      
      const response = await fetch(`/api/dashboard?month=${selectedMonth}`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const dashboardData = await response.json();
      console.log('📊 Dashboard data received:', {
        totalPacientes: dashboardData.totalPacientes,
        hasRankingResumos: dashboardData.rankingResumos?.length > 0,
        hasTopEfeitosAdversos: dashboardData.topEfeitosAdversos?.length > 0
      });
      
      // Validate data structure
      if (!dashboardData || typeof dashboardData.totalPacientes === 'undefined') {
        throw new Error('Dados do dashboard em formato inválido');
      }
      
      setData(dashboardData);
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do dashboard:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      
      // Set fallback data on error to prevent blank screen
      setData({
        totalPacientes: 0,
        pacientesAtivosMes: 0,
        pacientesAtivosTotal: 0,
        mediaMensal: 0,
        rankingResumos: [],
        topEfeitosAdversos: [],
        topFatoresSucesso: [],
        topMelhorias: [],
        topSupervalorizados: [],
        fonteUsuarios: [],
        temasMarketing: 'Sistema temporariamente indisponível.',
        oportunidadesMarketing: 'Dados sendo carregados...',
        observacoes: 'Dashboard em modo de recuperação.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-amber-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-amber-400 text-lg">Carregando dados...</div>
          <div className="text-gray-500 text-sm mt-2">Conectando ao banco de dados...</div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center text-red-400 bg-red-900/20 p-6 rounded-lg border border-red-700">
        <div className="text-xl font-semibold mb-2">⚠️ Erro no Dashboard</div>
        <div className="text-sm mb-4">{error}</div>
        <button 
          onClick={loadDashboardData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          🔄 Tentar Novamente
        </button>
      </div>
    );
  }

  // Show data even if there was an error (fallback data)
  return (
    <div className="space-y-8">
      {/* Header com seletor de mês */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-50">Dashboard Analytics</h1>
        <div className="flex items-center space-x-4">
          {error && (
            <div className="text-yellow-400 text-sm bg-yellow-900/20 px-3 py-1 rounded border border-yellow-700">
              ⚠️ Modo recuperação
            </div>
          )}
          <div>
            <label className="text-sm text-gray-300 mr-2">Mês:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-gray-50 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Total de Pacientes</h3>
          <p className="text-3xl font-bold text-amber-400">{data?.totalPacientes || 0}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Pacientes Ativos (Mês)</h3>
          <p className="text-3xl font-bold text-green-400">{data?.pacientesAtivosMes || 0}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Pacientes Ativos (Total)</h3>
          <p className="text-3xl font-bold text-blue-400">{data?.pacientesAtivosTotal || 0}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Média Mensal</h3>
          <p className="text-3xl font-bold text-purple-400">{data?.mediaMensal?.toFixed(1) || '0.0'}</p>
        </div>
      </div>

      {/* Grid de analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Ranking Pacientes com + Resumos */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            📊 Ranking - Pacientes com + Resumos Diários
          </h3>
          <div className="space-y-3">
            {data?.rankingResumos && data.rankingResumos.length > 0 ? (
              data.rankingResumos.slice(0, 10).map((item, index) => (
                <div key={item.cpf} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-amber-400">#{index + 1}</span>
                    <span className="text-sm text-gray-300">{item.cpf}</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-50">{item.total_resumos}</span>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Nenhum dado de ranking disponível
              </div>
            )}
          </div>
        </div>

        {/* Top 10 Efeitos Adversos */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            ⚠️ Top 10 - Efeitos Adversos Relatados
          </h3>
          <div className="space-y-3">
            {data?.topEfeitosAdversos && data.topEfeitosAdversos.length > 0 ? (
              data.topEfeitosAdversos.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-300 flex-1">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-red-400">{item.count}</span>
                    <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Nenhum efeito adverso relatado
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Fatores de Sucesso */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            ✅ Top 5 - Fatores de Sucesso
          </h3>
          <div className="space-y-3">
            {data?.topFatoresSucesso && data.topFatoresSucesso.length > 0 ? (
              data.topFatoresSucesso.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-300 flex-1">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-green-400">{item.count}</span>
                    <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Nenhum fator de sucesso mapeado
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Pontos de Melhoria */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            🔧 Top 5 - Pontos de Melhoria
          </h3>
          <div className="space-y-3">
            {data?.topMelhorias && data.topMelhorias.length > 0 ? (
              data.topMelhorias.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-300 flex-1">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-yellow-400">{item.count}</span>
                    <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Nenhum ponto de melhoria identificado
              </div>
            )}
          </div>
        </div>

        {/* Top 5 Aspectos Supervalorizados */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            ⭐ Top 5 - Aspectos Supervalorizados
          </h3>
          <div className="space-y-3">
            {data?.topSupervalorizados && data.topSupervalorizados.length > 0 ? (
              data.topSupervalorizados.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-300 flex-1">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-purple-400">{item.count}</span>
                    <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Nenhum aspecto supervalorizado mapeado
              </div>
            )}
          </div>
        </div>

        {/* Fonte de Usuários */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            📈 Fonte de Usuários
          </h3>
          <div className="space-y-3">
            {data?.fonteUsuarios && data.fonteUsuarios.length > 0 ? (
              data.fonteUsuarios.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-300 flex-1 capitalize">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-blue-400">{item.count}</span>
                    <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Nenhuma fonte de usuário mapeada
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Marketing e Observações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Temas Marketing */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            🎯 Temas Marketing do Mês
          </h3>
          <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
            {data?.temasMarketing || 'Nenhum tema definido para o mês atual.'}
          </div>
        </div>

        {/* Oportunidades Marketing */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            💡 Oportunidades de Conteúdo
          </h3>
          <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
            {data?.oportunidadesMarketing || 'Nenhuma oportunidade identificada.'}
          </div>
        </div>
      </div>

      {/* Observações */}
      {data?.observacoes && (
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            📝 Observações
          </h3>
          <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
            {data.observacoes}
          </div>
        </div>
      )}

      {/* Footer com timestamp */}
      <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700">
        Dados atualizados em: {new Date().toLocaleString('pt-BR')}
        {error && (
          <div className="mt-2 text-yellow-500">
            ⚠️ Sistema em modo de recuperação - Alguns dados podem estar desatualizados
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;