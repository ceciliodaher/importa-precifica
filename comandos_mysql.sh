#!/bin/bash

# ===================================================================
# COMANDOS MYSQL PARA VERIFICAR O BANCO DE DADOS
# Sistema Importa Precifica - Verificação de Dados
# ===================================================================

echo "🔍 COMANDOS PARA VERIFICAR O BANCO DE DADOS"
echo "============================================="
echo

# Definir variáveis
DB_NAME="importa_precificacao"
DB_USER="root"
DB_HOST="localhost"

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. VERIFICAR SE O BANCO FOI CRIADO:${NC}"
echo "mysql -u $DB_USER -p -e \"SHOW DATABASES LIKE '$DB_NAME';\""
echo

echo -e "${BLUE}2. VER TODAS AS TABELAS CRIADAS:${NC}"
echo "mysql -u $DB_USER -p $DB_NAME -e \"SHOW TABLES;\""
echo

echo -e "${BLUE}3. CONTAR REGISTROS EM CADA TABELA:${NC}"
echo "mysql -u $DB_USER -p $DB_NAME -e \""
echo "SELECT 'declaracoes_importacao' as tabela, COUNT(*) as total FROM declaracoes_importacao"
echo "UNION SELECT 'importadores', COUNT(*) FROM importadores"
echo "UNION SELECT 'adicoes', COUNT(*) FROM adicoes"
echo "UNION SELECT 'mercadorias', COUNT(*) FROM mercadorias"
echo "UNION SELECT 'tributos', COUNT(*) FROM tributos"
echo "ORDER BY tabela;\""
echo

echo -e "${BLUE}4. VER ÚLTIMAS DIs IMPORTADAS:${NC}"
echo "mysql -u $DB_USER -p $DB_NAME -e \""
echo "SELECT di.numero_di, di.data_registro, imp.nome as importador, di.total_adicoes"
echo "FROM declaracoes_importacao di"
echo "LEFT JOIN importadores imp ON di.importador_id = imp.id"
echo "ORDER BY di.created_at DESC LIMIT 10;\""
echo

echo -e "${BLUE}5. VER ESTRUTURA DE UMA TABELA:${NC}"
echo "mysql -u $DB_USER -p $DB_NAME -e \"DESCRIBE declaracoes_importacao;\""
echo

echo -e "${BLUE}6. BUSCAR DI ESPECÍFICA (exemplo com número 2300120746):${NC}"
echo "mysql -u $DB_USER -p $DB_NAME -e \""
echo "SELECT * FROM declaracoes_importacao WHERE numero_di = '2300120746';\""
echo

echo -e "${BLUE}7. VER VIEWS CRIADAS:${NC}"
echo "mysql -u $DB_USER -p $DB_NAME -e \"SHOW FULL TABLES WHERE Table_type = 'VIEW';\""
echo

echo -e "${BLUE}8. TESTAR UMA VIEW:${NC}"
echo "mysql -u $DB_USER -p $DB_NAME -e \"SELECT * FROM view_dis_resumo LIMIT 5;\""
echo

echo -e "${BLUE}9. VER ESTATÍSTICAS GERAIS:${NC}"
echo "mysql -u $DB_USER -p $DB_NAME -e \""
echo "SELECT "
echo "  (SELECT COUNT(*) FROM declaracoes_importacao) as total_dis,"
echo "  (SELECT COUNT(*) FROM adicoes) as total_adicoes,"
echo "  (SELECT COUNT(*) FROM mercadorias) as total_mercadorias,"
echo "  (SELECT COALESCE(SUM(valor_reais), 0) FROM adicoes) as valor_total_importado;\""
echo

echo -e "${BLUE}10. VER LOG DE IMPORTAÇÕES:${NC}"
echo "mysql -u $DB_USER -p $DB_NAME -e \""
echo "SELECT numero_di, status, total_adicoes, total_mercadorias, created_at"
echo "FROM importacoes_log ORDER BY created_at DESC LIMIT 10;\""
echo

echo -e "${YELLOW}📋 EXEMPLOS DE USO PRÁTICO:${NC}"
echo "=========================="
echo

echo -e "${GREEN}• Para executar um comando específico:${NC}"
echo "mysql -u root -p importa_precificacao -e \"SHOW TABLES;\""
echo

echo -e "${GREEN}• Para entrar no modo interativo:${NC}"
echo "mysql -u root -p importa_precificacao"
echo "MySQL> SELECT COUNT(*) FROM declaracoes_importacao;"
echo

echo -e "${GREEN}• Para fazer backup dos dados:${NC}"
echo "mysqldump -u root -p importa_precificacao > backup_$(date +%Y%m%d).sql"
echo

echo -e "${GREEN}• Para verificar se a API está funcionando:${NC}"
echo "curl http://localhost/api/status.php"
echo

echo -e "${YELLOW}🚀 SCRIPT DE VERIFICAÇÃO RÁPIDA:${NC}"
echo "================================"
echo

# Criar um script de verificação rápida
cat << 'EOF'
# Execute este bloco para verificação completa:
echo "🔍 Verificando banco de dados..."

# Verificar se banco existe
echo "1. Verificando se banco existe..."
mysql -u root -p -e "SHOW DATABASES LIKE 'importa_precificacao';" 2>/dev/null && echo "✅ Banco existe" || echo "❌ Banco não encontrado"

# Contar tabelas
echo "2. Contando tabelas..."
TABELAS=$(mysql -u root -p importa_precificacao -e "SHOW TABLES;" 2>/dev/null | wc -l)
echo "📋 Total de tabelas: $((TABELAS-1))"

# Contar registros
echo "3. Verificando dados..."
mysql -u root -p importa_precificacao -e "
SELECT 'DIs' as tipo, COUNT(*) as total FROM declaracoes_importacao
UNION SELECT 'Adições', COUNT(*) FROM adicoes  
UNION SELECT 'Mercadorias', COUNT(*) FROM mercadorias;" 2>/dev/null

echo "✅ Verificação concluída!"
EOF

echo
echo -e "${RED}⚠️  IMPORTANTE:${NC}"
echo "- Substitua 'root' pelo seu usuário MySQL se diferente"
echo "- Você será solicitado a digitar a senha do MySQL"
echo "- Se não tiver senha, use: mysql -u root (sem -p)"
echo