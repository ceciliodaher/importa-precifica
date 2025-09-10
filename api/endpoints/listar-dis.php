<?php
/**
 * API Endpoint: Listar Declarações de Importação
 * 
 * GET /api/listar-dis.php
 * 
 * Parâmetros:
 * - page: número da página (padrão: 1)
 * - limit: registros por página (padrão: 50, máx: 200)
 * - search: termo de busca
 * - uf: filtro por UF
 * - data_inicio: filtro por data início (YYYY-MM-DD)
 * - data_fim: filtro por data fim (YYYY-MM-DD)
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

    // Parâmetros de entrada
    $page = max(1, intval($_GET['page'] ?? 1));
    $limit = min(200, max(1, intval($_GET['limit'] ?? 50)));
    
    // Filtros
    $filters = [];
    if (!empty($_GET['search'])) {
        $search = trim($_GET['search']);
        // Se parece com número de DI, buscar por número
        if (preg_match('/^\d+$/', $search)) {
            $filters['numero_di'] = $search;
        } else {
            // Senão, buscar por nome do importador
            $filters['importador_nome'] = $search;
        }
    }
    
    if (!empty($_GET['uf'])) {
        $filters['uf'] = strtoupper($_GET['uf']);
    }
    
    if (!empty($_GET['data_inicio']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['data_inicio'])) {
        $filters['data_inicio'] = $_GET['data_inicio'];
    }
    
    if (!empty($_GET['data_fim']) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['data_fim'])) {
        $filters['data_fim'] = $_GET['data_fim'];
    }

    // Executar consulta
    $service = new DatabaseService();
    $resultado = $service->listarDIs($page, $limit, $filters);
    
    if (!$resultado['success']) {
        http_response_code(500);
        echo json_encode($resultado);
        exit;
    }

    // Formatar dados para resposta
    $dados = $resultado['data'];
    foreach ($dados as &$di) {
        // Formatar valores monetários
        $di['valor_total_reais'] = number_format($di['valor_total_reais'], 2, '.', '');
        
        // Formatar datas
        if ($di['data_registro']) {
            $di['data_registro_formatada'] = date('d/m/Y', strtotime($di['data_registro']));
        }
        
        if ($di['created_at']) {
            $di['importado_em'] = date('d/m/Y H:i', strtotime($di['created_at']));
        }
        
        // Formatar pesos
        $di['carga_peso_bruto'] = number_format($di['carga_peso_bruto'], 3, '.', '');
        $di['carga_peso_liquido'] = number_format($di['carga_peso_liquido'], 3, '.', '');
    }

    // Resposta de sucesso
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $dados,
        'pagination' => $resultado['pagination'],
        'filters_applied' => $filters,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Erro em listar-dis.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor',
        'timestamp' => date('c')
    ]);
}
?>