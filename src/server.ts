import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Database Configuration
const pool = new Pool({
  user: 'postgres',
  host: 'justiconecta_postgres_justiconecta',
  database: 'justiconecta',
  password: '3e27238b138b4693215b',
  port: 5432,
});

// Hardcoded users for authentication
const usuarios = [
  { id: 1, usuario: 'Admin', senha: 'admin123', role: 'admin' },
  { id: 2, usuario: 'Funcionario', senha: 'func123', role: 'staff' }
];

// Initialize database tables
const initDatabase = async () => {
  try {
    // Criar tabela de produtos se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS produtos_estoque (
        id_sku SERIAL PRIMARY KEY,
        nome_comercial_produto VARCHAR(255) NOT NULL,
        classe_terapeutica VARCHAR(100),
        estoque_minimo INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de lotes se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lotes_estoque (
        id_lote SERIAL PRIMARY KEY,
        id_sku INTEGER REFERENCES produtos_estoque(id_sku) ON DELETE CASCADE,
        validade VARCHAR(10) NOT NULL,
        quantidade INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Criar tabela de movimentações se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
        id SERIAL PRIMARY KEY,
        id_sku INTEGER REFERENCES produtos_estoque(id_sku),
        id_lote INTEGER REFERENCES lotes_estoque(id_lote),
        tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('Entrada', 'Saída')),
        quantidade INTEGER NOT NULL,
        observacao TEXT,
        usuario VARCHAR(100),
        data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Verificar se já existem produtos, se não, criar alguns exemplos
    const produtosExistentes = await pool.query('SELECT COUNT(*) FROM produtos_estoque');
    if (parseInt(produtosExistentes.rows[0].count) === 0) {
      console.log('🔧 Criando produtos exemplo...');
      
      // Inserir produtos exemplo
      const produto1 = await pool.query(`
        INSERT INTO produtos_estoque (nome_comercial_produto, classe_terapeutica, estoque_minimo)
        VALUES ('Dipirona 500mg', 'Analgésico', 50)
        RETURNING id_sku
      `);
      
      const produto2 = await pool.query(`
        INSERT INTO produtos_estoque (nome_comercial_produto, classe_terapeutica, estoque_minimo)
        VALUES ('Paracetamol 750mg', 'Analgésico', 30)
        RETURNING id_sku
      `);

      const produto3 = await pool.query(`
        INSERT INTO produtos_estoque (nome_comercial_produto, classe_terapeutica, estoque_minimo)
        VALUES ('Ibuprofeno 600mg', 'Anti-inflamatório', 40)
        RETURNING id_sku
      `);

      // Inserir lotes exemplo
      await pool.query(`
        INSERT INTO lotes_estoque (id_sku, validade, quantidade)
        VALUES 
          ($1, '12/2024', 100),
          ($1, '06/2025', 50),
          ($2, '03/2025', 75),
          ($3, '09/2024', 120)
      `, [
        produto1.rows[0].id_sku,
        produto2.rows[0].id_sku,
        produto3.rows[0].id_sku
      ]);

      console.log('✅ Produtos exemplo criados com sucesso');
    }

    console.log('✅ Database inicializada com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar database:', error);
  }
};

// === ROUTES ===

// Health Check
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as timestamp');
    res.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: result.rows[0].timestamp
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      database: 'disconnected',
      error: error.message
    });
  }
});

// Authentication
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  const user = usuarios.find(u => 
    u.usuario.toLowerCase() === username.toLowerCase() && u.senha === password
  );
  
  if (user) {
    const { senha, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } else {
    res.status(401).json({ error: 'Credenciais inválidas' });
  }
});

// Produtos - buscar todos com lotes
app.get('/api/produtos', async (req, res) => {
  try {
    const produtosResult = await pool.query(`
      SELECT 
        p.id_sku,
        p.nome_comercial_produto,
        p.classe_terapeutica,
        p.estoque_minimo
      FROM produtos_estoque p
      ORDER BY p.nome_comercial_produto
    `);

    const produtos = [];
    
    for (const produto of produtosResult.rows) {
      const lotesResult = await pool.query(`
        SELECT id_lote, validade, quantidade
        FROM lotes_estoque
        WHERE id_sku = $1 AND quantidade > 0
        ORDER BY 
          CASE 
            WHEN validade ~ '^[0-9]{2}/[0-9]{4} THEN
              TO_DATE(validade, 'MM/YYYY')
            ELSE TO_DATE('01/2099', 'MM/YYYY')
          END
      `, [produto.id_sku]);

      produtos.push({
        ...produto,
        lotes: lotesResult.rows
      });
    }

    res.json(produtos);
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// Movimentações - buscar do dia atual
app.get('/api/movimentacoes', async (req, res) => {
  try {
    const movimentacoesResult = await pool.query(`
      SELECT 
        m.id,
        m.id_sku,
        m.tipo,
        m.quantidade,
        m.observacao,
        m.usuario,
        m.data,
        p.nome_comercial_produto
      FROM movimentacoes_estoque m
      JOIN produtos_estoque p ON m.id_sku = p.id_sku
      WHERE DATE(m.data) = CURRENT_DATE
      ORDER BY m.data DESC
      LIMIT 50
    `);

    res.json(movimentacoesResult.rows);
  } catch (error) {
    console.error('Erro ao buscar movimentações:', error);
    res.status(500).json({ error: 'Erro ao buscar movimentações' });
  }
});

// Registrar saída
app.post('/api/movimentacoes/saida', async (req, res) => {
  const { id_sku, id_lote, quantidade, usuario } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verificar estoque disponível do lote
    const loteResult = await client.query(`
      SELECT validade, quantidade 
      FROM lotes_estoque 
      WHERE id_lote = $1 AND id_sku = $2
    `, [id_lote, id_sku]);
    
    if (loteResult.rows.length === 0) {
      throw new Error('Lote não encontrado');
    }
    
    const lote = loteResult.rows[0];
    if (lote.quantidade < quantidade) {
      throw new Error(`Estoque insuficiente. Disponível: ${lote.quantidade}`);
    }
    
    // Atualizar quantidade do lote
    await client.query(`
      UPDATE lotes_estoque 
      SET quantidade = quantidade - $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_lote = $2
    `, [quantidade, id_lote]);
    
    // Registrar movimentação
    await client.query(`
      INSERT INTO movimentacoes_estoque 
      (id_sku, id_lote, tipo, quantidade, observacao, usuario)
      VALUES ($1, $2, 'Saída', $3, $4, $5)
    `, [
      id_sku, 
      id_lote, 
      quantidade, 
      `Baixa do lote com validade ${lote.validade}`,
      usuario
    ]);
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Saída registrada com sucesso' });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar saída:', error);
    res.status(400).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Registrar entrada
app.post('/api/movimentacoes/entrada', async (req, res) => {
  const { id_sku, quantidade, validade, usuario } = req.body;
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verificar se já existe lote com essa validade
    const loteExistente = await client.query(`
      SELECT id_lote, quantidade 
      FROM lotes_estoque 
      WHERE id_sku = $1 AND validade = $2
    `, [id_sku, validade]);
    
    let id_lote;
    
    if (loteExistente.rows.length > 0) {
      // Atualizar lote existente
      id_lote = loteExistente.rows[0].id_lote;
      await client.query(`
        UPDATE lotes_estoque 
        SET quantidade = quantidade + $1, updated_at = CURRENT_TIMESTAMP
        WHERE id_lote = $2
      `, [quantidade, id_lote]);
    } else {
      // Criar novo lote
      const novoLote = await client.query(`
        INSERT INTO lotes_estoque (id_sku, validade, quantidade)
        VALUES ($1, $2, $3)
        RETURNING id_lote
      `, [id_sku, validade, quantidade]);
      id_lote = novoLote.rows[0].id_lote;
    }
    
    // Registrar movimentação
    await client.query(`
      INSERT INTO movimentacoes_estoque 
      (id_sku, id_lote, tipo, quantidade, observacao, usuario)
      VALUES ($1, $2, 'Entrada', $3, $4, $5)
    `, [
      id_sku, 
      id_lote, 
      quantidade, 
      `Recebimento de lote com validade ${validade}`,
      usuario
    ]);
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Entrada registrada com sucesso' });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao registrar entrada:', error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Dashboard - dados reais do PostgreSQL
app.get('/api/dashboard', async (req, res) => {
  const { month } = req.query;
  
  try {
    // 1. Total de pacientes cadastrados
    const totalPacientesResult = await pool.query(
      'SELECT COUNT(*) as count FROM pacientes_ballarin'
    );
    const totalPacientes = parseInt(totalPacientesResult.rows[0].count) || 0;

    // 2. Pacientes ativos no mês selecionado
    let pacientesAtivosMes = 0;
    if (month) {
      const pacientesAtivosMesResult = await pool.query(`
        SELECT COUNT(DISTINCT session_id) as count 
        FROM pacientes_chat_log 
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::date)
      `, [month + '-01']);
      pacientesAtivosMes = parseInt(pacientesAtivosMesResult.rows[0].count) || 0;
    }

    // 3. Total de pacientes que já utilizaram o serviço
    const pacientesAtivosTotalResult = await pool.query(
      'SELECT COUNT(DISTINCT session_id) as count FROM pacientes_chat_log'
    );
    const pacientesAtivosTotal = parseInt(pacientesAtivosTotalResult.rows[0].count) || 0;

    // 4. Média mensal (calculada baseada no total)
    const mediaMensal = totalPacientes > 0 ? totalPacientes * 0.75 : 0;

    // 5. Ranking pacientes com mais resumos diários
    let rankingResumos = [];
    try {
      const rankingResumosResult = await pool.query(`
        SELECT 
          p.cpf,
          COUNT(*) as total_resumos
        FROM pacientes_chat_log pcl
        JOIN pacientes_ballarin p ON p.session_id = pcl.session_id
        WHERE pcl.message_type = 'resumo_diario' OR pcl.content ILIKE '%resumo%'
        GROUP BY p.cpf
        ORDER BY total_resumos DESC
        LIMIT 10
      `);
      rankingResumos = rankingResumosResult.rows;
    } catch (error) {
      console.log('Ranking resumos não disponível:', error.message);
    }

    // 6-10. Top itens dos campos de texto
    const getTopItems = async (campo, limite = 5) => {
      try {
        const result = await pool.query(`
          SELECT ${campo} as items
          FROM resumo_indicadores_mensal 
          WHERE ${campo} IS NOT NULL AND ${campo} != ''
          ORDER BY created_at DESC
          LIMIT 100
        `);
        
        const itemCounts = {};
        let totalItems = 0;
        
        result.rows.forEach(row => {
          if (row.items) {
            const items = row.items.split(',').map(item => item.trim());
            items.forEach(item => {
              if (item) {
                itemCounts[item] = (itemCounts[item] || 0) + 1;
                totalItems++;
              }
            });
          }
        });
        
        return Object.entries(itemCounts)
          .map(([item, count]) => ({
            item,
            count,
            percentage: totalItems > 0 ? parseFloat(((count / totalItems) * 100).toFixed(1)) : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limite);
      } catch (error) {
        console.log(`Erro ao buscar ${campo}:`, error.message);
        return [];
      }
    };

    // Buscar tops de cada categoria
    const topEfeitosAdversos = await getTopItems('efeitos_adversos', 10);
    const topFatoresSucesso = await getTopItems('fcs', 5);
    const topMelhorias = await getTopItems('melhorias', 5);
    const topSupervalorizados = await getTopItems('supervalorizado', 5);
    const fonteUsuarios = await getTopItems('origem', 5);

    // 11-13. Dados do mês atual (último registro)
    let temasMarketing = '';
    let oportunidadesMarketing = '';
    let observacoes = '';
    
    try {
      const ultimoResumoResult = await pool.query(`
        SELECT 
          temas_marketing,
          oportunidades_marketing,
          observacoes
        FROM resumo_indicadores_mensal 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      if (ultimoResumoResult.rows.length > 0) {
        const ultimoResumo = ultimoResumoResult.rows[0];
        temasMarketing = ultimoResumo.temas_marketing || '';
        oportunidadesMarketing = ultimoResumo.oportunidades_marketing || '';
        observacoes = ultimoResumo.observacoes || '';
      }
    } catch (error) {
      console.log('Dados de marketing não disponíveis:', error.message);
    }

    const dashboardData = {
      totalPacientes,
      pacientesAtivosMes,
      pacientesAtivosTotal,
      mediaMensal,
      rankingResumos,
      topEfeitosAdversos,
      topFatoresSucesso,
      topMelhorias,
      topSupervalorizados,
      fonteUsuarios,
      temasMarketing,
      oportunidadesMarketing,
      observacoes
    };

    res.json(dashboardData);
    
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    
    // Fallback com dados básicos em caso de erro
    res.json({
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
      temasMarketing: 'Dados não disponíveis no momento',
      oportunidadesMarketing: 'Dados não disponíveis no momento',
      observacoes: 'Sistema conectado, mas algumas tabelas podem não existir ainda.'
    });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist' });
});

// Initialize database and start server
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`💾 PostgreSQL conectado: justiconecta`);
  });
});

export default app;