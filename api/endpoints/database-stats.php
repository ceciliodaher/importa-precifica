<?php
/**
 * API Endpoint: Estatísticas do Banco de Dados
 * 
 * GET /api/endpoints/database-stats.php
 * 
 * Retorna estatísticas reais do banco para detectar se está vazio ou populado
 * Usado pelo DataLoader.getStats() para status check
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Preflight CORS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Validar método HTTP
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'Método não permitido. Use GET.'
    ]);
    exit;
}

// Incluir serviços necessários
require_once '../services/database-service.php';

try {
    // Inicializar conexão com banco
    $db = new DatabaseService();
    $pdo = $db->getConnection();
    
    // Query otimizada para estatísticas essenciais
    $stats_queries = [
        'total_dis' => "SELECT COUNT(*) as count FROM declaracoes_importacao",
        'total_adicoes' => "SELECT COUNT(*) as count FROM adicoes", 
        'total_mercadorias' => "SELECT COUNT(*) as count FROM mercadorias",
        'total_tributos' => "SELECT COUNT(*) as count FROM tributos",
        'total_despesas' => "SELECT COUNT(*) as count FROM despesas_aduaneiras",
        'total_calculos' => "SELECT COUNT(*) as count FROM calculos_salvos",
        'total_produtos_calculados' => "SELECT COUNT(*) as count FROM produtos_individuais_calculados",
        'total_importadores' => "SELECT COUNT(*) as count FROM importadores"
    ];
    
    $statistics = [];
    
    // Executar todas as queries de contagem
    foreach ($stats_queries as $key => $query) {
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $statistics[$key] = intval($result['count']);
    }
    
    // Estatísticas agregadas adicionais
    $aggregate_queries = [
        'valor_total_dis' => "
            SELECT COALESCE(SUM(valor_reais), 0) as total 
            FROM adicoes
        ",
        'peso_total_bruto' => "
            SELECT COALESCE(SUM(carga_peso_bruto), 0) as total 
            FROM declaracoes_importacao 
            WHERE carga_peso_bruto IS NOT NULL
        ",
        'peso_total_liquido' => "
            SELECT COALESCE(SUM(carga_peso_liquido), 0) as total 
            FROM declaracoes_importacao 
            WHERE carga_peso_liquido IS NOT NULL
        ",
        'despesas_total_valor' => "
            SELECT COALESCE(SUM(valor), 0) as total 
            FROM despesas_aduaneiras
        ",
        'dis_recentes' => "
            SELECT COUNT(*) as count 
            FROM declaracoes_importacao 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        "
    ];
    
    foreach ($aggregate_queries as $key => $query) {
        $stmt = $pdo->prepare($query);
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        $statistics[$key] = $key === 'dis_recentes' ? intval($result['count']) : floatval($result['total']);
    }
    
    // Status geral do banco
    $banco_vazio = ($statistics['total_dis'] === 0);
    $dados_processados = ($statistics['total_mercadorias'] > 0 && $statistics['total_adicoes'] > 0);
    $calculos_realizados = ($statistics['total_calculos'] > 0);
    
    // Últimas DIs para debug com valor total calculado
    $stmt = $pdo->prepare("
        SELECT 
            di.numero_di, 
            di.data_registro, 
            COALESCE(SUM(a.valor_reais), 0) as valor_total,
            di.created_at 
        FROM declaracoes_importacao di
        LEFT JOIN adicoes a ON di.numero_di = a.numero_di
        GROUP BY di.numero_di, di.data_registro, di.created_at
        ORDER BY di.created_at DESC 
        LIMIT 5
    ");
    $stmt->execute();
    $ultimas_dis = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Preparar resposta completa
    $response = [
        'success' => true,
        'message' => 'Estatísticas do banco carregadas com sucesso',
        'timestamp' => date('c'),
        
        // Dados principais para DataLoader.getStats()
        'stats' => $statistics,
        
        // Status de saúde do sistema
        'health' => [
            'banco_vazio' => $banco_vazio,
            'dados_processados' => $dados_processados,
            'calculos_realizados' => $calculos_realizados,
            'status_geral' => $banco_vazio ? 'VAZIO' : ($dados_processados ? 'POPULADO' : 'PARCIAL')
        ],
        
        // Debug information
        'debug' => [
            'ultimas_dis' => $ultimas_dis,
            'tabelas_checadas' => count($stats_queries),
            'conexao_db' => 'OK'
        ],
        
        // Resumo legível
        'resumo' => [
            'total_registros' => array_sum(array_slice($statistics, 0, 6)), // Soma dos principais
            'dis_importadas' => $statistics['total_dis'],
            'produtos_identificados' => $statistics['total_mercadorias'], 
            'calculos_salvos' => $statistics['total_calculos'],
            'valor_total_sistema' => number_format($statistics['valor_total_dis'], 2, '.', '')
        ]
    ];
    
    // Log para debug
    error_log("API database-stats: Retornando estatísticas - DIs: {$statistics['total_dis']}, Mercadorias: {$statistics['total_mercadorias']}, Status: " . $response['health']['status_geral']);
    
    // Resposta de sucesso
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    // Log do erro
    error_log("Erro na API database-stats: " . $e->getMessage());
    
    // Resposta de erro
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor',
        'message' => 'Falha ao carregar estatísticas do banco',
        'details' => $e->getMessage(),
        'timestamp' => date('c')
    ], JSON_UNESCAPED_UNICODE);
}
?>