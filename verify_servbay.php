<?php
/**
 * Script para verificar configuração do ServBay
 */

echo "=== VERIFICAÇÃO SERVBAY ===\n";
echo "PHP Version: " . PHP_VERSION . "\n";
echo "Server Software: " . $_SERVER['SERVER_SOFTWARE'] . "\n";
echo "Document Root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
echo "Script Name: " . $_SERVER['SCRIPT_NAME'] . "\n";
echo "Current Directory: " . getcwd() . "\n";

echo "\n=== TESTE MYSQL ===\n";
try {
    require_once __DIR__ . '/api/config/database.php';
    $db = DatabaseConfig::getInstance();
    $connection = $db->getConnection();
    echo "✅ MySQL conectado com sucesso!\n";
    
    $config = $db->getConfig();
    echo "Host: " . $config['DB_HOST'] . ":" . $config['DB_PORT'] . "\n";
    echo "Database: " . $config['DB_NAME'] . "\n";
} catch (Exception $e) {
    echo "❌ Erro MySQL: " . $e->getMessage() . "\n";
}

echo "\n=== TESTE API ENDPOINTS ===\n";
$endpoints = [
    'status.php',
    'listar-dis.php', 
    'salvar-di.php',
    'salvar-calculo.php'
];

foreach ($endpoints as $endpoint) {
    $path = __DIR__ . '/api/endpoints/' . $endpoint;
    if (file_exists($path)) {
        echo "✅ $endpoint existe\n";
    } else {
        echo "❌ $endpoint não encontrado\n";
    }
}
?>