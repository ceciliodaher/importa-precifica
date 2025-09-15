<?php
/**
 * API Endpoint: Buscar Declaração de Importação Específica
 * 
 * GET /api/buscar-di.php?numero_di=XXXXXXXXX
 * 
 * Parâmetros:
 * - numero_di: número da DI (obrigatório)
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
    
    // Validar formato do número da DI (8 a 12 dígitos para flexibilidade)
    if (!preg_match('/^\d{8,12}$/', $numero_di)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Formato inválido para número da DI. Deve conter entre 8 e 12 dígitos.'
        ]);
        exit;
    }

    // Executar busca
    $service = new DatabaseService();
    $resultado = $service->buscarDI($numero_di);
    
    if (!$resultado['success']) {
        $status_code = (strpos($resultado['error'], 'não encontrada') !== false) ? 404 : 500;
        http_response_code($status_code);
        echo json_encode($resultado);
        exit;
    }

    // Formatar dados da DI
    $di = $resultado['data'];
    
    // Converter valores para números (não strings formatadas)
    if (!empty($di['adicoes'])) {
        foreach ($di['adicoes'] as &$adicao) {
            // Valores monetários como float
            $adicao['valor_reais'] = floatval($adicao['valor_reais']);
            $adicao['valor_moeda_negociacao'] = floatval($adicao['valor_moeda_negociacao']);
            $adicao['frete_valor_reais'] = floatval($adicao['frete_valor_reais']);
            $adicao['seguro_valor_reais'] = floatval($adicao['seguro_valor_reais']);
            
            // Pesos como float
            $adicao['peso_liquido'] = floatval($adicao['peso_liquido']);
            $adicao['quantidade_estatistica'] = floatval($adicao['quantidade_estatistica']);
            
            // Formatar tributos se existirem
            if (!empty($adicao['tributos'])) {
                $tributos = &$adicao['tributos'];
                $campos_monetarios = [
                    'ii_base_calculo', 'ii_valor_calculado', 'ii_valor_devido', 'ii_valor_recolher',
                    'ipi_valor_devido', 'ipi_valor_recolher',
                    'pis_valor_devido', 'pis_valor_recolher',
                    'cofins_valor_devido', 'cofins_valor_recolher'
                ];
                
                foreach ($campos_monetarios as $campo) {
                    if (isset($tributos[$campo])) {
                        $tributos[$campo] = floatval($tributos[$campo]);
                    }
                }
                
                $campos_percentuais = [
                    'ii_aliquota_ad_valorem', 'ipi_aliquota_ad_valorem',
                    'pis_aliquota_ad_valorem', 'cofins_aliquota_ad_valorem'
                ];
                
                foreach ($campos_percentuais as $campo) {
                    if (isset($tributos[$campo])) {
                        $tributos[$campo] = floatval($tributos[$campo]);
                    }
                }
            }
            
            // Converter mercadorias para números
            if (!empty($adicao['mercadorias'])) {
                foreach ($adicao['mercadorias'] as &$mercadoria) {
                    $mercadoria['quantidade'] = floatval($mercadoria['quantidade']);
                    $mercadoria['valor_unitario_usd'] = floatval($mercadoria['valor_unitario_usd']);
                    $mercadoria['valor_unitario_brl'] = floatval($mercadoria['valor_unitario_brl']);
                }
            }
        }
    }
    
    // Formatar datas
    if ($di['data_registro']) {
        $di['data_registro_formatada'] = date('d/m/Y', strtotime($di['data_registro']));
    }
    
    if ($di['carga_data_chegada']) {
        $di['carga_data_chegada_formatada'] = date('d/m/Y', strtotime($di['carga_data_chegada']));
    }
    
    // Converter pesos da carga para números
    $di['carga_peso_bruto'] = floatval($di['carga_peso_bruto']);
    $di['carga_peso_liquido'] = floatval($di['carga_peso_liquido']);
    
    // Converter valores de despesas, pagamentos e acréscimos para números
    if (!empty($di['despesas'])) {
        foreach ($di['despesas'] as &$despesa) {
            $despesa['valor'] = floatval($despesa['valor']);
        }
    }
    
    if (!empty($di['pagamentos'])) {
        foreach ($di['pagamentos'] as &$pagamento) {
            $pagamento['valor'] = floatval($pagamento['valor']);
        }
    }
    
    if (!empty($di['acrescimos'])) {
        foreach ($di['acrescimo'] as &$acrescimo) {
            $acrescimo['valor_reais'] = floatval($acrescimo['valor_reais']);
        }
    }
    
    if (!empty($di['icms'])) {
        foreach ($di['icms'] as &$icms_item) {
            $icms_item['valor_total_icms'] = floatval($icms_item['valor_total_icms']);
        }
    }
    
    // Calcular totais gerais
    $total_valor_adicoes = 0;
    $total_tributos = 0;
    
    if (!empty($di['adicoes'])) {
        foreach ($di['adicoes'] as $adicao) {
            $total_valor_adicoes += $adicao['valor_reais'];
            
            if (!empty($adicao['tributos'])) {
                $tributos = $adicao['tributos'];
                $total_tributos += ($tributos['ii_valor_devido'] ?? 0);
                $total_tributos += ($tributos['ipi_valor_devido'] ?? 0);
                $total_tributos += ($tributos['pis_valor_devido'] ?? 0);
                $total_tributos += ($tributos['cofins_valor_devido'] ?? 0);
            }
        }
    }
    
    $di['resumo'] = [
        'total_adicoes' => count($di['adicoes'] ?? []),
        'total_mercadorias' => array_sum(array_map(function($a) { return count($a['mercadorias'] ?? []); }, $di['adicoes'] ?? [])),
        'valor_total_adicoes' => $total_valor_adicoes,
        'total_tributos_federais' => $total_tributos,
        'custo_total_estimado' => $total_valor_adicoes + $total_tributos
    ];

    // Resposta de sucesso
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => $di,
        'timestamp' => date('c')
    ], JSON_PRETTY_PRINT);

} catch (Exception $e) {
    error_log("Erro em buscar-di.php: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro interno do servidor',
        'timestamp' => date('c')
    ]);
}
?>