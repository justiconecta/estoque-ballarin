#!/bin/bash

echo "🔍 Teste Rápido - Clínica Ballarin"
echo "=================================="

# Verificar se o backend está rodando
echo "1. Testando backend (porta 3000)..."
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "   ✅ Backend OK - Porta 3000 ativa"
    
    # Testar login
    echo "2. Testando login..."
    LOGIN_RESPONSE=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d '{"username":"Admin","password":"admin123"}' \
        http://localhost:3000/api/auth/login)
    
    HTTP_STATUS=$(echo $LOGIN_RESPONSE | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
    
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "   ✅ Login funcionando"
    else
        echo "   ❌ Login com problema (Status: $HTTP_STATUS)"
    fi
else
    echo "   ❌ Backend não está rodando na porta 3000"
    echo "   💡 Execute: npm run dev"
fi

# Verificar se o frontend está rodando
echo "3. Testando frontend (porta 5173)..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "   ✅ Frontend OK - Porta 5173 ativa"
else
    echo "   ❌ Frontend não está rodando na porta 5173"
    echo "   💡 Execute: npm run dev"
fi

# Verificar processos
echo "4. Processos ativos:"
VITE_PROCESS=$(pgrep -f "vite" | wc -l)
NODE_PROCESS=$(pgrep -f "ts-node" | wc -l)

if [ $VITE_PROCESS -gt 0 ]; then
    echo "   ✅ Vite rodando ($VITE_PROCESS processo(s))"
else
    echo "   ❌ Vite não está rodando"
fi

if [ $NODE_PROCESS -gt 0 ]; then
    echo "   ✅ Node/TS-Node rodando ($NODE_PROCESS processo(s))"
else
    echo "   ❌ Node/TS-Node não está rodando"
fi

echo ""
echo "📋 RESUMO:"
echo "=========="

if curl -s http://localhost:3000/api/health > /dev/null 2>&1 && curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "🎉 Sistema funcionando!"
    echo "🌐 Acesse: http://localhost:5173"
    echo "🔑 Use os botões 'Admin' ou 'Funcionário' na tela de login"
else
    echo "⚠️  Sistema com problemas"
    echo "🔧 Execute: npm run restart"
fi

echo ""
echo "🔑 CREDENCIAIS:"
echo "   Admin: admin123"
echo "   Funcionario: func123"