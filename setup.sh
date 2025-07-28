#!/bin/bash

echo "🚀 Configurando Clínica Ballarin Dashboard..."

# Criar estrutura de pastas
echo "📁 Criando estrutura de pastas..."
mkdir -p src
mkdir -p public
mkdir -p dist

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Criar arquivo .env se não existir
if [ ! -f .env ]; then
    echo "⚙️ Criando arquivo .env..."
    cp .env.example .env
    echo "✅ Arquivo .env criado! Configure as variáveis se necessário."
fi

# Verificar se o PostgreSQL está acessível
echo "🔍 Verificando conexão com PostgreSQL..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  host: 'justiconecta_postgres_justiconecta',
  database: 'justiconecta',
  password: '3e27238b138b4693215b',
  port: 5432,
});

pool.query('SELECT 1')
  .then(() => {
    console.log('✅ Conexão com PostgreSQL OK');
    process.exit(0);
  })
  .catch(err => {
    console.log('❌ Erro na conexão PostgreSQL:', err.message);
    console.log('⚠️  Verifique se o PostgreSQL está rodando');
    process.exit(1);
  });
" 2>/dev/null || echo "⚠️  PostgreSQL não acessível - configure depois"

echo ""
echo "🎉 Setup concluído!"
echo ""
echo "🚀 Para iniciar o desenvolvimento:"
echo "   npm run dev"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo "   Health:   http://localhost:3000/api/health"
echo ""
echo "🔒 Credenciais:"
echo "   Admin: admin123"
echo "   Funcionario: func123"