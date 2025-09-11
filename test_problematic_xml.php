<?php
/**
 * Teste das Correções com XML Problemático
 * Verifica se o erro de truncamento foi resolvido
 */

require_once 'sistema-expertzy-local/xml-import/processor.php';

echo "🧪 Testando Correções com XML Problemático\n";
echo "=========================================\n";

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
    
    // Testar com XML que estava falhando
    $xmlFile = 'orientacoes/2518173187.xml';
    if (!file_exists($xmlFile)) {
        throw new Exception("Arquivo XML não encontrado: $xmlFile");
    }
    
    $xmlContent = file_get_contents($xmlFile);
    echo "✅ XML carregado: " . strlen($xmlContent) . " bytes\n";
    echo "📄 Arquivo: $xmlFile\n";
    
    // Processar XML
    echo "\n📤 Processando XML problemático...\n";
    $result = $processor->processXML($xmlContent, '2518173187.xml');
    
    // Mostrar resultado
    if ($result['success']) {
        echo "✅ SUCESSO! XML processado sem erros de truncamento\n";
        echo "📊 DIs processadas: " . $result['dis_processadas'] . "\n";
        echo "📦 Adições: " . $result['details']['adicoes'] . "\n";
        echo "🏷️ Mercadorias: " . $result['details']['mercadorias'] . "\n";
        
        foreach ($result['results'] as $di) {
            echo "   └─ DI {$di['numero_di']}: {$di['status']}\n";
        }
        
        // Verificar dados no banco
        echo "\n📋 Verificando dados salvos...\n";
        $stmt = $processor->pdo->query("SELECT numero_di, situacao_entrega, LENGTH(situacao_entrega) as tamanho FROM declaracoes_importacao WHERE numero_di = '2518173187'");
        $registro = $stmt->fetch();
        
        if ($registro) {
            echo "✅ Registro encontrado no banco\n";
            echo "📄 DI: " . $registro['numero_di'] . "\n";
            echo "📏 Tamanho do texto: " . $registro['tamanho'] . " caracteres\n";
            echo "📝 Situação (primeiros 80 chars): " . substr($registro['situacao_entrega'], 0, 80) . "...\n";
        }
        
    } else {
        echo "❌ ERRO no processamento:\n";
        echo "   └─ " . $result['error'] . "\n";
    }
    
    echo "\n🎉 TESTE CONCLUÍDO!\n";
    
    // Testar limpeza do banco também
    echo "\n🧹 Testando Limpeza do Banco...\n";
    $clearResult = $processor->clearDatabase();
    
    if ($clearResult['success']) {
        echo "✅ Banco limpo com sucesso\n";
        echo "📊 Tabelas limpas: " . $clearResult['tables_cleared'] . "\n";
    } else {
        echo "⚠️ Problema na limpeza:\n";
        echo "   └─ " . $clearResult['error'] . "\n";
    }
    
} catch (Exception $e) {
    echo "\n❌ ERRO NO TESTE:\n";
    echo "   └─ " . $e->getMessage() . "\n";
}

echo "\n" . str_repeat("=", 50) . "\n";
?>