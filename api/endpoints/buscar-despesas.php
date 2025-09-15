<?php
/**
 * API Endpoint - Buscar Despesas Aduaneiras
 * Retorna despesas extraídas de informações complementares para uma DI específica
 * 
 * Usage: buscar-despesas.php?numero_di=2520345968
 * 
 * Response: Array com despesas (SISCOMEX, AFRMM, CAPATAZIA)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../services/database-service.php';

try {
    // Verificar se número da DI foi fornecido
    if (!isset($_GET['numero_di']) || empty($_GET['numero_di'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Número da DI é obrigatório'
        ]);
        exit;
    }
    
    $numero_di = trim($_GET['numero_di']);
    
    // Validar formato da DI (10 dígitos)
    if (!preg_match('/^\d{10}$/', $numero_di)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Número da DI deve conter exatamente 10 dígitos'
        ]);
        exit;
    }
    
    // Usar DatabaseService para buscar dados
    $service = new DatabaseService();
    
    // Buscar despesas aduaneiras da DI
    $despesasResult = $service->buscarDespesasAduaneiras($numero_di);
    
    // Verificar se a DI existe
    $diResult = $service->buscarDI($numero_di);
    $diExists = $diResult['success'];
    
    if (!$diExists) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => "DI $numero_di não encontrada no banco de dados",
            'numero_di' => $numero_di
        ]);
        exit;
    }
    
    $despesas = $despesasResult['success'] ? $despesasResult['data'] : [];
    
    // Calcular totais por tipo
    $totais_por_tipo = [];
    $total_geral = 0;
    
    foreach ($despesas as $despesa) {
        $tipo = $despesa['tipo_despesa'];
        $valor = floatval($despesa['valor']);
        
        if (!isset($totais_por_tipo[$tipo])) {
            $totais_por_tipo[$tipo] = 0;
        }
        
        $totais_por_tipo[$tipo] += $valor;
        $total_geral += $valor;
    }
    
    // Resposta estruturada
    $response = [
        'success' => true,
        'numero_di' => $numero_di,
        'total_despesas' => count($despesas),
        'total_valor' => round($total_geral, 2),
        'totais_por_tipo' => $totais_por_tipo,
        'despesas' => array_map(function($despesa) {
            return [
                'tipo_despesa' => $despesa['tipo_despesa'],
                'codigo_receita' => $despesa['codigo_receita'],
                'descricao' => $despesa['descricao'],
                'valor' => floatval($despesa['valor']),
                'valor_formatado' => 'R$ ' . number_format($despesa['valor'], 2, ',', '.'),
                'created_at' => $despesa['created_at']
            ];
        }, $despesas),
        'metadata' => [
            'extracted_from' => 'informacaoComplementar',
            'parser_version' => 'PHP XMLImportProcessor v1.1',
            'extraction_date' => date('c')
        ]
    ];
    
    echo json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro de banco de dados',
        'details' => $e->getMessage()
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno',
        'details' => $e->getMessage()
    ]);
}
?>