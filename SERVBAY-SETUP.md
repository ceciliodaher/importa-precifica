# CONFIGURAÇÃO SERVBAY - Sistema Importa Precifica

## 🚢 SETUP ESPECÍFICO PARA SERVBAY

### **1. VERIFICAR SERVBAY ESTÁ RODANDO**

1. **Abrir ServBay**
2. **Verificar status dos serviços:**
   - ✅ Apache/Nginx (servidor web)
   - ✅ MySQL (banco de dados)
   - ✅ PHP (versão 8.0+)

### **2. LOCALIZAR DIRETÓRIO WEB DO SERVBAY**

**Caminhos típicos do ServBay:**
- **Diretório Web**: `~/ServBay/www/` ou `~/Documents/ServBay/www/`
- **Logs**: `~/ServBay/logs/`
- **Configurações**: `~/ServBay/config/`

### **3. CONFIGURAR MYSQL NO SERVBAY**

#### **Acessar MySQL via ServBay:**
```bash
# Comando para acessar MySQL do ServBay
/Applications/ServBay.app/Contents/Resources/bin/mysql -u root -p

# Ou através do cliente integrado do ServBay
# ServBay App > Databases > MySQL > Connect
```

#### **Credenciais padrão ServBay:**
- **Host**: localhost ou 127.0.0.1
- **Porta**: 3306 (padrão) ou verificar na interface do ServBay
- **Usuário**: root
- **Senha**: (vazia por padrão, ou conforme configurado)

### **4. COPIAR ARQUIVOS PARA SERVBAY**

```bash
# Descobrir diretório web do ServBay
ls -la ~/ServBay/www/

# Copiar projeto para diretório web
cp -r /Users/ceciliodaher/Documents/git/importa-precifica ~/ServBay/www/

# Ou criar link simbólico
ln -s /Users/ceciliodaher/Documents/git/importa-precifica ~/ServBay/www/importa-precifica
```

### **5. CONFIGURAR PERMISSÕES**

```bash
# Dar permissões necessárias
chmod -R 755 ~/ServBay/www/importa-precifica/
chmod -R 777 ~/ServBay/www/importa-precifica/uploads/
chmod -R 777 ~/ServBay/www/importa-precifica/logs/
```

### **6. CRIAR BANCO DE DADOS VIA SERVBAY**

#### **Opção A: Via Interface Gráfica do ServBay**
1. Abrir ServBay
2. Ir em "Databases" > "MySQL"
3. Criar novo banco: `importa_precificacao`
4. Importar arquivo SQL

#### **Opção B: Via Linha de Comando**
```bash
# Acessar MySQL do ServBay
/Applications/ServBay.app/Contents/Resources/bin/mysql -u root -p

# Executar script
/Applications/ServBay.app/Contents/Resources/bin/mysql -u root -p < ~/ServBay/www/importa-precifica/sql/create_database_importa_precifica.sql
```

### **7. CONFIGURAR .ENV PARA SERVBAY**

```bash
# Copiar arquivo de configuração
cp ~/ServBay/www/importa-precifica/api/config/.env.example ~/ServBay/www/importa-precifica/api/config/.env
```

**Conteúdo do .env para ServBay:**
```env
# ServBay Configuration
DB_HOST=127.0.0.1
DB_NAME=importa_precificacao
DB_USER=root
DB_PASS=
DB_CHARSET=utf8mb4

# API Configuration
API_BASE_URL=http://localhost:8080/importa-precifica/api/
API_VERSION=v1
DEBUG=true

# Upload Configuration
UPLOAD_MAX_SIZE=52428800
UPLOAD_DIR=../uploads/xml/
ALLOWED_EXTENSIONS=xml
```

### **8. URLs PARA ACESSAR NO SERVBAY**

**Assumindo porta padrão 8080:**

```bash
# Verificar banco
http://localhost:8080/importa-precifica/verificar_banco.php

# Interface de importação
http://localhost:8080/importa-precifica/povoar_importa_precifica.php

# Interface de consulta
http://localhost:8080/importa-precifica/consultar_dados.php

# Sistema principal
http://localhost:8080/importa-precifica/sistema-expertzy-local/index.html

# API Status
http://localhost:8080/importa-precifica/api/status.php
```

### **9. COMANDOS ESPECÍFICOS SERVBAY**

```bash
# Verificar se ServBay está rodando
ps aux | grep -i servbay

# Ver logs do ServBay
tail -f ~/ServBay/logs/apache/error.log
tail -f ~/ServBay/logs/mysql/error.log

# Reiniciar serviços via CLI (se suportado)
servbay restart mysql
servbay restart apache
```

### **10. TROUBLESHOOTING SERVBAY**

#### **Problema: Porta ocupada**
- Verificar porta do ServBay (pode ser 8080, 80, ou outra)
- Ajustar URLs conforme porta configurada

#### **Problema: MySQL não conecta**
- Verificar se MySQL está ativo no ServBay
- Conferir porta MySQL (padrão 3306)
- Testar conexão: `telnet localhost 3306`

#### **Problema: Permissões PHP**
- Verificar se PHP tem permissão de escrita
- Conferir configuração PHP no ServBay

#### **Problema: API não responde**
- Verificar se mod_rewrite está ativo
- Conferir configuração .htaccess se necessário

### **11. SCRIPT DE VERIFICAÇÃO SERVBAY**

```bash
#!/bin/bash
echo "🔍 Verificando configuração ServBay..."

# Verificar se ServBay está rodando
if pgrep -f "ServBay" > /dev/null; then
    echo "✅ ServBay está rodando"
else
    echo "❌ ServBay não está rodando - inicie o ServBay"
    exit 1
fi

# Verificar diretório web
if [ -d "~/ServBay/www" ]; then
    echo "✅ Diretório web encontrado: ~/ServBay/www"
else
    echo "❌ Diretório web não encontrado"
fi

# Testar MySQL
if /Applications/ServBay.app/Contents/Resources/bin/mysql -u root -e "SELECT 1;" 2>/dev/null; then
    echo "✅ MySQL está acessível"
else
    echo "❌ MySQL não está acessível"
fi

# Testar servidor web
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Servidor web respondendo na porta 8080"
elif curl -s http://localhost:80 > /dev/null; then
    echo "✅ Servidor web respondendo na porta 80"
else
    echo "❌ Servidor web não está respondendo"
fi

echo "🚀 Verificação concluída!"
```

### **12. CONFIGURAÇÃO DE DESENVOLVIMENTO RECOMENDADA**

```bash
# 1. Criar workspace no ServBay
mkdir -p ~/ServBay/www/importa-precifica

# 2. Fazer link simbólico para facilitar desenvolvimento
ln -sf /Users/ceciliodaher/Documents/git/importa-precifica/* ~/ServBay/www/importa-precifica/

# 3. Configurar logs
mkdir -p ~/ServBay/www/importa-precifica/logs
chmod 777 ~/ServBay/www/importa-precifica/logs

# 4. Configurar uploads
mkdir -p ~/ServBay/www/importa-precifica/uploads/xml
chmod 777 ~/ServBay/www/importa-precifica/uploads
```