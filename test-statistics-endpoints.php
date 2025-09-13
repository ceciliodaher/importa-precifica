<?php
/**
 * Teste dos Endpoints de Estatísticas
 * 
 * Este script testa os três endpoints criados para o dashboard de estatísticas
 */

echo "=== TESTE DOS ENDPOINTS DE ESTATÍSTICAS ===\n\n";

// Função para fazer requisição curl
function testarEndpoint($url, $nome) {
    echo "Testando: {$nome}\n";
    echo "URL: {$url}\n";
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_HEADER, false);
    
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);
    
    if ($curl_error) {
        echo "❌ ERRO CURL: {$curl_error}\n\n";
        return false;
    }
    
    echo "Status HTTP: {$http_code}\n";
    
    if ($http_code >= 200 && $http_code < 300) {
        $data = json_decode($response, true);
        if ($data && isset($data['success']) && $data['success']) {
            echo "✅ SUCESSO\n";
            echo "Estrutura da resposta:\n";
            echo "- success: " . ($data['success'] ? 'true' : 'false') . "\n";
            if (isset($data['data'])) {
                echo "- data: estrutura presente\n";
                // Mostrar algumas chaves principais
                foreach (array_keys($data['data']) as $key) {
                    if (is_array($data['data'][$key])) {
                        echo "  - {$key}: array com " . count($data['data'][$key]) . " elementos\n";
                    } else {
                        echo "  - {$key}: " . gettype($data['data'][$key]) . "\n";
                    }
                }
            }
            if (isset($data['timestamp'])) {
                echo "- timestamp: {$data['timestamp']}\n";
            }
        } else {
            echo "❌ FALHOU: " . ($data['error'] ?? 'Erro desconhecido') . "\n";
        }
    } else {
        echo "❌ HTTP ERROR: {$http_code}\n";
        echo "Response: " . substr($response, 0, 500) . "\n";
    }
    
    echo "\n" . str_repeat("-", 60) . "\n\n";
    return $http_code >= 200 && $http_code < 300;
}

// Base URL - ajustar conforme seu ambiente
$base_url = 'http://localhost/importa-precifica/api/endpoints/statistics';

// Testes com DI conhecida (assumindo que existe uma DI no banco)
$numero_di_teste = '2300120746'; // Usar uma DI conhecida do sistema

echo "ATENÇÃO: Certifique-se que existe a DI {$numero_di_teste} no banco para testes específicos.\n\n";

// 1. Teste Global Stats
testarEndpoint(
    "{$base_url}/global-stats.php",
    "Estatísticas Globais - Básico"
);

testarEndpoint(
    "{$base_url}/global-stats.php?periodo=30d&detalhamento=completo",
    "Estatísticas Globais - Completo"
);

// 2. Teste DI Summary
testarEndpoint(
    "{$base_url}/di-summary.php?numero_di={$numero_di_teste}",
    "Resumo de DI Específica"
);

// 3. Teste Tributos Analysis
testarEndpoint(
    "{$base_url}/tributos-analysis.php?numero_di={$numero_di_teste}",
    "Análise de Tributos - Resumida"
);

testarEndpoint(
    "{$base_url}/tributos-analysis.php?numero_di={$numero_di_teste}&tipo_analise=detalhada",
    "Análise de Tributos - Detalhada"
);

// 4. Testes de validação (devem retornar erro)
echo "=== TESTES DE VALIDAÇÃO (devem falhar) ===\n\n";

testarEndpoint(
    "{$base_url}/di-summary.php",
    "DI Summary sem parâmetro (deve falhar)"
);

testarEndpoint(
    "{$base_url}/di-summary.php?numero_di=123",
    "DI Summary com formato inválido (deve falhar)"
);

testarEndpoint(
    "{$base_url}/tributos-analysis.php?numero_di=9999999999",
    "Tributos Analysis com DI inexistente (deve falhar)"
);

testarEndpoint(
    "{$base_url}/global-stats.php?periodo=invalid",
    "Global Stats com período inválido (deve falhar)"
);

echo "=== FIM DOS TESTES ===\n";
echo "Para executar este teste:\n";
echo "1. Certifique-se que o servidor web está rodando\n";
echo "2. Ajuste a \$base_url se necessário\n";
echo "3. Execute: php test-statistics-endpoints.php\n\n";

echo "URLs dos endpoints criados:\n";
echo "- {$base_url}/global-stats.php\n";
echo "- {$base_url}/di-summary.php\n";
echo "- {$base_url}/tributos-analysis.php\n";
?>