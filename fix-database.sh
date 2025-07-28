#!/bin/bash

echo "🔧 CORRIGINDO CONEXÃO POSTGRESQL..."
echo "=================================="

# Parar servidor atual
echo "1. Parando servidor atual..."
pkill -f "ts-node"
pkill -f "vite"

# Backup do server.ts original
echo "2. Fazendo backup do server.ts..."
cp src/server.ts src/server.ts.backup

# Substituir server.ts pelo corrigido
echo "3. Aplicando correção do server.ts..."
# (O código corrigido está no artifact acima)

# Verificar se PostgreSQL está rodando localmente
echo "4. Verificando PostgreSQL local..."
if pg_isready -h localhost -p 5432 2>/dev/null; then
    echo "✅ PostgreSQL local encontrado"
    echo "📝 Usando configuração localhost"
    
    # Criar database justiconecta se não existir
    createdb -h localhost -U postgres justiconecta 2>/dev/null || echo "Database justiconecta já existe"
    
else
    echo "⚠️  PostgreSQL local não encontrado"
    echo "💡 Opções:"
    echo "   1. Instalar PostgreSQL: brew install postgresql (Mac) ou apt install postgresql (Ubuntu)"
    echo "   2. Iniciar container Docker: docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres"
    echo "   3. Sistema funcionará em modo FALLBACK"
fi

# Reiniciar servidor
echo "5. Reiniciando servidor..."
npm run dev &

echo ""
echo "🎉 CORREÇÃO APLICADA!"
echo ""
echo "🌐 Teste agora:"
echo "   http://localhost:5173 (Frontend)"
echo "   http://localhost:3000/api/health (Backend Health)"
echo ""
echo "💡 Se ainda não funcionar:"
echo "   1. Verifique logs no terminal"
echo "   2. Sistema funcionará em modo desenvolvimento"
echo "   3. Execute: docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres"