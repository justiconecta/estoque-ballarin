import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Database Configuration (optional - sistema funciona sem)
let pool: Pool | null = null;
try {
  pool = new Pool({
    user: 'postgres',
    host: 'justiconecta_postgres_justiconecta',
    database: 'justiconecta',
    password: '3e27238b138b4693215b',
    port: 5432,
  });
} catch (error) {
  console.log('⚠️  PostgreSQL não disponível - usando dados mock');
}

// Hardcoded users for authentication
const usuarios = [
  { id: 1, usuario: 'Admin', senha: 'admin123', role: 'admin' },
  { id: 2, usuario: 'Funcionario', senha: 'func123', role: 'staff' }
];

// Mock data
const mockProdutos = [
  {
    id_sku: 1,
    nome_comercial_produto: 'Dipirona 500mg',
    classe_terapeutica: 'Analgésico',
    estoque_minimo: 50,
    lotes: [
      { id_lote: 1, validade: '12/2024', quantidade: 100 },
      { id_lote: 2, validade: '06/2025', quantidade: 50 }
    ]
  },
  {
    id_sku: 2,
    nome_comercial_produto: 'Paracetamol 750mg',
    classe_terapeutica: 'Analgésico',
    estoque_minimo: 30,
    lotes: [
      { id_lote: 3, validade: '03/2025', quantidade: 75 }
    ]
  }
];

let movimentacoes: any[] = [];

// Mock dashboard data
const mockDashboardData = {
  totalPacientes: 150,
  pacientesAtivosMes: 45,
  pacientesAtivosTotal: 120,
  mediaMensal: 112.5,
  rankingResumos: [
    { cpf: '123.456.789-00', total_resumos: 25 },
    { cpf: '987.654.321-00', total_resumos: 18 },
    { cpf: '456.789.123-00', total_resumos: 15 }
  ],
  topEfeitosAdversos: [
    { item: 'Náusea', count: 12, percentage: 15.2 },
    { item: 'Tontura', count: 8, percentage: 10.1 },
    { item: 'Dor de cabeça', count: 6, percentage: 7.6 }
  ],
  topFatoresSucesso: [
    { item: 'Adesão ao tratamento', count: 20, percentage: 25.3 },
    { item: 'Suporte familiar', count: 15, percentage: 19.0 }
  ],
  topMelhorias: [
    { item: 'Tempo de resposta', count: 10, percentage: 12.7 },
    { item: 'Interface do app', count: 8, percentage: 10.1 }
  ],
  topSupervalorizados: [
    { item: 'Atendimento humanizado', count: 25, percentage: 31.6 },
    { item: 'Tecnologia avançada', count: 18, percentage: 22.8 }
  ],
  fonteUsuarios: [
    { item: 'Google', count: 40, percentage: 35.0 },
    { item: 'Instagram', count: 30, percentage: 26.3 },
    { item: 'Indicação', count: 25, percentage: 21.9 }
  ],
  temasMarketing: 'Prevenção de doenças cardiovasculares\nCuidados com diabetes\nSaúde mental e bem-estar',
  oportunidadesMarketing: 'Conteúdo sobre exercícios físicos\nReceitas saudáveis\nDicas de autocuidado',
  observacoes: 'Crescimento significativo no engajamento dos pacientes. Necessário expandir equipe de atendimento.'
};

// === ROUTES ===

// Health Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  if (pool) {
    try {
      await pool.query('SELECT 1');
      dbStatus = 'connected';
    } catch (error) {
      dbStatus = 'error';
    }
  }
  res.json({ status: 'ok', database: dbStatus, timestamp: new Date().toISOString() });
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

// Produtos
app.get('/api/produtos', (req, res) => {
  res.json(mockProdutos);
});

// Movimentações
app.get('/api/movimentacoes', (req, res) => {
  res.json(movimentacoes);
});

app.post('/api/movimentacoes/saida', (req, res) => {
  const { id_sku, id_lote, quantidade, usuario } = req.body;
  
  const produto = mockProdutos.find(p => p.id_sku === id_sku);
  const lote = produto?.lotes.find(l => l.id_lote === id_lote);
  
  if (!lote || lote.quantidade < quantidade) {
    return res.status(400).json({ error: 'Estoque insuficiente' });
  }
  
  lote.quantidade -= quantidade;
  
  const movimentacao = {
    id: Date.now(),
    id_sku,
    tipo: 'Saída',
    quantidade,
    observacao: `Baixa do lote com validade ${lote.validade}`,
    data: new Date(),
    usuario
  };
  
  movimentacoes.push(movimentacao);
  res.json({ success: true });
});

app.post('/api/movimentacoes/entrada', (req, res) => {
  const { id_sku, quantidade, validade, usuario } = req.body;
  
  const produto = mockProdutos.find(p => p.id_sku === id_sku);
  if (!produto) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  
  let loteExistente = produto.lotes.find(l => l.validade === validade);
  if (loteExistente) {
    loteExistente.quantidade += quantidade;
  } else {
    const novoLoteId = Date.now();
    produto.lotes.push({ id_lote: novoLoteId, validade, quantidade });
  }
  
  const movimentacao = {
    id: Date.now(),
    id_sku,
    tipo: 'Entrada',
    quantidade,
    observacao: `Recebimento de lote com validade ${validade}`,
    data: new Date(),
    usuario
  };
  
  movimentacoes.push(movimentacao);
  res.json({ success: true });
});

// Dashboard
app.get('/api/dashboard', async (req, res) => {
  if (pool) {
    try {
      // Try to get real data from database
      const totalPacientesResult = await pool.query('SELECT COUNT(*) as count FROM pacientes_ballarin');
      const realData = {
        ...mockDashboardData,
        totalPacientes: parseInt(totalPacientesResult.rows[0].count)
      };
      res.json(realData);
    } catch (error) {
      console.log('Using mock data - DB error:', error.message);
      res.json(mockDashboardData);
    }
  } else {
    res.json(mockDashboardData);
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile('index.html', { root: 'dist' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
});

export default app;