<?php
/**
 * API Endpoint: Salvar Cálculo Realizado
 * 
 * POST /api/salvar-calculo.php
 * 
 * Body JSON:
 * {
 *   "numero_di": "string",
 *   "estado_icms": "string",
 *   "tipo_calculo": "string", 
 *   "dados_entrada": {},
 *   "dados_calculo": {},
 *   "resultados": {}
 * }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Lidar com preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../services/database-service.php';

try {
    // Validar método HTTP
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'success' => false,
            'error' => 'Método não permitido. Use POST.'
        ]);
        exit;
    }

    // Obter dados JSON do body
    $json_input = file_get_contents('php://input');
    $dados = json_decode($json_input, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'JSON inválido: ' . json_last_error_msg()
        ]);
        exit;
    }

    // Validar campo obrigatório (seguindo estrutura DIProcessor)
    if (empty($dados['numero_di'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Campo 'numero_di' é obrigatório"
        ]);
        exit;
    }

    // Validar formato do número da DI
    if (!preg_match('/^\d{11,12}$/', $dados['numero_di'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Formato inválido para número da DI'
        ]);
        exit;
    }


    // Verificar se DI existe no banco
    $service = new DatabaseService();
    $di_existente = $service->buscarDI($dados['numero_di']);
    
    if (!$di_existente['success']) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'DI não encontrada no banco de dados'
        ]);
        exit;
    }

    // Preparar dados para salvar (seguindo estrutura DIProcessor)
    $dados_calculo = [
        'numero_di' => $dados['numero_di'],
        'tipo_calculo' => $dados['tipo_calculo'] ?? 'CONFORMIDADE',
        'dados_entrada' => $dados['dados_entrada'] ?? [],
        'dados_calculo' => $dados['dados_calculo'] ?? [],
        'resultados' => $dados['resultados'] ?? []
    ];

    // Validar estrutura dos resultados se fornecida
    if (!empty($dados_calculo['resultados'])) {
        $campos_esperados = ['impostos', 'totais'];
        foreach ($campos_esperados as $campo) {
            if (!isset($dados_calculo['resultados'][$campo])) {
                error_log("Aviso: Campo '{$campo}' não encontrado nos resultados do cálculo");
            }
        }
    }

    // Salvar no banco
    $resultado = $service->salvarCalculo($dados_calculo);
    
    if (!$resultado['success']) {
        http_response_code(500);
        echo json_encode($resultado);
        exit;
    }

    // Resposta de sucesso
    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Cálculo salvo com sucesso',
        'data' => [
            'calculo_id' => $resultado['calculo_id'],
            'numero_di' => $dados_calculo['numero_di'],
            'tipo_calculo' => $dados_calculo['tipo_calculo']
        ],
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Erro em salvar-calculo.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor',
        'timestamp' => date('c')
    ]);
}
?>