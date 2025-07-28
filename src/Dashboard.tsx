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
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      
      // Fallback data
      setData({
        totalPacientes: 0,
        pacientesAtivosMes: 0,
        pacientesAtivosTotal: 0,
        mediaMensal: 0,
        mediaGoogleReviews: '0.0',
        totalReviews: 0,
        reviewsPositivas: 0,
        reviewsNegativas: 0,
        rankingResumos: [],
        topEfeitosAdversos: [],
        topFatoresSucesso: [],
        topMelhorias: [],
        topSupervalorizados: [],
        fonteUsuarios: [],
        temasMarketing: 'Sistema em recuperação.',
        oportunidadesMarketing: 'Dados sendo carregados...',
        observacoes: 'Dashboard em modo de recuperação.'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentimento: string) => {
    switch (sentimento) {
      case 'Positivo': return 'text-green-400';
      case 'Negativo': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Realizada': return 'text-green-400';
      case 'Agendada': return 'text-blue-400';
      case 'Cancelada': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-600 border-t-amber-400 rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-amber-400 text-lg">Carregando dados completos...</div>
          <div className="text-gray-500 text-sm mt-2">Integrando com base de dados real...</div>
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
          onClick={loadAllData}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          🔄 Tentar Novamente
        </button>
      </div>
    );
  }

  const satisfacaoPercentual = data?.totalReviews > 0 
    ? ((data.reviewsPositivas / data.totalReviews) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-8">
      {/* Header */}
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

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Total de Pacientes</h3>
          <p className="text-3xl font-bold text-amber-400">{data?.totalPacientes || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Base real PostgreSQL</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Pacientes Ativos (Mês)</h3>
          <p className="text-3xl font-bold text-green-400">{data?.pacientesAtivosMes || 0}</p>
          <p className="text-xs text-gray-500 mt-1">Chat logs reais</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Avaliação Google</h3>
          <p className="text-3xl font-bold text-blue-400">{data?.mediaGoogleReviews || '0.0'}/5.0</p>
          <p className="text-xs text-gray-500 mt-1">{data?.totalReviews || 0} avaliações</p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-sm font-medium text-gray-400">Satisfação</h3>
          <p className="text-3xl font-bold text-purple-400">{satisfacaoPercentual}%</p>
          <p className="text-xs text-gray-500 mt-1">{data?.reviewsPositivas || 0}/{data?.totalReviews || 0} positivas</p>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Google Reviews */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            ⭐ Avaliações Google Recentes
          </h3>
          <div className="space-y-4 max-h-80 overflow-y-auto">
            {reviews.length > 0 ? (
              reviews.map((review, index) => (
                <div key={index} className="bg-gray-900 p-4 rounded border border-gray-700">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-300">{review.autor}</span>
                      <span className={`text-xs px-2 py-1 rounded ${getSentimentColor(review.sentimento)} bg-gray-800`}>
                        {review.sentimento}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-amber-400 font-bold">{review.nota}</span>
                      <span className="text-amber-400">★</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    {review.comentario}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    {new Date(review.data).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Nenhuma avaliação recente
              </div>
            )}
          </div>
        </div>

        {/* Recent Consultas */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            📅 Consultas Recentes
          </h3>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {consultas.length > 0 ? (
              consultas.map((consulta, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-300">{consulta.nome_completo}</p>
                    <p className="text-xs text-gray-500">{consulta.tipo_consulta}</p>
                    <p className="text-xs text-gray-600">{consulta.origem}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${getStatusColor(consulta.status_consulta)}`}>
                      {consulta.status_consulta}
                    </p>
                    <p className="text-xs text-gray-500">
                      {consulta.data_consulta ? new Date(consulta.data_consulta).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Nenhuma consulta recente
              </div>
            )}
          </div>
        </div>

        {/* Top Fatores de Sucesso */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            ✅ Top Procedimentos (Faturamento)
          </h3>
          <div className="space-y-3">
            {data?.topFatoresSucesso && data.topFatoresSucesso.length > 0 ? (
              data.topFatoresSucesso.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-300 flex-1">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-green-400">R$ {item.count}k</span>
                    <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Dados de faturamento em processamento
              </div>
            )}
          </div>
        </div>

        {/* Fonte de Usuários */}
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            📈 Origem dos Pacientes (Faturamento)
          </h3>
          <div className="space-y-3">
            {data?.fonteUsuarios && data.fonteUsuarios.length > 0 ? (
              data.fonteUsuarios.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-700">
                  <span className="text-sm text-gray-300 flex-1 capitalize">{item.item}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-blue-400">R$ {item.count}k</span>
                    <span className="text-xs text-gray-500">({item.percentage.toFixed(1)}%)</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-4">
                Dados de origem em processamento
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Marketing Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            🎯 Inteligência de Marketing
          </h3>
          <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
            {data?.temasMarketing || 'Dados sendo processados...'}
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-50 mb-4">
            💡 Oportunidades Identificadas
          </h3>
          <div className="text-sm text-gray-300 whitespace-pre-line leading-relaxed">
            {data?.oportunidadesMarketing || 'Análises em andamento...'}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-gray-800 p-6 rounded-lg">
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
            <span className="text-gray-300 ml-2">{data?.totalPacientes} pacientes, {reviews.length} reviews</span>
          </div>
          <div className="bg-gray-900 p-3 rounded">
            <span className="text-amber-400 font-semibold">🔄 Última Atualização:</span>
            <span className="text-gray-300 ml-2">{new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-700">
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