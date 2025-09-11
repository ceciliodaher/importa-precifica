<?php
/**
 * Teste de Conexão MySQL ServBay
 * Sistema Importa Precifica
 */

// Incluir configurações
require_once __DIR__ . '/api/config/database.php';

try {
    echo "🔍 Testando configuração MySQL ServBay...\n";
    echo "==========================================\n";
    
    // Testar conexão com banco
    $db = DatabaseConfig::getInstance();
    $connection = $db->getConnection();
    
    echo "✅ Conexão com MySQL estabelecida com sucesso!\n";
    
    // Testar configurações
    $config = $db->getConfig();
    echo "📋 Configurações:\n";
    echo "   Host: " . $config['DB_HOST'] . "\n";
    echo "   Porta: " . $config['DB_PORT'] . "\n";
    echo "   Banco: " . $config['DB_NAME'] . "\n";
    echo "   Usuário: " . $config['DB_USER'] . "\n";
    echo "   Charset: " . $config['DB_CHARSET'] . "\n";
    
    // Testar informações do banco
    $info = $db->testConnection();
    echo "\n🗄️  Informações do MySQL:\n";
    echo "   Versão: " . $info['mysql_version'] . "\n";
    echo "   Banco atual: " . $info['current_database'] . "\n";
    echo "   Horário: " . $info['mysql_time'] . "\n";
    
    // Listar tabelas
    $tables = $db->getTables();
    echo "\n📊 Tabelas encontradas (" . count($tables) . "):\n";
    foreach ($tables as $table) {
        echo "   - " . $table . "\n";
    }
    
    // Testar view_dis_resumo
    $stmt = $connection->query("SELECT COUNT(*) as total FROM view_dis_resumo");
    $result = $stmt->fetch();
    echo "\n📈 DIs no banco: " . $result['total'] . "\n";
    
    echo "\n🎉 CONFIGURAÇÃO MYSQL SERVBAY FUNCIONANDO PERFEITAMENTE!\n";
    
} catch (Exception $e) {
    echo "❌ ERRO: " . $e->getMessage() . "\n";
    echo "\n🔧 Verifique:\n";
    echo "   1. ServBay está rodando\n";
    echo "   2. MySQL está ativo na porta 3307\n";
    echo "   3. Senha é 'ServBay.dev'\n";
    echo "   4. Banco 'importa_precificacao' existe\n";
    exit(1);
}
?>