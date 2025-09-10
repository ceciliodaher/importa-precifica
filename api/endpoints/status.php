<?php
/**
 * API Endpoint: Status do Sistema e Estatísticas
 * 
 * GET /api/status.php
 * 
 * Retorna informações sobre o status da API, banco de dados e estatísticas gerais
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../services/database-service.php';

try {
    // Validar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Método não permitido. Use GET.'
        ]);
        exit;
    }

    $service = new DatabaseService();
    
    // Testar conexão com banco
    $conexao = $service->testarConexao();
    
    // Obter estatísticas do sistema
    $estatisticas = $service->obterEstatisticas();
    
    // Obter informações das tabelas
    $tabelas = $service->obterInfoTabelas();
    
    // Informações do servidor
    $servidor_info = [
        'php_version' => PHP_VERSION,
        'servidor' => $_SERVER['SERVER_SOFTWARE'] ?? 'Desconhecido',
        'timestamp' => date('c'),
        'timezone' => date_default_timezone_get(),
        'memory_limit' => ini_get('memory_limit'),
        'max_execution_time' => ini_get('max_execution_time'),
        'upload_max_filesize' => ini_get('upload_max_filesize'),
        'post_max_size' => ini_get('post_max_size')
    ];

    // Informações da API
    $api_info = [
        'version' => '1.0.0',
        'name' => 'Sistema Importa Precifica API',
        'description' => 'API REST para integração com sistema de importação e precificação',
        'endpoints' => [
            'GET /api/status.php' => 'Status do sistema',
            'GET /api/listar-dis.php' => 'Listar declarações de importação',
            'GET /api/buscar-di.php' => 'Buscar DI específica',
            'GET /api/buscar-calculos.php' => 'Buscar cálculos salvos',
            'POST /api/salvar-calculo.php' => 'Salvar cálculo realizado'
        ]
    ];

    // Verificar status geral
    $status_geral = 'healthy';
    $problemas = [];
    
    if (!$conexao['success']) {
        $status_geral = 'unhealthy';
        $problemas[] = 'Falha na conexão com banco de dados';
    }
    
    if (!$estatisticas['success']) {
        $status_geral = 'degraded';
        $problemas[] = 'Erro ao obter estatísticas';
    }
    
    if (!$tabelas['success']) {
        $status_geral = 'degraded';
        $problemas[] = 'Erro ao obter informações das tabelas';
    }

    // Resposta estruturada
    $resposta = [
        'success' => true,
        'status' => $status_geral,
        'api' => $api_info,
        'servidor' => $servidor_info,
        'banco_dados' => [
            'status' => $conexao['success'] ? 'conectado' : 'erro',
            'info' => $conexao['data'] ?? null,
            'tabelas' => $tabelas['data'] ?? []
        ]
    ];

    // Adicionar estatísticas se disponíveis
    if ($estatisticas['success']) {
        $resposta['estatisticas'] = $estatisticas['data'];
        
        // Calcular algumas métricas adicionais
        $stats = $estatisticas['data'];
        
        if ($stats['total_dis'] > 0) {
            $resposta['metricas'] = [
                'adicoes_por_di' => round($stats['total_adicoes'] / $stats['total_dis'], 2),
                'mercadorias_por_adicao' => $stats['total_adicoes'] > 0 ? 
                    round($stats['total_mercadorias'] / $stats['total_adicoes'], 2) : 0,
                'valor_medio_por_di' => $stats['total_dis'] > 0 ? 
                    round($stats['valor_total_importado'] / $stats['total_dis'], 2) : 0,
                'valor_medio_por_adicao' => $stats['total_adicoes'] > 0 ? 
                    round($stats['valor_total_importado'] / $stats['total_adicoes'], 2) : 0
            ];
        }
    }

    // Adicionar problemas se existirem
    if (!empty($problemas)) {
        $resposta['problemas'] = $problemas;
    }

    // Definir código de resposta baseado no status
    $http_code = 200;
    if ($status_geral === 'unhealthy') {
        $http_code = 503; // Service Unavailable
    } elseif ($status_geral === 'degraded') {
        $http_code = 206; // Partial Content
    }

    http_response_code($http_code);
    echo json_encode($resposta, JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Erro em status.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'status' => 'error',
        'error' => 'Erro interno do servidor',
        'timestamp' => date('c')
    ]);
}
?>