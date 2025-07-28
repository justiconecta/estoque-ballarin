const { Pool } = require('pg');

// Database diagnostic script
async function runDiagnostic() {
  console.log('🔍 Starting Database Diagnostic...\n');
  
  const config = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'justiconecta_postgres_justiconecta',
    database: process.env.DB_NAME || 'justiconecta',
    password: process.env.DB_PASSWORD || '3e27238b138b4693215b',
    port: parseInt(process.env.DB_PORT || '5432'),
    connectionTimeoutMillis: 5000
  };
  
  console.log('📋 Connection Config:');
  console.log(`   Host: ${config.host}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Password: ${'*'.repeat(config.password.length)}\n`);
  
  const pool = new Pool(config);
  
  try {
    // Test 1: Basic Connection
    console.log('1️⃣  Testing basic connection...');
    const client = await pool.connect();
    console.log('   ✅ Connection successful');
    
    // Test 2: Database Version
    console.log('\n2️⃣  Checking PostgreSQL version...');
    const versionResult = await client.query('SELECT version()');
    console.log(`   ✅ ${versionResult.rows[0].version.split(',')[0]}`);
    
    // Test 3: Available Schemas
    console.log('\n3️⃣  Checking available schemas...');
    const schemasResult = await client.query(`
      SELECT schema_name FROM information_schema.schemata 
      WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1')
      ORDER BY schema_name
    `);
    console.log('   Available schemas:');
    schemasResult.rows.forEach(row => {
      const marker = row.schema_name === 'andressa_ballarin' ? '✅' : '📋';
      console.log(`   ${marker} ${row.schema_name}`);
    });
    
    // Test 4: andressa_ballarin Schema Check
    console.log('\n4️⃣  Checking andressa_ballarin schema...');
    const ballarinSchemaExists = schemasResult.rows.some(row => row.schema_name === 'andressa_ballarin');
    
    if (ballarinSchemaExists) {
      console.log('   ✅ Schema andressa_ballarin exists');
      
      // Test 5: Tables in Schema
      console.log('\n5️⃣  Checking required tables...');
      const tablesResult = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'andressa_ballarin'
        ORDER BY table_name
      `);
      
      const requiredTables = [
        'produtos_sku',
        'classes_terapeuticas', 
        'lotes',
        'movimentacoes_estoque',
        'pacientes',
        'consultas',
        'google_review',
        'usuarios_internos'
      ];
      
      console.log('   Required tables status:');
      requiredTables.forEach(tableName => {
        const exists = tablesResult.rows.some(row => row.table_name === tableName);
        const marker = exists ? '✅' : '❌';
        console.log(`   ${marker} ${tableName}`);
      });
      
      // Test 6: Data Count
      console.log('\n6️⃣  Checking data counts...');
      for (const table of requiredTables) {
        try {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM andressa_ballarin.${table}`);
          const count = countResult.rows[0].count;
          console.log(`   📊 ${table}: ${count} records`);
        } catch (error) {
          console.log(`   ❌ ${table}: Error - ${error.message}`);
        }
      }
      
      // Test 7: Sample Query Test
      console.log('\n7️⃣  Testing sample queries...');
      
      try {
        const produtosQuery = await client.query(`
          SELECT p.nome_comercial_produto, ct.nome as classe 
          FROM andressa_ballarin.produtos_sku p
          JOIN andressa_ballarin.classes_terapeuticas ct ON p.id_classe_terapeutica = ct.id_classe_terapeutica
          LIMIT 3
        `);
        console.log(`   ✅ Produtos query: ${produtosQuery.rows.length} results`);
        produtosQuery.rows.forEach(row => {
          console.log(`      - ${row.nome_comercial_produto} (${row.classe})`);
        });
      } catch (error) {
        console.log(`   ❌ Produtos query failed: ${error.message}`);
      }
      
    } else {
      console.log('   ❌ Schema andressa_ballarin NOT FOUND');
      console.log('\n💡 Solution: Run the database setup script or import the schema');
    }
    
    client.release();
    
    // Test 8: Connection Pool Test
    console.log('\n8️⃣  Testing connection pool...');
    const poolClient1 = await pool.connect();
    const poolClient2 = await pool.connect();
    console.log('   ✅ Multiple connections successful');
    poolClient1.release();
    poolClient2.release();
    
    console.log('\n🎉 Diagnostic completed successfully!');
    
    if (ballarinSchemaExists) {
      console.log('\n✅ Database is ready for the application');
    } else {
      console.log('\n⚠️  Database setup required');
      console.log('   Run: psql -h justiconecta_postgres_justiconecta -U postgres -d justiconecta -f database-setup.sql');
    }
    
  } catch (error) {
    console.error('\n❌ Diagnostic failed:');
    console.error('   Error:', error.message);
    console.error('   Code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Solutions:');
      console.log('   1. Check if PostgreSQL container is running: docker-compose ps');
      console.log('   2. Start PostgreSQL: docker-compose up -d postgres');
      console.log('   3. Check connection details in .env file');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Solutions:');
      console.log('   1. Check container name: justiconecta_postgres_justiconecta');
      console.log('   2. Verify Docker network connectivity');
      console.log('   3. Try using localhost if running outside Docker');
    }
    
  } finally {
    await pool.end();
    console.log('\n👋 Diagnostic finished');
  }
}

// Run diagnostic
if (require.main === module) {
  runDiagnostic().catch(console.error);
}

module.exports = { runDiagnostic };