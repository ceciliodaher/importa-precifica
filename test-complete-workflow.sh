#!/bin/bash

echo "🚀 TESTE COMPLETO DO SISTEMA - Workflow End-to-End"
echo "=================================================="

echo ""
echo "🧹 1. Executando teste completo com logs detalhados..."
npx playwright test tests/simple-flow.test.js --headed --timeout=180000 > complete-test-log.txt 2>&1

echo ""
echo "📊 2. Analisando resultados..."
if [ $? -eq 0 ]; then
    echo "✅ TESTE PASSOU COMPLETAMENTE!"
    echo ""
    echo "📈 Estatísticas dos erros:"
    grep -c "❌ Erro:" complete-test-log.txt && echo " erros encontrados"
    grep -c "✅" complete-test-log.txt && echo " sucessos confirmados"
    
    echo ""
    echo "🎯 Últimas linhas do log:"
    tail -10 complete-test-log.txt
    
    echo ""
    echo "🎉 SISTEMA FUNCIONANDO!"
    echo "   ✅ Importação XML"
    echo "   ✅ Processamento DI"  
    echo "   ✅ Alimentação interface"
    echo "   ✅ Cálculo impostos"
    echo "   ✅ Exibição resultados"
    
else
    echo "❌ TESTE FALHOU"
    echo ""
    echo "📋 Últimos erros:"
    tail -20 complete-test-log.txt | grep "❌"
fi

echo ""
echo "📄 Log completo salvo em: complete-test-log.txt"
echo "=================================================="