<?php
/**
 * Teste da Funcionalidade de Limpeza do Banco
 */

require_once 'sistema-expertzy-local/xml-import/processor.php';

echo "🧹 Testando Funcionalidade de Limpeza do Banco\n";
echo "==============================================\n";

try {
    // Configuração do banco
    $db_config = [
        'host' => 'localhost:3307',
        'dbname' => 'importa_precificacao',
        'username' => 'root',
        'password' => 'ServBay.dev',
        'charset' => 'utf8mb4'
    ];
    
    // Instanciar processador
    $processor = new XMLImportProcessor($db_config);
    echo "✅ Processador instanciado com sucesso\n";
    
    // Verificar estado antes da limpeza
    $stats = $processor->getStats();
    echo "\n📊 Estado ANTES da limpeza:\n";
    echo "   └─ DIs: " . $stats['total_dis'] . "\n";
    echo "   └─ Adições: " . $stats['total_adicoes'] . "\n";
    echo "   └─ Mercadorias: " . $stats['total_mercadorias'] . "\n";
    
    // Testar limpeza
    echo "\n🧹 Executando limpeza do banco...\n";
    $result = $processor->clearDatabase();
    
    if ($result['success']) {
        echo "✅ Limpeza executada com sucesso\n";
        echo "📊 Tabelas processadas: " . $result['tables_cleared'] . "\n";
        
        if (isset($result['details'])) {
            echo "📋 Tabelas limpas:\n";
            foreach ($result['details'] as $table) {
                echo "   └─ $table\n";
            }
        }
    } else {
        echo "❌ Erro na limpeza:\n";
        echo "   └─ " . $result['error'] . "\n";
        
        if (isset($result['tables_cleared'])) {
            echo "📊 Tabelas limpas com sucesso: " . $result['tables_cleared'] . "\n";
        }
        if (isset($result['tables_failed'])) {
            echo "❌ Tabelas que falharam: " . $result['tables_failed'] . "\n";
            if (isset($result['failed_tables'])) {
                foreach ($result['failed_tables'] as $table) {
                    echo "   └─ $table\n";
                }
            }
        }
    }
    
    // Verificar estado após limpeza
    $stats_after = $processor->getStats();
    echo "\n📊 Estado APÓS a limpeza:\n";
    echo "   └─ DIs: " . $stats_after['total_dis'] . "\n";
    echo "   └─ Adições: " . $stats_after['total_adicoes'] . "\n";
    echo "   └─ Mercadorias: " . $stats_after['total_mercadorias'] . "\n";
    
    // Verificar logs
    echo "\n📋 Verificando logs de limpeza...\n";
    $logger = $processor->getLogger();
    $logs = $logger->getLogs();
    $clear_logs = array_filter($logs, function($log) {
        return strpos($log['message'], 'limpeza') !== false;
    });
    
    echo "📄 Logs de limpeza encontrados: " . count($clear_logs) . "\n";
    foreach (array_slice($clear_logs, -3) as $log) {
        $time = date('H:i:s', strtotime($log['timestamp']));
        echo "   [$time] {$log['level']}: {$log['message']}\n";
    }
    
    echo "\n🎉 TESTE DE LIMPEZA CONCLUÍDO!\n";
    
} catch (Exception $e) {
    echo "\n❌ ERRO NO TESTE:\n";
    echo "   └─ " . $e->getMessage() . "\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
?>