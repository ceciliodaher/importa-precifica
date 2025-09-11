#!/bin/bash

# Script para iniciar servidor API para desenvolvimento
echo "🚀 Iniciando servidor API para desenvolvimento..."

# Parar qualquer servidor anterior
pkill -f "php.*8890" 2>/dev/null || true

# Iniciar servidor na pasta api (com caminho absoluto)  
cd /Users/ceciliodaher/Documents/git/importa-precifica && php -S localhost:8890 -t api/ > api_server.log 2>&1 &
API_PID=$!

echo "✅ Servidor API iniciado na porta 8890 (PID: $API_PID)"

# Testar se está funcionando
sleep 2
if curl -s "http://localhost:8890/endpoints/status.php" > /dev/null; then
    echo "✅ API testada com sucesso!"
else
    echo "❌ Erro ao testar API"
fi

echo "📋 URLs da API:"
echo "   Status: http://localhost:8890/endpoints/status.php"
echo "   Listar DIs: http://localhost:8890/endpoints/listar-dis.php" 
echo "   Salvar DI: http://localhost:8890/endpoints/salvar-di.php"
echo "   Salvar Cálculo: http://localhost:8890/endpoints/salvar-calculo.php"

echo ""
echo "💡 Para parar o servidor: pkill -f 'php.*8890'"
echo "🔄 Para reiniciar: ./start_api_server.sh"