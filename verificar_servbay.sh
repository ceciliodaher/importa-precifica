#!/bin/bash

# ===================================================================
# SCRIPT DE VERIFICAÇÃO SERVBAY
# Verifica instalação e configuração do ServBay antes do setup
# ===================================================================

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 VERIFICAÇÃO SERVBAY - Sistema Importa Precifica${NC}"
echo "=================================================="
echo

# 1. Verificar se ServBay está instalado
echo -e "${BLUE}1. Verificando instalação do ServBay...${NC}"
if [ -d "/Applications/ServBay.app" ]; then
    echo -e "${GREEN}✅ ServBay encontrado em /Applications/ServBay.app${NC}"
else
    echo -e "${RED}❌ ServBay não encontrado!${NC}"
    echo "Baixe em: https://servbay.com"
    exit 1
fi

# 2. Verificar se ServBay está rodando
echo -e "${BLUE}2. Verificando se ServBay está ativo...${NC}"
if pgrep -f "ServBay" > /dev/null; then
    echo -e "${GREEN}✅ ServBay está rodando${NC}"
else
    echo -e "${YELLOW}⚠️  ServBay não está rodando${NC}"
    echo "Inicie o ServBay manualmente"
fi

# 3. Procurar diretório web
echo -e "${BLUE}3. Procurando diretório web do ServBay...${NC}"

POSSIBLE_WEB_DIRS=(
    "$HOME/ServBay/www"
    "$HOME/Documents/ServBay/www"
    "$HOME/.servbay/www"
    "$HOME/Library/Application Support/ServBay/www"
    "/Applications/ServBay.app/Contents/Resources/www"
    "/Applications/ServBay.app/Contents/MacOS/www"
    "/Applications/ServBay.app/www"
)

WEB_DIR_FOUND=""
for dir in "${POSSIBLE_WEB_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        WEB_DIR_FOUND="$dir"
        echo -e "${GREEN}✅ Diretório web encontrado: $dir${NC}"
        break
    fi
done

if [ -z "$WEB_DIR_FOUND" ]; then
    echo -e "${YELLOW}⚠️  Diretório web não encontrado automaticamente${NC}"
    echo "Verifique no aplicativo ServBay onde estão os sites"
    echo
    echo "Diretórios testados:"
    for dir in "${POSSIBLE_WEB_DIRS[@]}"; do
        echo "  - $dir"
    done
fi

# 4. Testar MySQL
echo -e "${BLUE}4. Testando MySQL...${NC}"

MYSQL_COMMANDS=(
    "/Applications/ServBay.app/Contents/Resources/bin/mysql"
    "/Applications/ServBay.app/Contents/MacOS/bin/mysql"
    "/Applications/ServBay.app/bin/mysql"
    "/usr/local/bin/mysql"
    "/opt/homebrew/bin/mysql"
    "mysql"
)

MYSQL_FOUND=""
for cmd in "${MYSQL_COMMANDS[@]}"; do
    if command -v "$cmd" > /dev/null 2>&1; then
        MYSQL_FOUND="$cmd"
        echo -e "${GREEN}✅ MySQL encontrado: $cmd${NC}"
        
        # Testar conexão
        if $cmd -u root -e "SELECT 1;" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ MySQL acessível sem senha${NC}"
        elif $cmd -u root --password="" -e "SELECT 1;" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ MySQL acessível com senha vazia${NC}"
        else
            echo -e "${YELLOW}⚠️  MySQL pode requerer senha${NC}"
        fi
        break
    fi
done

if [ -z "$MYSQL_FOUND" ]; then
    echo -e "${RED}❌ MySQL não encontrado${NC}"
    echo "Verifique se MySQL está ativo no ServBay"
fi

# 5. Testar servidor web
echo -e "${BLUE}5. Testando servidor web...${NC}"

PORTAS_TESTE=(80 8080 3000 8000 8888 9000)
PORTA_ATIVA=""

for porta in "${PORTAS_TESTE[@]}"; do
    if curl -s --connect-timeout 2 "http://localhost:$porta" > /dev/null 2>&1; then
        PORTA_ATIVA=$porta
        echo -e "${GREEN}✅ Servidor web ativo na porta: $porta${NC}"
        break
    fi
done

if [ -z "$PORTA_ATIVA" ]; then
    echo -e "${YELLOW}⚠️  Nenhum servidor web detectado${NC}"
    echo "Portas testadas: ${PORTAS_TESTE[*]}"
    echo "Verifique se Apache/Nginx está ativo no ServBay"
fi

# 6. Verificar PHP
echo -e "${BLUE}6. Testando PHP...${NC}"

if command -v php > /dev/null 2>&1; then
    PHP_VERSION=$(php -v | head -n 1)
    echo -e "${GREEN}✅ PHP disponível: $PHP_VERSION${NC}"
    
    # Testar extensões necessárias
    if php -m | grep -q "pdo_mysql"; then
        echo -e "${GREEN}✅ Extensão PDO MySQL disponível${NC}"
    else
        echo -e "${YELLOW}⚠️  Extensão PDO MySQL não encontrada${NC}"
    fi
else
    echo -e "${RED}❌ PHP não encontrado${NC}"
fi

# Resumo
echo
echo -e "${BLUE}📋 RESUMO DA VERIFICAÇÃO:${NC}"
echo "========================="

if [ -d "/Applications/ServBay.app" ]; then
    echo -e "${GREEN}✅${NC} ServBay instalado"
else
    echo -e "${RED}❌${NC} ServBay instalado"
fi

if pgrep -f "ServBay" > /dev/null; then
    echo -e "${GREEN}✅${NC} ServBay rodando"
else
    echo -e "${YELLOW}⚠️${NC} ServBay rodando"
fi

if [ -n "$WEB_DIR_FOUND" ]; then
    echo -e "${GREEN}✅${NC} Diretório web: $WEB_DIR_FOUND"
else
    echo -e "${YELLOW}⚠️${NC} Diretório web: Não encontrado automaticamente"
fi

if [ -n "$MYSQL_FOUND" ]; then
    echo -e "${GREEN}✅${NC} MySQL: $MYSQL_FOUND"
else
    echo -e "${RED}❌${NC} MySQL: Não encontrado"
fi

if [ -n "$PORTA_ATIVA" ]; then
    echo -e "${GREEN}✅${NC} Servidor web: Porta $PORTA_ATIVA"
else
    echo -e "${YELLOW}⚠️${NC} Servidor web: Nenhuma porta respondendo"
fi

if command -v php > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC} PHP disponível"
else
    echo -e "${RED}❌${NC} PHP disponível"
fi

echo
if [ -n "$WEB_DIR_FOUND" ] && [ -n "$MYSQL_FOUND" ] && [ -n "$PORTA_ATIVA" ]; then
    echo -e "${GREEN}🎉 TUDO PRONTO! Execute ./setup_servbay.sh para continuar${NC}"
else
    echo -e "${YELLOW}⚠️  VERIFICAR CONFIGURAÇÕES ANTES DE CONTINUAR${NC}"
    echo
    echo "Possíveis ações:"
    echo "1. Abrir aplicativo ServBay"
    echo "2. Iniciar serviços MySQL e Apache/Nginx"
    echo "3. Verificar configurações de rede"
    echo "4. Consultar documentação do ServBay"
fi

echo