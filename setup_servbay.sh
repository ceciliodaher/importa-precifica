#!/bin/bash

# ===================================================================
# SCRIPT DE CONFIGURAÇÃO AUTOMÁTICA PARA SERVBAY
# Sistema Importa Precifica - Setup Completo
# ===================================================================

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚢 CONFIGURAÇÃO SERVBAY - Sistema Importa Precifica${NC}"
echo "=================================================="
echo

# Verificar se ServBay está instalado
if [ ! -d "/Applications/ServBay.app" ]; then
    echo -e "${RED}❌ ServBay não encontrado!${NC}"
    echo "Por favor, instale o ServBay primeiro: https://servbay.com"
    exit 1
fi

echo -e "${GREEN}✅ ServBay encontrado${NC}"

# Verificar se ServBay está rodando
if ! pgrep -f "ServBay" > /dev/null; then
    echo -e "${YELLOW}⚠️  ServBay não está rodando${NC}"
    echo "Iniciando ServBay..."
    open -a ServBay
    echo "Aguarde o ServBay iniciar completamente..."
    sleep 10
fi

echo -e "${GREEN}✅ ServBay está rodando${NC}"

# Descobrir diretório web do ServBay
SERVBAY_WEB=""

# Lista de possíveis localizações do ServBay
POSSIBLE_LOCATIONS=(
    "$HOME/ServBay/www"
    "$HOME/Documents/ServBay/www"
    "$HOME/.servbay/www"
    "/Applications/ServBay.app/Contents/Resources/www"
    "/Applications/ServBay.app/Contents/MacOS/www"
    "/Applications/ServBay.app/www"
    "$HOME/Library/Application Support/ServBay/www"
    "/usr/local/servbay/www"
    "/opt/servbay/www"
)

echo -e "${BLUE}🔍 Procurando diretório web do ServBay...${NC}"

for location in "${POSSIBLE_LOCATIONS[@]}"; do
    if [ -d "$location" ]; then
        SERVBAY_WEB="$location"
        echo -e "${GREEN}✅ Encontrado: $SERVBAY_WEB${NC}"
        break
    fi
done

# Se não encontrou automaticamente, perguntar ao usuário
if [ -z "$SERVBAY_WEB" ]; then
    echo -e "${YELLOW}⚠️  Diretório web não encontrado automaticamente${NC}"
    echo
    echo "Por favor, informe o caminho do diretório web do ServBay."
    echo "Locais comuns:"
    echo "- ~/ServBay/www"
    echo "- ~/Documents/ServBay/www"
    echo "- /Applications/ServBay.app/Contents/Resources/www"
    echo
    read -p "Digite o caminho completo (ou Enter para criar ~/ServBay/www): " USER_PATH
    
    if [ -z "$USER_PATH" ]; then
        # Criar diretório padrão
        SERVBAY_WEB="$HOME/ServBay/www"
        echo -e "${BLUE}📁 Criando diretório padrão: $SERVBAY_WEB${NC}"
        mkdir -p "$SERVBAY_WEB"
    else
        if [ -d "$USER_PATH" ]; then
            SERVBAY_WEB="$USER_PATH"
        else
            echo -e "${RED}❌ Diretório não existe: $USER_PATH${NC}"
            read -p "Deseja criar este diretório? (y/n): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                mkdir -p "$USER_PATH"
                SERVBAY_WEB="$USER_PATH"
            else
                echo "Operação cancelada"
                exit 1
            fi
        fi
    fi
fi

# Verificar se diretório é válido
if [ ! -d "$SERVBAY_WEB" ]; then
    echo -e "${RED}❌ Erro: Diretório web não acessível: $SERVBAY_WEB${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Diretório web: $SERVBAY_WEB${NC}"

# Criar diretório do projeto no ServBay
PROJECT_DIR="$SERVBAY_WEB/importa-precifica"
CURRENT_DIR="/Users/ceciliodaher/Documents/git/importa-precifica"

echo -e "${BLUE}📁 Configurando diretório do projeto...${NC}"

if [ -d "$PROJECT_DIR" ]; then
    echo -e "${YELLOW}⚠️  Diretório já existe: $PROJECT_DIR${NC}"
    read -p "Deseja sobrescrever? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$PROJECT_DIR"
    else
        echo "Operação cancelada"
        exit 1
    fi
fi

# Criar link simbólico ou copiar arquivos
echo -e "${BLUE}📋 Criando link simbólico para facilitar desenvolvimento...${NC}"
ln -sf "$CURRENT_DIR" "$PROJECT_DIR"

if [ -L "$PROJECT_DIR" ]; then
    echo -e "${GREEN}✅ Link simbólico criado com sucesso${NC}"
else
    echo -e "${YELLOW}⚠️  Link simbólico falhou, copiando arquivos...${NC}"
    cp -r "$CURRENT_DIR" "$PROJECT_DIR"
fi

# Criar diretórios necessários
echo -e "${BLUE}📂 Criando diretórios necessários...${NC}"
mkdir -p "$PROJECT_DIR/uploads/xml"
mkdir -p "$PROJECT_DIR/logs"

# Configurar permissões
echo -e "${BLUE}🔐 Configurando permissões...${NC}"
chmod -R 755 "$PROJECT_DIR"
chmod -R 777 "$PROJECT_DIR/uploads"
chmod -R 777 "$PROJECT_DIR/logs"

echo -e "${GREEN}✅ Permissões configuradas${NC}"

# Detectar porta do ServBay
echo -e "${BLUE}🔍 Detectando porta do servidor web...${NC}"

# Lista de portas comuns do ServBay
PORTAS_TESTE=(80 8080 3000 8000 8888 9000)
PORTA=""

for p in "${PORTAS_TESTE[@]}"; do
    if curl -s --connect-timeout 2 "http://localhost:$p" > /dev/null 2>&1; then
        PORTA=$p
        echo -e "${GREEN}✅ Servidor web respondendo na porta: $PORTA${NC}"
        break
    fi
done

if [ -z "$PORTA" ]; then
    echo -e "${YELLOW}⚠️  Não foi possível detectar a porta automaticamente${NC}"
    echo "Portas testadas: ${PORTAS_TESTE[*]}"
    echo
    read -p "Digite a porta do ServBay (padrão 8080): " USER_PORTA
    PORTA=${USER_PORTA:-8080}
    echo -e "${BLUE}ℹ️  Usando porta: $PORTA${NC}"
fi

# Configurar arquivo .env
echo -e "${BLUE}⚙️  Configurando arquivo .env...${NC}"
ENV_FILE="$PROJECT_DIR/api/config/.env"

if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env já existe${NC}"
else
    cp "$PROJECT_DIR/api/config/.env.example" "$ENV_FILE"
    
    # Personalizar configurações para ServBay
    cat > "$ENV_FILE" << EOF
# ServBay Configuration
DB_HOST=127.0.0.1
DB_NAME=importa_precificacao
DB_USER=root
DB_PASS=
DB_CHARSET=utf8mb4

# API Configuration
API_BASE_URL=http://localhost:$PORTA/importa-precifica/api/
API_VERSION=v1
DEBUG=true

# Upload Configuration
UPLOAD_MAX_SIZE=52428800
UPLOAD_DIR=../uploads/xml/
ALLOWED_EXTENSIONS=xml

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL=3600

# Log Configuration
LOG_LEVEL=INFO
LOG_FILE=../logs/api.log
EOF

    echo -e "${GREEN}✅ Arquivo .env configurado${NC}"
fi

# Testar conexão MySQL
echo -e "${BLUE}🗄️  Testando conexão MySQL...${NC}"

# Lista de possíveis localizações do comando MySQL
MYSQL_COMMANDS=(
    "/Applications/ServBay.app/Contents/Resources/bin/mysql"
    "/Applications/ServBay.app/Contents/MacOS/bin/mysql"
    "/Applications/ServBay.app/bin/mysql"
    "/usr/local/bin/mysql"
    "/opt/homebrew/bin/mysql"
    "mysql"
)

MYSQL_CMD=""
for cmd in "${MYSQL_COMMANDS[@]}"; do
    if command -v "$cmd" > /dev/null 2>&1; then
        MYSQL_CMD="$cmd"
        echo -e "${GREEN}✅ MySQL encontrado: $MYSQL_CMD${NC}"
        break
    fi
done

if [ -z "$MYSQL_CMD" ]; then
    echo -e "${YELLOW}⚠️  Comando MySQL não encontrado automaticamente${NC}"
    echo "Tentando mysql padrão do sistema..."
    MYSQL_CMD="mysql"
fi

# Testar conexão MySQL
if $MYSQL_CMD -u root -e "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MySQL está acessível${NC}"
    
    # Criar banco de dados
    echo -e "${BLUE}🏗️  Criando banco de dados...${NC}"
    $MYSQL_CMD -u root -e "CREATE DATABASE IF NOT EXISTS importa_precificacao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
    
    # Executar script SQL
    if [ -f "$PROJECT_DIR/sql/create_database_importa_precifica.sql" ]; then
        echo -e "${BLUE}📋 Executando script SQL...${NC}"
        $MYSQL_CMD -u root importa_precificacao < "$PROJECT_DIR/sql/create_database_importa_precifica.sql"
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Banco de dados criado com sucesso${NC}"
            
            # Verificar tabelas criadas
            TABELAS_COUNT=$($MYSQL_CMD -u root importa_precificacao -e "SHOW TABLES;" | wc -l)
            echo -e "${GREEN}✅ $((TABELAS_COUNT-1)) tabelas criadas${NC}"
        else
            echo -e "${RED}❌ Erro ao criar banco de dados${NC}"
            echo "Tentando com senha..."
            echo "Execute manualmente: $MYSQL_CMD -u root -p importa_precificacao < $PROJECT_DIR/sql/create_database_importa_precifica.sql"
        fi
    else
        echo -e "${RED}❌ Script SQL não encontrado: $PROJECT_DIR/sql/create_database_importa_precifica.sql${NC}"
    fi
    
elif $MYSQL_CMD -u root -p -e "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  MySQL requer senha${NC}"
    echo "Execute manualmente os comandos:"
    echo "1. $MYSQL_CMD -u root -p"
    echo "2. CREATE DATABASE importa_precificacao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    echo "3. EXIT;"
    echo "4. $MYSQL_CMD -u root -p importa_precificacao < $PROJECT_DIR/sql/create_database_importa_precifica.sql"
else
    echo -e "${RED}❌ MySQL não está acessível${NC}"
    echo "Possíveis soluções:"
    echo "1. Verificar se MySQL está ativo no ServBay"
    echo "2. Abrir o aplicativo ServBay e iniciar MySQL"
    echo "3. Verificar configurações de rede do MySQL"
fi

# Testar servidor web
echo -e "${BLUE}🌐 Testando servidor web...${NC}"
if curl -s "http://localhost:$PORTA" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Servidor web está respondendo${NC}"
else
    echo -e "${RED}❌ Servidor web não está respondendo${NC}"
    echo "Verifique se o Apache/Nginx está ativo no ServBay"
fi

# Mostrar URLs de acesso
echo
echo -e "${YELLOW}🎯 URLS PARA ACESSAR O SISTEMA:${NC}"
echo "==============================="
echo
echo -e "${GREEN}📋 Verificar banco de dados:${NC}"
echo "http://localhost:$PORTA/importa-precifica/verificar_banco.php"
echo
echo -e "${GREEN}📤 Interface de importação:${NC}"
echo "http://localhost:$PORTA/importa-precifica/povoar_importa_precifica.php"
echo
echo -e "${GREEN}🔍 Interface de consulta:${NC}"
echo "http://localhost:$PORTA/importa-precifica/consultar_dados.php"
echo
echo -e "${GREEN}🏠 Sistema principal:${NC}"
echo "http://localhost:$PORTA/importa-precifica/sistema-expertzy-local/index.html"
echo
echo -e "${GREEN}🔌 API Status:${NC}"
echo "http://localhost:$PORTA/importa-precifica/api/status.php"
echo

# Verificar se tudo está funcionando
echo -e "${BLUE}🔍 Verificação final...${NC}"

# Testar API
if curl -s "http://localhost:$PORTA/importa-precifica/api/status.php" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ API está funcionando${NC}"
else
    echo -e "${YELLOW}⚠️  API não está respondendo (pode ser normal se for primeira execução)${NC}"
fi

# Verificar arquivo principal do sistema
if curl -s "http://localhost:$PORTA/importa-precifica/sistema-expertzy-local/index.html" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Sistema principal está acessível${NC}"
else
    echo -e "${YELLOW}⚠️  Sistema principal não está acessível${NC}"
fi

echo
echo -e "${GREEN}🎉 CONFIGURAÇÃO CONCLUÍDA!${NC}"
echo "========================"
echo
echo -e "${BLUE}Próximos passos:${NC}"
echo "1. Abrir http://localhost:$PORTA/importa-precifica/verificar_banco.php"
echo "2. Importar XMLs em http://localhost:$PORTA/importa-precifica/povoar_importa_precifica.php"
echo "3. Consultar dados em http://localhost:$PORTA/importa-precifica/consultar_dados.php"
echo "4. Usar o sistema em http://localhost:$PORTA/importa-precifica/sistema-expertzy-local/index.html"
echo

# Abrir primeira URL automaticamente
echo -e "${BLUE}🚀 Abrindo verificação do banco...${NC}"
sleep 2
open "http://localhost:$PORTA/importa-precifica/verificar_banco.php"