#!/bin/bash

# Script para iniciar servidor API para desenvolvimento
echo "🚀 Iniciando servidor API para desenvolvimento..."

# Parar qualquer servidor anterior
pkill -f "php.*8889" 2>/dev/null || true

# Iniciar servidor na pasta api (com caminho absoluto)
cd /Users/ceciliodaher/Documents/git/importa-precifica/api/endpoints && php -S localhost:8889 > /dev/null 2>&1 &
API_PID=$!

echo "✅ Servidor API iniciado na porta 8889 (PID: $API_PID)"

# Testar se está funcionando
sleep 2
if curl -s "http://localhost:8889/status.php" > /dev/null; then
    echo "✅ API testada com sucesso!"
else
    echo "❌ Erro ao testar API"
fi

echo "📋 URLs da API:"
echo "   Status: http://localhost:8889/status.php"
echo "   Listar DIs: http://localhost:8889/listar-dis.php"
echo "   Salvar DI: http://localhost:8889/salvar-di.php"
echo "   Salvar Cálculo: http://localhost:8889/salvar-calculo.php"

echo ""
echo "💡 Para parar o servidor: pkill -f 'php.*8889'"
echo "🔄 Para reiniciar: ./start_api_server.sh"