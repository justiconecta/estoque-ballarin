// Teste de conexão e dados do PostgreSQL
// Execute: node test-database.js

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'justiconecta_postgres_justiconecta',
  database: 'justiconecta',
  password: '3e27238b138b4693215b',
  port: 5432,
});

console.log('🔍 Testando conexão PostgreSQL...\n');

const testConnection = async () => {
  try {
    console.log('📡 Conectando ao banco...');
    const client = await pool.connect();
    
    console.log('✅ Conexão estabelecida!');
    
    // Teste 1: Verificar tabelas existentes
    console.log('\n📋 Verificando tabelas...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('produtos_estoque', 'lotes_estoque', 'movimentacoes_estoque', 'pacientes_ballarin', 'pacientes_chat_log', 'resumo_indicadores_mensal')
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('✅ Tabelas encontradas:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  Nenhuma tabela do sistema encontrada');
    }
    
    // Teste 2: Verificar dados de estoque se existirem
    try {
      console.log('\n📦 Verificando dados de estoque...');
      const produtosResult = await client.query('SELECT COUNT(*) as count FROM produtos_estoque');
      const produtosCount = parseInt(produtosResult.rows[0].count);
      
      if (produtosCount > 0) {
        console.log(`✅ ${produtosCount} produtos encontrados no estoque`);
        
        // Mostrar alguns produtos
        const produtos = await client.query(`
          SELECT 
            p.nome_comercial_produto,
            COALESCE(SUM(l.quantidade), 0) as estoque_total
          FROM produtos_estoque p
          LEFT JOIN lotes_estoque l ON p.id_sku = l.id_sku
          GROUP BY p.id_sku, p.nome_comercial_produto
          ORDER BY p.nome_comercial_produto
          LIMIT 5
        `);
        
        produtos.rows.forEach(produto => {
          console.log(`   - ${produto.nome_comercial_produto}: ${produto.estoque_total} unidades`);
        });
      } else {
        console.log('⚠️  Nenhum produto encontrado no estoque');
      }
    } catch (error) {
      console.log('⚠️  Tabelas de estoque não existem ainda');
    }
    
    // Teste 3: Verificar dados de pacientes
    try {
      console.log('\n👥 Verificando dados de pacientes...');
      const pacientesResult = await client.query('SELECT COUNT(*) as count FROM pacientes_ballarin');
      const pacientesCount = parseInt(pacientesResult.rows[0].count);
      console.log(`✅ ${pacientesCount} pacientes cadastrados`);
      
      if (pacientesCount > 0) {
        const chatResult = await client.query('SELECT COUNT(DISTINCT session_id) as count FROM pacientes_chat_log');
        const chatCount = parseInt(chatResult.rows[0].count);
        console.log(`✅ ${chatCount} pacientes com histórico de chat`);
      }
    } catch (error) {
      console.log('⚠️  Tabelas de pacientes não acessíveis:', error.message);
    }
    
    // Teste 4: Verificar dados de dashboard
    try {
      console.log('\n📊 Verificando dados de dashboard...');
      const resumoResult = await client.query('SELECT COUNT(*) as count FROM resumo_indicadores_mensal');
      const resumoCount = parseInt(resumoResult.rows[0].count);
      console.log(`✅ ${resumoCount} registros de indicadores mensais`);
    } catch (error) {
      console.log('⚠️  Tabela de indicadores não acessível:', error.message);
    }
    
    client.release();
    
    console.log('\n🎉 Teste de conexão concluído!');
    console.log('\n💡 Dicas:');
    console.log('   - Se tabelas de estoque não existem, o servidor criará automaticamente');
    console.log('   - Execute npm run dev para iniciar o sistema');
    console.log('   - As tabelas de pacientes devem existir no banco justiconecta');
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.log('\n🔧 Possíveis soluções:');
    console.log('   1. Verificar se PostgreSQL está rodando');
    console.log('   2. Confirmar credenciais do banco');
    console.log('   3. Verificar conectividade de rede');
    console.log('\n📋 Configuração atual:');
    console.log('   Host: justiconecta_postgres_justiconecta');
    console.log('   Database: justiconecta');
    console.log('   User: postgres');
    console.log('   Port: 5432');
  } finally {
    await pool.end();
  }
};

testConnection();