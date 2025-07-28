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
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );

  useEffect(() => {
    loadDashboardData();
  }, [selectedMonth]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard?month=${selectedMonth}`);
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-amber-400 text-lg">Carregando dados...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-red-400">
        Erro ao carregar dados do dashboard
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header com seletor de mês */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-50">Dashboard Analytics</h1>
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

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Total de Pacientes</h3>
          <p className="text-3xl font-bold text-amber-400">{data.totalPacientes}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Pacientes Ativos (Mês)</h3>
          <p className="text-3xl font-bold text-green-400">{data.pacientesAtivosMes}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Pacientes Ativos (Total)</h3>
          <p className="text-3xl font-bold text-blue-400">{data.pacientesAtivosTotal}</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Média Mensal</h3>
          <p className="text-3xl font-bold text-purple-400">{data.mediaMensal.toFixed(1)}</p>
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
            {data.rankingResumos.slice(0, 10).map((item, index) => (
              <div key={item.cpf} className="flex justify-between items-center py-2 border-b border-gray-700">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-bold text-amber-400">#{index + 1}</span>
                  <span className="text-sm text-gray-300">{item.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '***.$2.***-**')}</span>
                </div>
                <span className="text-lg font-semibold text-gray-50">{item.total_resumos}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 10 Efeitos Adversos */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            ⚠️ Top 10 - Efeitos Adversos Relatados
          </h3>
          <div className="space-y-3">
            {data.topEfeitosAdversos.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-sm text-gray-300 flex-1">{item.item}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-red-400">{item.count}</span>
                  <span className="text-xs text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Fatores de Sucesso */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            ✅ Top 5 - Fatores de Sucesso
          </h3>
          <div className="space-y-3">
            {data.topFatoresSucesso.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-sm text-gray-300 flex-1">{item.item}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-green-400">{item.count}</span>
                  <span className="text-xs text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Pontos de Melhoria */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            🔧 Top 5 - Pontos de Melhoria
          </h3>
          <div className="space-y-3">
            {data.topMelhorias.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-sm text-gray-300 flex-1">{item.item}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-yellow-400">{item.count}</span>
                  <span className="text-xs text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Aspectos Supervalorizados */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            ⭐ Top 5 - Aspectos Supervalorizados
          </h3>
          <div className="space-y-3">
            {data.topSupervalorizados.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-sm text-gray-300 flex-1">{item.item}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-purple-400">{item.count}</span>
                  <span className="text-xs text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fonte de Usuários */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            📈 Fonte de Usuários
          </h3>
          <div className="space-y-3">
            {data.fonteUsuarios.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                <span className="text-sm text-gray-300 flex-1 capitalize">{item.item}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-blue-400">{item.count}</span>
                  <span className="text-xs text-gray-500">({item.percentage}%)</span>
                </div>
              </div>
            ))}
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
            {data.temasMarketing || 'Nenhum tema definido para o mês atual.'}
          </div>
        </div>

        {/* Oportunidades Marketing */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            💡 Oportunidades de Conteúdo
          </h3>
          <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
            {data.oportunidadesMarketing || 'Nenhuma oportunidade identificada.'}
          </div>
        </div>
      </div>

      {/* Observações */}
      {data.observacoes && (
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
      </div>
    </div>
  );
};

export default Dashboard;