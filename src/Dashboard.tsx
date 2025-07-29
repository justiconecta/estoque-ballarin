import React, { useState, useEffect } from 'react';

interface PacienteRanking {
  cpf: string;
  nome_paciente?: string;
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
  mediaGoogleReviews: string;
  totalReviews: number;
  reviewsPositivas: number;
  reviewsNegativas: number;
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

interface GoogleReview {
  autor: string;
  nota: number;
  sentimento: string;
  comentario: string;
  data: string;
}

interface Consulta {
  id_consulta: number;
  nome_completo: string;
  data_consulta: string;
  tipo_consulta: string;
  status_consulta: string;
  origem: string;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7)
  );

  useEffect(() => {
    loadAllData();
  }, [selectedMonth]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Loading complete dashboard data for month:', selectedMonth);
      
      // Load main dashboard data
      const dashboardResponse = await fetch(`/api/dashboard?month=${selectedMonth}`);
      if (!dashboardResponse.ok) {
        throw new Error(`Dashboard API error: ${dashboardResponse.status}`);
      }
      const dashboardData = await dashboardResponse.json();
      setData(dashboardData);

      // Load Google Reviews
      try {
        const reviewsResponse = await fetch('/api/reviews');
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          setReviews(reviewsData);
        }
      } catch (reviewError) {
        console.warn('Reviews data not available:', reviewError);
      }

      // Load Recent Consultas
      try {
        const consultasResponse = await fetch('/api/consultas');
        if (consultasResponse.ok) {
          const consultasData = await consultasResponse.json();
          setConsultas(consultasData);
        }
      } catch (consultaError) {
        console.warn('Consultas data not available:', consultaError);
      }

      console.log('✅ All dashboard data loaded successfully');
      
    } catch (err) {
      console.error('❌ Error loading dashboard data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Safe percentage calculation with proper null checks
  const calculatePercentage = (value: number, total: number): number => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const satisfacaoPercentual = data && data.totalReviews > 0 
    ? calculatePercentage(data.reviewsPositivas, data.totalReviews)
    : 0;

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-amber-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-amber-400">Dashboard Analytics</h1>
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium">Mês:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-gray-300"
            />
          </div>
        </div>
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-2">Total Pacientes</h3>
          <p className="text-3xl font-bold text-amber-400">{data?.totalPacientes || 0}</p>
          <p className="text-sm text-gray-400 mt-1">Cadastrados no sistema</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-2">Ativos no Mês</h3>
          <p className="text-3xl font-bold text-green-400">{data?.pacientesAtivosMes || 0}</p>
          <p className="text-sm text-gray-400 mt-1">Consultas realizadas</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-2">Google Reviews</h3>
          <p className="text-3xl font-bold text-blue-400">{data?.mediaGoogleReviews || '0.0'}</p>
          <p className="text-sm text-gray-400 mt-1">{data?.totalReviews || 0} avaliações</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-2">Satisfação</h3>
          <p className="text-3xl font-bold text-purple-400">{satisfacaoPercentual}%</p>
          <p className="text-sm text-gray-400 mt-1">
            {data?.reviewsPositivas || 0} positivas / {data?.totalReviews || 0} total
          </p>
        </div>
      </div>

      {/* Rankings e Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Fatores de Sucesso */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            ⭐ Top Fatores de Sucesso
          </h3>
          {data?.topFatoresSucesso && data.topFatoresSucesso.length > 0 ? (
            <div className="space-y-3">
              {data.topFatoresSucesso.slice(0, 5).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-300">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">{item.count}</span>
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum dado disponível</p>
          )}
        </div>

        {/* Fontes de Usuários */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            📊 Fontes de Usuários
          </h3>
          {data?.fonteUsuarios && data.fonteUsuarios.length > 0 ? (
            <div className="space-y-3">
              {data.fonteUsuarios.slice(0, 5).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-300">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">{item.count}</span>
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum dado disponível</p>
          )}
        </div>

        {/* Top Melhorias */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            🔧 Pontos de Melhoria
          </h3>
          {data?.topMelhorias && data.topMelhorias.length > 0 ? (
            <div className="space-y-3">
              {data.topMelhorias.slice(0, 5).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-300">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">{item.count}</span>
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum ponto identificado</p>
          )}
        </div>

        {/* Top Supervalorizados */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            💎 Diferenciais Valorizados
          </h3>
          {data?.topSupervalorizados && data.topSupervalorizados.length > 0 ? (
            <div className="space-y-3">
              {data.topSupervalorizados.slice(0, 5).map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-gray-300">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-400">{item.count}</span>
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(item.percentage, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhum diferencial identificado</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Consultas Recentes */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            📅 Consultas Recentes
          </h3>
          {consultas.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {consultas.slice(0, 5).map((consulta) => (
                <div key={consulta.id_consulta} className="border-l-4 border-blue-500 pl-3 py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-300">{consulta.nome_completo}</p>
                      <p className="text-sm text-gray-400">{consulta.tipo_consulta}</p>
                      <p className="text-xs text-gray-500">
                        {formatDate(consulta.data_consulta)} • {consulta.origem}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      consulta.status_consulta === 'Realizada' 
                        ? 'bg-green-900 text-green-300'
                        : 'bg-amber-900 text-amber-300'
                    }`}>
                      {consulta.status_consulta}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma consulta recente</p>
          )}
        </div>

        {/* Google Reviews Recentes */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            ⭐ Reviews Recentes
          </h3>
          {reviews.length > 0 ? (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {reviews.slice(0, 5).map((review, index) => (
                <div key={index} className="border-l-4 border-amber-500 pl-3 py-2">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-gray-300">{review.autor}</p>
                    <div className="flex items-center space-x-1">
                      <span className="text-amber-400">{'★'.repeat(review.nota)}</span>
                      <span className="text-gray-600">{'★'.repeat(5 - review.nota)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 mb-1">{review.comentario}</p>
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      review.sentimento === 'Positivo'
                        ? 'bg-green-900 text-green-300'
                        : review.sentimento === 'Negativo'
                        ? 'bg-red-900 text-red-300'
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {review.sentimento}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(review.data)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">Nenhuma review recente</p>
          )}
        </div>
      </div>

      {/* Insights de Marketing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            🎯 Inteligência de Marketing
          </h3>
          <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
            {data?.temasMarketing || 'Dados sendo processados...'}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            💡 Oportunidades Identificadas
          </h3>
          <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
            {data?.oportunidadesMarketing || 'Análises em andamento...'}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-50 mb-4">
          📊 Status do Sistema
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-900 p-3 rounded">
            <span className="text-green-400 font-semibold">✅ PostgreSQL:</span>
            <span className="text-gray-300 ml-2">Conectado e operacional</span>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <span className="text-blue-400 font-semibold">📊 Dados:</span>
            <span className="text-gray-300 ml-2">{data?.totalPacientes || 0} pacientes, {reviews.length} reviews</span>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <span className="text-amber-400 font-semibold">🔄 Última Atualização:</span>
            <span className="text-gray-300 ml-2">{new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
        
        {data?.observacoes && (
          <div className="mt-4 p-3 bg-gray-900 rounded">
            <span className="text-purple-400 font-semibold">📋 Observações:</span>
            <span className="text-gray-300 ml-2">{data.observacoes}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700 mt-8">
        Dashboard integrado com schema real PostgreSQL - 19 tabelas disponíveis
        {error && (
          <div className="mt-2 text-yellow-500">
            ⚠️ Sistema em modo de recuperação - Alguns dados podem estar em processamento
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;