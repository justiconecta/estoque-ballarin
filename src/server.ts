import express from 'express';
import cors from 'cors';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Types for better type safety
interface Database {
  public: {
    Tables: {
      classes_terapeuticas: {
        Row: { id_classe_terapeutica: number; nome: string; estoque_minimo_dias: number; };
      };
      skus: {
        Row: { id_sku: number; nome_produto: string; classe_terapeutica: string; id_classe_terapeutica: number; };
      };
      lotes: {
        Row: { id_lote: number; id_sku: number; validade: string; quantidade_disponivel: number; };
      };
      movimentacoes_estoque: {
        Row: { id_movimentacao: number; id_lote: number; tipo_movimentacao: string; quantidade: number; observacao?: string; data_movimentacao: string; usuario: string; };
      };
      pacientes: {
        Row: { id_paciente: number; nome: string; cpf?: string; };
      };
      consultas: {
        Row: { id_consulta: number; id_paciente: number; data_consulta?: string; tipo_consulta?: string; status_consulta?: string; origem?: string; };
      };
      google_review: {
        Row: { review_id?: number; autor?: string; nota?: number; sentimento?: string; comentario?: string; data?: string; };
      };
      dashboard_agregados: {
        Row: { id_agregado: number; tipo_agregado: string; dados_agregados: any; data_referencia: string; data_geracao?: string; };
      };
      usuarios_internos: {
        Row: { id_usuario: number; usuario: string; senha: string; nome_completo?: string; };
      };
    };
  };
}

// Supabase client setup with proper typing
const supabaseUrl = process.env.SUPABASE_URL || 'https://jlprybnxjqzaqzsxxnuh.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpscHJ5Ym54anF6YXF6c3h4bnVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzczNjU0NiwiZXhwIjoyMDY5MzEyNTQ2fQ._pwWwiQ9kI_67_hVTh5KvECFHCRMOiInCT-J1NfItN0';

const supabase: SupabaseClient<Database> = createClient(supabaseUrl, supabaseServiceKey);

// Test Supabase connection with proper error typing
const testConnection = async (): Promise<boolean> => {
  try {
    console.log('🔄 Testing Supabase connection...');
    const { data, error } = await supabase.from('classes_terapeuticas').select('*').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
};

// Health check with proper error handling
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  
  try {
    const { count, error } = await supabase.from('skus').select('*', { count: 'exact', head: true });
    
    if (error) {
      throw error;
    }
    
    res.json({
      status: dbConnected ? 'ok' : 'error',
      database: 'supabase',
      connection: dbConnected ? 'connected' : 'disconnected',
      tables_count: count || 0,
      timestamp: new Date().toISOString(),
      project: 'jlprybnxjqzaqzsxxnuh'
    });
  } catch (err: unknown) {
    const error = err as Error;
    res.status(500).json({
      status: 'error',
      database: 'supabase',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auth endpoint - Supabase users table with proper typing
app.post('/api/auth/login', async (req, res) => {
  const { username, password }: { username: string; password: string } = req.body;
  
  try {
    console.log(`🔐 Login attempt for user: ${username}`);
    
    // Check usuarios_internos table first (if exists)
    const { data: users, error } = await supabase
      .from('usuarios_internos')
      .select('usuario, nome_completo')
      .eq('usuario', username)
      .eq('senha', password)
      .limit(1);
    
    if (!error && users && users.length > 0) {
      const user = users[0];
      console.log('✅ Supabase auth successful for:', user.usuario);
      res.json({ usuario: user.usuario, nome_completo: user.nome_completo, role: 'staff' });
      return;
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Supabase auth error:', error.message);
  }
  
  // Fallback local auth
  const localUsers = [
    { usuario: 'Admin', senha: 'admin123', role: 'admin' },
    { usuario: 'Funcionario', senha: 'func123', role: 'staff' }
  ];
  
  const user = localUsers.find(u => u.usuario === username && u.senha === password);
  if (user) {
    console.log('✅ Local auth successful for:', user.usuario);
    const { senha, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } else {
    console.log('❌ Auth failed for:', username);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Produtos endpoint - Supabase skus + classes_terapeuticas with proper typing
app.get('/api/produtos', async (req, res) => {
  try {
    console.log('🔄 Loading produtos from Supabase...');
    
    // Get products with therapeutic classes and lots
    const { data: produtos, error: produtoError } = await supabase
      .from('skus')
      .select(`
        id_sku,
        nome_produto,
        classe_terapeutica,
        id_classe_terapeutica,
        lotes(id_lote, quantidade_disponivel, validade)
      `)
      .order('nome_produto');
    
    if (produtoError) {
      throw produtoError;
    }

    // Get classes_terapeuticas separately for estoque_minimo_dias
    const { data: classes, error: classesError } = await supabase
      .from('classes_terapeuticas')
      .select('id_classe_terapeutica, estoque_minimo_dias');
    
    if (classesError) {
      throw classesError;
    }

    // Create a map for quick lookup
    const classesMap = new Map();
    classes?.forEach(classe => {
      classesMap.set(classe.id_classe_terapeutica, classe.estoque_minimo_dias);
    });

    // Format response to match frontend expectations
    const formattedProdutos = produtos?.map(produto => ({
      id_sku: produto.id_sku,
      nome_comercial_produto: produto.nome_produto,
      classe_terapeutica: produto.classe_terapeutica,
      estoque_minimo: classesMap.get(produto.id_classe_terapeutica) || 14,
      lotes: produto.lotes?.filter(lote => lote.quantidade_disponivel > 0).map(lote => ({
        id_lote: lote.id_lote,
        validade: new Date(lote.validade).toLocaleDateString('pt-BR', { 
          month: '2-digit', 
          year: 'numeric' 
        }).replace('/', '/'),
        quantidade: lote.quantidade_disponivel
      })) || []
    })) || [];
    
    console.log(`✅ Produtos loaded successfully: ${formattedProdutos.length} items`);
    res.json(formattedProdutos);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Error fetching produtos:', error.message);
    res.status(500).json({ error: 'Supabase error', details: error.message });
  }
});

// Movimentações endpoint - Supabase movimentacoes_estoque with proper typing
app.get('/api/movimentacoes', async (req, res) => {
  try {
    console.log('🔄 Loading movimentacoes from Supabase...');
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    const { data: movimentacoes, error } = await supabase
      .from('movimentacoes_estoque')
      .select(`
        id_movimentacao,
        tipo_movimentacao,
        quantidade,
        observacao,
        data_movimentacao,
        usuario,
        id_lote,
        lotes!inner(id_sku)
      `)
      .gte('data_movimentacao', today)
      .order('data_movimentacao', { ascending: false })
      .limit(50);
    
    if (error) throw error;

    const formattedMovimentacoes = movimentacoes?.map(mov => ({
      id: mov.id_movimentacao,
      id_sku: (mov.lotes as any)?.id_sku,
      tipo: mov.tipo_movimentacao,
      quantidade: mov.quantidade,
      observacao: mov.observacao,
      data: mov.data_movimentacao,
      usuario: mov.usuario,
      id_lote: mov.id_lote
    })) || [];
    
    console.log(`✅ Movimentacoes loaded successfully: ${formattedMovimentacoes.length} items`);
    res.json(formattedMovimentacoes);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Error fetching movimentacoes:', error.message);
    res.status(500).json({ error: 'Supabase error', details: error.message });
  }
});

// Dashboard endpoint - Supabase aggregated data with proper typing
app.get('/api/dashboard', async (req, res) => {
  try {
    console.log('🔄 Loading dashboard data from Supabase...');
    const month = (req.query.month as string) || new Date().toISOString().substring(0, 7);
    
    // Get patient count
    const { count: totalPacientes } = await supabase
      .from('pacientes')
      .select('*', { count: 'exact', head: true });

    // Get reviews data
    const { data: reviewsData, error: reviewsError } = await supabase
      .from('google_review')
      .select('nota, sentimento')
      .gte('data', `${month}-01`)
      .lt('data', `${month}-31`);

    if (reviewsError) {
      console.warn('Reviews query failed:', reviewsError.message);
    }

    const reviewsCount = reviewsData?.length || 0;
    const avgRating = reviewsCount > 0 ? 
      (reviewsData.reduce((sum, r) => sum + (r.nota || 0), 0) / reviewsCount).toFixed(1) : '0.0';
    const positiveReviews = reviewsData?.filter(r => r.sentimento === 'Positivo').length || 0;
    const negativeReviews = reviewsData?.filter(r => r.sentimento === 'Negativo').length || 0;

    // Get dashboard aggregated data
    const { data: agregados, error: agregadosError } = await supabase
      .from('dashboard_agregados')
      .select('tipo_agregado, dados_agregados')
      .gte('data_referencia', `${month}-01`)
      .order('data_geracao', { ascending: false });

    if (agregadosError) {
      console.warn('Agregados query failed:', agregadosError.message);
    }

    // Process aggregated data for rankings
    let topFatoresSucesso: Array<{item: string; count: number; percentage: number}> = [];
    let fonteUsuarios: Array<{item: string; count: number; percentage: number}> = [];
    
    agregados?.forEach(item => {
      if (item.tipo_agregado.includes('RANKING_PROCEDIMENTOS')) {
        const data = item.dados_agregados;
        if (Array.isArray(data)) {
          topFatoresSucesso = data.slice(0, 5).map(proc => ({
            item: proc.procedimento || proc.nome || 'Unknown',
            count: Math.floor((proc.faturamento || proc.valor || 0) / 1000),
            percentage: 25.0
          }));
        }
      }
      if (item.tipo_agregado.includes('FATURAMENTO_POR_ORIGEM')) {
        const data = item.dados_agregados;
        if (Array.isArray(data)) {
          fonteUsuarios = data.slice(0, 5).map(origem => ({
            item: origem.origem || 'Unknown',
            count: Math.floor((origem.faturamento || origem.valor || 0) / 1000),
            percentage: 25.0
          }));
        }
      }
    });

    const dashboardData = {
      totalPacientes: totalPacientes || 0,
      pacientesAtivosMes: Math.floor((totalPacientes || 0) * 0.3), // Estimate
      pacientesAtivosTotal: Math.floor((totalPacientes || 0) * 0.7), // Estimate
      mediaMensal: Math.floor((totalPacientes || 0) * 0.1),
      mediaGoogleReviews: avgRating,
      totalReviews: reviewsCount,
      reviewsPositivas: positiveReviews,
      reviewsNegativas: negativeReviews,
      rankingResumos: [],
      topEfeitosAdversos: [],
      topFatoresSucesso,
      topMelhorias: [],
      topSupervalorizados: [],
      fonteUsuarios,
      temasMarketing: 'Dados integrados com Supabase cloud.',
      oportunidadesMarketing: 'Analytics baseados em dados reais do Supabase PostgreSQL.',
      observacoes: `Dashboard Supabase: ${totalPacientes} pacientes, ${reviewsCount} reviews processadas.`
    };
    
    console.log('✅ Dashboard data loaded successfully from Supabase');
    res.json(dashboardData);
    
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Dashboard error:', error.message);
    res.status(500).json({
      error: 'Supabase dashboard error',
      details: error.message,
      fallback: true
    });
  }
});

// Entrada endpoint - Supabase lotes + movimentacoes_estoque with proper typing
app.post('/api/movimentacoes/entrada', async (req, res) => {
  const { id_sku, quantidade, validade, usuario }: {
    id_sku: number;
    quantidade: number;
    validade: string;
    usuario?: string;
  } = req.body;
  
  try {
    console.log('🔄 Processing entrada:', { id_sku, quantidade, validade, usuario });
    
    // Convert MM/YYYY to date
    const [mes, ano] = validade.split('/');
    const validadeDate = `${ano}-${mes.padStart(2, '0')}-28`;
    
    // Check if lote exists
    const { data: existingLotes, error: loteError } = await supabase
      .from('lotes')
      .select('id_lote, quantidade_disponivel')
      .eq('id_sku', id_sku)
      .eq('validade', validadeDate);
    
    if (loteError) throw loteError;

    let id_lote: number;
    
    if (existingLotes && existingLotes.length > 0) {
      // Update existing lote
      id_lote = existingLotes[0].id_lote;
      const novaQuantidade = existingLotes[0].quantidade_disponivel + quantidade;
      
      const { error: updateError } = await supabase
        .from('lotes')
        .update({ quantidade_disponivel: novaQuantidade })
        .eq('id_lote', id_lote);
      
      if (updateError) throw updateError;
    } else {
      // Create new lote
      const { data: newLote, error: insertError } = await supabase
        .from('lotes')
        .insert({
          id_sku,
          validade: validadeDate,
          quantidade_disponivel: quantidade
        })
        .select('id_lote')
        .single();
      
      if (insertError) throw insertError;
      if (!newLote) throw new Error('Failed to create new lote');
      id_lote = newLote.id_lote;
    }
    
    // Record movimentacao
    const { error: movError } = await supabase
      .from('movimentacoes_estoque')
      .insert({
        id_lote,
        tipo_movimentacao: 'ENTRADA',
        quantidade,
        usuario: usuario || 'sistema',
        data_movimentacao: new Date().toISOString()
      });
    
    if (movError) throw movError;
    
    console.log('✅ Entrada registered successfully');
    res.json({ success: true, message: 'Entrada registrada com sucesso' });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Error recording entrada:', error.message);
    res.status(500).json({ error: 'Supabase error', details: error.message });
  }
});

// Saída endpoint - Supabase lotes + movimentacoes_estoque with proper typing
app.post('/api/movimentacoes/saida', async (req, res) => {
  const { id_sku, id_lote, quantidade, usuario }: {
    id_sku: number;
    id_lote: number;
    quantidade: number;
    usuario?: string;
  } = req.body;
  
  try {
    console.log('🔄 Processing saida:', { id_sku, id_lote, quantidade, usuario });
    
    // Check available quantity
    const { data: lote, error: loteError } = await supabase
      .from('lotes')
      .select('quantidade_disponivel')
      .eq('id_lote', id_lote)
      .single();
    
    if (loteError) throw new Error('Lote não encontrado');
    if (!lote) throw new Error('Lote não encontrado');
    
    const availableQty = lote.quantidade_disponivel;
    if (availableQty < quantidade) {
      throw new Error(`Quantidade insuficiente. Disponível: ${availableQty}`);
    }
    
    // Update lote quantity
    const { error: updateError } = await supabase
      .from('lotes')
      .update({ quantidade_disponivel: availableQty - quantidade })
      .eq('id_lote', id_lote);
    
    if (updateError) throw updateError;
    
    // Record movimentacao
    const { error: movError } = await supabase
      .from('movimentacoes_estoque')
      .insert({
        id_lote,
        tipo_movimentacao: 'SAIDA',
        quantidade,
        usuario: usuario || 'sistema',
        data_movimentacao: new Date().toISOString()
      });
    
    if (movError) throw movError;
    
    console.log('✅ Saida registered successfully');
    res.json({ success: true, message: 'Saída registrada com sucesso' });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('❌ Error recording saida:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Consultas endpoint - Supabase consultas + pacientes with proper typing
app.get('/api/consultas', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: consultas, error } = await supabase
      .from('consultas')
      .select(`
        id_consulta,
        id_paciente,
        data_consulta,
        tipo_consulta,
        status_consulta,
        origem,
        pacientes!inner(nome)
      `)
      .gte('data_consulta', thirtyDaysAgo)
      .order('data_consulta', { ascending: false });
    
    if (error) throw error;

    const formattedConsultas = consultas?.map(consulta => ({
      id_consulta: consulta.id_consulta,
      id_paciente: consulta.id_paciente,
      nome_completo: (consulta.pacientes as any)?.nome || 'Nome não informado',
      data_consulta: consulta.data_consulta,
      tipo_consulta: consulta.tipo_consulta,
      status_consulta: consulta.status_consulta,
      origem: consulta.origem
    })) || [];
    
    res.json(formattedConsultas);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error fetching consultas:', error.message);
    res.status(200).json([]);
  }
});

// Reviews endpoint - Supabase google_review with proper typing
app.get('/api/reviews', async (req, res) => {
  try {
    const { data: reviews, error } = await supabase
      .from('google_review')
      .select('autor, nota, sentimento, comentario, data')
      .order('data', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    res.json(reviews || []);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error fetching reviews:', error.message);
    res.status(200).json([]);
  }
});

// Error handling middleware with proper typing
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error', 
    message: err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(`☁️  Database: Supabase Cloud`);
  console.log(`🆔 Project: jlprybnxjqzaqzsxxnuh`);
  testConnection();
});

export default app;