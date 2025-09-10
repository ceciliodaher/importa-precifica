<?php
/**
 * Configuração de Banco de Dados - Sistema Importa Precifica
 * 
 * Classe responsável pela configuração e conexão com MySQL
 */

class DatabaseConfig {
    private static $instance = null;
    private $pdo = null;
    private $config = [];

    private function __construct() {
        $this->loadConfig();
        $this->connect();
    }

    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function loadConfig() {
        // Carregar configurações do .env se existir
        $env_file = __DIR__ . '/.env';
        if (file_exists($env_file)) {
            $lines = file($env_file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                if (strpos($line, '=') !== false) {
                    list($key, $value) = explode('=', $line, 2);
                    $this->config[trim($key)] = trim($value);
                }
            }
        }

        // Configurações padrão com fallback (ServBay defaults)
        $this->config = array_merge([
            'DB_HOST' => 'localhost',
            'DB_PORT' => '3307',
            'DB_NAME' => 'importa_precificacao',
            'DB_USER' => 'root',
            'DB_PASS' => 'ServBay.dev',
            'DB_CHARSET' => 'utf8mb4'
        ], $this->config);
    }

    private function connect() {
        try {
            $dsn = sprintf(
                "mysql:host=%s;port=%s;dbname=%s;charset=%s",
                $this->config['DB_HOST'],
                $this->config['DB_PORT'],
                $this->config['DB_NAME'],
                $this->config['DB_CHARSET']
            );

            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$this->config['DB_CHARSET']} COLLATE {$this->config['DB_CHARSET']}_unicode_ci"
            ];

            $this->pdo = new PDO($dsn, $this->config['DB_USER'], $this->config['DB_PASS'], $options);
            
        } catch (PDOException $e) {
            error_log("Erro de conexão com banco de dados: " . $e->getMessage());
            throw new Exception("Falha na conexão com banco de dados");
        }
    }

    public function getConnection() {
        // Verificar se conexão ainda está ativa
        try {
            $this->pdo->query('SELECT 1');
        } catch (PDOException $e) {
            // Reconectar se necessário
            $this->connect();
        }
        
        return $this->pdo;
    }

    public function getConfig($key = null) {
        if ($key) {
            return $this->config[$key] ?? null;
        }
        return $this->config;
    }

    // Métodos helper para operações comuns
    public function testConnection() {
        try {
            $stmt = $this->pdo->query("SELECT VERSION() as mysql_version, DATABASE() as current_database, NOW() as mysql_time");
            return $stmt->fetch();
        } catch (PDOException $e) {
            throw new Exception("Teste de conexão falhou: " . $e->getMessage());
        }
    }

    public function getTables() {
        try {
            $stmt = $this->pdo->query("SHOW TABLES");
            return $stmt->fetchAll(PDO::FETCH_COLUMN);
        } catch (PDOException $e) {
            throw new Exception("Erro ao listar tabelas: " . $e->getMessage());
        }
    }

    public function getTableInfo($table_name) {
        try {
            $stmt = $this->pdo->prepare("DESCRIBE `{$table_name}`");
            $stmt->execute();
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            throw new Exception("Erro ao obter informações da tabela {$table_name}: " . $e->getMessage());
        }
    }

    public function beginTransaction() {
        return $this->pdo->beginTransaction();
    }

    public function commit() {
        return $this->pdo->commit();
    }

    public function rollback() {
        return $this->pdo->rollback();
    }

    // Prevenir clonagem
    private function __clone() {}
    
    // Prevenir unserialização
    public function __wakeup() {
        throw new Exception("Não é possível fazer unserialize de um singleton");
    }
}

// Função global para facilitar acesso
function getDB() {
    return DatabaseConfig::getInstance()->getConnection();
}

function getDBConfig() {
    return DatabaseConfig::getInstance();
}
?>