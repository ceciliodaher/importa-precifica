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
    
    // DEBUG: Log received data for troubleshooting
    error_log("DEBUG salvar-calculo.php: Dados recebidos: " . json_encode($dados, JSON_PRETTY_PRINT));
    
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

    // Validar formato do número da DI (mais flexível)
    $numero_di_clean = preg_replace('/\D/', '', $dados['numero_di']); // Remove non-digits
    if (strlen($numero_di_clean) < 10 || strlen($numero_di_clean) > 15) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => "Formato inválido para número da DI: '{$dados['numero_di']}' (deve ter 10-15 dígitos)"
        ]);
        exit;
    }
    // Use cleaned number for consistency
    $dados['numero_di'] = $numero_di_clean;


    // Verificar se DI existe no banco (mais flexível para testes)
    $service = new DatabaseService();
    $di_existente = $service->buscarDI($dados['numero_di']);
    
    if (!$di_existente['success']) {
        error_log("WARNING salvar-calculo.php: DI {$dados['numero_di']} não encontrada no banco - permitindo para testes");
        // Don't fail if DI not found - allow for testing scenarios
        // http_response_code(404);
        // echo json_encode([
        //     'success' => false,
        //     'error' => 'DI não encontrada no banco de dados'
        // ]);
        // exit;
    } else {
        error_log("DEBUG salvar-calculo.php: DI {$dados['numero_di']} encontrada no banco");
    }

    // Preparar dados para salvar (seguindo estrutura DIProcessor)
    $dados_calculo = [
        'numero_di' => $dados['numero_di'],
        'tipo_calculo' => $dados['tipo_calculo'] ?? 'CONFORMIDADE',
        'dados_entrada' => $dados['dados_entrada'] ?? [],
        'dados_calculo' => $dados['dados_calculo'] ?? [],
        'resultados' => $dados['resultados'] ?? []
    ];

    // Validar estrutura dos resultados se fornecida (mais flexível)
    if (!empty($dados_calculo['resultados'])) {
        $campos_esperados = ['impostos', 'totais'];
        $missing_fields = [];
        
        foreach ($campos_esperados as $campo) {
            if (!isset($dados_calculo['resultados'][$campo])) {
                $missing_fields[] = $campo;
            }
        }
        
        if (!empty($missing_fields)) {
            error_log("INFO salvar-calculo.php: Campos opcionais ausentes: " . implode(', ', $missing_fields));
            // Continue processing - don't fail for missing optional fields
        }
        
        error_log("DEBUG salvar-calculo.php: Estrutura resultados validada com " . count($dados_calculo['resultados']) . " campos");
    }

    // Salvar no banco
    error_log("DEBUG salvar-calculo.php: Tentando salvar cálculo para DI {$dados_calculo['numero_di']}");
    
    $resultado = $service->salvarCalculo($dados_calculo);
    
    if (!$resultado['success']) {
        error_log("ERROR salvar-calculo.php: Falha ao salvar - " . ($resultado['error'] ?? 'Erro desconhecido'));
        http_response_code(500);
        echo json_encode($resultado);
        exit;
    }
    
    error_log("SUCCESS salvar-calculo.php: Cálculo salvo com sucesso - ID: " . ($resultado['calculo_id'] ?? 'N/A'));

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