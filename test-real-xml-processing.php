<?php
/**
 * Teste real de processamento XML
 * Testa a extração de SISCOMEX da DI 2520345968
 */

require_once 'sistema-expertzy-local/xml-import/processor.php';

// Configuração do banco (usar ServBay)
$db_config = [
    'host' => 'localhost:3307',
    'dbname' => 'importa_precificacao',
    'username' => 'root',
    'password' => 'ServBay.dev',
    'charset' => 'utf8mb4'
];

echo "=== TESTE REAL DE PROCESSAMENTO XML ===\n\n";

try {
    // Inicializar processador
    $processor = new XMLImportProcessor($db_config);
    
    // Ler XML da DI 2520345968
    $xml_path = 'orientacoes/2520345968.xml';
    if (!file_exists($xml_path)) {
        throw new Exception("Arquivo XML não encontrado: $xml_path");
    }
    
    $xml_content = file_get_contents($xml_path);
    echo "✅ XML carregado: " . strlen($xml_content) . " bytes\n";
    
    // Processar XML
    echo "🔄 Processando XML da DI 2520345968...\n";
    $result = $processor->processXML($xml_content, '2520345968.xml');
    
    if ($result['success']) {
        echo "✅ XML processado com sucesso!\n";
        echo "   DIs processadas: " . $result['stats']['dis_processadas'] . "\n";
        echo "   Adições inseridas: " . $result['stats']['adicoes_inseridas'] . "\n";
        echo "   Mercadorias inseridas: " . $result['stats']['mercadorias_inseridas'] . "\n\n";
        
        // Verificar se SISCOMEX foi extraído
        echo "=== VERIFICANDO SISCOMEX NO BANCO ===\n";
        $pdo = new PDO(
            "mysql:host={$db_config['host']};dbname={$db_config['dbname']};charset={$db_config['charset']}",
            $db_config['username'],
            $db_config['password']
        );
        
        $stmt = $pdo->prepare("
            SELECT tipo_despesa, codigo_receita, descricao, valor 
            FROM despesas_aduaneiras 
            WHERE numero_di = '2520345968'
            ORDER BY tipo_despesa
        ");
        $stmt->execute();
        $despesas = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($despesas)) {
            echo "❌ Nenhuma despesa encontrada no banco!\n";
        } else {
            echo "✅ Despesas extraídas:\n";
            foreach ($despesas as $despesa) {
                echo "   • " . $despesa['tipo_despesa'] . ": R$ " . 
                     number_format($despesa['valor'], 2, ',', '.') . 
                     " (Código: " . ($despesa['codigo_receita'] ?? 'N/A') . ")\n";
                echo "     Descrição: " . $despesa['descricao'] . "\n";
            }
            
            // Verificar especificamente SISCOMEX 154,23
            $siscomex = array_filter($despesas, function($d) {
                return $d['tipo_despesa'] === 'SISCOMEX';
            });
            
            if (!empty($siscomex)) {
                $siscomex_valor = reset($siscomex)['valor'];
                if (abs($siscomex_valor - 154.23) < 0.01) {
                    echo "\n🎯 SISCOMEX R$ 154,23 EXTRAÍDO CORRETAMENTE!\n";
                } else {
                    echo "\n⚠️  SISCOMEX extraído com valor diferente: R$ " . 
                         number_format($siscomex_valor, 2, ',', '.') . "\n";
                }
            } else {
                echo "\n❌ SISCOMEX não encontrado nas despesas extraídas\n";
            }
        }
        
    } else {
        echo "❌ Erro no processamento:\n";
        foreach ($result['errors'] as $error) {
            echo "   • $error\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Erro: " . $e->getMessage() . "\n";
}

echo "\n=== FIM DO TESTE ===\n";
?>