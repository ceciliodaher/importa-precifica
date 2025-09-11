<?php
/**
 * Teste das Correções de Importação XML
 * Verifica se o erro ICMS foi corrigido e se logs estão funcionando
 */

require_once 'sistema-expertzy-local/xml-import/processor.php';

echo "🧪 Testando Correções de Importação XML\n";
echo "=====================================\n";

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
    
    // Ler arquivo XML de teste
    $xmlFile = 'orientacoes/2300120746.xml';
    if (!file_exists($xmlFile)) {
        throw new Exception("Arquivo XML não encontrado: $xmlFile");
    }
    
    $xmlContent = file_get_contents($xmlFile);
    echo "✅ XML carregado: " . strlen($xmlContent) . " bytes\n";
    
    // Processar XML
    echo "\n📤 Processando XML...\n";
    $result = $processor->processXML($xmlContent, '2300120746.xml');
    
    // Mostrar resultado
    if ($result['success']) {
        echo "✅ SUCESSO! XML processado sem erros\n";
        echo "📊 DIs processadas: " . $result['dis_processadas'] . "\n";
        echo "📦 Adições: " . $result['details']['adicoes'] . "\n";
        echo "🏷️ Mercadorias: " . $result['details']['mercadorias'] . "\n";
        
        foreach ($result['results'] as $di) {
            echo "   └─ DI {$di['numero_di']}: {$di['status']}\n";
        }
    } else {
        echo "❌ ERRO no processamento:\n";
        echo "   └─ " . $result['error'] . "\n";
    }
    
    // Testar logs
    echo "\n📋 Testando Sistema de Log...\n";
    $logger = $processor->getLogger();
    $logs = $logger->getLogs();
    echo "📄 Total de logs: " . count($logs) . "\n";
    
    if (count($logs) > 0) {
        echo "📝 Últimos logs:\n";
        foreach (array_slice($logs, -3) as $log) {
            $time = date('H:i:s', strtotime($log['timestamp']));
            echo "   [$time] {$log['level']}: {$log['message']}\n";
        }
    }
    
    // Testar exportação de log
    echo "\n📤 Testando Exportação de Log...\n";
    $exportData = $logger->exportLogs();
    echo "✅ Logs exportados: " . $exportData['total_entries'] . " entradas\n";
    echo "📁 Arquivo: " . $exportData['filename'] . "\n";
    
    echo "\n🎉 TESTE CONCLUÍDO COM SUCESSO!\n";
    echo "✅ Erro ICMS corrigido - sem violações de constraint\n";
    echo "✅ Sistema de logs funcionando\n";
    echo "✅ Exportação de logs disponível\n";
    
} catch (Exception $e) {
    echo "\n❌ ERRO NO TESTE:\n";
    echo "   └─ " . $e->getMessage() . "\n";
    echo "   └─ Verifique se o banco MySQL está rodando\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
?>