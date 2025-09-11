#!/bin/bash

echo "🧪 Teste do Module 2 Refatorado"
echo "================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Contador de testes
TESTS_PASSED=0
TESTS_TOTAL=5

# Teste 1: API Connectivity
echo "1. Testando conectividade API..."
API_STATUS=$(curl -s "http://localhost:8889/api/endpoints/status.php" | grep -o '"success".*true' | head -1)
if [ ! -z "$API_STATUS" ]; then
    echo -e "   ${GREEN}✅ API conectada${NC}"
    ((TESTS_PASSED++))
else
    echo -e "   ${RED}❌ API não responde${NC}"
fi

# Teste 2: Dados processados
echo ""
echo "2. Verificando dados processados..."
DI_DATA=$(curl -s "http://localhost:8889/api/endpoints/listar-dis.php?limit=1")
VALOR_FORMATADO=$(echo "$DI_DATA" | grep -o '"valor_total_reais".*"[0-9.]*"' | head -1)
if [ ! -z "$VALOR_FORMATADO" ]; then
    echo -e "   ${GREEN}✅ Dados vêm processados (valor já formatado)${NC}"
    echo "   Exemplo: $VALOR_FORMATADO"
    ((TESTS_PASSED++))
else
    echo -e "   ${RED}❌ Dados não estão processados${NC}"
fi

# Teste 3: DI específica
echo ""
echo "3. Testando carregamento de DI..."
DI_DETAIL=$(curl -s "http://localhost:8889/api/endpoints/buscar-di.php?numero_di=2518173187")
HAS_UF=$(echo "$DI_DETAIL" | grep -o '"importador_uf".*"GO"' | head -1)
if [ ! -z "$HAS_UF" ]; then
    echo -e "   ${GREEN}✅ DI carrega com dados completos${NC}"
    echo "   Estado importador: GO (necessário para ICMS)"
    ((TESTS_PASSED++))
else
    echo -e "   ${RED}❌ DI não tem dados necessários${NC}"
fi

# Teste 4: Interface refatorada
echo ""
echo "4. Verificando interface HTML..."
HTML=$(curl -s "http://localhost:8889/sistema-expertzy-local/di-processing/di-processor.html")
HAS_DATALOADER=$(echo "$HTML" | grep -c "DataLoader.js")
HAS_XMLUPLOAD=$(echo "$HTML" | grep -c 'accept=".xml"')

if [ $HAS_DATALOADER -gt 0 ] && [ $HAS_XMLUPLOAD -eq 0 ]; then
    echo -e "   ${GREEN}✅ Interface refatorada corretamente${NC}"
    echo "   DataLoader.js incluído: SIM"
    echo "   Upload XML removido: SIM"
    ((TESTS_PASSED++))
else
    echo -e "   ${RED}❌ Interface ainda tem elementos antigos${NC}"
fi

# Teste 5: Estatísticas banco
echo ""
echo "5. Verificando estatísticas do banco..."
STATS=$(curl -s "http://localhost:8889/api/endpoints/status.php")
TOTAL_DIS=$(echo "$STATS" | grep -o '"total_dis".*[0-9]' | grep -o '[0-9]*' | head -1)
if [ ! -z "$TOTAL_DIS" ] && [ "$TOTAL_DIS" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Banco tem $TOTAL_DIS DIs disponíveis${NC}"
    ((TESTS_PASSED++))
else
    echo -e "   ${RED}❌ Banco está vazio${NC}"
fi

# Resultado final
echo ""
echo "================================"
echo "📊 RESULTADO: $TESTS_PASSED/$TESTS_TOTAL testes passaram"
echo ""

if [ $TESTS_PASSED -eq $TESTS_TOTAL ]; then
    echo -e "${GREEN}🎉 SUCESSO! Module 2 refatorado está funcionando!${NC}"
    echo ""
    echo "✨ Nova arquitetura implementada:"
    echo "   - Seletor de DI do banco"
    echo "   - Calculador ICMS por estado"
    echo "   - Sem processamento XML duplicado"
    echo "   - Trabalha com dados já processados"
else
    echo -e "${RED}⚠️ Alguns testes falharam. Verifique acima.${NC}"
fi