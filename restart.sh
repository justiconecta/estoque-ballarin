#!/bin/bash

echo "🔄 Reiniciando Clínica Ballarin Dashboard..."

# Parar processos existentes
echo "🛑 Parando processos existentes..."
pkill -f "vite"
pkill -f "ts-node"
pkill -f "concurrently"

# Limpar porta se estiver ocupada
echo "🧹 Limpando portas..."
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true

# Aguardar um momento
sleep 2

# Verificar se os arquivos principais existem
echo "📋 Verificando arquivos..."
if [ ! -f "src/App.tsx" ]; then
    echo "❌ App.tsx não encontrado!"
    exit 1
fi

if [ ! -f "src/server.ts" ]; then
    echo "❌ server.ts não encontrado!"
    exit 1
fi

if [ ! -f "package.json" ]; then
    echo "❌ package.json não encontrado!"
    exit 1
fi

# Verificar node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
fi

echo "🚀 Iniciando serviços..."
npm run dev &

echo ""
echo "✅ Serviços reiniciados!"
echo ""
echo "🌐 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo ""
echo "⏳ Aguarde alguns segundos para os serviços iniciarem..."
echo "🔍 Verifique http://localhost:3000/api/health para status do backend"