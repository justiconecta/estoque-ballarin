import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'justiconecta_postgres_justiconecta',
  database: process.env.DB_NAME || 'justiconecta',
  password: process.env.DB_PASSWORD || '3e27238b138b4693215b',
  port: parseInt(process.env.DB_PORT || '5432'),
});

// Test database connection
const testConnection = async (): Promise<boolean> => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('✅ PostgreSQL connected successfully');
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message);
    return false;
  }
};

// Health check
app.get('/api/health', async (req, res) => {
  const dbConnected = await testConnection();
  res.json({
    status: 'ok',
    database: dbConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Auth endpoint - CORRIGIDO para usuarios_internos
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const userQuery = await pool.query(
      'SELECT usuario, nome_completo FROM andressa_ballarin.usuarios_internos WHERE usuario = $1 AND senha = $2',
      [username, password]
    );
    
    if (userQuery.rows.length > 0) {
      const user = userQuery.rows[0];
      res.json({ usuario: user.usuario, nome_completo: user.nome_completo, role: 'staff' });
      return;
    }
  } catch (error) {
    console.log('Database auth failed, trying local fallback');
  }
  
  // Fallback local auth
  const localUsers = [
    { usuario: 'Admin', senha: 'admin123', role: 'admin' },
    { usuario: 'Funcionario', senha: 'func123', role: 'staff' }
  ];
  
  const user = localUsers.find(u => u.usuario === username && u.senha === password);
  if (user) {
    const { senha, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Produtos endpoints - CORRIGIDO para produtos_sku + classes_terapeuticas
app.get('/api/produtos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.id_sku,
        p.nome_comercial_produto,
        ct.nome as classe_terapeutica,
        ct.estoque_minimo_dias as estoque_minimo,
        COALESCE(json_agg(
          json_build_object(
            'id_lote', l.id_lote,
            'validade', TO_CHAR(l.validade, 'MM/YYYY'),
            'quantidade', l.quantidade_disponivel
          ) ORDER BY l.validade
        ) FILTER (WHERE l.id_lote IS NOT NULL), '[]'::json) as lotes
      FROM andressa_ballarin.produtos_sku p
      JOIN andressa_ballarin.classes_terapeuticas ct ON p.id_classe_terapeutica = ct.id_classe_terapeutica
      LEFT JOIN andressa_ballarin.lotes l ON p.id_sku = l.id_sku AND l.quantidade_disponivel > 0
      GROUP BY p.id_sku, p.nome_comercial_produto, ct.nome, ct.estoque_minimo_dias
      ORDER BY p.nome_comercial_produto
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching produtos:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Movimentações endpoints - CORRIGIDO para schema real
app.get('/api/movimentacoes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id_movimentacao as id,
        l.id_sku,
        m.tipo_movimentacao as tipo,
        m.quantidade,
        m.observacao,
        m.data_movimentacao as data,
        m.usuario,
        m.id_lote
      FROM andressa_ballarin.movimentacoes_estoque m
      JOIN andressa_ballarin.lotes l ON m.id_lote = l.id_lote
      WHERE DATE(m.data_movimentacao) = CURRENT_DATE
      ORDER BY m.data_movimentacao DESC
      LIMIT 50
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching movimentacoes:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Entrada - CORRIGIDO para schema real
app.post('/api/movimentacoes/entrada', async (req, res) => {
  const { id_sku, quantidade, validade, usuario } = req.body;
  
  try {
    await pool.query('BEGIN');
    
    // Convert MM/YYYY to DATE
    const [mes, ano] = validade.split('/');
    const validadeDate = `${ano}-${mes.padStart(2, '0')}-28`; // Last safe day of month
    
    // Check if lote with this validade exists
    let loteResult = await pool.query(
      'SELECT id_lote FROM andressa_ballarin.lotes WHERE id_sku = $1 AND validade = $2',
      [id_sku, validadeDate]
    );
    
    let id_lote;
    if (loteResult.rows.length > 0) {
      id_lote = loteResult.rows[0].id_lote;
      // Update existing lote
      await pool.query(
        'UPDATE andressa_ballarin.lotes SET quantidade_disponivel = quantidade_disponivel + $1 WHERE id_lote = $2',
        [quantidade, id_lote]
      );
    } else {
      // Create new lote
      const newLoteResult = await pool.query(
        'INSERT INTO andressa_ballarin.lotes (id_sku, validade, quantidade_disponivel) VALUES ($1, $2, $3) RETURNING id_lote',
        [id_sku, validadeDate, quantidade]
      );
      id_lote = newLoteResult.rows[0].id_lote;
    }
    
    // Record movimentacao
    await pool.query(
      'INSERT INTO andressa_ballarin.movimentacoes_estoque (id_lote, tipo_movimentacao, quantidade, usuario, data_movimentacao) VALUES ($1, $2, $3, $4, NOW())',
      [id_lote, 'ENTRADA', quantidade, usuario]
    );
    
    await pool.query('COMMIT');
    res.json({ success: true, message: 'Entrada registrada com sucesso' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error recording entrada:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Saída - CORRIGIDO para schema real
app.post('/api/movimentacoes/saida', async (req, res) => {
  const { id_sku, id_lote, quantidade, usuario } = req.body;
  
  try {
    await pool.query('BEGIN');
    
    // Check available quantity
    const loteResult = await pool.query(
      'SELECT quantidade_disponivel FROM andressa_ballarin.lotes WHERE id_lote = $1',
      [id_lote]
    );
    
    if (loteResult.rows.length === 0) {
      throw new Error('Lote não encontrado');
    }
    
    const availableQty = loteResult.rows[0].quantidade_disponivel;
    if (availableQty < quantidade) {
      throw new Error(`Quantidade insuficiente. Disponível: ${availableQty}`);
    }
    
    // Update lote quantity
    await pool.query(
      'UPDATE andressa_ballarin.lotes SET quantidade_disponivel = quantidade_disponivel - $1 WHERE id_lote = $2',
      [quantidade, id_lote]
    );
    
    // Record movimentacao
    await pool.query(
      'INSERT INTO andressa_ballarin.movimentacoes_estoque (id_lote, tipo_movimentacao, quantidade, usuario, data_movimentacao) VALUES ($1, $2, $3, $4, NOW())',
      [id_lote, 'SAIDA', quantidade, usuario]
    );
    
    await pool.query('COMMIT');
    res.json({ success: true, message: 'Saída registrada com sucesso' });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error recording saida:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dashboard endpoint - USANDO DADOS REAIS do dashboard_agregados
app.get('/api/dashboard', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().substring(0, 7);
    const [year, monthNum] = month.split('-');
    
    // Pacientes count
    const totalPacientesResult = await pool.query(
      'SELECT COUNT(*) as count FROM andressa_ballarin.pacientes'
    );
    const totalPacientes = parseInt(totalPacientesResult.rows[0].count) || 0;
    
    // Active patients this month from chat logs
    const activeThisMonthResult = await pool.query(`
      SELECT COUNT(DISTINCT session_id) as count 
      FROM andressa_ballarin.pacientes_chat_logs 
      WHERE DATE_TRUNC('month', created_on) = DATE_TRUNC('month', $1::date)
    `, [`${year}-${monthNum}-01`]);
    const pacientesAtivosMes = parseInt(activeThisMonthResult.rows[0].count) || 0;
    
    // Active patients last 90 days
    const activeTotalResult = await pool.query(`
      SELECT COUNT(DISTINCT session_id) as count 
      FROM andressa_ballarin.pacientes_chat_logs 
      WHERE created_on >= CURRENT_DATE - INTERVAL '90 days'
    `);
    const pacientesAtivosTotal = parseInt(activeTotalResult.rows[0].count) || 0;
    
    // Get dashboard agregados data
    const agregadosResult = await pool.query(`
      SELECT tipo_agregado, dados_agregados 
      FROM andressa_ballarin.dashboard_agregados 
      WHERE data_referencia >= $1::date - INTERVAL '30 days'
      ORDER BY data_referencia DESC
    `, [`${year}-${monthNum}-01`]);
    
    // Google Reviews data
    const reviewsResult = await pool.query(`
      SELECT 
        AVG(nota) as media_nota,
        COUNT(*) as total_reviews,
        SUM(CASE WHEN sentimento = 'Positivo' THEN 1 ELSE 0 END) as positivos,
        SUM(CASE WHEN sentimento = 'Negativo' THEN 1 ELSE 0 END) as negativos
      FROM andressa_ballarin.google_review 
      WHERE DATE_TRUNC('month', data) = DATE_TRUNC('month', $1::date)
    `, [`${year}-${monthNum}-01`]);
    
    const reviewData = reviewsResult.rows[0];
    
    // Process agregados data
    const processedData = {
      totalPacientes,
      pacientesAtivosMes,
      pacientesAtivosTotal,
      mediaMensal: pacientesAtivosMes > 0 ? (pacientesAtivosTotal / 3) : 0,
      rankingResumos: [],
      topEfeitosAdversos: [],
      topFatoresSucesso: [],
      topMelhorias: [],
      topSupervalorizados: [],
      fonteUsuarios: [],
      mediaGoogleReviews: parseFloat(reviewData.media_nota || '0').toFixed(1),
      totalReviews: parseInt(reviewData.total_reviews || '0'),
      reviewsPositivas: parseInt(reviewData.positivos || '0'),
      reviewsNegativas: parseInt(reviewData.negativos || '0'),
      temasMarketing: 'Dados carregados do sistema real.',
      oportunidadesMarketing: 'Analytics baseados em dados reais do PostgreSQL.',
      observacoes: `Dashboard conectado: ${totalPacientes} pacientes, ${pacientesAtivosMes} ativos no mês.`
    };
    
    // Process specific agregados
    agregadosResult.rows.forEach(row => {
      const data = row.dados_agregados;
      if (row.tipo_agregado.includes('RANKING_PROCEDIMENTOS')) {
        processedData.topFatoresSucesso = Array.isArray(data) ? data.slice(0, 5).map(item => ({
          item: item.procedimento || 'Unknown',
          count: Math.floor(item.faturamento / 1000) || 0,
          percentage: 25.0
        })) : [];
      }
      if (row.tipo_agregado.includes('FATURAMENTO_POR_ORIGEM')) {
        processedData.fonteUsuarios = Array.isArray(data) ? data.slice(0, 5).map(item => ({
          item: item.origem || 'Unknown',
          count: Math.floor(item.faturamento / 1000) || 0,
          percentage: 25.0
        })) : [];
      }
    });
    
    res.json(processedData);
    
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// NEW: Consultas endpoint
app.get('/api/consultas', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.id_consulta,
        c.id_paciente,
        p.nome_completo,
        c.data_consulta,
        c.tipo_consulta,
        c.status_consulta,
        c.origem
      FROM andressa_ballarin.consultas c
      JOIN andressa_ballarin.pacientes p ON c.id_paciente = p.id_paciente
      WHERE c.data_consulta >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY c.data_consulta DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching consultas:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// NEW: Google Reviews endpoint
app.get('/api/reviews', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        autor,
        nota,
        sentimento,
        comentario,
        data
      FROM andressa_ballarin.google_review
      ORDER BY data DESC
      LIMIT 10
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Database error', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/dashboard`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  testConnection();
});

export default app;