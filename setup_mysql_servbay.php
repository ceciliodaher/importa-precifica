<?php
/**
 * Script de configuração MySQL para ServBay
 * Sistema Importa Precifica v2.0
 */

echo "<!DOCTYPE html>\n";
echo "<html lang='pt-BR'>\n";
echo "<head>\n";
echo "    <meta charset='UTF-8'>\n";
echo "    <meta name='viewport' content='width=device-width, initial-scale=1.0'>\n";
echo "    <title>Configuração MySQL ServBay</title>\n";
echo "    <style>\n";
echo "        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }\n";
echo "        .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }\n";
echo "        .success { color: #28a745; }\n";
echo "        .error { color: #dc3545; }\n";
echo "        .warning { color: #ffc107; }\n";
echo "        .info { color: #17a2b8; }\n";
echo "        pre { background: #f8f9fa; padding: 15px; border-left: 4px solid #007bff; overflow-x: auto; }\n";
echo "        ul li { margin: 5px 0; }\n";
echo "    </style>\n";
echo "</head>\n";
echo "<body>\n";
echo "<div class='container'>\n";

echo "<h1>🚢 Configuração MySQL ServBay</h1>";
echo "<hr>";

// Configurações de teste para ServBay
$configs = [
    ['host' => '127.0.0.1', 'port' => 3306, 'user' => 'root', 'pass' => 'ServBay.dev'],
    ['host' => '127.0.0.1', 'port' => 3307, 'user' => 'root', 'pass' => 'ServBay.dev'],
    ['host' => '127.0.0.1', 'port' => 3308, 'user' => 'root', 'pass' => 'ServBay.dev'],
    ['host' => 'localhost', 'port' => 3306, 'user' => 'root', 'pass' => 'ServBay.dev'],
    ['host' => '127.0.0.1', 'port' => 3306, 'user' => 'root', 'pass' => ''],
    ['host' => '127.0.0.1', 'port' => 3306, 'user' => 'root', 'pass' => 'root'],
];

echo "<h2>🔍 Testando conexões MySQL...</h2>";

$conexao_ok = false;
$pdo = null;
$config_ok = null;

foreach ($configs as $i => $config) {
    echo "<p><strong>Teste " . ($i + 1) . ":</strong> ";
    echo "Host: {$config['host']}:{$config['port']}, User: {$config['user']}, Pass: " . 
         (empty($config['pass']) ? '(vazia)' : '***');
    
    try {
        $dsn = "mysql:host={$config['host']};port={$config['port']};charset=utf8mb4";
        $pdo = new PDO($dsn, $config['user'], $config['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_TIMEOUT => 5,
        ]);
        
        echo " <span class='success'>✅ CONEXÃO OK!</span></p>";
        $conexao_ok = true;
        $config_ok = $config;
        break;
        
    } catch (PDOException $e) {
        echo " <span class='error'>❌ FALHOU: " . htmlspecialchars($e->getMessage()) . "</span></p>";
    }
}

if (!$conexao_ok) {
    echo "<div class='error'>";
    echo "<h2>❌ MySQL não está acessível!</h2>";
    echo "<p><strong>Possíveis soluções:</strong></p>";
    echo "<ol>";
    echo "<li><strong>Abrir o aplicativo ServBay</strong> e verificar se MySQL está ativo</li>";
    echo "<li><strong>Iniciar o serviço MySQL</strong> através da interface do ServBay</li>";
    echo "<li><strong>Verificar porta:</strong> MySQL pode estar em porta diferente (3307, 3308)</li>";
    echo "<li><strong>Verificar credenciais:</strong> Senha pode ser diferente</li>";
    echo "</ol>";
    echo "</div>";
    
    echo "<div class='info'>";
    echo "<h3>📋 Comandos para verificação manual:</h3>";
    echo "<pre>";
    echo "# Verificar se MySQL está rodando:\n";
    echo "ps aux | grep mysql\n\n";
    echo "# Verificar portas ativas:\n";
    echo "netstat -an | grep :330\n\n";
    echo "# Testar conexão:\n";
    echo "/Applications/ServBay/bin/mysql -u root -pServBay.dev -h 127.0.0.1\n";
    echo "</pre>";
    echo "</div>";
    
    echo "</div></body></html>";
    exit;
}

echo "<hr>";
echo "<h2 class='success'>🎉 MySQL Conectado com Sucesso!</h2>";
echo "<p><strong>Configuração usada:</strong></p>";
echo "<ul>";
echo "<li><strong>Host:</strong> {$config_ok['host']}:{$config_ok['port']}</li>";
echo "<li><strong>Usuário:</strong> {$config_ok['user']}</li>";
echo "<li><strong>Senha:</strong> " . (empty($config_ok['pass']) ? '(vazia)' : 'definida') . "</li>";
echo "</ul>";

echo "<hr>";
echo "<h2>🏗️ Configurando Banco de Dados</h2>";

try {
    // Verificar se banco existe
    $stmt = $pdo->query("SHOW DATABASES LIKE 'importa_precificacao'");
    $banco_existe = $stmt->rowCount() > 0;
    
    if ($banco_existe) {
        echo "<p class='success'>✅ <strong>Banco 'importa_precificacao' já existe</strong></p>";
    } else {
        echo "<p class='info'>🏗️ Criando banco 'importa_precificacao'...</p>";
        $pdo->exec("CREATE DATABASE importa_precificacao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        echo "<p class='success'>✅ <strong>Banco criado com sucesso!</strong></p>";
    }
    
    // Conectar ao banco específico
    $dsn = "mysql:host={$config_ok['host']};port={$config_ok['port']};dbname=importa_precificacao;charset=utf8mb4";
    $pdo = new PDO($dsn, $config_ok['user'], $config_ok['pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    
    // Verificar tabelas
    $stmt = $pdo->query("SHOW TABLES");
    $tabelas = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $total_tabelas = count($tabelas);
    
    echo "<h3>📋 Status do Banco:</h3>";
    echo "<p><strong>Total de tabelas:</strong> $total_tabelas</p>";
    
    if ($total_tabelas == 0) {
        echo "<p class='warning'>⚠️ <strong>Banco vazio - Executando script SQL...</strong></p>";
        
        // Executar o script SQL
        $sql_file = __DIR__ . '/sql/create_database_importa_precifica.sql';
        if (file_exists($sql_file)) {
            echo "<p class='info'>🔄 Executando script SQL...</p>";
            $sql_content = file_get_contents($sql_file);
            
            try {
                // Dividir SQL em comandos individuais
                $commands = array_filter(array_map('trim', explode(';', $sql_content)));
                $executed = 0;
                
                foreach ($commands as $command) {
                    if (!empty($command) && !preg_match('/^(--|\#)/', $command)) {
                        $pdo->exec($command);
                        $executed++;
                    }
                }
                
                echo "<p class='success'>✅ <strong>Script SQL executado! ($executed comandos)</strong></p>";
                
                // Verificar novamente
                $stmt = $pdo->query("SHOW TABLES");
                $tabelas = $stmt->fetchAll(PDO::FETCH_COLUMN);
                echo "<p class='success'>📋 <strong>Tabelas criadas:</strong> " . count($tabelas) . "</p>";
                
            } catch (PDOException $e) {
                echo "<p class='error'>❌ <strong>Erro ao executar script SQL:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
            }
        } else {
            echo "<p class='error'>❌ <strong>Arquivo SQL não encontrado:</strong> $sql_file</p>";
        }
        
    } else {
        echo "<p class='success'>✅ <strong>Banco configurado!</strong></p>";
        echo "<details><summary>📋 <strong>Ver tabelas ($total_tabelas)</strong></summary><ul>";
        foreach ($tabelas as $tabela) {
            echo "<li>$tabela</li>";
        }
        echo "</ul></details>";
        
        // Mostrar estatísticas básicas
        try {
            $stats = $pdo->query("
                SELECT 
                    (SELECT COUNT(*) FROM declaracoes_importacao) as total_dis,
                    (SELECT COUNT(*) FROM adicoes) as total_adicoes,
                    (SELECT COUNT(*) FROM mercadorias) as total_mercadorias
            ")->fetch();
            
            echo "<h4>📊 Estatísticas:</h4>";
            echo "<ul>";
            echo "<li><strong>DIs:</strong> {$stats['total_dis']}</li>";
            echo "<li><strong>Adições:</strong> {$stats['total_adicoes']}</li>";
            echo "<li><strong>Mercadorias:</strong> {$stats['total_mercadorias']}</li>";
            echo "</ul>";
            
        } catch (PDOException $e) {
            // Tabelas ainda não criadas ou estrutura diferente
        }
    }
    
    // Criar arquivo .env com configurações corretas
    echo "<h3>⚙️ Configurando arquivo .env</h3>";
    
    $env_content = "# ServBay MySQL Configuration - Auto-generated " . date('Y-m-d H:i:s') . "
DB_HOST={$config_ok['host']}
DB_PORT={$config_ok['port']}
DB_NAME=importa_precificacao
DB_USER={$config_ok['user']}
DB_PASS={$config_ok['pass']}
DB_CHARSET=utf8mb4

# API Configuration
API_BASE_URL=http://localhost/importa-precifica/api/
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

# ServBay Specific
SERVBAY_ENV=development
MYSQL_CONFIG_VERIFIED=true
MYSQL_CONFIG_DATE=" . date('Y-m-d H:i:s');

    $env_file = __DIR__ . '/api/config/.env';
    if (file_put_contents($env_file, $env_content)) {
        echo "<p class='success'>✅ <strong>Arquivo .env atualizado</strong></p>";
    } else {
        echo "<p class='error'>❌ <strong>Erro ao criar arquivo .env</strong></p>";
    }
    
} catch (PDOException $e) {
    echo "<p class='error'>❌ <strong>Erro:</strong> " . htmlspecialchars($e->getMessage()) . "</p>";
}

echo "<hr>";
echo "<h2>🎯 Próximos Passos</h2>";
echo "<div class='info'>";
echo "<ol>";
echo "<li><strong>Testar importação:</strong> <a href='povoar_importa_precifica.php'>Importar XMLs</a></li>";
echo "<li><strong>Verificar dados:</strong> <a href='verificar_banco.php'>Verificar Banco</a></li>";
echo "<li><strong>Consultar registros:</strong> <a href='consultar_dados.php'>Consultar Dados</a></li>";
echo "<li><strong>Usar sistema:</strong> <a href='sistema-expertzy-local/index.html'>Sistema Principal</a></li>";
echo "<li><strong>Verificar API:</strong> <a href='api/status.php'>Status da API</a></li>";
echo "</ol>";
echo "</div>";

echo "<hr>";
echo "<p><em>Configuração executada em: " . date('Y-m-d H:i:s') . "</em></p>";
echo "</div></body></html>";
?>