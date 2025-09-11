<?php
/**
 * API Endpoint: Buscar Cálculos Salvos
 * 
 * GET /api/buscar-calculos.php?numero_di=XXXXXXXXX&estado_icms=XX&tipo_calculo=XXX
 * 
 * Parâmetros:
 * - numero_di: número da DI (obrigatório)
 * - estado_icms: filtro por estado ICMS (opcional)
 * - tipo_calculo: filtro por tipo de cálculo (opcional)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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

    // Validar parâmetro numero_di
    if (empty($_GET['numero_di'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Parâmetro numero_di é obrigatório'
        ]);
        exit;
    }

    $numero_di = trim($_GET['numero_di']);
    
    // Validar formato do número da DI
    if (!preg_match('/^\d{11,12}$/', $numero_di)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Formato inválido para número da DI'
        ]);
        exit;
    }

    // Parâmetros opcionais
    $estado_icms = !empty($_GET['estado_icms']) ? strtoupper(trim($_GET['estado_icms'])) : null;
    $tipo_calculo = !empty($_GET['tipo_calculo']) ? trim($_GET['tipo_calculo']) : null;

    // Validar UF se fornecida
    if ($estado_icms) {
        $ufs_validas = [
            'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 
            'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 
            'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
        ];
        
        if (!in_array($estado_icms, $ufs_validas)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Estado ICMS inválido'
            ]);
            exit;
        }
    }

    // Executar busca
    $service = new DatabaseService();
    $resultado = $service->buscarCalculos($numero_di, $estado_icms, $tipo_calculo);
    
    if (!$resultado['success']) {
        http_response_code(500);
        echo json_encode($resultado);
        exit;
    }

    // Formatar dados dos cálculos
    $calculos = $resultado['data'];
    
    foreach ($calculos as &$calculo) {
        // Formatar timestamps
        $calculo['created_at_formatted'] = date('d/m/Y H:i:s', strtotime($calculo['created_at']));
        $calculo['updated_at_formatted'] = date('d/m/Y H:i:s', strtotime($calculo['updated_at']));
        
        // Adicionar resumo dos resultados se existir
        if (!empty($calculo['resultados'])) {
            $resultados = $calculo['resultados'];
            
            $resumo = [];
            
            // Resumo dos impostos
            if (isset($resultados['impostos'])) {
                $total_impostos = 0;
                $impostos_resumo = [];
                
                foreach ($resultados['impostos'] as $imposto => $dados) {
                    if (isset($dados['valor_devido'])) {
                        $valor = is_numeric($dados['valor_devido']) ? floatval($dados['valor_devido']) : 0;
                        $impostos_resumo[$imposto] = $valor;
                        $total_impostos += $valor;
                    }
                }
                
                $resumo['impostos'] = $impostos_resumo;
                $resumo['total_impostos'] = $total_impostos;
            }
            
            // Resumo dos totais
            if (isset($resultados['totais'])) {
                $resumo['totais'] = $resultados['totais'];
            }
            
            // Resumo de produtos individuais se existir
            if (isset($resultados['produtos_individuais'])) {
                $resumo['total_produtos'] = count($resultados['produtos_individuais']);
            }
            
            $calculo['resumo'] = $resumo;
        }
        
        // Adicionar informações sobre mudanças nos dados
        $calculo['tem_dados_entrada'] = !empty($calculo['dados_entrada']);
        $calculo['tem_dados_calculo'] = !empty($calculo['dados_calculo']);
        $calculo['tem_resultados'] = !empty($calculo['resultados']);
    }

    // Estatísticas dos cálculos encontrados
    $estatisticas = [
        'total_calculos' => count($calculos),
        'tipos_calculo' => array_count_values(array_column($calculos, 'tipo_calculo')),
        'estados_icms' => array_count_values(array_column($calculos, 'estado_icms'))
    ];

    // Resposta de sucesso
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $calculos,
        'estatisticas' => $estatisticas,
        'filtros_aplicados' => [
            'numero_di' => $numero_di,
            'estado_icms' => $estado_icms,
            'tipo_calculo' => $tipo_calculo
        ],
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Erro em buscar-calculos.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor',
        'timestamp' => date('c')
    ]);
}
?>